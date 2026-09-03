import {
	INLINE_SUB_AGENT_ID,
	parseDelegateSubAgentContinuation,
	type Agent as RuntimeAgent,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import {
	AgentExecutionService,
	type RecordMessageParams,
	type StartExecutionParams,
} from './agent-execution.service';
import { AgentRunTracingService, modelIdFromSnapshot } from './agent-run-tracing.service';
import {
	AgentRuntimeCacheService,
	type AgentRuntime,
	type GetRuntimeParams,
} from './agent-runtime-cache.service';
import {
	decodeAgentSandboxHostMetadata,
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
	type AgentSandboxPrincipalHash,
} from './agent-sandbox-principal';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { buildToolCallDetails, ExecutionRecorder, type MessageRecord } from './execution-recorder';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import type { StoredAttachmentRef } from './agent-chat-attachment.service';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { buildInboundUserMessage } from './utils/inbound-attachments';
import { streamAgentChunks } from './utils/agent-stream';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';

export interface AgentMemoryScope {
	threadId: string;
	resourceId: string;
}

export interface ExecuteForChatConfig {
	agentId: string;
	projectId: string;
	message: string;
	/**
	 * The calling n8n user — used to gate node/workflow tools by their access,
	 * and for RBAC / credential resolution and telemetry attribution. Always
	 * present: the in-app test chat only runs behind an authenticated session
	 * (`AgentChatController.chat` always has `req.user`).
	 */
	user: User;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
	/** Stored attachments to include as file parts on the user turn. */
	attachments?: StoredAttachmentRef[];
	/** Identifies the surface that started the draft test run. */
	source?: string;
	/** Fired after the turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

export interface ExecuteForChatPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
	attachments?: StoredAttachmentRef[];
	integrationType?: string;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	// No `user` field here: a published chat integration (Slack, Telegram, …)
	// run is triggered by an inbound platform event, not an interactive n8n
	// session — there is no n8n `User` to attach. The admin who published the
	// agent is the one who approved its
	// tools, and Layer A's node denylist (`EphemeralNodeExecutor`) still
	// applies regardless.
}

export interface ResumeForChatConfig {
	agentId: string;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
	/** Expected memory scope used to prevent resuming another user's or thread's checkpoint. */
	expectedMemory?: Partial<AgentMemoryScope>;
	/** Identifies the surface that resumed the execution. */
	source?: string;
	/**
	 * The calling n8n user for in-app preview chat resumes — used to gate
	 * node/workflow tools by their access. Absent for published/integration
	 * resumes, which keep today's project-scoped behavior.
	 */
	user?: User;
	/** Defaults to true for external integrations; preview chat passes false. */
	usePublishedVersion?: boolean;
	/**
	 * Required when the suspended turn invoked a platform-injected tool
	 * (e.g. an integration action). Without it, `getRuntime` rebuilds the agent
	 * with only its configured tools, and `runtime.resume` throws because the
	 * persisted tool call references a tool the rebuilt runtime doesn't know.
	 */
	integrationType?: string;
	/** Fired after the resumed turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

export interface ExecuteForTaskPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The scheduled task this run belongs to; stamped on the session for traceability. */
	taskId: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId: string;
}

export interface ExecuteForTaskNowConfig {
	agentId: string;
	projectId: string;
	/**
	 * The calling n8n user — used to gate node/workflow tools by their
	 * access, and for RBAC / credential resolution and recorded on the
	 * session. Always present: manual "Run now" is triggered by an authenticated
	 * `AgentTasksController.runTaskNow` request, threaded down via
	 * `AgentTaskService.runNow(agentId, taskId, user)`.
	 */
	user: User;
	message: string;
	/** Memory scope — resourceId isolates per-run memory. */
	memory: AgentMemoryScope;
	/** The task this manual run belongs to; stamped on the session for traceability. */
	taskId: string;
}

export interface ExecuteForWakeConfig {
	agentId: string;
	projectId: string;
	message: string;
	memory: AgentMemoryScope;
	abortSignal: AbortSignal;
	identity:
		| { type: 'draft'; user: User; principalHash: AgentSandboxPrincipalHash }
		| {
				type: 'published';
				integrationType: string;
				principalHash: AgentSandboxPrincipalHash;
		  };
}

export interface StreamChatResponseConfig {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	userId?: string;
	message: string;
	attachments?: StoredAttachmentRef[];
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	telemetry: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
	/** Fired after the turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
	/** Add full sanitized tool configuration to approval cards in preview chat. */
	includeHitlToolDetails?: boolean;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	/** Keep an internal wake instruction out of the user-facing execution transcript. */
	hideUserMessageFromTranscript?: boolean;
	/** Prevent a wake run from scheduling another wake when it finishes. */
	isWakeRun?: boolean;
}

function withApprovalToolDetails(chunk: StreamChunk, toolRegistry: ToolRegistry): StreamChunk {
	if (chunk.type !== 'tool-call-suspended' || !isRecord(chunk.suspendPayload)) return chunk;
	if (chunk.suspendPayload.type !== 'approval') return chunk;

	const toolName = chunk.suspendPayload.toolName;
	if (typeof toolName !== 'string' || toolName.length === 0) return chunk;

	return {
		...chunk,
		suspendPayload: {
			...chunk.suspendPayload,
			details: buildToolCallDetails(toolRegistry, toolName, chunk.suspendPayload.args),
		},
	};
}

function getMaxIterationsChunks(): StreamChunk[] {
	const id = crypto.randomUUID();
	return [
		{ type: 'text-start', id },
		{
			type: 'text-delta',
			id,
			delta: 'The agent has reached the maximum number of iterations and has stopped.',
		},
		{ type: 'text-end', id },
	];
}

function normalizeAbortedMessageRecord(
	record: MessageRecord,
	abortSignal?: AbortSignal,
): MessageRecord {
	if (!abortSignal?.aborted) return record;
	return { ...record, finishReason: 'cancelled', error: null };
}

function getDelegatedChildCheckpoints(
	checkpoint: SerializableAgentState,
	parentAgentId: string,
): Array<{ runId: string; agentId: string }> {
	const childCheckpoints: Array<{ runId: string; agentId: string }> = [];
	const seen = new Set<string>();

	for (const pendingToolCall of Object.values(checkpoint.pendingToolCalls)) {
		if (!pendingToolCall.suspended) continue;
		const childCheckpoint = parseDelegateSubAgentContinuation(pendingToolCall.continuation);
		if (!childCheckpoint) continue;

		let ownerAgentId: string;
		if (childCheckpoint.resumeContext === undefined) {
			if (childCheckpoint.subAgentId !== INLINE_SUB_AGENT_ID) continue;
			ownerAgentId = parentAgentId;
		} else {
			if (
				!isRecord(childCheckpoint.resumeContext) ||
				typeof childCheckpoint.resumeContext.agentId !== 'string' ||
				childCheckpoint.resumeContext.agentId.length === 0 ||
				(childCheckpoint.resumeContext.versionId !== undefined &&
					(typeof childCheckpoint.resumeContext.versionId !== 'string' ||
						childCheckpoint.resumeContext.versionId.length === 0))
			) {
				continue;
			}
			const expectedOwnerAgentId =
				childCheckpoint.subAgentId === INLINE_SUB_AGENT_ID
					? parentAgentId
					: childCheckpoint.subAgentId;
			if (childCheckpoint.resumeContext.agentId !== expectedOwnerAgentId) continue;
			ownerAgentId = expectedOwnerAgentId;
		}

		const identity = `${ownerAgentId}\0${childCheckpoint.runId}`;
		if (seen.has(identity)) continue;
		seen.add(identity);
		childCheckpoints.push({ runId: childCheckpoint.runId, agentId: ownerAgentId });
	}

	return childCheckpoints;
}

/**
 * Executes agents for the interactive surfaces — in-app test chat, published
 * chat integrations (Slack, Telegram, …), and scheduled/manual tasks — as
 * streaming runs against cached runtimes, with HITL suspend/resume via
 * checkpoints. Workflow-invoked runs (AI Agent node, "Message an Agent")
 * live in `AgentWorkflowExecutionService`.
 */
@Service()
export class AgentExecutionOrchestratorService {
	constructor(
		private readonly logger: Logger,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly telemetry: Telemetry,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly integrationMessageContextService: IntegrationMessageContextService,
		private readonly agentRunTracingService: AgentRunTracingService,
		private readonly externalHooks: ExternalHooks,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly agentRepository: AgentRepository,
	) {}

	/**
	 * Return user-visible conversation history for a persisted chat thread.
	 *
	 * Execution records are the source of truth for the UI transcript. SDK
	 * memory is runtime context for the agent: it can be disabled, windowed, or
	 * shaped for model input rather than for user-facing history.
	 */
	async getConversationHistory(params: {
		threadId: string;
		projectId: string;
		agentId: string;
	}): Promise<AgentPersistedMessageDto[] | null> {
		const { threadId, projectId, agentId } = params;
		const detail = await this.agentExecutionService.getThreadDetail(threadId, projectId, agentId);
		if (!detail) return null;
		return executionsToMessagesDto(detail.executions);
	}

	async cancelChatRun(params: {
		agentId: string;
		runId: string;
		resourceId: string;
	}): Promise<boolean> {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(
			params.runId,
			params.agentId,
		);
		if (checkpointStatus.status === 'not-found' || checkpointStatus.checkpoint === undefined) {
			return false;
		}

		const { checkpoint } = checkpointStatus;
		if (
			checkpoint.status !== 'suspended' ||
			checkpoint.persistence?.delegated === true ||
			checkpoint.persistence?.resourceId !== params.resourceId
		) {
			return false;
		}

		const childCheckpoints = getDelegatedChildCheckpoints(checkpoint, params.agentId);
		if (checkpointStatus.status === 'active') {
			const cancelled = await this.n8nCheckpointStorage.cancelSuspended(
				params.runId,
				checkpoint,
				params.agentId,
			);
			if (!cancelled) return false;
		}

		await Promise.all(
			childCheckpoints.map(
				async ({ runId, agentId }) => await this.n8nCheckpointStorage.delete(runId, agentId),
			),
		);
		await this.n8nCheckpointStorage.delete(params.runId, params.agentId);
		return true;
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			runId,
			toolCallId,
			resumeData,
			expectedMemory,
			source,
			integrationType,
			user,
			usePublishedVersion = true,
			onExecutionRecorded,
			abortSignal,
		} = config;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId, agentId);
		if (checkpointStatus.status === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus.status === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const memoryScope = checkpointStatus.checkpoint?.persistence;
		if (!memoryScope) {
			throw new UserError(`Checkpoint ${runId} has no memory data and cannot be resumed`);
		}
		if (memoryScope.delegated === true) {
			throw new UserError('Delegated actions must be resumed through their parent agent');
		}
		if (
			(expectedMemory?.threadId !== undefined &&
				memoryScope.threadId !== expectedMemory.threadId) ||
			(expectedMemory?.resourceId !== undefined &&
				memoryScope.resourceId !== expectedMemory.resourceId)
		) {
			throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
		}
		const sandboxScope = decodeAgentSandboxHostMetadata(memoryScope.hostMetadata);
		const sandboxPrincipalHash = sandboxScope?.principalHash;
		if (
			this.agentSandboxRuntimeService.isEnabled() &&
			(!sandboxScope ||
				sandboxScope.projectId !== projectId ||
				!sandboxPrincipalHash ||
				(!usePublishedVersion &&
					(!user ||
						sandboxPrincipalHash !==
							hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id }))))
		) {
			throw new UserError(`Checkpoint ${runId} is unavailable and cannot be resumed`);
		}

		const threadId = memoryScope.threadId;

		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			usePublishedVersion,
			integrationType,
			// `usePublishedVersion` defaults to true and is what platform
			// integrations (Slack/Telegram HITL resume) use — those have no
			// interactive n8n user, so `user` is force-undefined to keep the
			// existing project-scoped runtime. Only the in-app draft/test-chat
			// resume passes `usePublishedVersion: false` (see
			// `AgentChatController.chatResume`), and only then does the caller's
			// `user` actually reach the cache/reconstruction layer.
			user: usePublishedVersion ? undefined : user,
			...(sandboxPrincipalHash ? { sandboxPrincipalHash } : {}),
		});

		const { agent: agentInstance, toolRegistry } = runtime;
		let executionId: string | undefined;
		let recorder: ExecutionRecorder;
		let startedAt: Date;
		let runType: AgentRunTelemetryType;
		let executionSource: string | undefined;
		try {
			recorder = this.createRecorder(toolRegistry, () => executionId, {
				projectId,
				agentId,
				threadId,
			});
			startedAt = recorder.startedAt;
			runType = usePublishedVersion ? 'production' : 'test';
			executionSource = source;
		} catch (error) {
			this.runtimeCacheService.releaseRuntimeLease(agentInstance);
			throw error;
		}

		try {
			// A resume request carries no `source` of its own — recover it from
			// the suspended run being resumed so tracing stays consistent across
			// the suspend/resume cycle. Skipped entirely when tracing is disabled,
			// since `build()` would discard the result anyway.
			const suspendedExecution =
				this.agentRunTracingService.enabled && source === undefined
					? await this.agentExecutionService.findLatestSuspendedRun(threadId)
					: undefined;
			executionSource ??= suspendedExecution?.source ?? undefined;

			const tracing = await this.agentRunTracingService.build({
				agentId,
				projectId,
				threadId,
				userId: user?.id,
				source: executionSource ?? 'unknown',
				modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
			});

			const resultStream = await agentInstance.resume('stream', resumeData, {
				runId,
				toolCallId,
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId,
					userId: user?.id,
					runType,
				}),
				...(tracing ? { telemetry: tracing } : {}),
				...(abortSignal ? { abortSignal } : {}),
			});
			recorder.recordHitlResponse(toolCallId, resumeData);
			const startParams: StartExecutionParams = {
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: null,
				...(executionSource !== undefined ? { source: executionSource } : {}),
				telemetry: {
					runType,
					configuration: runtime.telemetryConfiguration,
				},
			};
			executionId = await this.tryStartExecution(
				startParams,
				startedAt,
				'Failed to start resumed agent execution recording',
			);
			for await (const value of streamAgentChunks(resultStream.stream)) {
				const chunk = usePublishedVersion ? value : withApprovalToolDetails(value, toolRegistry);
				recorder.record(chunk);
				yield chunk;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			try {
				// Always record resumed executions — even if they suspend again (chained HITL)
				// or fail while streaming. Don't repeat the original user message — the
				// pre-suspension execution already has it.
				const messageRecord = normalizeAbortedMessageRecord(
					recorder.getMessageRecord(),
					abortSignal,
				);
				await this.persistRecordedExecution({
					executionId,
					onExecutionRecorded,
					failureMessage: 'Failed to record resumed agent execution',
					params: {
						threadId,
						agentId,
						agentName: agentInstance.name,
						projectId,
						userMessage: null,
						...(executionSource !== undefined ? { source: executionSource } : {}),
						record: messageRecord,
						hitlStatus: recorder.suspended ? 'suspended' : 'resumed',
						telemetry: {
							runType,
							configuration: runtime.telemetryConfiguration,
						},
					},
				});
				// Mail that settled while the parent waited for approval is delivered
				// once the resumed turn ends.
				if (!recorder.suspended) await this.requestPendingBackgroundWake(threadId);
			} finally {
				this.runtimeCacheService.releaseRuntimeLease(agentInstance);
			}
		}
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			message,
			user,
			memory,
			attachments,
			source,
			onExecutionRecorded,
			abortSignal,
		} = config;

		// `user` is always set (see ExecuteForChatConfig) — this builds/reuses a
		// runtime scoped to this specific user's tool access.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: user.id,
		});
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
			sandboxPrincipalHash,
		});

		try {
			await this.integrationMessageContextService.setLatest(memory.threadId, memory.resourceId, {
				integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
				platform: N8N_CHAT_INTEGRATION_TYPE,
				target: { type: 'dm', userId: user.id, threadId: memory.threadId },
				interactingUserId: user.id,
				updatedAt: new Date().toISOString(),
			});

			yield* this.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId: user.id,
				message,
				attachments,
				memory,
				projectId: runtime.projectId,
				source,
				telemetry: {
					runType: 'test',
					configuration: runtime.telemetryConfiguration,
				},
				onExecutionRecorded,
				abortSignal,
				includeHitlToolDetails: true,
				sandboxPrincipalHash,
			});
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
		}
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			message,
			memory,
			integrationType,
			attachments,
			sandboxPrincipalHash,
		} = config;
		await this.externalHooks.run('agent.preExecute', [agentId]);

		// Published integration runtimes have no n8n user but are isolated by
		// their external caller's hashed workspace principal.
		const runtime = await this.getPublishedRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType,
				usePublishedVersion: true,
				sandboxPrincipalHash,
			},
			{ threadId: memory.threadId, userMessage: message, attachments, source: integrationType },
		);

		try {
			yield* this.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				message,
				attachments,
				memory,
				projectId: runtime.projectId,
				source: integrationType,
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
				sandboxPrincipalHash,
			});
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
		}
	}

	/**
	 * Execute a published agent for a scheduled task, stamping `source='task'`
	 * and the originating `taskId` on the recorded session for traceability.
	 */
	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, taskId, taskVersionId } = config;
		await this.externalHooks.run('agent.preExecute', [agentId]);

		// Cron-fired runs have no n8n user and reuse the scheduled task's scope.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({ type: 'scheduled-task', taskId });
		const runtime = await this.getPublishedRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType: 'task',
				usePublishedVersion: true,
				sandboxPrincipalHash,
				allowBackgroundTasks: false,
			},
			{ threadId: memory.threadId, userMessage: message, source: 'task', taskId, taskVersionId },
		);

		try {
			yield* this.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				message,
				memory,
				projectId: runtime.projectId,
				source: 'task',
				taskId,
				taskVersionId,
				telemetry: {
					runType: 'production',
					configuration: runtime.telemetryConfiguration,
				},
				sandboxPrincipalHash,
			});
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
		}
	}

	/**
	 * Execute a task on demand against the current (draft) config as the
	 * requesting user.
	 */
	async *executeForTaskNow(config: ExecuteForTaskNowConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, user, message, memory, taskId } = config;

		// `user` is always set (see ExecuteForTaskNowConfig) — manual "Run now"
		// runs get a runtime scoped to the requesting user's tool access, same
		// as the in-app test chat.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: user.id,
		});
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			user,
			sandboxPrincipalHash,
			allowBackgroundTasks: false,
		});

		try {
			yield* this.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				userId: user.id,
				message,
				memory,
				projectId: runtime.projectId,
				source: 'task',
				taskId,
				telemetry: {
					runType: 'test',
					configuration: runtime.telemetryConfiguration,
				},
				sandboxPrincipalHash,
			});
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
		}
	}

	async executeForWake(config: ExecuteForWakeConfig): Promise<void> {
		const { agentId, projectId, message, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		// Draft wakes are test runs; like executeForChat they skip the quota hook.
		if (!isDraft) await this.externalHooks.run('agent.preExecute', [agentId]);
		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType,
			usePublishedVersion: !isDraft,
			...(isDraft ? { user: identity.user } : {}),
			sandboxPrincipalHash: identity.principalHash,
		});

		try {
			const stream = this.streamChatResponse({
				agentInstance: runtime.agent,
				toolRegistry: runtime.toolRegistry,
				agentId,
				...(isDraft ? { userId: identity.user.id } : {}),
				message,
				memory,
				projectId: runtime.projectId,
				source: integrationType,
				telemetry: {
					runType: isDraft ? 'test' : 'production',
					configuration: runtime.telemetryConfiguration,
				},
				abortSignal,
				includeHitlToolDetails: isDraft,
				sandboxPrincipalHash: identity.principalHash,
				hideUserMessageFromTranscript: true,
				isWakeRun: true,
			});
			// The runtime reports model failures as chunks instead of throwing. A
			// wake has no client to show them to, so surface them here: the caller
			// must leave the mail pending for a retry.
			let runError: unknown;
			for await (const chunk of stream) {
				if (chunk.type === 'error') runError = chunk.error;
				if (chunk.type === 'finish' && chunk.finishReason === 'error') runError ??= chunk;
			}
			if (runError !== undefined) {
				throw new OperationalError('Background job wake run ended with an error', {
					cause: runError,
				});
			}
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
		}
	}

	/**
	 * Stream an agent response, record it, and yield each chunk.
	 */
	async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			agentInstance,
			toolRegistry,
			agentId,
			userId,
			message,
			attachments,
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
			telemetry,
			onExecutionRecorded,
			abortSignal,
			includeHitlToolDetails,
			sandboxPrincipalHash,
			hideUserMessageFromTranscript,
			isWakeRun,
		} = config;
		const { threadId, resourceId } = memory;

		let executionId: string | undefined;
		const recorder = this.createRecorder(toolRegistry, () => executionId, {
			projectId,
			agentId,
			threadId,
		});
		const startedAt = recorder.startedAt;

		try {
			const tracing = await this.agentRunTracingService.build({
				agentId,
				projectId,
				threadId,
				userId,
				source: source ?? 'test',
				modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
			});

			const input = attachments?.length ? buildInboundUserMessage(message, attachments) : message;
			const hostMetadata = encodeAgentSandboxHostMetadata({
				projectId,
				principalHash: sandboxPrincipalHash,
			});
			const resultStream = await agentInstance.stream(input, {
				persistence: { threadId, resourceId, hostMetadata },
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId,
					userId,
					runType: telemetry.runType,
				}),
				...(tracing ? { telemetry: tracing } : {}),
				...(abortSignal ? { abortSignal } : {}),
			});
			const startParams: StartExecutionParams = {
				threadId,
				agentId,
				agentName: agentInstance.name,
				projectId,
				userMessage: hideUserMessageFromTranscript ? null : message,
				attachments,
				source,
				taskId,
				taskVersionId,
				telemetry,
			};
			executionId = await this.tryStartExecution(
				startParams,
				startedAt,
				'Failed to start agent execution recording',
			);
			for await (const value of streamAgentChunks(resultStream.stream)) {
				const chunk = includeHitlToolDetails ? withApprovalToolDetails(value, toolRegistry) : value;
				recorder.record(chunk);
				if (chunk.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId,
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
					});
				}
				if (chunk.type === 'finish' && chunk.finishReason === 'max-iterations') {
					for (const chunk of getMaxIterationsChunks()) {
						recorder.record(chunk);
						yield chunk;
					}
				}
				yield chunk;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record — even if suspended or failed, the pre-suspension/error
			// response text and tool calls are valuable.
			const messageRecord = normalizeAbortedMessageRecord(recorder.getMessageRecord(), abortSignal);
			await this.persistRecordedExecution({
				executionId,
				onExecutionRecorded,
				failureMessage: 'Failed to record agent execution',
				params: {
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage: hideUserMessageFromTranscript ? null : message,
					attachments,
					record: messageRecord,
					hitlStatus: recorder.suspended ? 'suspended' : undefined,
					source,
					taskId,
					taskVersionId,
					telemetry,
				},
			});
			if (!isWakeRun) await this.requestPendingBackgroundWake(threadId);
		}
	}

	private async requestPendingBackgroundWake(threadId: string): Promise<void> {
		try {
			const { AgentWakeService } = await import('./background/agent-wake.service.js');
			await Container.get(AgentWakeService).onParentTurnFinished(threadId);
		} catch (error) {
			this.logger.warn('Failed to request pending background job delivery', { threadId, error });
		}
	}

	/**
	 * Build the published runtime, or record the failure as an errored session
	 * before rethrowing. `streamChatResponse` only starts recording once it has
	 * a runtime, so without this a broken tool or credential leaves no trace in
	 * Agent Sessions and the channel only sees a generic error.
	 */
	private async getPublishedRuntimeOrRecordFailure(
		params: GetRuntimeParams,
		session: Pick<
			StartExecutionParams,
			'threadId' | 'userMessage' | 'attachments' | 'source' | 'taskId' | 'taskVersionId'
		>,
	): Promise<AgentRuntime> {
		try {
			return await this.runtimeCacheService.getRuntime(params);
		} catch (error) {
			try {
				await this.recordFailedStart(params, session, error);
			} catch (recordError) {
				this.logger.warn('Failed to record agent execution', {
					agentId: params.agentId,
					threadId: session.threadId,
					error: recordError instanceof Error ? recordError.message : String(recordError),
				});
			}
			throw error;
		}
	}

	private async recordFailedStart(
		{ agentId, projectId }: GetRuntimeParams,
		session: Pick<
			StartExecutionParams,
			'threadId' | 'userMessage' | 'attachments' | 'source' | 'taskId' | 'taskVersionId'
		>,
		error: unknown,
	): Promise<void> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) return;
		// Production runs execute the published snapshot, so name the session and
		// build telemetry from it rather than from a draft that may have moved on.
		const published = agent.activeVersion?.schema ? getPublishedAgentSnapshot(agent) : agent;

		const recorder = new ExecutionRecorder();
		recorder.record({ type: 'error', error });
		recorder.record({ type: 'finish', finishReason: 'error' });
		const startParams: StartExecutionParams = {
			...session,
			agentId,
			agentName: published.schema?.name ?? agent.name,
			projectId,
			telemetry: {
				runType: 'production',
				configuration: buildAgentConfigurationTelemetry(published),
			},
		};
		const executionId = await this.tryStartExecution(
			startParams,
			recorder.startedAt,
			'Failed to start agent execution recording',
		);
		await this.persistRecordedExecution({
			executionId,
			params: { ...startParams, record: recorder.getMessageRecord() },
			failureMessage: 'Failed to record agent execution',
		});
	}

	private createRecorder(
		toolRegistry: ToolRegistry,
		getExecutionId: () => string | undefined,
		context: Pick<StartExecutionParams, 'projectId' | 'agentId' | 'threadId'>,
	): ExecutionRecorder {
		return new ExecutionRecorder(toolRegistry, (timeline) => {
			const executionId = getExecutionId();
			if (executionId) {
				this.agentExecutionService.recordTimelineSnapshot({
					...context,
					executionId,
					timeline,
				});
			}
		});
	}

	private async tryStartExecution(
		params: StartExecutionParams,
		startedAt: Date,
		failureMessage: string,
	): Promise<string | undefined> {
		try {
			return await this.agentExecutionService.startExecutionRecording(params, startedAt);
		} catch (error) {
			this.logger.warn(failureMessage, {
				agentId: params.agentId,
				threadId: params.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private async persistRecordedExecution(args: {
		executionId?: string;
		onExecutionRecorded?: (executionId: string) => void;
		params: RecordMessageParams;
		failureMessage: string;
	}): Promise<void> {
		const { executionId, onExecutionRecorded, params, failureMessage } = args;
		if (!executionId) return;
		try {
			const recordedId = await this.agentExecutionService.finalizeExecution(executionId, params);
			onExecutionRecorded?.(recordedId);
		} catch (error) {
			this.logger.warn(failureMessage, {
				agentId: params.agentId,
				threadId: params.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
