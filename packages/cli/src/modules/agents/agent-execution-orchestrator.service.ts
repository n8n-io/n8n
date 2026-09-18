import {
	INLINE_SUB_AGENT_ID,
	parseDelegateSubAgentContinuation,
	type Agent as RuntimeAgent,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import type {
	AgentBackgroundJobSignal,
	AgentMessageAuthor,
	AgentPersistedMessageDto,
} from '@n8n/api-types';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import { AgentExecutionService, type StartExecutionParams } from './agent-execution.service';
import type { AgentThreadAccess } from './entities/agent-execution-thread.entity';
import {
	draftChatMemoryResourceId,
	isTaskRunMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';
import { threadBelongsTo } from './utils/agent-thread-access';
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
import { AgentTurnExecutionService } from './agent-turn-execution.service';
import { AgentExecutionRecordingError } from './agent-execution-recording.error';
import type { AgentChatBridge } from './integrations/agent-chat-bridge';
import {
	encodeIntegrationMessageContext,
	inheritIntegrationMessageContext,
} from './integrations/integration-message-context';
import type {
	IntegrationMessageContext,
	SessionBinding,
} from './integrations/integration-tool-types';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { modelStreamStallOptions } from './model-stream-stall-options';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import type { StoredAttachmentRef } from './agent-chat-attachment.service';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { buildInboundUserMessage } from './utils/inbound-attachments';
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
	messageContext?: IntegrationMessageContext | null;
	/** Platform conversation metadata scope. Execution memory can belong to a task. */
	contextConversation?: SessionBinding;
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
	messageContext?: IntegrationMessageContext | null;
	/** Platform conversation metadata scope. Execution memory can belong to a task. */
	contextConversation?: SessionBinding;
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
	backgroundJobSignal: AgentBackgroundJobSignal;
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
	access: AgentThreadAccess;
	messageContext?: IntegrationMessageContext | null;
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	/** See `AgentRuntime.mcpServerAttributions`. */
	mcpServerAttributions: Map<string, string>;
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
	/** Hide the internal wake instruction from the execution transcript. */
	hideUserMessageFromTranscript?: boolean;
	/** Prevent this wake run from triggering another wake. */
	isWakeRun?: boolean;
	backgroundJobSignal?: AgentBackgroundJobSignal;
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
		private readonly turnExecutionService: AgentTurnExecutionService,
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
		userId: string;
	}): Promise<AgentPersistedMessageDto[] | null> {
		const { threadId, projectId, agentId, userId } = params;
		const detail = await this.agentExecutionService.getThreadDetail(
			threadId,
			projectId,
			agentId,
			userId,
		);
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
		const thread = await this.agentExecutionService.findThreadById(checkpoint.persistence.threadId);
		const userId = userIdFromDraftChatMemoryResourceId(params.resourceId);
		if (thread && (!userId || !threadBelongsTo(thread, thread.projectId, params.agentId, userId))) {
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

	private async loadResumeCheckpoint(params: {
		agentId: string;
		projectId: string;
		runId: string;
		expectedMemory: Partial<AgentMemoryScope> | undefined;
		user: User | undefined;
		usePublishedVersion: boolean;
	}): Promise<{
		memoryScope: NonNullable<SerializableAgentState['persistence']>;
		sandboxPrincipalHash: AgentSandboxPrincipalHash | undefined;
		access: AgentThreadAccess;
	}> {
		const { agentId, projectId, runId, expectedMemory, user, usePublishedVersion } = params;
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
		const isPreview = !usePublishedVersion && !isTaskRunMemoryResourceId(memoryScope.resourceId);
		let access: AgentThreadAccess = { accessScope: 'project', ownerId: null };
		if (isPreview) {
			if (
				!user ||
				memoryScope.resourceId !== draftChatMemoryResourceId(user.id) ||
				!(await this.agentExecutionService.canUsePreviewThread(
					memoryScope.threadId,
					projectId,
					agentId,
					user.id,
				))
			) {
				throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
			}
			access = { accessScope: 'user', ownerId: user.id };
		} else {
			const thread = await this.agentExecutionService.findThreadById(memoryScope.threadId);
			if (
				userIdFromDraftChatMemoryResourceId(memoryScope.resourceId) ||
				(thread &&
					(thread.projectId !== projectId ||
						thread.agentId !== agentId ||
						thread.accessScope !== 'project'))
			) {
				throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
			}
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

		return { memoryScope, sandboxPrincipalHash, access };
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
		const { memoryScope, sandboxPrincipalHash, access } = await this.loadResumeCheckpoint({
			agentId,
			projectId,
			runId,
			expectedMemory,
			user,
			usePublishedVersion,
		});

		const threadId = memoryScope.threadId;

		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						usePublishedVersion,
						integrationType,
						// Published integrations retain their project-scoped tool access.
						user: usePublishedVersion ? undefined : user,
						...(sandboxPrincipalHash ? { sandboxPrincipalHash } : {}),
						previewChat: config.previewChat,
					},
					{ threadId, userMessage: null, source, onExecutionRecorded, abortSignal, access },
				),
			(runtime) =>
				this.turnExecutionService.execute({
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					context: { projectId, agentId, threadId },
					includeHitlToolDetails: !usePublishedVersion,
					onExecutionRecorded,
					onSettled: async (suspended) => {
						if (!suspended) await this.requestPendingBackgroundWake(threadId);
					},
					prepare: async () => {
						// Recover the original source only when tracing needs it.
						const suspendedExecution =
							this.agentRunTracingService.enabled && source === undefined
								? await this.agentExecutionService.findLatestSuspendedRun(threadId)
								: undefined;
						const executionSource = source ?? suspendedExecution?.source ?? undefined;
						const runType = usePublishedVersion ? 'production' : 'test';
						const tracing = await this.agentRunTracingService.build({
							agentId,
							projectId,
							threadId,
							userId: user?.id,
							source: executionSource ?? 'unknown',
							modelId: modelIdFromSnapshot(runtime.agent.snapshot.model),
						});
						let messageContext = config.messageContext;
						if (messageContext === undefined) {
							messageContext =
								await this.integrationMessageContextService.getForResume(memoryScope);
						} else if (messageContext && config.contextConversation) {
							messageContext = inheritIntegrationMessageContext(
								messageContext,
								await this.integrationMessageContextService.getForResume(memoryScope),
							);
						}
						const selectedContext = messageContext;
						const conversation = config.contextConversation;

						return {
							type: 'resume',
							resumeData,
							options: {
								runId,
								toolCallId,
								hostMetadata: encodeIntegrationMessageContext(selectedContext),
								...(selectedContext && conversation
									? {
											onResumeClaimed: async () =>
												await this.integrationMessageContextService.installIncoming(
													selectedContext,
													memoryScope,
													conversation,
												),
										}
									: {}),
								executionCounter: createAgentExecutionCounter(this.telemetry, {
									agentId,
									userId: user?.id,
									runType,
								}),
								...modelStreamStallOptions(this.aiConfig),
								...(tracing ? { telemetry: tracing } : {}),
								...(abortSignal ? { abortSignal } : {}),
							},
							recording: {
								access,
								threadId,
								agentId,
								agentName: runtime.agent.name,
								projectId,
								userMessage: null,
								...(executionSource !== undefined ? { source: executionSource } : {}),
								telemetry: {
									userId: user?.id,
									runType,
									configuration: runtime.telemetryConfiguration,
								},
							},
						};
					},
				}),
		);
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
		if (
			memory.resourceId !== draftChatMemoryResourceId(user.id) ||
			!(await this.agentExecutionService.canUsePreviewThread(
				memory.threadId,
				projectId,
				agentId,
				user.id,
			))
		) {
			throw new UserError('Session not found');
		}
		const access: AgentThreadAccess = { accessScope: 'user', ownerId: user.id };
		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						integrationType: N8N_CHAT_INTEGRATION_TYPE,
						user,
						sandboxPrincipalHash,
						previewChat,
					},
					{
						threadId: memory.threadId,
						access,
						userMessage: message,
						attachments,
						source,
						onExecutionRecorded,
						abortSignal,
					},
				),
			async (runtime) => {
				const messageContext: IntegrationMessageContext = {
					integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
					platform: N8N_CHAT_INTEGRATION_TYPE,
					target: { type: 'dm', userId: user.id, threadId: memory.threadId },
					interactingUserId: user.id,
					updatedAt: new Date().toISOString(),
				};
				await this.integrationMessageContextService.setLatest(
					memory.threadId,
					memory.resourceId,
					messageContext,
				);

				return this.streamChatResponse({
					access,
					messageContext,
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
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
			},
		);
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
			modelMessage,
			author,
			memory,
			integrationType,
			attachments,
			sandboxPrincipalHash,
		} = config;
		await this.externalHooks.run('agent.preExecute', [agentId]);

		// Published integration runtimes have no n8n user but are isolated by
		// their external caller's hashed workspace principal.
		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						integrationType,
						usePublishedVersion: true,
						sandboxPrincipalHash,
					},
					{
						threadId: memory.threadId,
						userMessage: message,
						author,
						attachments,
						source: integrationType,
						access: { accessScope: 'project', ownerId: null },
					},
				),
			async (runtime) => {
				let messageContext = config.messageContext;
				if (messageContext && config.contextConversation) {
					messageContext = inheritIntegrationMessageContext(
						messageContext,
						await this.integrationMessageContextService.getLatestForIncoming(memory.threadId),
					);
					await this.integrationMessageContextService.installIncoming(
						messageContext,
						memory,
						config.contextConversation,
					);
				}
				return this.streamChatResponse({
					messageContext,
					access: { accessScope: 'project', ownerId: null },
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					agentId,
					message,
					modelMessage,
					author,
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
			},
		);
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
		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						integrationType: 'task',
						usePublishedVersion: true,
						sandboxPrincipalHash,
						allowBackgroundTasks: false,
					},
					{
						threadId: memory.threadId,
						userMessage: message,
						source: 'task',
						taskId,
						taskVersionId,
						access: { accessScope: 'project', ownerId: null },
					},
				),
			(runtime) =>
				this.streamChatResponse({
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					agentId,
					message,
					memory,
					projectId: runtime.projectId,
					source: 'task',
					taskId,
					taskVersionId,
					access: { accessScope: 'project', ownerId: null },
					telemetry: {
						runType: 'production',
						configuration: runtime.telemetryConfiguration,
					},
					sandboxPrincipalHash,
				}),
		);
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
		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						user,
						sandboxPrincipalHash,
						allowBackgroundTasks: false,
					},
					{
						threadId: memory.threadId,
						userMessage: message,
						source: 'task',
						taskId,
						access: { accessScope: 'project', ownerId: null },
					},
				),
			(runtime) =>
				this.streamChatResponse({
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					agentId,
					userId: user.id,
					message,
					memory,
					projectId: runtime.projectId,
					source: 'task',
					taskId,
					access: { accessScope: 'project', ownerId: null },
					telemetry: {
						runType: 'test',
						configuration: runtime.telemetryConfiguration,
					},
					sandboxPrincipalHash,
				}),
		);
	}

	async executeForWake(config: ExecuteForWakeConfig): Promise<void> {
		const { agentId, projectId, message, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		const access: AgentThreadAccess = isDraft
			? { accessScope: 'user', ownerId: identity.user.id }
			: { accessScope: 'project', ownerId: null };
		if (
			isDraft &&
			(memory.resourceId !== draftChatMemoryResourceId(identity.user.id) ||
				!(await this.agentExecutionService.canUsePreviewThread(
					memory.threadId,
					projectId,
					agentId,
					identity.user.id,
				)))
		) {
			throw new UserError('Session not found');
		}

		// Draft wakes skip the quota hook, like other test chat runs.
		if (!isDraft) await this.externalHooks.run('agent.preExecute', [agentId]);

		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;
		const messageContext = await this.integrationMessageContextService.getLatest(memory.threadId);
		const delivery = isDraft
			? undefined
			: await this.getWakeDelivery(agentId, integrationType, messageContext);
		const stream = this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						integrationType,
						usePublishedVersion: !isDraft,
						...(isDraft ? { user: identity.user } : {}),
						sandboxPrincipalHash: identity.principalHash,
					},
					{
						threadId: memory.threadId,
						userMessage: null,
						source: integrationType,
						abortSignal,
						access,
					},
				),
			(runtime) =>
				this.streamWakeResponse(
					this.streamChatResponse({
						access,
						messageContext,
						agentInstance: runtime.agent,
						toolRegistry: runtime.toolRegistry,
						mcpServerAttributions: runtime.mcpServerAttributions,
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
						backgroundJobSignal: config.backgroundJobSignal,
					}),
					abortSignal,
					delivery,
				),
		);
		for await (const _chunk of stream) {
			// Complete execution and reply delivery within the runtime lease.
		}
	}

	private async *streamWakeResponse(
		stream: AsyncGenerator<StreamChunk>,
		abortSignal: AbortSignal,
		delivery?: { bridge: AgentChatBridge; threadId: string },
	): AsyncGenerator<StreamChunk> {
		const chunks: StreamChunk[] = [];
		let runError: unknown;
		for await (const chunk of stream) {
			if (delivery) chunks.push(chunk);
			if (chunk.type === 'error') runError = chunk.error;
			if (chunk.type === 'finish' && chunk.finishReason === 'error') runError ??= chunk;
			yield chunk;
		}
		// Leave failed job results pending so the caller can retry delivery.
		if (runError !== undefined) {
			throw new OperationalError('Background job wake failed', { cause: runError });
		}
		abortSignal.throwIfAborted();
		if (delivery) await delivery.bridge.deliverWakeResponse(delivery.threadId, chunks);
	}

	private async getWakeDelivery(
		agentId: string,
		integrationType: string,
		context: IntegrationMessageContext | null,
	) {
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
	 * Stream an agent response, record it, and yield each chunk.
	 */
	async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		const {
			agentInstance,
			toolRegistry,
			mcpServerAttributions,
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
			telemetry,
			onExecutionRecorded,
			abortSignal,
			includeHitlToolDetails,
			sandboxPrincipalHash,
			hideUserMessageFromTranscript,
			isWakeRun,
			backgroundJobSignal,
		} = config;
		const { threadId, resourceId } = memory;

		yield* this.turnExecutionService.execute({
			agentInstance,
			toolRegistry,
			mcpServerAttributions,
			context: { projectId, agentId, threadId },
			backgroundJobSignal,
			includeHitlToolDetails,
			onExecutionRecorded,
			onSettled: isWakeRun
				? undefined
				: async () => await this.requestPendingBackgroundWake(threadId),
			prepare: async () => {
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
				const messageContext =
					config.messageContext === undefined
						? await this.integrationMessageContextService.getLatest(threadId)
						: config.messageContext;
				const hostMetadata = {
					...encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: sandboxPrincipalHash,
					}),
					...encodeIntegrationMessageContext(messageContext),
				};

				return {
					type: 'start',
					input,
					options: {
						persistence: { threadId, resourceId, hostMetadata },
						executionCounter: createAgentExecutionCounter(this.telemetry, {
							agentId,
							userId,
							runType: telemetry.runType,
						}),
						...modelStreamStallOptions(this.aiConfig),
						...(tracing ? { telemetry: tracing } : {}),
						...(abortSignal ? { abortSignal } : {}),
					},
					recording: {
						threadId,
						access: config.access,
						agentId,
						agentName: agentInstance.name,
						projectId,
						userMessage: hideUserMessageFromTranscript ? null : message,
						author,
						attachments,
						source,
						taskId,
						taskVersionId,
						telemetry: { ...telemetry, userId },
					},
				};
			},
		});
	}

	private async *withRuntimeLease(
		acquire: () => Promise<AgentRuntime>,
		use: (
			runtime: AgentRuntime,
		) => AsyncGenerator<StreamChunk> | Promise<AsyncGenerator<StreamChunk>>,
	): AsyncGenerator<StreamChunk> {
		const runtime = await acquire();
		try {
			yield* await use(runtime);
		} finally {
			this.runtimeCacheService.releaseRuntimeLease(runtime.agent);
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

	/** Record runtime initialization failures before reporting them to the caller. */
	private async getRuntimeOrRecordFailure(
		params: GetRuntimeParams,
		session: Pick<
			StartExecutionParams,
			| 'threadId'
			| 'userMessage'
			| 'author'
			| 'attachments'
			| 'source'
			| 'taskId'
			| 'taskVersionId'
			| 'access'
		> & {
			onExecutionRecorded?: (executionId: string) => void;
			abortSignal?: AbortSignal;
		},
	): Promise<AgentRuntime> {
		const { onExecutionRecorded, abortSignal, ...recording } = session;
		abortSignal?.throwIfAborted();
		try {
			return await this.runtimeCacheService.getRuntime(params);
		} catch (error) {
			abortSignal?.throwIfAborted();
			const { agentId, projectId } = params;
			let agent;
			try {
				agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
			} catch (cause) {
				throw new AgentExecutionRecordingError({ phase: 'create', cause, executionError: error });
			}
			abortSignal?.throwIfAborted();
			if (agent) {
				const selected =
					params.usePublishedVersion && agent.activeVersion?.schema
						? getPublishedAgentSnapshot(agent)
						: agent;
				await this.turnExecutionService.recordFailedStart(
					{
						...recording,
						agentId,
						agentName: selected.schema?.name ?? agent.name,
						projectId,
						telemetry: {
							userId: params.user?.id,
							runType: params.usePublishedVersion ? 'production' : 'test',
							configuration: buildAgentConfigurationTelemetry(selected),
						},
					},
					error,
					onExecutionRecorded,
				);
			}
			throw error;
		}
	}
}
