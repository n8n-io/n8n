import {
	INLINE_SUB_AGENT_ID,
	parseDelegateSubAgentContinuation,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import type { AgentMessageAuthor, AgentPersistedMessageDto } from '@n8n/api-types';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import { AgentActionAlreadyHandledError } from './agent-action-already-handled.error';
import {
	AgentExecutionService,
	type RecordMessageParams,
	type StartExecutionParams,
} from './agent-execution.service';
import { AgentRunTracingService, modelIdFromSnapshot } from './agent-run-tracing.service';
import { AgentRuntimeCacheService, type AgentRuntime } from './agent-runtime-cache.service';
import {
	decodeAgentSandboxHostMetadata,
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
	type AgentSandboxPrincipalHash,
} from './agent-sandbox-principal';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import type { AgentTurnClaim } from './agent-turn-queue.service';
import { buildToolCallDetails, ExecutionRecorder, type MessageRecord } from './execution-recorder';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { modelStreamStallOptions } from './model-stream-stall-options';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import type { StoredAttachmentRef } from './agent-chat-attachment.service';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { buildInboundUserMessage } from './utils/inbound-attachments';
import { streamAgentChunks } from './utils/agent-stream';
import { createAttributionTracker } from './utils/mcp-attribution';
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
	/**
	 * Set by the in-app preview chat, which builds the runtime with an extra
	 * instruction saying the agent cannot change its own setup. Other draft
	 * callers (AI Assistant test calls, MCP, "Run now") leave it unset.
	 */
	previewChat?: boolean;
	/** Fired after the turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
}

export interface ExecuteForChatPublishedConfig {
	agentId: string;
	projectId: string;
	/** What the user wrote; recorded in the execution transcript. */
	message: string;
	/** What the model receives when it differs from `message`, e.g. with an author label or thread history. */
	modelMessage?: string;
	/** Chat platform user who wrote the turn; shown as the sender in the sessions view. */
	author?: AgentMessageAuthor;
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
	/**
	 * Set by the in-app preview chat, which builds the runtime with an extra
	 * instruction saying the agent cannot change its own setup. Other draft
	 * callers (AI Assistant test calls, MCP, "Run now") leave it unset.
	 */
	previewChat?: boolean;
	/** Fired after the resumed turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	/**
	 * Runs once the resume holds its claimed running row, right before
	 * `agentInstance.resume()`. Chat integrations settle the action card and
	 * update message context here, so a resume that is rejected changes nothing.
	 */
	beforeResume?: () => Promise<void>;
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
	/** The claimed running row this turn records into; released once the row is finalized. */
	claim: AgentTurnClaim;
	/**
	 * Builds the runtime once the turn holds its row. A failure here ends the
	 * row as an error execution, so a broken tool or credential leaves a trace
	 * in Agent Sessions. The lease is released when the turn ends.
	 */
	getRuntime: () => Promise<AgentRuntime>;
	agentId: string;
	userId?: string;
	/** What the user wrote; recorded in the execution transcript. */
	message: string;
	/** What the model receives when it differs from `message`. */
	modelMessage?: string;
	/** Chat platform user who wrote the turn; shown as the sender in the sessions view. */
	author?: AgentMessageAuthor;
	attachments?: StoredAttachmentRef[];
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	runType: AgentRunTelemetryType;
	/** Fired after the turn is persisted; used to attach `executionId` to SSE `done`. */
	onExecutionRecorded?: (executionId: string) => void;
	abortSignal?: AbortSignal;
	/** Add full sanitized tool configuration to approval cards in preview chat. */
	includeHitlToolDetails?: boolean;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	/** Hide the internal wake instruction from the execution transcript. */
	hideUserMessageFromTranscript?: boolean;
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
		private readonly aiConfig: AiConfig,
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
	 * Validate a resume request before it enters the turn queue and return the
	 * thread the suspended run belongs to. Throws
	 * {@link AgentActionAlreadyHandledError} once the checkpoint is no longer
	 * suspended, and a `UserError` for a checkpoint the caller may not resume.
	 */
	async resolveResumeThread(config: ResumeForChatConfig): Promise<string> {
		return (await this.loadResumableCheckpoint(config)).threadId;
	}

	private async loadResumableCheckpoint(
		config: ResumeForChatConfig,
	): Promise<{ threadId: string; sandboxPrincipalHash: AgentSandboxPrincipalHash | undefined }> {
		const { agentId, projectId, runId, expectedMemory, user, usePublishedVersion = true } = config;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId, agentId);
		if (checkpointStatus.status === 'expired') {
			throw new UserError(`Checkpoint ${runId} is expired and cannot be resumed`);
		}

		if (checkpointStatus.status === 'not-found') {
			throw new UserError(`Checkpoint ${runId} not found and cannot be resumed`);
		}

		const memoryScope = checkpointStatus.checkpoint.persistence;
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
		// A second click, or a run that already moved on. Checked last: the
		// scope errors above say why the resume can never run.
		if (checkpointStatus.checkpoint.status !== 'suspended') {
			throw new AgentActionAlreadyHandledError();
		}

		return { threadId: memoryScope.threadId, sandboxPrincipalHash };
	}

	/**
	 * Resume a suspended tool call into the claimed row and yield the resulting
	 * stream chunks. Used by chat integration handlers to continue an agent run
	 * after a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(
		config: ResumeForChatConfig,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			runId,
			toolCallId,
			resumeData,
			source,
			integrationType,
			user,
			usePublishedVersion = true,
			onExecutionRecorded,
			beforeResume,
			abortSignal,
		} = config;
		const { threadId } = claim;
		const runType: AgentRunTelemetryType = usePublishedVersion ? 'production' : 'test';
		let runtime: AgentRuntime | undefined;
		let recorder = new ExecutionRecorder();
		let executionSource = source;
		try {
			// The pre-submit check can go stale while this resume waits in the turn queue.
			const { sandboxPrincipalHash } = await this.loadResumableCheckpoint(config);
			runtime = await this.runtimeCacheService.getRuntime({
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
				previewChat: config.previewChat,
			});
			const { agent: agentInstance, toolRegistry } = runtime;
			recorder = this.createRecorder(toolRegistry, () => claim.executionId, {
				projectId,
				agentId,
				threadId,
			});

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

			await beforeResume?.();
			const resultStream = await agentInstance.resume('stream', resumeData, {
				runId,
				toolCallId,
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId,
					userId: user?.id,
					runType,
				}),
				...modelStreamStallOptions(this.aiConfig),
				...(tracing ? { telemetry: tracing } : {}),
				abortSignal: turnAbortSignal(claim, abortSignal),
			});
			recorder.recordHitlResponse(toolCallId, resumeData);
			const attributionTracker = createAttributionTracker(runtime.mcpServerAttributions);
			for await (const value of streamAgentChunks(resultStream.stream)) {
				const chunk = usePublishedVersion ? value : withApprovalToolDetails(value, toolRegistry);
				recorder.record(chunk);
				for (const attributionChunk of attributionTracker.observe(chunk)) {
					recorder.record(attributionChunk);
					yield attributionChunk;
				}
				yield chunk;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record resumed executions — even if they suspend again (chained HITL)
			// or fail while streaming. Don't repeat the original user message — the
			// pre-suspension execution already has it.
			await this.finishTurn({
				claim,
				runtime,
				record: normalizeAbortedMessageRecord(recorder.getMessageRecord(), abortSignal),
				onExecutionRecorded,
				failureMessage: 'Failed to record resumed agent execution',
				params: {
					threadId,
					agentId,
					projectId,
					userMessage: null,
					...(executionSource !== undefined ? { source: executionSource } : {}),
					hitlStatus: recorder.suspended ? 'suspended' : 'resumed',
				},
				telemetry: { userId: user?.id, runType },
			});
		}
	}

	/**
	 * Execute an agent for the in-app test chat into the claimed row and yield
	 * stream chunks.
	 */
	async *executeForChat(
		config: ExecuteForChatConfig,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			message,
			user,
			memory,
			attachments,
			source,
			previewChat,
			onExecutionRecorded,
			abortSignal,
		} = config;

		// `user` is always set (see ExecuteForChatConfig) — this builds/reuses a
		// runtime scoped to this specific user's tool access.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: user.id,
		});

		yield* this.streamChatResponse({
			claim,
			getRuntime: async () => {
				const runtime = await this.runtimeCacheService.getRuntime({
					agentId,
					projectId,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
					user,
					sandboxPrincipalHash,
					previewChat,
				});
				try {
					// Message context is written by the claimed turn only, so a
					// queued message never redirects the running turn's replies.
					await this.integrationMessageContextService.setLatest(
						memory.threadId,
						memory.resourceId,
						{
							integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
							platform: N8N_CHAT_INTEGRATION_TYPE,
							target: { type: 'dm', userId: user.id, threadId: memory.threadId },
							interactingUserId: user.id,
							updatedAt: new Date().toISOString(),
						},
					);
					return runtime;
				} catch (error) {
					this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
					throw error;
				}
			},
			agentId,
			userId: user.id,
			message,
			attachments,
			memory,
			projectId,
			source,
			runType: 'test',
			onExecutionRecorded,
			abortSignal,
			includeHitlToolDetails: true,
			sandboxPrincipalHash,
		});
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …)
	 * into the claimed row.
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		const {
			agentId,
			projectId,
			message,
			modelMessage,
			author,
			memory,
			integrationType,
			attachments,
			sandboxPrincipalHash,
		} = config;

		// Published integration runtimes have no n8n user but are isolated by
		// their external caller's hashed workspace principal.
		yield* this.streamChatResponse({
			claim,
			getRuntime: async () => {
				await this.externalHooks.run('agent.preExecute', [agentId]);
				return await this.runtimeCacheService.getRuntime({
					agentId,
					projectId,
					integrationType,
					usePublishedVersion: true,
					sandboxPrincipalHash,
				});
			},
			agentId,
			message,
			modelMessage,
			author,
			attachments,
			memory,
			projectId,
			source: integrationType,
			runType: 'production',
			sandboxPrincipalHash,
		});
	}

	/**
	 * Execute a published agent for a scheduled task into the claimed row,
	 * stamping `source='task'` and the originating `taskId` on the recorded
	 * session for traceability.
	 */
	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, taskId, taskVersionId } = config;

		// Cron-fired runs have no n8n user and reuse the scheduled task's scope.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({ type: 'scheduled-task', taskId });
		yield* this.streamChatResponse({
			claim,
			getRuntime: async () => {
				await this.externalHooks.run('agent.preExecute', [agentId]);
				return await this.runtimeCacheService.getRuntime({
					agentId,
					projectId,
					integrationType: 'task',
					usePublishedVersion: true,
					sandboxPrincipalHash,
					allowBackgroundTasks: false,
				});
			},
			agentId,
			message,
			memory,
			projectId,
			source: 'task',
			taskId,
			taskVersionId,
			runType: 'production',
			sandboxPrincipalHash,
		});
	}

	/**
	 * Execute a task on demand against the current (draft) config as the
	 * requesting user, into the claimed row.
	 */
	async *executeForTaskNow(
		config: ExecuteForTaskNowConfig,
		claim: AgentTurnClaim,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, user, message, memory, taskId } = config;

		// `user` is always set (see ExecuteForTaskNowConfig) — manual "Run now"
		// runs get a runtime scoped to the requesting user's tool access, same
		// as the in-app test chat.
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: user.id,
		});
		yield* this.streamChatResponse({
			claim,
			getRuntime: async () =>
				await this.runtimeCacheService.getRuntime({
					agentId,
					projectId,
					user,
					sandboxPrincipalHash,
					allowBackgroundTasks: false,
				}),
			agentId,
			userId: user.id,
			message,
			memory,
			projectId,
			source: 'task',
			taskId,
			runType: 'test',
			sandboxPrincipalHash,
		});
	}

	/**
	 * Wake a thread with finished background job results into the claimed row.
	 * Throws when the run fails so the caller leaves the results pending.
	 */
	async executeForWake(config: ExecuteForWakeConfig, claim: AgentTurnClaim): Promise<void> {
		const { agentId, projectId, message, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;

		let delivery: Awaited<ReturnType<typeof this.getWakeDelivery>> | undefined;
		try {
			delivery = isDraft
				? undefined
				: await this.getWakeDelivery(agentId, integrationType, memory.threadId);
		} catch (error) {
			await claim.fail(error);
			throw error;
		}
		const stream = this.streamChatResponse({
			claim,
			getRuntime: async () => {
				// Draft wakes skip the quota hook, like other test chat runs.
				if (!isDraft) await this.externalHooks.run('agent.preExecute', [agentId]);
				return await this.runtimeCacheService.getRuntime({
					agentId,
					projectId,
					integrationType,
					usePublishedVersion: !isDraft,
					...(isDraft ? { user: identity.user } : {}),
					sandboxPrincipalHash: identity.principalHash,
				});
			},
			agentId,
			...(isDraft ? { userId: identity.user.id } : {}),
			message,
			memory,
			projectId,
			source: integrationType,
			runType: isDraft ? 'test' : 'production',
			abortSignal,
			includeHitlToolDetails: isDraft,
			sandboxPrincipalHash: identity.principalHash,
			hideUserMessageFromTranscript: true,
		});

		// The runtime returns model errors as stream chunks. Throw here so the caller
		// leaves the job results pending for a retry.
		const chunks: StreamChunk[] = [];
		let runError: unknown;
		for await (const chunk of stream) {
			if (delivery) chunks.push(chunk);
			if (chunk.type === 'error') runError = chunk.error;
			if (chunk.type === 'finish' && chunk.finishReason === 'error') runError ??= chunk;
		}
		if (runError !== undefined) {
			throw new OperationalError('Background job wake failed', {
				cause: runError,
			});
		}
		abortSignal.throwIfAborted();
		if (delivery) await delivery.bridge.deliverWakeResponse(delivery.threadId, chunks);
	}

	private async getWakeDelivery(agentId: string, integrationType: string, threadId: string) {
		const context = await this.integrationMessageContextService.getLatest(threadId);
		const target = context?.replyTarget ?? context?.target;
		const [platform, credentialId] = context?.integrationConnectionId.split(':') ?? [];
		if (
			context?.platform !== integrationType ||
			platform !== integrationType ||
			!credentialId ||
			!target?.threadId
		) {
			throw new OperationalError('Background job wake has no reply context');
		}

		// Use the stored connection so results return to the correct workspace.
		const { ChatIntegrationService } = await import('./integrations/chat-integration.service.js');
		const bridge = Container.get(ChatIntegrationService).getBridge(
			agentId,
			integrationType,
			credentialId,
		);
		if (!bridge) {
			throw new OperationalError('Background job wake chat connection is unavailable');
		}
		return { bridge, threadId: target.threadId };
	}

	/**
	 * Stream an agent response into the claimed row, record it, and yield each
	 * chunk. The row is finalized and the claim released when the stream ends,
	 * also on error and abort.
	 */
	async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			claim,
			getRuntime,
			agentId,
			userId,
			message,
			modelMessage = message,
			author,
			attachments,
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
			runType,
			onExecutionRecorded,
			abortSignal,
			includeHitlToolDetails,
			sandboxPrincipalHash,
			hideUserMessageFromTranscript,
		} = config;
		const { threadId, resourceId } = memory;
		let runtime: AgentRuntime | undefined;
		let recorder = new ExecutionRecorder();

		try {
			if (claim.threadId !== threadId) {
				throw new UnexpectedError('Agent turn claim does not belong to this thread');
			}
			runtime = await getRuntime();
			const { agent: agentInstance, toolRegistry } = runtime;
			recorder = this.createRecorder(toolRegistry, () => claim.executionId, {
				projectId,
				agentId,
				threadId,
			});

			const tracing = await this.agentRunTracingService.build({
				agentId,
				projectId,
				threadId,
				userId,
				source: source ?? 'test',
				modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
			});

			const input = attachments?.length
				? buildInboundUserMessage(modelMessage, attachments)
				: modelMessage;
			const hostMetadata = encodeAgentSandboxHostMetadata({
				projectId,
				principalHash: sandboxPrincipalHash,
			});
			const resultStream = await agentInstance.stream(input, {
				persistence: { threadId, resourceId, hostMetadata },
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId,
					userId,
					runType,
				}),
				...modelStreamStallOptions(this.aiConfig),
				...(tracing ? { telemetry: tracing } : {}),
				abortSignal: turnAbortSignal(claim, abortSignal),
			});
			const attributionTracker = createAttributionTracker(runtime.mcpServerAttributions);
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
				for (const attributionChunk of attributionTracker.observe(chunk)) {
					recorder.record(attributionChunk);
					yield attributionChunk;
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
			await this.finishTurn({
				claim,
				runtime,
				record: normalizeAbortedMessageRecord(recorder.getMessageRecord(), abortSignal),
				onExecutionRecorded,
				failureMessage: 'Failed to record agent execution',
				params: {
					threadId,
					agentId,
					projectId,
					userMessage: hideUserMessageFromTranscript ? null : message,
					author,
					attachments,
					hitlStatus: recorder.suspended ? 'suspended' : undefined,
					source,
					taskId,
					taskVersionId,
				},
				telemetry: { userId, runType },
			});
		}
	}

	/**
	 * Finalize the claimed row with the turn's record, release the runtime lease,
	 * then release the claim so the thread's queued rows run. A turn that failed
	 * before it had a runtime reports the stored agent configuration instead.
	 */
	private async finishTurn(args: {
		claim: AgentTurnClaim;
		runtime: AgentRuntime | undefined;
		record: MessageRecord;
		onExecutionRecorded?: (executionId: string) => void;
		failureMessage: string;
		params: Omit<RecordMessageParams, 'record' | 'telemetry'>;
		telemetry: { userId?: string; runType: AgentRunTelemetryType };
	}): Promise<void> {
		const { claim, runtime, record, onExecutionRecorded, failureMessage, params, telemetry } = args;
		try {
			const configuration =
				runtime?.telemetryConfiguration ??
				(await this.storedTelemetryConfiguration(
					params.agentId,
					params.projectId,
					telemetry.runType,
				));
			await this.persistRecordedExecution({
				executionId: claim.executionId,
				onExecutionRecorded,
				failureMessage,
				params: {
					...params,
					record,
					...(configuration ? { telemetry: { ...telemetry, configuration } } : {}),
				},
			});
		} finally {
			if (runtime) this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
			await claim.release();
		}
	}

	private async storedTelemetryConfiguration(
		agentId: string,
		projectId: string,
		runType: AgentRunTelemetryType,
	): Promise<IAgentConfigurationTelemetryProperties | undefined> {
		try {
			const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
			if (!agent) return undefined;
			// Production runs execute the published snapshot, so build telemetry
			// from it rather than from a draft that may have moved on.
			const snapshot =
				runType === 'production' && agent.activeVersion?.schema
					? getPublishedAgentSnapshot(agent)
					: agent;
			return buildAgentConfigurationTelemetry(snapshot);
		} catch (error) {
			this.logger.warn('Failed to load agent configuration for telemetry', { agentId, error });
			return undefined;
		}
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

	private async persistRecordedExecution(args: {
		executionId: string;
		onExecutionRecorded?: (executionId: string) => void;
		params: RecordMessageParams;
		failureMessage: string;
	}): Promise<void> {
		const { executionId, onExecutionRecorded, params, failureMessage } = args;
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

/**
 * The runtime stops when the caller cancels or when the run no longer holds
 * its thread claim. Only the caller's own signal marks the record as cancelled.
 */
function turnAbortSignal(claim: AgentTurnClaim, abortSignal?: AbortSignal): AbortSignal {
	return abortSignal ? AbortSignal.any([abortSignal, claim.abortSignal]) : claim.abortSignal;
}
