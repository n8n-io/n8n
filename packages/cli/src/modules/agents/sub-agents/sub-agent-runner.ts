import {
	assertSubAgentTaskPath,
	deriveSubAgentTelemetry,
	renderDelegateSubAgentPrompt,
	type AgentExecutionCounter,
	type AgentMessage,
	type BuiltAgent,
	type BuiltTelemetry,
	type CredentialProvider,
	type DelegateSubAgentCancelRequest,
	type DelegateSubAgentResumeRequest,
	type GenerateResult,
	type JSONValue,
	type SerializableAgentState,
	type StreamChunk,
	type StreamResult,
	type SubAgentTaskDifficulty,
	type SubAgentTaskPath,
} from '@n8n/agents';
import type {
	ResolvedSubAgentSource,
	RunnableAgentJsonConfig,
	SubAgentSource,
	SubAgentSpawnRequest,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { AgentRunTelemetryType } from '@/interfaces';

import type { StartExecutionParams } from '../agent-execution.service';
import { withLeaseSignal } from '../agent-session-lease.service';
import { AgentTurnExecutionService } from '../agent-turn-execution.service';
import type { AgentRuntimeInstrumentation } from '../agent-runtime-instrumentation';
import {
	decodeAgentSandboxHostMetadata,
	encodeAgentSandboxHostMetadata,
	isAgentSandboxPrincipalHash,
	type AgentSandboxPrincipalHash,
} from '../agent-sandbox-principal';
import type { AgentSandboxRuntime } from '../agent-sandbox-runtime.service';
import { buildAgentConfigurationTelemetryFromConfig } from '../agent-telemetry';
import type { ExecutionRecorder, MessageRecord } from '../execution-recorder';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { buildProviderToolsForModel } from '../json-config/from-json-config';
import { modelStreamStallOptions } from '../model-stream-stall-options';
import type { WorkflowToolExecutionMode } from '../tools/workflow-tool-factory';
import { streamAgentChunks } from '../utils/agent-stream';
import { createAttributionTracker } from '../utils/mcp-attribution';
import { SubAgentSourceResolver } from './sub-agent-source-resolver';

export interface SubAgentRunContext {
	projectId: string;
	/** Saved n8n agent id of the delegating parent agent, used to link the child session back. */
	parentAgentId: string;
	credentialProvider: CredentialProvider;
	/**
	 * Telemetry classification inherited from the delegating parent run.
	 */
	runType: AgentRunTelemetryType;
	/** Workflow execution classification inherited from the parent runtime. */
	workflowToolExecutionMode?: WorkflowToolExecutionMode;
	executionCounter?: AgentExecutionCounter;
	/** Parent run's abort signal — cancelling the parent cancels this child. */
	abortSignal?: AbortSignal;
	/**
	 * Parent's live, resolved telemetry, forwarded per-request. Derived (via
	 * `deriveSubAgentTelemetry`) into the child's own telemetry so it shares the
	 * parent's tracer and nests under the parent's delegate-tool-call span.
	 */
	telemetry?: BuiltTelemetry;
	/**
	 * Interactive n8n user of the delegating parent run; used to filter the
	 * sub-agent's node/workflow tools by their access. Absent when the parent
	 * is a published/integration run.
	 */
	user?: User;
	/**
	 * Runtime instrumentation of the delegating parent run. Threaded into the
	 * child's reconstruction so delegated runs share the parent's seams
	 * (model fetch, MCP fetch, tool execution contexts).
	 */
	instrumentation?: AgentRuntimeInstrumentation;
	/**
	 * Parent run's live workspace sandbox handle. Delegated runs scope into a
	 * per-delegation subdirectory of it instead of acquiring their own sandbox.
	 */
	parentWorkspaceHandle?: AgentSandboxRuntime;
	/** Optional callback to forward child stream chunks to the parent chat. */
	onChunk?: (chunk: StreamChunk) => void;
	/** Difficulty-selected model override for parent self-delegation only. */
	selfDelegationDifficulty?: SubAgentTaskDifficulty;
}

export interface SubAgentRunResult {
	taskPath: SubAgentTaskPath;
	/** The child run's memory/session thread id, so callers can link or continue it. */
	threadId: string;
	status: 'completed' | 'failed' | 'suspended';
	result: GenerateResult;
	/** Opaque, checkpoint-safe host context required to reconstruct this child exactly. */
	resumeContext?: JSONValue;
}

type ForegroundOperation = {
	taskPath: SubAgentTaskPath;
} & (
	| { type: 'run'; request: SubAgentSpawnRequest }
	| {
			type: 'resume';
			request: DelegateSubAgentResumeRequest;
			source: SubAgentSource;
			threadId: string;
	  }
);

@Service()
export class SubAgentRunner {
	constructor(
		private readonly sourceResolver: SubAgentSourceResolver,
		private readonly turnExecutionService: AgentTurnExecutionService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly logger: Logger,
		private readonly aiConfig: AiConfig,
	) {}

	async run(
		request: SubAgentSpawnRequest,
		context: SubAgentRunContext,
	): Promise<SubAgentRunResult> {
		// The SDK delegate tool already assigned this delegation's task path and
		// enforced the depth/fan-out policy before invoking the runner. Just
		// validate the forwarded shape — don't recompute it or re-run the gates.
		const taskPath = request.taskPath;
		assertSubAgentTaskPath(taskPath);
		return await this.executeForeground({ type: 'run', request, taskPath }, context);
	}

	async resumeForeground(
		request: DelegateSubAgentResumeRequest,
		context: SubAgentRunContext,
		expectedSourceAgentId = request.subAgentId,
	): Promise<SubAgentRunResult> {
		assertSubAgentTaskPath(request.taskPath);
		if (request.childThreadId === undefined || request.resumeContext === undefined) {
			throw new UserError('Configured sub-agent checkpoint metadata is missing or invalid');
		}
		const pinnedSource = parseResumeContext(request.resumeContext, expectedSourceAgentId);
		return await this.executeForeground(
			{
				type: 'resume',
				request,
				taskPath: request.taskPath,
				source: pinnedSource,
				threadId: request.childThreadId,
			},
			context,
		);
	}

	async cancelForeground(
		request: DelegateSubAgentCancelRequest,
		expectedSourceAgentId = request.subAgentId,
	): Promise<void> {
		assertSubAgentTaskPath(request.taskPath);
		if (request.resumeContext === undefined) {
			throw new UserError('Configured sub-agent checkpoint metadata is missing or invalid');
		}
		const pinnedSource = parseResumeContext(request.resumeContext, expectedSourceAgentId);
		await this.checkpointStorage.delete(request.childRunId, pinnedSource.agentId);
	}

	private async executeForeground(
		operation: ForegroundOperation,
		context: SubAgentRunContext,
	): Promise<SubAgentRunResult> {
		// Same versioning model as sub-workflows and "Message an Agent": test runs
		// resolve the child's current draft, production runs its published version.
		// A resume carries the pinned versionId it started with, which wins either way.
		const runtimeSource = await this.sourceResolver.resolveForRuntime(
			operation.type === 'run' ? operation.request.source : operation.source,
			{ projectId: context.projectId, usePublishedVersion: context.runType === 'production' },
		);

		// A delegated run uses the same fresh id for SDK memory and its session
		// record. A background dispatcher supplies the id itself so the job row
		// can reference the child before the run starts.
		const threadId =
			operation.type === 'run' ? (operation.request.childThreadId ?? uuid()) : operation.threadId;
		const resourceId =
			operation.type === 'run' ? (operation.request.parentResourceId ?? threadId) : threadId;
		const sandboxPrincipalHash = await this.resolveSandboxPrincipalHash(
			operation,
			runtimeSource.source.sourceId,
			context.projectId,
		);
		const reconstructionService = await getReconstructionService();
		const resolvedConfig = applyDifficultyModelOverride(
			runtimeSource.source.config,
			context.selfDelegationDifficulty,
		);
		const childConfig =
			context.instrumentation?.transformDelegatedAgentConfig?.(resolvedConfig, {
				subAgentId: runtimeSource.source.sourceId,
			}) ?? resolvedConfig;
		const telemetry = deriveSubAgentTelemetry(context.telemetry);
		const userMessage =
			operation.type === 'run' ? renderDelegateSubAgentPrompt(operation.request) : null;
		const recording: StartExecutionParams = {
			// Saved parents supply access in the thread creation transaction.
			access: { accessScope: 'user', ownerId: null },
			threadId,
			agentId: runtimeSource.source.sourceId,
			agentName: runtimeSource.source.config.name,
			projectId: context.projectId,
			userMessage,
			sessionMode: operation.type === 'resume' ? 'existing' : 'new',
			source: 'subagent',
			threadMetadata: {
				parentThreadId: operation.request.parentThreadId,
				parentAgentId: context.parentAgentId,
			},
			telemetry: {
				userId: context.user?.id,
				runType: context.runType,
				configuration: buildAgentConfigurationTelemetryFromConfig(runtimeSource.source.config),
			},
		};
		const recorder = this.turnExecutionService.createRecorder(
			undefined,
			() => executionId,
			recording,
		);
		context.abortSignal?.throwIfAborted();
		const { executionId, leaseSignal } = await this.turnExecutionService.startExecution(
			recording,
			recorder.startedAt,
		);
		const abortSignal = withLeaseSignal(context.abortSignal, leaseSignal);
		let executionStarted = false;
		let executionError: unknown;
		let agent: BuiltAgent | undefined;
		try {
			abortSignal?.throwIfAborted();
			const reconstructed = await reconstructionService.reconstructFromResolvedSource({
				config: childConfig,
				memoryOwnerAgentId: runtimeSource.source.sourceId,
				projectId: context.projectId,
				credentialProvider: context.credentialProvider,
				toolDescriptors: runtimeSource.toolDescriptors,
				toolCodeByName: runtimeSource.toolCodeByName,
				skills: runtimeSource.skills,
				runtimeProfile: 'sub-agent',
				runType: context.runType,
				workflowToolExecutionMode: context.workflowToolExecutionMode,
				parentAgentIdForDelegation: context.parentAgentId,
				user: context.user,
				instrumentation: context.instrumentation,
				...(sandboxPrincipalHash !== undefined ? { sandboxPrincipalHash } : {}),
				...(context.parentWorkspaceHandle !== undefined
					? {
							parentWorkspace: {
								handle: context.parentWorkspaceHandle,
								delegationThreadId: threadId,
							},
						}
					: {}),
			});

			agent = reconstructed.agent;
			abortSignal?.throwIfAborted();
			const executionOptions = {
				...(abortSignal !== undefined ? { abortSignal } : {}),
				...(telemetry !== undefined ? { telemetry } : {}),
				...modelStreamStallOptions(this.aiConfig),
				executionCounter: context.executionCounter,
			};
			executionStarted = operation.type === 'run';
			const resultStream =
				operation.type === 'run'
					? await agent.stream(userMessage ?? '', {
							...executionOptions,
							persistence: {
								resourceId,
								threadId,
								delegated: true,
								...(sandboxPrincipalHash !== undefined
									? {
											hostMetadata: encodeAgentSandboxHostMetadata({
												projectId: context.projectId,
												principalHash: sandboxPrincipalHash,
											}),
										}
									: {}),
							},
						})
					: await agent.resume('stream', operation.request.resumeData, {
							...executionOptions,
							runId: operation.request.childRunId,
							toolCallId: operation.request.childToolCallId,
							onResumeClaimed: () => {
								executionStarted = true;
								recorder.recordHitlResponse(
									operation.request.childToolCallId,
									operation.request.resumeData,
								);
							},
						});
			const consumed = await consumeAgentStream(
				resultStream,
				recorder,
				createAttributionTracker(reconstructed.mcpServerAttributions),
				context.onChunk,
			);
			executionError = consumed.executionError;
			const { result } = consumed;
			const suspended = recorder.suspended;

			return {
				taskPath: operation.taskPath,
				threadId,
				status: suspended
					? 'suspended'
					: result.finishReason === 'error' || result.error !== undefined
						? 'failed'
						: 'completed',
				result,
				...(suspended ? { resumeContext: createResumeContext(runtimeSource.source) } : {}),
			};
		} catch (error) {
			executionError = error;
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			try {
				const record = recorder.getMessageRecord();
				await this.turnExecutionService.finalizeExecution({
					executionId,
					executionStarted,
					executionError,
					params: {
						...recording,
						record: abortSignal?.aborted
							? { ...record, finishReason: 'cancelled', error: null }
							: record,
						hitlStatus: recorder.suspended
							? 'suspended'
							: operation.type === 'resume' && executionStarted
								? 'resumed'
								: undefined,
					},
				});
			} finally {
				await agent?.close().catch((error) => {
					this.logger.warn(`Failed to close subagent after ${operation.type}`, {
						taskPath: operation.taskPath,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			}
		}
	}

	private async resolveSandboxPrincipalHash(
		operation: ForegroundOperation,
		childAgentId: string,
		projectId: string,
	): Promise<AgentSandboxPrincipalHash | undefined> {
		if (operation.type === 'run') {
			const value = operation.request.parentSandboxPrincipalHash;
			if (value === undefined) return undefined;
			if (!isAgentSandboxPrincipalHash(value)) {
				throw new UserError('Configured sub-agent workspace scope is invalid');
			}
			return value;
		}

		const checkpoint = await this.checkpointStorage.load(
			operation.request.childRunId,
			childAgentId,
		);
		const scope = decodeAgentSandboxHostMetadata(checkpoint?.persistence?.hostMetadata);
		if (!scope) return undefined;
		if (scope.projectId !== projectId) {
			throw new UserError('Configured sub-agent workspace scope is invalid');
		}
		return scope.principalHash;
	}
}

/**
 * Lazy resolution avoids a circular DI dependency: AgentRuntimeReconstructionService
 * injects SubAgentRunner into the delegate tool, while this runner needs
 * reconstruction only when a configured sub-agent run starts.
 */
async function getReconstructionService() {
	// eslint-disable-next-line import-x/no-cycle
	const { AgentRuntimeReconstructionService } = await import(
		'../agent-runtime-reconstruction.service.js'
	);
	return Container.get(AgentRuntimeReconstructionService);
}

async function consumeAgentStream(
	resultStream: StreamResult,
	recorder: ExecutionRecorder,
	attributionTracker: ReturnType<typeof createAttributionTracker>,
	onChunk?: (chunk: StreamChunk) => void,
): Promise<{ result: GenerateResult; executionError: unknown }> {
	const pendingSuspend: NonNullable<GenerateResult['pendingSuspend']> = [];
	let structuredOutput: unknown;
	let executionError: unknown;

	for await (const value of streamAgentChunks(resultStream.stream)) {
		recorder.record(value);
		if (value.type === 'error') executionError = value.error;
		// Recorded before the record is read, so the label reaches the child's
		// timeline, the parent's live stream, and the answer the parent model sees.
		for (const attributionChunk of attributionTracker.observe(value)) {
			recorder.record(attributionChunk);
			onChunk?.(attributionChunk);
		}
		onChunk?.(value);
		if (value.type === 'tool-call-suspended') {
			pendingSuspend.push({
				runId: value.runId,
				toolCallId: value.toolCallId,
				toolName: value.toolName,
				input: value.input,
				suspendPayload: value.suspendPayload,
				...(value.resumeSchema !== undefined ? { resumeSchema: value.resumeSchema } : {}),
			});
		}
		if (value.type === 'finish' && value.structuredOutput !== undefined) {
			structuredOutput = value.structuredOutput;
		}
	}

	const messageRecord = recorder.getMessageRecord();
	return {
		executionError,
		result: buildGenerateResultFromRecord(
			resultStream.runId,
			messageRecord,
			structuredOutput,
			() => resultStream.getState(),
			pendingSuspend,
		),
	};
}

function createResumeContext(runtimeSource: ResolvedSubAgentSource): JSONValue {
	return {
		agentId: runtimeSource.sourceId,
		...(runtimeSource.versionId !== undefined ? { versionId: runtimeSource.versionId } : {}),
	};
}

function applyDifficultyModelOverride(
	config: RunnableAgentJsonConfig,
	difficulty?: SubAgentTaskDifficulty,
): RunnableAgentJsonConfig {
	const modelConfig = difficulty ? config.subAgents?.modelsByDifficulty?.[difficulty] : undefined;
	if (!modelConfig) return config;

	const providerTools = Object.fromEntries(
		buildProviderToolsForModel(config, modelConfig.model).map(({ name, args }) => [name, args]),
	);
	return {
		...config,
		model: modelConfig.model,
		credential: modelConfig.credential,
		providerTools,
	};
}

function parseResumeContext(
	resumeContext: JSONValue,
	expectedSourceAgentId: string,
): SubAgentSource {
	if (
		!isRecord(resumeContext) ||
		typeof resumeContext.agentId !== 'string' ||
		resumeContext.agentId.length === 0 ||
		resumeContext.agentId !== expectedSourceAgentId
	) {
		throw new UserError('Configured sub-agent resume context is missing or invalid');
	}
	const versionId = resumeContext.versionId;
	if (versionId !== undefined && (typeof versionId !== 'string' || versionId.length === 0)) {
		throw new UserError('Configured sub-agent resume context is missing or invalid');
	}
	return {
		agentId: resumeContext.agentId,
		...(versionId !== undefined ? { versionId } : {}),
	};
}

function buildGenerateResultFromRecord(
	runId: string,
	record: MessageRecord,
	structuredOutput: unknown,
	getState: () => SerializableAgentState,
	pendingSuspend: NonNullable<GenerateResult['pendingSuspend']> = [],
): GenerateResult {
	const messages = createAssistantMessages(record.assistantResponse);
	const finishReason = toKnownFinishReason(record.finishReason);
	const result: GenerateResult = {
		runId,
		messages,
		...(record.model !== null ? { model: record.model } : {}),
		...(finishReason !== undefined ? { finishReason } : {}),
		...(record.usage !== null
			? {
					usage: {
						...record.usage,
						...(record.totalCost !== null ? { cost: record.totalCost } : {}),
					},
				}
			: {}),
		...(structuredOutput !== undefined ? { structuredOutput } : {}),
		...(record.error !== null ? { error: record.error } : {}),
		...(pendingSuspend.length > 0 ? { pendingSuspend } : {}),
		getState,
	};
	return result;
}

function createAssistantMessages(text: string): AgentMessage[] {
	if (!text.trim()) return [];

	return [
		{
			role: 'assistant',
			content: [{ type: 'text', text }],
		},
	];
}

function toKnownFinishReason(
	value: string,
): NonNullable<GenerateResult['finishReason']> | undefined {
	if (
		value === 'stop' ||
		value === 'length' ||
		value === 'content-filter' ||
		value === 'tool-calls' ||
		value === 'error' ||
		value === 'other' ||
		value === 'max-iterations'
	) {
		return value;
	}
	return undefined;
}
