import { createScopedWorkspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	isAgentProposalArmPass,
	type AgentEvalSuiteCase,
	type AgentProposalCaseArm,
	type AgentProposalEdit,
	type AgentProposalEvalCase,
	type AgentProposalEvidence,
	type InstanceAiEvalLlmUsage,
	type SelfHealingAgentGoal,
	type SelfHealingResultUsage,
} from '@n8n/api-types';
import { getN8nVersion, Logger, ModuleRegistry } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import {
	AGENT_IMPROVEMENT_PROFILE_VERSION,
	agentImprovementOutputSchema,
	createAgentImprovementAgent,
	createInstanceAiTraceContext,
	getSelfHealingResourceId,
	MAX_STEPS,
	orchestratorAgentId,
	streamAgentRun,
	type AgentImprovementHostTools,
	type AgentImprovementListSessionsInput,
	type AgentImprovementOutput,
	type AgentImprovementReadSessionInput,
	type AgentImprovementTestProposalInput,
	type AgentImprovementThreadMetadata,
	type BuilderUsageItem,
	type InstanceAiContext,
	type InstanceAiTraceContext,
	type ModelConfig,
	type ServiceProxyConfig,
	type StreamRunResult,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { nanoid } from 'nanoid';

import { WORKFLOW_SDK_VERSION } from '@/constants';
import { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProposalBase } from '@/modules/agents/agent-proposal.contracts';
import { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import { formatAgentSessionTranscriptPage } from '@/modules/agents/format-agent-session-context';
import type { ProxyTokenManager } from '@/services/proxy-token-manager';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';

import { isAgentsAccessEnabled } from '../../agents-access';
import { InProcessEventBus } from '../../event-bus/in-process-event-bus';
import { InstanceAiAdapterService } from '../../instance-ai.adapter.service';
import { InstanceAiCreditService } from '../../instance-ai-credit.service';
import { InstanceAiErrorReporterService } from '../../instance-ai-error-reporter.service';
import { InstanceAiModelService } from '../../instance-ai-model.service';
import type { InstanceAiSandboxService } from '../../sandbox/instance-ai-sandbox.service';
import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import type { InstanceAiTracingService } from '../../tracing/instance-ai-tracing.service';

export type AgentInvestigatorLastTested = {
	edits: AgentProposalEdit[];
	evalCases: AgentProposalEvalCase[];
	evidence: AgentProposalEvidence;
};

export type AgentImprovementRunInput = {
	/** The configuration actor. */
	user: User;
	threadId: string;
	investigationId: string;
	projectId: string;
	agentId: string;
	/** The aims of the run. The first one is `quality`. */
	goals: SelfHealingAgentGoal[];
	/** The published definition, read at admission. */
	base: AgentProposalBase;
	traceWindow: { after: Date | null; until: Date };
	/** Production sessions that have a turn in the window. */
	traceCount: number;
};

export type AgentImprovementRunResult = {
	status: StreamRunResult['status'];
	finishReason?: string;
	/** Null when the output is missing or invalid, and when the run did not complete. */
	output: AgentImprovementOutput | null;
	usage: SelfHealingResultUsage;
	/** Set only by a `test_proposal` call that returned `ok: true`. */
	lastTested: AgentInvestigatorLastTested | null;
};

export type AgentImprovementRunLifecycle = {
	runId: string;
	onComplete: (result: AgentImprovementRunResult, signal: AbortSignal) => Promise<void>;
};

type ProxyRunConfig = {
	searchProxyConfig?: ServiceProxyConfig;
	tracingProxyConfig?: ServiceProxyConfig;
	tokenManager?: ProxyTokenManager;
	proxyBaseUrl?: string;
};

export type AgentImprovementRunOptions = {
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
	onComplete: AgentImprovementRunLifecycle['onComplete'];
	getAbortReason: () => string;
	onFinish: (
		result: { status: AgentImprovementRunResult['status']; reason?: string },
		modelId?: ModelConfig,
		stream?: StreamRunResult,
	) => void;
};

type TestProposalResult = { ok: true; cases: CaseOutcome[] } | { ok: false; errors: string[] };

type ArmOutcome = {
	pass: boolean;
	runStatus: AgentProposalCaseArm['status'];
	verdictReasoning: string | null;
	toolsCalled: string[];
};

type CaseOutcome = {
	caseKey: string;
	origin: 'suite' | 'proposal';
	motivating: boolean;
	published: ArmOutcome;
	proposed: ArmOutcome | null;
};

/** The state that the host tools of one run share. */
type RunState = {
	input: AgentImprovementRunInput;
	runId: string;
	signal: AbortSignal;
	helperModel: ModelConfig;
	onHelperUsage: (usage: InstanceAiEvalLlmUsage[]) => Promise<void>;
	suiteCases?: Promise<AgentEvalSuiteCase[]>;
	lastTested: AgentInvestigatorLastTested | null;
};

const INVESTIGATION_MESSAGE = 'Investigate the agent and prepare one tested improvement.';
/** Quality is always the first aim. Cost and latency are aims only when the list has them. */
function goalsLine(goals: SelfHealingAgentGoal[]) {
	const additional = goals.filter((goal) => goal !== 'quality');
	return additional.length === 0
		? 'Goals: quality'
		: `Goals: quality first, then ${additional.join(' and ')}`;
}

const TESTING_UNAVAILABLE = 'Proposal tests are not available on this instance.';

const toArmOutcome = (arm: AgentProposalCaseArm): ArmOutcome => ({
	pass: isAgentProposalArmPass(arm),
	runStatus: arm.status,
	verdictReasoning: arm.verdict.reasoning,
	toolsCalled: arm.toolCalls.map((call) => call.tool),
});

/** Runs the Assistant agent that prepares one tested improvement for a published agent. */
@Service()
export class SelfHealingAgentInvestigatorService {
	// The agents and agent-evals modules can be inactive, so their services are
	// resolved when a run uses them and are not constructor dependencies.
	constructor(
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
		private readonly memory: TypeORMAgentMemory,
		private readonly adapter: InstanceAiAdapterService,
		private readonly models: InstanceAiModelService,
		private readonly credits: InstanceAiCreditService,
		private readonly events: InProcessEventBus,
		private readonly errorReporter: InstanceAiErrorReporterService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async execute(
		input: AgentImprovementRunInput,
		options: AgentImprovementRunOptions,
	): Promise<AgentImprovementRunResult> {
		const { user, projectId, agentId } = input;
		const { threadId, runId, signal } = options;
		const startedAt = Date.now();

		const metadata: AgentImprovementThreadMetadata = {
			agentImprovement: {
				backgroundUserId: user.id,
				projectId,
				agentId,
				investigationId: input.investigationId,
			},
			profileVersion: AGENT_IMPROVEMENT_PROFILE_VERSION,
		};
		const resourceId = getSelfHealingResourceId(user.id);
		const messageId = nanoid();
		const message = this.buildMessage(input);

		let tracing: InstanceAiTraceContext | undefined;
		let modelId: ModelConfig | undefined;
		let stream: StreamRunResult | undefined;
		let state: RunState | undefined;
		let hasWorkspace = false;
		let providerStream = false;
		let runError: unknown;
		let reason: string | undefined;
		let validationError: string | undefined;
		// Each claim resolves to the credits that it charged.
		const helperClaims: Array<Promise<number | undefined>> = [];
		const helperTokens = { prompt: 0, completion: 0 };
		let helperReports = 0;
		const result: AgentImprovementRunResult = {
			status: 'errored',
			output: null,
			usage: this.models.isProxyEnabled()
				? { credits: null, turns: null, durationSeconds: null }
				: {
						promptTokens: null,
						completionTokens: null,
						totalTokens: null,
						turns: null,
						durationSeconds: null,
					},
			lastTested: null,
		};

		try {
			await this.memory.saveThreadWithProject({ id: threadId, resourceId, metadata }, projectId);

			this.events.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				payload: { messageId, messageGroupId: options.messageGroupId },
			});

			if (user.disabled) throw new ForbiddenError('The self-healing actor is disabled.');
			signal.throwIfAborted();

			const environment = await this.prepareEnvironment(input, options);
			modelId = environment.modelId;
			const { context, proxy } = environment;

			state = {
				input,
				runId,
				signal,
				helperModel: environment.utilityModelId ?? modelId,
				lastTested: null,
				onHelperUsage: async (usage) => {
					for (const item of usage) {
						helperTokens.prompt +=
							item.uncachedInputTokens + item.cacheReadTokens + item.cacheWriteTokens;
						helperTokens.completion += item.outputTokens;
					}
					// The claim is deduplicated by this ID, so each report needs its own.
					const dedupeId = `${runId}:eval:${helperReports++}`;
					const items = usage.map(
						(item): BuilderUsageItem => ({
							type: 'llmTokens',
							model: item.model,
							uncachedInput: item.uncachedInputTokens,
							cacheRead: item.cacheReadTokens,
							cacheWrite: item.cacheWriteTokens,
							output: item.outputTokens,
						}),
					);
					const claim = (async () => {
						try {
							return await this.credits.claimRunUsage(
								user,
								threadId,
								dedupeId,
								items,
								'completed',
								'self_healing',
							);
						} catch (error) {
							this.logger.warn('Could not claim agent improvement helper usage.', {
								runId,
								error: getErrorMessage(error),
							});
							return undefined;
						}
					})();
					helperClaims.push(claim);
					await claim;
				},
			};

			tracing = await createInstanceAiTraceContext({
				threadId,
				runId,
				messageId,
				messageGroupId: options.messageGroupId,
				userId: user.id,
				modelId,
				input: { message },
				metadata: {
					...metadata,
					self_healing: true,
					self_healing_agent_id: agentId,
					self_healing_project_id: projectId,
				},
				proxyConfig: proxy.tracingProxyConfig,
				n8nVersion: getN8nVersion(),
				workflowSdkVersion: WORKFLOW_SDK_VERSION,
			});
			if (tracing) {
				options.tracing.registerTraceContext(runId, threadId, tracing, options.messageGroupId);
			}
			context.tracing = tracing;

			signal.throwIfAborted();
			// The five host tools do all required work, so a missing sandbox does not stop the run.
			const entry = await options.sandbox.getOrCreateWorkspace(threadId, user, context);
			if (entry) {
				hasWorkspace = true;
				const root = await getWorkspaceRoot(entry.workspace);
				context.workspace = createScopedWorkspace(entry.workspace, root);
			}

			signal.throwIfAborted();
			stream = await this.runAgent({
				state,
				options,
				context,
				modelId,
				metadata,
				message,
				onStreamStart: () => {
					providerStream = true;
				},
			});
			result.status = stream.status;
			result.finishReason = stream.finishReason;
			runError = stream.error;
			result.usage.turns = stream.stepCount ?? null;
			if (stream.status === 'suspended') {
				// The run has no user, so nobody can resume it.
				reason = 'unexpected_suspension';
			} else {
				const output = agentImprovementOutputSchema.safeParse(stream.structuredOutput);
				if (output.success) result.output = output.data;
				else validationError = output.error.message;
			}
		} catch (error) {
			result.status = signal.aborted ? 'cancelled' : 'errored';
			runError = error;
			reason = sanitizeErrorDetail(getErrorMessage(error), 1000);
		} finally {
			// Model work has stopped. The final charge must not cancel result persistence.
			options.onFinalizing();
			result.lastTested = state?.lastTested ?? null;
			result.usage.durationSeconds = (Date.now() - startedAt) / 1000;

			if ('promptTokens' in result.usage) {
				// Helper tokens count when the agent stream reported no usage.
				const total = (value: number | undefined, helper: number) =>
					value === undefined && helper === 0 ? null : (value ?? 0) + helper;
				const used = stream?.usage;
				result.usage.promptTokens = total(used?.promptTokens, helperTokens.prompt);
				result.usage.completionTokens = total(used?.completionTokens, helperTokens.completion);
				result.usage.totalTokens = total(
					used?.totalTokens,
					helperTokens.prompt + helperTokens.completion,
				);
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
				// Helper claims never reject, so this waits for every helper claim of the run.
				const helperCredits = (await Promise.all(helperClaims)).reduce<number>(
					(sum, claimed) => sum + (claimed ?? 0),
					0,
				);
				if ('credits' in result.usage) {
					// A failed run claim keeps `null`, so a partial total never looks complete.
					result.usage.credits = credits === undefined ? null : credits + helperCredits;
				}
			} catch (error) {
				this.logger.warn('Could not claim agent improvement usage.', {
					runId,
					error: getErrorMessage(error),
				});
			}
			if (signal.aborted || result.status === 'cancelled') {
				reason = this.markResultCancelled(result, options.getAbortReason());
			}
		}

		if (result.status === 'errored' && runError !== undefined) {
			this.errorReporter.report(runError, {
				component: 'instance-ai-self-healing',
				role: 'agent-improvement',
				threadId,
				runId,
				userId: user.id,
				projectId,
				tracing,
				providerStream,
			});
		}

		try {
			await options.onComplete(result, signal);
		} catch (error) {
			if (signal.aborted && result.status !== 'cancelled') {
				reason = this.markResultCancelled(result, options.getAbortReason());
			}
			throw error;
		} finally {
			// A successful completion has committed. A later abort cannot undo that result.
			await this.finish({
				result,
				reason: reason ?? result.finishReason,
				validationError,
				stream,
				tracing,
				modelId,
				options,
			});
			if (hasWorkspace) {
				await options.sandbox
					.destroySandbox(threadId, 'thread_cleanup', user.id)
					.catch((error: unknown) => {
						this.logger.warn('Could not clear the agent improvement workspace.', {
							runId,
							error: getErrorMessage(error),
						});
					});
			}
		}
		return result;
	}

	private markResultCancelled(result: AgentImprovementRunResult, reason: string): string {
		result.status = 'cancelled';
		result.output = null;
		delete result.finishReason;
		return reason;
	}

	private buildMessage({
		base,
		agentId,
		goals,
		traceWindow,
		traceCount,
	}: AgentImprovementRunInput) {
		const start = traceWindow.after ? traceWindow.after.toISOString() : 'no lower limit';
		return (
			`${INVESTIGATION_MESSAGE}\n\nAgent: ${JSON.stringify(base.agentName)} (${agentId})\n` +
			`${goalsLine(goals)}\n` +
			`Production session window: start ${start}, end ${traceWindow.until.toISOString()}, ` +
			`${traceCount} ${traceCount === 1 ? 'session' : 'sessions'}`
		);
	}

	private async prepareEnvironment(
		input: AgentImprovementRunInput,
		options: AgentImprovementRunOptions,
	) {
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
		const utilityModelId = await this.models.resolveUtilityModelConfig(user, modelId, {
			proxyBaseUrl: proxy.proxyBaseUrl,
			tokenManager: proxy.tokenManager,
			proxyContext,
		});

		// The sandbox setup reads the context. The agent itself gets host tools only.
		const context = this.adapter.createContext(user, {
			threadId,
			projectId: input.projectId,
			searchProxyConfig: proxy.searchProxyConfig,
			modelId,
			utilityModelId,
			modelFetch: this.models.getModelFetch(),
		});
		context.runId = runId;
		context.threadId = threadId;
		context.threadMemory = this.memory;

		return { context, modelId, utilityModelId, proxy };
	}

	private async runAgent({
		state,
		options,
		context,
		modelId,
		metadata,
		message,
		onStreamStart,
	}: {
		state: RunState;
		options: AgentImprovementRunOptions;
		context: InstanceAiContext;
		modelId: ModelConfig;
		metadata: AgentImprovementThreadMetadata;
		message: string;
		onStreamStart: () => void;
	}): Promise<StreamRunResult> {
		const { runId, threadId, signal } = options;
		const { tracing } = context;
		const resourceId = getSelfHealingResourceId(state.input.user.id);

		const agent = await createAgentImprovementAgent({
			modelId,
			context,
			tools: this.bindTools(state),
			thinkingEnabled: this.config.instanceAi.thinkingEnabled,
			modelFetch: this.models.getLabeledModelFetch({ runId, threadId }),
			requestLabels: this.config.instanceAi.modelRequestLabels,
			abortSignal: signal,
		});

		signal.throwIfAborted();
		const consume = async () => {
			onStreamStart();
			return await streamAgentRun(
				agent,
				message,
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

	private bindTools(state: RunState): AgentImprovementHostTools {
		const { input } = state;
		const { base } = input;
		return {
			getAgentDefinition: async () => ({
				goals: input.goals,
				agentName: base.agentName,
				model: base.model,
				instructions: base.instructions,
				tools: base.tools,
				skills: base.skills,
				subAgents: base.subAgents,
			}),
			listEvalCases: async () => ({ cases: await this.listSuiteCases(state) }),
			listProductionSessions: async (toolInput) => await this.listSessions(state, toolInput),
			readProductionSession: async (toolInput) => await this.readSession(state, toolInput),
			testProposal: async (toolInput) => await this.testProposal(state, toolInput),
		};
	}

	/**
	 * The agent-evals module imports Instance AI, so a static import from here
	 * makes an import cycle. The module can also be inactive.
	 */
	private async getEvalProposals() {
		if (
			!this.moduleRegistry.isActive('agent-evals') ||
			!this.moduleRegistry.isActive('data-table') ||
			!isAgentsAccessEnabled(this.moduleRegistry)
		) {
			return null;
		}
		const { AgentEvalProposalService } = await import(
			'@/modules/agent-evals/agent-eval-proposal.service.js'
		);
		return Container.get(AgentEvalProposalService);
	}

	/** One read for each run: `test_proposal` checks case IDs against the list that the model saw. */
	private async listSuiteCases(state: RunState): Promise<AgentEvalSuiteCase[]> {
		const { user, projectId, agentId } = state.input;
		state.suiteCases ??= (async () => {
			const proposals = await this.getEvalProposals();
			return proposals ? await proposals.listCases(user, projectId, agentId) : [];
		})();
		try {
			return await state.suiteCases;
		} catch (error) {
			// A failed read is not kept, so the next call reads again.
			state.suiteCases = undefined;
			throw error;
		}
	}

	private async listSessions(
		state: RunState,
		{ limit, offset }: AgentImprovementListSessionsInput,
	) {
		const { user, projectId, agentId, traceWindow, traceCount } = state.input;
		const sessions = await Container.get(AgentContextService).listProductionTraces(
			user,
			projectId,
			agentId,
			traceWindow,
			{ limit, offset },
		);
		return { total: traceCount, sessions };
	}

	/** Returns the full conversation of the session, also the turns from before the window. */
	private async readSession(state: RunState, { sessionId }: AgentImprovementReadSessionInput) {
		const { user, projectId, agentId, traceWindow } = state.input;
		const trace = await Container.get(AgentContextService).readProductionTrace(
			user,
			projectId,
			agentId,
			sessionId,
			traceWindow,
		);
		if (!trace) return { error: 'This session has no production activity in the window.' };

		const { session, ...summary } = trace;
		const page = formatAgentSessionTranscriptPage(session.thread, session.executions);
		if (!page.ok) return { error: 'The session could not be read.' };
		return { ...summary, transcript: page.transcript, truncated: page.nextCursor !== null };
	}

	private async testProposal(
		state: RunState,
		toolInput: AgentImprovementTestProposalInput,
	): Promise<TestProposalResult> {
		const { input, signal } = state;
		const { user, projectId, agentId, base } = input;

		const proposals = await this.getEvalProposals();
		if (proposals?.availability() !== 'ok') return { ok: false, errors: [TESTING_UNAVAILABLE] };

		const suiteCases = new Map(
			(await this.listSuiteCases(state)).map((suiteCase) => [suiteCase.caseId, suiteCase]),
		);
		const errors = this.validateProposal(toolInput, base, suiteCases);
		if (errors.length > 0) return { ok: false, errors };

		let edits: AgentProposalEdit[] = [];
		if (toolInput.edits.length > 0) {
			const normalized = await Container.get(AgentProposalService).normalizeEdits(
				user,
				projectId,
				agentId,
				base.versionId,
				toolInput.edits,
			);
			if ('errors' in normalized) return { ok: false, errors: normalized.errors };
			edits = normalized.edits;
		}

		const cases: Parameters<typeof proposals.compare>[1]['cases'] = [];
		const evalCases: AgentProposalEvalCase[] = [];
		toolInput.evalCases.forEach((evalCase, index) => {
			const suiteCase = evalCase.caseId === undefined ? undefined : suiteCases.get(evalCase.caseId);
			const caseKey = suiteCase?.caseId ?? `new:${index}`;
			const content = {
				input: evalCase.input,
				criteria: evalCase.criteria,
				expectedTools: evalCase.expectedTools,
			};
			evalCases.push({
				...content,
				caseKey,
				change: suiteCase ? 'updated' : 'added',
				caseId: suiteCase?.caseId ?? null,
				before: suiteCase
					? {
							input: suiteCase.input,
							criteria: suiteCase.criteria,
							expectedTools: suiteCase.expectedTools,
						}
					: null,
				motivating: evalCase.motivating,
			});
			cases.push({
				...content,
				caseKey,
				origin: 'proposal',
				motivating: evalCase.motivating,
				// An update keeps the gold answer of the suite row.
				expectedOutput: suiteCase?.expectedOutput ?? null,
			});
		});
		for (const caseId of toolInput.regressionCaseIds) {
			const suiteCase = suiteCases.get(caseId);
			if (!suiteCase) continue;
			cases.push({
				caseKey: caseId,
				origin: 'suite',
				motivating: false,
				input: suiteCase.input,
				criteria: suiteCase.criteria,
				expectedOutput: suiteCase.expectedOutput,
				expectedTools: suiteCase.expectedTools,
			});
		}

		let evidence: AgentProposalEvidence;
		try {
			evidence = await proposals.compare(user, {
				projectId,
				agentId,
				baseVersionId: base.versionId,
				edits,
				cases,
				helperModel: state.helperModel,
				onHelperUsage: state.onHelperUsage,
				abortSignal: signal,
			});
		} catch (error) {
			return { ok: false, errors: [sanitizeErrorDetail(getErrorMessage(error), 1000)] };
		}
		// A stopped comparison returns error arms. It must not become the proposal.
		signal.throwIfAborted();

		state.lastTested = { edits, evalCases, evidence };
		return {
			ok: true,
			cases: evidence.cases.map((result) => ({
				caseKey: result.caseKey,
				origin: result.origin,
				motivating: result.motivating,
				published: toArmOutcome(result.published),
				proposed: result.proposed ? toArmOutcome(result.proposed) : null,
			})),
		};
	}

	private validateProposal(
		toolInput: AgentImprovementTestProposalInput,
		base: AgentProposalBase,
		suiteCases: Map<string, AgentEvalSuiteCase>,
	): string[] {
		const errors: string[] = [];
		const caseIds = [
			...toolInput.evalCases.flatMap(({ caseId }) => (caseId === undefined ? [] : [caseId])),
			...toolInput.regressionCaseIds,
		];
		const seen = new Set<string>();
		for (const caseId of caseIds) {
			if (!suiteCases.has(caseId)) {
				errors.push(`Case "${caseId}" is not in the result of list_eval_cases.`);
			} else if (seen.has(caseId)) {
				errors.push(
					`Case "${caseId}" is given more than once. Put a case in evalCases or in regressionCaseIds, not in both.`,
				);
			}
			seen.add(caseId);
		}

		// An MCP tool cannot be an expected tool.
		const toolNames = new Set(
			base.tools.filter((tool) => tool.type !== 'mcp').map((tool) => tool.name),
		);
		for (const evalCase of toolInput.evalCases) {
			for (const expected of evalCase.expectedTools) {
				const name = expected.startsWith('!') ? expected.slice(1) : expected;
				if (!toolNames.has(name)) {
					errors.push(
						`Expected tool "${name}" is not the name of a node, workflow or custom tool in the result of get_agent_definition.`,
					);
				}
			}
		}
		return [...new Set(errors)];
	}

	private async finish({
		result,
		reason,
		validationError,
		stream,
		tracing,
		modelId,
		options,
	}: {
		result: AgentImprovementRunResult;
		reason: string | undefined;
		validationError: string | undefined;
		stream: StreamRunResult | undefined;
		tracing: InstanceAiTraceContext | undefined;
		modelId: ModelConfig | undefined;
		options: AgentImprovementRunOptions;
	}): Promise<void> {
		try {
			options.onFinish({ status: result.status, reason }, modelId, stream);
		} catch (error) {
			this.logger.warn('Could not report agent improvement completion.', {
				runId: options.runId,
				error: getErrorMessage(error),
			});
		}

		const finalization = {
			status:
				result.status === 'errored' || result.status === 'suspended' ? 'error' : result.status,
			reason,
			modelId,
			outputs: { output: result.output ?? undefined, validationError },
		} satisfies Parameters<InstanceAiTracingService['finalizeRunTracing']>[2];

		await options.tracing.finalizeRunTracing(options.runId, tracing, finalization);

		if (tracing) {
			await options.tracing.finalizeMessageTraceRoot(options.runId, tracing, finalization);
		}
	}
}
