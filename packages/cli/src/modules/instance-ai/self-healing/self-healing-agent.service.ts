import { createScopedWorkspace, type Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	applyBranchReadOnlyOverrides,
	type SelfHealingResultUsage,
	type WorkflowSuggestionBaseline,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import {
	createInstanceAiTraceContext,
	createSelfHealingAgent,
	generateWorkflowSource,
	getSelfHealingResourceId,
	orchestratorAgentId,
	SELF_HEALING_PROFILE_VERSION,
	selfHealingOutputSchema,
	streamAgentRun,
	writeWorkspaceFile,
	MAX_STEPS,
	type InstanceAiContext,
	type InstanceAiTraceContext,
	type ModelConfig,
	type SelfHealingOutput,
	type SelfHealingThreadMetadata,
	type ServiceProxyConfig,
	type StreamRunResult,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { nanoid } from 'nanoid';
import { UnexpectedError } from 'n8n-workflow';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import type { ProxyTokenManager } from '@/services/proxy-token-manager';
import { AiUsageService } from '@/services/ai-usage.service';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';

import { InProcessEventBus } from '../event-bus/in-process-event-bus';
import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import { InstanceAiCreditService } from '../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';
import { InstanceAiModelService } from '../instance-ai-model.service';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiSandboxService } from '../sandbox/instance-ai-sandbox.service';
import { TypeORMAgentMemory } from '../storage/typeorm-agent-memory';
import type { InstanceAiTracingService } from '../tracing/instance-ai-tracing.service';
import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import { toWorkflowJSON } from '../workflow-json';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';
import { SelfHealingCandidateService } from './self-healing-candidate.service';
import type { CandidateWorkflowResult } from './candidate-workflow';

export type SelfHealingRunInput = {
	user: User;
	baseline: WorkflowSuggestionBaseline;
	executionId: string;
};

export type SelfHealingRunResult = {
	threadId: string;
	runId: string;
	status: StreamRunResult['status'];
	finishReason?: StreamRunResult['finishReason'];
	reason?: string;
	output?: SelfHealingOutput;
	validationError?: string;
	error?: unknown;
	usage: SelfHealingResultUsage;
	candidate?: {
		filePath: string;
		compile: () => Promise<CandidateWorkflowResult>;
	};
};

export type SelfHealingRunLifecycle = {
	threadId: string;
	runId: string;
	onComplete: (result: SelfHealingRunResult, signal: AbortSignal) => Promise<void>;
};

type ProxyRunConfig = {
	searchProxyConfig?: ServiceProxyConfig;
	tracingProxyConfig?: ServiceProxyConfig;
	tokenManager?: ProxyTokenManager;
	proxyBaseUrl?: string;
};

export type SelfHealingRunOptions = {
	threadId: string;
	runId: string;
	messageGroupId?: string;
	signal: AbortSignal;
	sandbox: Pick<InstanceAiSandboxService, 'getOrCreateWorkspace' | 'destroySandbox'>;
	tracing: Pick<
		InstanceAiTracingService,
		'registerTraceContext' | 'finalizeRunTracing' | 'finalizeMessageTraceRoot'
	>;
	createProxyRunConfig: () => Promise<ProxyRunConfig>;
	assertCreditsAvailable: () => Promise<void>;
	onActivity: () => void;
	onFinalizing: () => void;
	onComplete: SelfHealingRunLifecycle['onComplete'];
	getAbortReason: () => string;
	onFinish: (
		result: Pick<SelfHealingRunResult, 'status' | 'reason' | 'finishReason'>,
		modelId?: ModelConfig,
		stream?: StreamRunResult,
	) => void;
};

const CANDIDATE_FILE_PATH = 'self-healing/candidate.workflow.ts';
const INVESTIGATION_MESSAGE = 'Investigate the failed execution using the execution tools.';

@Service()
export class SelfHealingAgentService {
	constructor(
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly executions: SelfHealingExecutionReferenceService,
		private readonly memory: TypeORMAgentMemory,
		private readonly adapter: InstanceAiAdapterService,
		private readonly models: InstanceAiModelService,
		private readonly settings: InstanceAiSettingsService,
		private readonly writeAccess: InstanceWriteAccessService,
		private readonly aiUsage: AiUsageService,
		private readonly credits: InstanceAiCreditService,
		private readonly events: InProcessEventBus,
		private readonly candidates: SelfHealingCandidateService,
		private readonly errorReporter: InstanceAiErrorReporterService,
	) {}

	assertEnabled(): void {
		if (!this.config.instanceAi.workflowSuggestionsEnabled) {
			throw new BadRequestError('Self-healing investigations are disabled.');
		}
	}

	async execute(
		input: SelfHealingRunInput,
		options: SelfHealingRunOptions,
	): Promise<SelfHealingRunResult> {
		input = { ...input, baseline: structuredClone(input.baseline) };
		let user = input.user;

		const { baseline, executionId } = input;
		const { threadId, runId, signal } = options;
		const startedAt = Date.now();

		const metadata: SelfHealingThreadMetadata = {
			selfHealing: {
				backgroundUserId: user.id,
				projectId: baseline.projectId,
				workflowId: baseline.workflowId,
				executionId,
			},
			profileVersion: SELF_HEALING_PROFILE_VERSION,
		};
		const resourceId = getSelfHealingResourceId(user.id);
		const messageId = nanoid();

		let tracing: InstanceAiTraceContext | undefined;
		let modelId: ModelConfig | undefined;
		let stream: StreamRunResult | undefined;
		let providerStream = false;
		const result: SelfHealingRunResult = {
			threadId,
			runId,
			status: 'errored',
			usage: this.models.isProxyEnabled()
				? {
						credits: null,
						turns: null,
						durationSeconds: null,
					}
				: {
						promptTokens: null,
						completionTokens: null,
						totalTokens: null,
						turns: null,
						durationSeconds: null,
					},
		};

		try {
			await this.memory.saveThreadWithProject(
				{ id: threadId, resourceId, metadata },
				baseline.projectId,
			);

			this.events.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				payload: { messageId, messageGroupId: options.messageGroupId },
			});

			user = await this.validateInput(input);
			signal.throwIfAborted();

			const environment = await this.prepareEnvironment({ ...input, user }, options);
			modelId = environment.modelId;
			const { context, proxy, shareParameters } = environment;

			tracing = await createInstanceAiTraceContext({
				threadId,
				runId,
				messageId,
				messageGroupId: options.messageGroupId,
				userId: user.id,
				modelId,
				input: { message: INVESTIGATION_MESSAGE },
				metadata: {
					...metadata,
					self_healing: true,
					self_healing_workflow_id: baseline.workflowId,
					self_healing_execution_id: executionId,
					self_healing_project_id: baseline.projectId,
				},
				proxyConfig: proxy.tracingProxyConfig,
				n8nVersion: N8N_VERSION,
				workflowSdkVersion: WORKFLOW_SDK_VERSION,
			});
			if (tracing) {
				options.tracing.registerTraceContext(runId, threadId, tracing, options.messageGroupId);
			}
			context.tracing = tracing;

			signal.throwIfAborted();
			const entry = await options.sandbox.getOrCreateWorkspace(threadId, user, context);
			if (!entry) throw new UnexpectedError('The self-healing workspace is unavailable.');
			const workspace = createScopedWorkspace(
				entry.workspace,
				await getWorkspaceRoot(entry.workspace),
			);
			context.workspace = workspace;
			await this.prepareCandidate(baseline, workspace, shareParameters, signal);

			signal.throwIfAborted();
			stream = await this.runAgent({
				input: { ...input, user },
				options,
				context,
				modelId,
				metadata,
				onStreamStart: () => {
					providerStream = true;
				},
			});
			result.status = stream.status;
			result.finishReason = stream.finishReason;
			result.error = stream.error;
			result.usage.turns = stream.stepCount ?? null;
			const output = selfHealingOutputSchema.safeParse(stream.structuredOutput);
			if (output.success) result.output = output.data;
			else result.validationError = output.error.message;
			if (output.success && output.data.candidateFilePath) {
				const filePath = output.data.candidateFilePath;
				result.candidate = {
					filePath,
					compile: async () =>
						await this.candidates.compile(
							{ baseline, context, filePath, abortSignal: signal },
							await this.suggestions.requireEditor(baseline.backgroundUserId, baseline.workflowId),
						),
				};
			}
			if (stream.status === 'suspended') {
				result.reason = 'unexpected_suspension';
			}
		} catch (error) {
			result.status = signal.aborted ? 'cancelled' : 'errored';
			result.error = error;
			result.reason = sanitizeErrorDetail(getErrorMessage(error), 1000);
		} finally {
			// Model work has stopped. The final charge must not cancel result persistence.
			options.onFinalizing();
			result.usage.durationSeconds = (Date.now() - startedAt) / 1000;

			if ('promptTokens' in result.usage) {
				result.usage.promptTokens = stream?.usage?.promptTokens ?? null;
				result.usage.completionTokens = stream?.usage?.completionTokens ?? null;
				result.usage.totalTokens = stream?.usage?.totalTokens ?? null;
			}
			try {
				const credits = await this.credits.claimRunUsage(
					user,
					threadId,
					stream?.agentRunId || runId,
					stream?.usage?.usage ?? [],
					result.status,
					'self_healing',
				);
				if ('credits' in result.usage) {
					result.usage.credits = credits ?? null;
				}
			} catch (error) {
				this.logger.warn('Could not claim self-healing usage.', {
					runId,
					error: getErrorMessage(error),
				});
			}
			if (signal.aborted || result.status === 'cancelled') {
				this.markResultCancelled(result, options.getAbortReason());
			}
		}

		if (result.status === 'errored' && result.error !== undefined) {
			this.errorReporter.report(result.error, {
				component: 'instance-ai-self-healing',
				role: 'self-healing',
				threadId,
				runId,
				userId: user.id,
				projectId: baseline.projectId,
				tracing,
				providerStream,
			});
		}

		try {
			await options.onComplete(result, signal);
		} catch (error) {
			if (signal.aborted && result.status !== 'cancelled') {
				this.markResultCancelled(result, options.getAbortReason());
			}
			throw error;
		} finally {
			// A successful completion has committed. A later abort cannot undo that result.
			await this.finish(result, stream, tracing, modelId, options);
			await options.sandbox
				.destroySandbox(threadId, 'thread_cleanup', user.id)
				.catch((error: unknown) => {
					this.logger.warn('Could not clear the self-healing workspace.', {
						runId,
						error: getErrorMessage(error),
					});
				});
		}
		return result;
	}

	private markResultCancelled(result: SelfHealingRunResult, reason: string): void {
		result.status = 'cancelled';
		result.reason = reason;
		delete result.output;
		delete result.candidate;
		delete result.finishReason;
		delete result.validationError;
	}

	private async validateInput({ user, baseline, executionId }: SelfHealingRunInput) {
		if (user.disabled || user.id !== baseline.backgroundUserId) {
			throw new ForbiddenError('The self-healing actor must match the workflow baseline.');
		}

		const actor = await this.suggestions.requireCurrentBaseline(baseline);
		await this.executions.validateReference(actor, baseline.workflowId, executionId);

		return actor;
	}

	private async prepareEnvironment(input: SelfHealingRunInput, options: SelfHealingRunOptions) {
		const { user } = input;
		const { signal, runId, threadId } = options;

		await options.assertCreditsAvailable();
		signal.throwIfAborted();

		const proxy = await options.createProxyRunConfig();
		const proxyContext = { runId, threadId };
		const modelId =
			proxy.proxyBaseUrl && proxy.tokenManager
				? await this.models.resolveProxyModel(
						user,
						proxy.proxyBaseUrl,
						proxy.tokenManager,
						proxyContext,
					)
				: await this.models.resolveAgentModelConfig(user, proxyContext);

		const shareParameters = await this.aiUsage.isParameterValueSharingAllowed();
		const context = this.adapter.createContext(user, {
			threadId: options.threadId,
			projectId: input.baseline.projectId,
			searchProxyConfig: proxy.searchProxyConfig,
			modelId,
			modelFetch: this.models.getModelFetch(),
			allowSendingParameterValues: shareParameters,
		});
		context.runId = options.runId;
		context.threadId = options.threadId;
		const permissions = this.settings.getPermissions();
		context.permissions = {
			...permissions,
			fetchUrl: permissions.fetchUrl === 'blocked' ? 'blocked' : 'always_allow',
			webSearch: permissions.webSearch === 'blocked' ? 'blocked' : 'always_allow',
		};
		context.branchReadOnly = this.writeAccess.isReadOnly();
		if (context.branchReadOnly) {
			context.permissions = applyBranchReadOnlyOverrides(context.permissions);
		}
		context.threadMemory = this.memory;

		this.bindWorkflowReads(context, input, shareParameters);

		return { context, modelId, proxy, shareParameters };
	}

	private bindWorkflowReads(
		context: InstanceAiContext,
		{ user, baseline }: SelfHealingRunInput,
		shareParameters: boolean,
	) {
		const workflowService = context.workflowService;

		context.workflowService = {
			...workflowService,
			get: async (workflowId) => {
				if (workflowId !== baseline.workflowId) return await workflowService.get(workflowId);
				await this.suggestions.requireEditor(user.id, workflowId);
				const detail = await workflowService.get(workflowId);

				return {
					...detail,
					name: baseline.original.name,
					connections: structuredClone(baseline.original.connections),
					settings: baseline.original.settings
						? { ...structuredClone(baseline.original.settings) }
						: undefined,
					versionId: baseline.expectedBaseline.savedVersionId,
					activeVersionId: baseline.expectedBaseline.publishedVersionId,
					checksum: baseline.expectedBaseline.checksum,
					nodes: baseline.original.nodes.map((node) => ({
						...structuredClone(node),
						parameters: shareParameters ? structuredClone(node.parameters) : undefined,
					})),
				};
			},

			getAsWorkflowJSON: async (workflowId, versionId) => {
				if (workflowId !== baseline.workflowId) {
					return await workflowService.getAsWorkflowJSON(workflowId, versionId);
				}
				await this.suggestions.requireEditor(user.id, workflowId);
				if (versionId && versionId !== baseline.expectedBaseline.publishedVersionId) {
					throw new ForbiddenError('Read the published baseline assigned to this investigation.');
				}

				return toWorkflowJSON(
					{ ...structuredClone(baseline.original), id: workflowId },
					{ redactParameters: !shareParameters },
				);
			},
			getVersion: async (workflowId, versionId) => {
				if (workflowId === baseline.workflowId) {
					await this.suggestions.requireEditor(user.id, workflowId);
					if (versionId !== baseline.expectedBaseline.publishedVersionId) {
						throw new ForbiddenError('Read the published baseline assigned to this investigation.');
					}
				}
				const version = await workflowService.getVersion?.(workflowId, versionId);
				if (!version) throw new BadRequestError('The requested workflow version is unavailable.');
				if (workflowId !== baseline.workflowId) return version;
				return {
					...version,
					nodes: baseline.original.nodes.map((node) => ({
						...structuredClone(node),
						parameters: shareParameters ? structuredClone(node.parameters) : undefined,
					})),
					connections: structuredClone(baseline.original.connections),
				};
			},
		};
	}

	private async runAgent({
		input,
		options,
		context,
		modelId,
		metadata,
		onStreamStart,
	}: {
		input: SelfHealingRunInput;
		options: SelfHealingRunOptions;
		context: InstanceAiContext;
		modelId: ModelConfig;
		metadata: SelfHealingThreadMetadata;
		onStreamStart: () => void;
	}): Promise<StreamRunResult> {
		const { user, baseline, executionId } = input;
		const { runId, threadId, signal } = options;
		const { tracing } = context;
		const resourceId = getSelfHealingResourceId(user.id);

		const agent = await createSelfHealingAgent({
			modelId,
			context,
			thinkingEnabled: this.config.instanceAi.thinkingEnabled,
			modelFetch: this.models.getModelFetch(),
			abortSignal: signal,
			verifyCandidate: async (args) => {
				signal.throwIfAborted();

				return await this.candidates.verify({
					...args,
					user,
					baseline,
					context,
					abortSignal: signal,
				});
			},
		});

		signal.throwIfAborted();
		const consume = async () => {
			onStreamStart();
			return await streamAgentRun(
				agent,
				`${INVESTIGATION_MESSAGE}\n\nWorkflow: ${baseline.workflowId}\nFailed execution: ${executionId}\nCandidate: ${CANDIDATE_FILE_PATH}`,
				{
					maxIterations: MAX_STEPS.ORCHESTRATOR,
					abortSignal: signal,
					recoverUsageOnAbort: true,
					...modelStreamStallOptions(this.config.ai),
					persistence: { resourceId, threadId, hostRunId: runId, hostMetadata: metadata },
					providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
				},
				{
					threadId,
					runId,
					agentId: orchestratorAgentId(runId),
					signal,
					eventBus: this.events,
					logger: this.logger,
					onActivity: options.onActivity,
				},
			);
		};

		return tracing ? await tracing.withActiveSpan(tracing.actorRun, consume) : await consume();
	}

	private async prepareCandidate(
		baseline: WorkflowSuggestionBaseline,
		workspace: Workspace,
		shareParameters: boolean,
		abortSignal: AbortSignal,
	): Promise<void> {
		const workflow = toWorkflowJSON(
			{ ...baseline.original, id: baseline.workflowId },
			{ redactParameters: !shareParameters },
		);
		const source = await generateWorkflowSource(workflow);

		await writeWorkspaceFile(workspace, CANDIDATE_FILE_PATH, source, {
			logger: this.logger,
			abortSignal,
		});
	}

	private async finish(
		result: SelfHealingRunResult,
		stream: StreamRunResult | undefined,
		tracing: InstanceAiTraceContext | undefined,
		modelId: ModelConfig | undefined,
		options: SelfHealingRunOptions,
	): Promise<void> {
		try {
			options.onFinish(result, modelId, stream);
		} catch (error) {
			this.logger.warn('Could not report self-healing completion.', {
				runId: result.runId,
				error: getErrorMessage(error),
			});
		}

		const finalization = {
			status:
				result.status === 'errored' || result.status === 'suspended' ? 'error' : result.status,
			reason: result.reason ?? result.finishReason,
			modelId,
			outputs: { output: result.output, validationError: result.validationError },
		} satisfies Parameters<InstanceAiTracingService['finalizeRunTracing']>[2];

		await options.tracing.finalizeRunTracing(result.runId, tracing, finalization);

		if (tracing) {
			await options.tracing.finalizeMessageTraceRoot(result.runId, tracing, finalization);
		}
	}
}
