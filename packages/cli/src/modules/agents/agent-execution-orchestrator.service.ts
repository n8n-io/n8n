import type { Agent as RuntimeAgent, StreamChunk } from '@n8n/agents';
import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import { AgentExecutionService } from './agent-execution.service';
import { AgentRunTracingService, modelIdFromSnapshot } from './agent-run-tracing.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { ExecutionRecorder } from './execution-recorder';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import type { ToolRegistry } from './tool-registry';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { streamAgentChunks } from './utils/agent-stream';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';

import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

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
}

export interface ExecuteForChatPublishedConfig {
	agentId: string;
	projectId: string;
	message: string;
	/** Memory scope — resourceId is the chat platform user (e.g. Slack / Telegram user ID). */
	memory: AgentMemoryScope;
	integrationType?: string;
	// No `user` field here: a published chat integration (Slack, Telegram, …)
	// run is triggered by an inbound platform event, not an interactive n8n
	// session — there is no n8n `User` to attach. This path keeps the
	// project-scoped trust boundary that existed before per-user tool
	// gating; the admin who published the agent is the one who approved its
	// tools, and Layer A's node denylist (`EphemeralNodeExecutor`) still
	// applies regardless.
}

export interface ResumeForChatConfig {
	agentId: string;
	projectId: string;
	runId: string;
	toolCallId: string;
	resumeData: unknown;
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
	// No `user` field here: this run is fired by `ScheduledTaskManager` on a
	// cron tick — there is no human in the loop at all, let alone an n8n
	// session, so there's nothing to gate tools against. Same project-scoped
	// trust boundary as `ExecuteForChatPublishedConfig`.
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

export interface StreamChatResponseConfig {
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	agentId: string;
	userId?: string;
	message: string;
	memory: AgentMemoryScope;
	projectId: string;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	telemetry?: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
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
			integrationType,
			user,
			usePublishedVersion = true,
		} = config;

		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(runId);
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
		});

		const { agent: agentInstance, toolRegistry } = runtime;
		const recorder = new ExecutionRecorder(toolRegistry);
		const runType: AgentRunTelemetryType = usePublishedVersion ? 'production' : 'test';

		try {
			// A resume request carries no `source` of its own — recover it from
			// the suspended run being resumed so tracing stays consistent across
			// the suspend/resume cycle. Skipped entirely when tracing is disabled,
			// since `build()` would discard the result anyway.
			const suspendedExecution = this.agentRunTracingService.enabled
				? await this.agentExecutionService.findLatestSuspendedRun(threadId)
				: undefined;

			const tracing = await this.agentRunTracingService.build({
				agentId,
				projectId,
				threadId,
				userId: user?.id,
				source: suspendedExecution?.source ?? 'unknown',
				modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
			});

			const resultStream = await agentInstance.resume('stream', resumeData, {
				runId,
				toolCallId,
				executionCounter: createAgentExecutionCounter(this.telemetry, {
					agentId,
					userId: user?.id,
				}),
				...(tracing ? { telemetry: tracing } : {}),
			});

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);
				yield value;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record resumed executions — even if they suspend again (chained HITL)
			// or fail while streaming. Don't repeat the original user message — the
			// pre-suspension execution already has it.
			const messageRecord = recorder.getMessageRecord();
			void this.agentExecutionService
				.recordMessage({
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage: null,
					record: messageRecord,
					hitlStatus: recorder.suspended ? 'suspended' : 'resumed',
					telemetry: {
						runType,
						configuration: runtime.telemetryConfiguration,
					},
				})
				.catch((error) => {
					this.logger.warn('Failed to record resumed agent execution', {
						agentId,
						threadId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, user, memory } = config;

		// `user` is always set (see ExecuteForChatConfig) — this builds/reuses a
		// runtime scoped to this specific user's tool access.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			user,
		});

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
			memory,
			projectId: runtime.projectId,
			telemetry: {
				runType: 'test',
				configuration: runtime.telemetryConfiguration,
			},
		});
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, message, memory, integrationType } = config;
		await this.externalHooks.run('agent.preExecute', [agentId]);

		// No `user` (see ExecuteForChatPublishedConfig): this is the shared,
		// project-scoped runtime — every caller of this published agent through
		// this integration reuses the same cache entry regardless of who
		// triggered the platform event.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType,
			usePublishedVersion: true,
		});

		yield* this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			agentId,
			message,
			memory,
			projectId: runtime.projectId,
			source: integrationType,
			telemetry: {
				runType: 'production',
				configuration: runtime.telemetryConfiguration,
			},
		});
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

		// No `user` (see ExecuteForTaskPublishedConfig): cron-fired, no human to
		// attach — same shared, project-scoped runtime for every tick.
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			integrationType: 'task',
			usePublishedVersion: true,
		});

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
		});
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
		const runtime = await this.runtimeCacheService.getRuntime({
			agentId,
			projectId,
			user,
		});

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
		});
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
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
			telemetry,
		} = config;
		const { threadId, resourceId } = memory;

		const recorder = new ExecutionRecorder(toolRegistry);

		try {
			const tracing = await this.agentRunTracingService.build({
				agentId,
				projectId,
				threadId,
				userId,
				source: source ?? 'test',
				modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
			});

			const resultStream = await agentInstance.stream(message, {
				persistence: { threadId, resourceId },
				executionCounter: createAgentExecutionCounter(this.telemetry, { agentId, userId }),
				...(tracing ? { telemetry: tracing } : {}),
			});

			for await (const value of streamAgentChunks(resultStream.stream)) {
				recorder.record(value);
				if (value.type === 'tool-call-suspended') {
					this.logger.info('Chat: tool-call-suspended chunk received', {
						agentId,
						toolCallId: value.toolCallId,
						toolName: value.toolName,
					});
				}
				if (value.type === 'finish' && value.finishReason === 'max-iterations') {
					for (const chunk of getMaxIterationsChunks()) {
						recorder.record(chunk);
						yield chunk;
					}
				}
				yield value;
			}
		} catch (error) {
			recorder.record({ type: 'error', error });
			recorder.record({ type: 'finish', finishReason: 'error' });
			throw error;
		} finally {
			// Always record — even if suspended or failed, the pre-suspension/error
			// response text and tool calls are valuable.
			const messageRecord = recorder.getMessageRecord();
			void this.agentExecutionService
				.recordMessage({
					threadId,
					agentId,
					agentName: agentInstance.name,
					projectId,
					userMessage: message,
					record: messageRecord,
					hitlStatus: recorder.suspended ? 'suspended' : undefined,
					source,
					taskId,
					taskVersionId,
					telemetry,
				})
				.catch((error) => {
					this.logger.warn('Failed to record agent execution', {
						agentId,
						threadId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}
	}
}
