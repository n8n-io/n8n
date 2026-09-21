import {
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
import { getDelegatedChildCheckpoints } from './utils/delegated-child-checkpoints';
import { buildInboundUserMessage } from './utils/inbound-attachments';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';

export interface AgentMemoryScope {
	threadId: string;
	resourceId: string;
}

type PersistedMemoryScope = NonNullable<SerializableAgentState['persistence']>;

type ResumeCheckpointParams = {
	agentId: string;
	projectId: string;
	runId: string;
	expectedMemory: Partial<AgentMemoryScope> | undefined;
	user: User | undefined;
	usePublishedVersion: boolean;
};

type AuthorizedResumeCheckpoint = {
	memoryScope: PersistedMemoryScope;
	sandboxPrincipalHash: AgentSandboxPrincipalHash | undefined;
	access: AgentThreadAccess;
};

type PreparedWake = {
	isDraft: boolean;
	access: AgentThreadAccess;
	integrationType: string;
	messageContext: IntegrationMessageContext | null;
	delivery?: { bridge: AgentChatBridge; threadId: string };
};

type RunTracing = Awaited<ReturnType<AgentRunTracingService['build']>>;

type RuntimeSession = Pick<
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
};

const PROJECT_THREAD_ACCESS = { accessScope: 'project', ownerId: null } as const;

function userThreadAccess(userId: string): AgentThreadAccess {
	return { accessScope: 'user', ownerId: userId };
}

function matchesExpectedMemory(
	memoryScope: PersistedMemoryScope,
	expectedMemory: Partial<AgentMemoryScope> | undefined,
): boolean {
	return !(
		(expectedMemory?.threadId !== undefined && memoryScope.threadId !== expectedMemory.threadId) ||
		(expectedMemory?.resourceId !== undefined &&
			memoryScope.resourceId !== expectedMemory.resourceId)
	);
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

	private async canUsePreviewMemory(
		memory: AgentMemoryScope,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<boolean> {
		if (memory.resourceId !== draftChatMemoryResourceId(userId)) return false;
		return await this.agentExecutionService.canUsePreviewThread(
			memory.threadId,
			projectId,
			agentId,
			userId,
		);
	}

	private async requirePreviewAccess(
		memory: AgentMemoryScope,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<AgentThreadAccess> {
		if (!(await this.canUsePreviewMemory(memory, projectId, agentId, userId))) {
			throw new UserError('Session not found');
		}
		return userThreadAccess(userId);
	}

	async cancelChatRun(params: {
		agentId: string;
		runId: string;
		resourceId: string;
	}): Promise<boolean> {
		const run = await this.findCancellableChatRun(params);
		if (!run) return false;

		const childCheckpoints = getDelegatedChildCheckpoints(run.checkpoint, params.agentId);
		if (
			run.isActive &&
			!(await this.n8nCheckpointStorage.cancelSuspended(
				params.runId,
				run.checkpoint,
				params.agentId,
			))
		) {
			return false;
		}

		await Promise.all(
			childCheckpoints.map(
				async ({ runId, agentId }) => await this.n8nCheckpointStorage.delete(runId, agentId),
			),
		);
		await this.n8nCheckpointStorage.delete(params.runId, params.agentId);
		return true;
	}

	private async findCancellableChatRun(params: {
		agentId: string;
		runId: string;
		resourceId: string;
	}) {
		const checkpointStatus = await this.n8nCheckpointStorage.getStatus(
			params.runId,
			params.agentId,
		);
		if (checkpointStatus.status === 'not-found' || checkpointStatus.checkpoint === undefined) {
			return null;
		}

		const { checkpoint } = checkpointStatus;
		if (
			checkpoint.status !== 'suspended' ||
			checkpoint.persistence?.delegated === true ||
			checkpoint.persistence?.resourceId !== params.resourceId
		) {
			return null;
		}
		const thread = await this.agentExecutionService.findThreadById(checkpoint.persistence.threadId);
		const userId = userIdFromDraftChatMemoryResourceId(params.resourceId);
		if (thread && (!userId || !threadBelongsTo(thread, thread.projectId, params.agentId, userId))) {
			return null;
		}
		return { checkpoint, isActive: checkpointStatus.status === 'active' };
	}

	private async loadResumeCheckpoint(
		params: ResumeCheckpointParams,
	): Promise<AuthorizedResumeCheckpoint> {
		const memoryScope = await this.loadResumeMemoryScope(params);
		const access = await this.resolveResumeAccess(params, memoryScope);
		const sandboxPrincipalHash = this.resolveResumeSandboxPrincipal(params, memoryScope);
		return { memoryScope, sandboxPrincipalHash, access };
	}

	private async loadResumeMemoryScope(
		params: ResumeCheckpointParams,
	): Promise<PersistedMemoryScope> {
		const { agentId, runId, expectedMemory } = params;
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
		if (!matchesExpectedMemory(memoryScope, expectedMemory)) {
			throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
		}
		return memoryScope;
	}

	private async resolveResumeAccess(
		params: ResumeCheckpointParams,
		memoryScope: PersistedMemoryScope,
	): Promise<AgentThreadAccess> {
		const { agentId, projectId, runId, user, usePublishedVersion } = params;
		const isPreview = !usePublishedVersion && !isTaskRunMemoryResourceId(memoryScope.resourceId);
		if (isPreview) {
			if (!user || !(await this.canUsePreviewMemory(memoryScope, projectId, agentId, user.id))) {
				throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
			}
			return userThreadAccess(user.id);
		}

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
		return PROJECT_THREAD_ACCESS;
	}

	private resolveResumeSandboxPrincipal(
		params: ResumeCheckpointParams,
		memoryScope: PersistedMemoryScope,
	): AgentSandboxPrincipalHash | undefined {
		const { projectId, runId, user, usePublishedVersion } = params;
		const sandboxScope = decodeAgentSandboxHostMetadata(memoryScope.hostMetadata);
		const sandboxPrincipalHash = sandboxScope?.principalHash;
		if (!this.agentSandboxRuntimeService.isEnabled()) return sandboxPrincipalHash;
		if (!sandboxScope || sandboxScope.projectId !== projectId || !sandboxPrincipalHash) {
			throw new UserError(`Checkpoint ${runId} is unavailable and cannot be resumed`);
		}
		if (
			!usePublishedVersion &&
			(!user ||
				sandboxPrincipalHash !== hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id }))
		) {
			throw new UserError(`Checkpoint ${runId} is unavailable and cannot be resumed`);
		}
		return sandboxPrincipalHash;
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, runId, expectedMemory, user } = config;
		const usePublishedVersion = config.usePublishedVersion ?? true;
		const { memoryScope, sandboxPrincipalHash, access } = await this.loadResumeCheckpoint({
			agentId,
			projectId,
			runId,
			expectedMemory,
			user,
			usePublishedVersion,
		});
		const checkpoint = { memoryScope, sandboxPrincipalHash, access };
		yield* this.withRuntimeLease(
			async () => await this.acquireResumeRuntime(config, checkpoint, usePublishedVersion),
			(runtime) => this.executeResumeTurn(config, runtime, checkpoint, usePublishedVersion),
		);
	}

	private async acquireResumeRuntime(
		config: ResumeForChatConfig,
		checkpoint: AuthorizedResumeCheckpoint,
		usePublishedVersion: boolean,
	): Promise<AgentRuntime> {
		const { agentId, projectId, integrationType, user, source, onExecutionRecorded, abortSignal } =
			config;
		const { memoryScope, sandboxPrincipalHash, access } = checkpoint;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				usePublishedVersion,
				integrationType,
				user: usePublishedVersion ? undefined : user,
				...(sandboxPrincipalHash ? { sandboxPrincipalHash } : {}),
				previewChat: config.previewChat,
			},
			{
				threadId: memoryScope.threadId,
				userMessage: null,
				source,
				onExecutionRecorded,
				abortSignal,
				access,
			},
		);
	}

	private executeResumeTurn(
		config: ResumeForChatConfig,
		runtime: AgentRuntime,
		checkpoint: AuthorizedResumeCheckpoint,
		usePublishedVersion: boolean,
	): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, onExecutionRecorded } = config;
		const { threadId } = checkpoint.memoryScope;
		return this.turnExecutionService.execute({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			context: { projectId, agentId, threadId },
			includeHitlToolDetails: !usePublishedVersion,
			onExecutionRecorded,
			onSettled: async (suspended) => {
				if (!suspended) await this.requestPendingBackgroundWake(threadId);
			},
			prepare: async () =>
				await this.prepareResumeTurn(config, runtime, checkpoint, usePublishedVersion),
		});
	}

	private async prepareResumeTurn(
		config: ResumeForChatConfig,
		runtime: AgentRuntime,
		checkpoint: AuthorizedResumeCheckpoint,
		usePublishedVersion: boolean,
	) {
		const { agentId, projectId, resumeData, user } = config;
		const { memoryScope } = checkpoint;
		const threadId = memoryScope.threadId;
		const executionSource = await this.resolveResumeExecutionSource(config.source, threadId);
		const runType: AgentRunTelemetryType = usePublishedVersion ? 'production' : 'test';
		const tracing = await this.agentRunTracingService.build({
			agentId,
			projectId,
			threadId,
			userId: user?.id,
			source: executionSource ?? 'unknown',
			modelId: modelIdFromSnapshot(runtime.agent.snapshot.model),
		});
		const messageContext = await this.resolveResumeMessageContext(config, memoryScope);

		return {
			type: 'resume' as const,
			resumeData,
			options: this.resumeTurnOptions(config, memoryScope, messageContext, tracing, runType),
			recording: this.resumeTurnRecording(config, runtime, checkpoint, executionSource, runType),
		};
	}

	private resumeTurnOptions(
		config: ResumeForChatConfig,
		memoryScope: PersistedMemoryScope,
		messageContext: IntegrationMessageContext | null,
		tracing: RunTracing,
		runType: AgentRunTelemetryType,
	) {
		const { agentId, runId, toolCallId, user, abortSignal } = config;
		return {
			runId,
			toolCallId,
			hostMetadata: encodeIntegrationMessageContext(messageContext),
			...this.resumeClaimHandler(config, memoryScope, messageContext),
			executionCounter: createAgentExecutionCounter(this.telemetry, {
				agentId,
				userId: user?.id,
				runType,
			}),
			...modelStreamStallOptions(this.aiConfig),
			...(tracing ? { telemetry: tracing } : {}),
			...(abortSignal ? { abortSignal } : {}),
		};
	}

	private resumeTurnRecording(
		config: ResumeForChatConfig,
		runtime: AgentRuntime,
		checkpoint: AuthorizedResumeCheckpoint,
		executionSource: string | undefined,
		runType: AgentRunTelemetryType,
	): StartExecutionParams {
		return {
			access: checkpoint.access,
			threadId: checkpoint.memoryScope.threadId,
			agentId: config.agentId,
			agentName: runtime.agent.name,
			projectId: config.projectId,
			userMessage: null,
			...(executionSource !== undefined ? { source: executionSource } : {}),
			telemetry: {
				userId: config.user?.id,
				runType,
				configuration: runtime.telemetryConfiguration,
			},
		};
	}

	private async resolveResumeExecutionSource(source: string | undefined, threadId: string) {
		if (!this.agentRunTracingService.enabled || source !== undefined) return source;
		return (await this.agentExecutionService.findLatestSuspendedRun(threadId))?.source ?? undefined;
	}

	private async resolveResumeMessageContext(
		config: ResumeForChatConfig,
		memoryScope: PersistedMemoryScope,
	): Promise<IntegrationMessageContext | null> {
		if (config.messageContext === undefined) {
			return await this.integrationMessageContextService.getForResume(memoryScope);
		}
		if (!config.messageContext || !config.contextConversation) return config.messageContext;
		return inheritIntegrationMessageContext(
			config.messageContext,
			await this.integrationMessageContextService.getForResume(memoryScope),
		);
	}

	private resumeClaimHandler(
		config: ResumeForChatConfig,
		memoryScope: PersistedMemoryScope,
		messageContext: IntegrationMessageContext | null,
	) {
		const conversation = config.contextConversation;
		if (!messageContext || !conversation) return {};
		return {
			onResumeClaimed: async () =>
				await this.integrationMessageContextService.installIncoming(
					messageContext,
					memoryScope,
					conversation,
				),
		};
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const { agentId, projectId, user, memory } = config;
		const access = await this.requirePreviewAccess(memory, projectId, agentId, user.id);
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: user.id,
		});
		yield* this.withRuntimeLease(
			async () => await this.acquirePreviewRuntime(config, access, sandboxPrincipalHash),
			async (runtime) =>
				await this.executePreviewChat(config, runtime, access, sandboxPrincipalHash),
		);
	}

	private async acquirePreviewRuntime(
		config: ExecuteForChatConfig,
		access: AgentThreadAccess,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): Promise<AgentRuntime> {
		const {
			agentId,
			projectId,
			user,
			memory,
			message,
			attachments,
			source,
			onExecutionRecorded,
			abortSignal,
		} = config;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				user,
				sandboxPrincipalHash,
				previewChat: config.previewChat,
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
		);
	}

	private async executePreviewChat(
		config: ExecuteForChatConfig,
		runtime: AgentRuntime,
		access: AgentThreadAccess,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): Promise<AsyncGenerator<StreamChunk>> {
		const {
			agentId,
			user,
			message,
			attachments,
			memory,
			source,
			onExecutionRecorded,
			abortSignal,
		} = config;
		const messageContext = this.previewMessageContext(user.id, memory.threadId);
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
			telemetry: { runType: 'test', configuration: runtime.telemetryConfiguration },
			onExecutionRecorded,
			abortSignal,
			includeHitlToolDetails: true,
			sandboxPrincipalHash,
		});
	}

	private previewMessageContext(userId: string, threadId: string): IntegrationMessageContext {
		return {
			integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
			platform: N8N_CHAT_INTEGRATION_TYPE,
			target: { type: 'dm', userId, threadId },
			interactingUserId: userId,
			updatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		await this.externalHooks.run('agent.preExecute', [config.agentId]);
		yield* this.withRuntimeLease(
			async () => await this.acquirePublishedChatRuntime(config),
			async (runtime) => await this.executePublishedChat(config, runtime),
		);
	}

	private async acquirePublishedChatRuntime(
		config: ExecuteForChatPublishedConfig,
	): Promise<AgentRuntime> {
		const { agentId, projectId, memory, message, author, attachments, integrationType } = config;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType,
				usePublishedVersion: true,
				sandboxPrincipalHash: config.sandboxPrincipalHash,
			},
			{
				threadId: memory.threadId,
				userMessage: message,
				author,
				attachments,
				source: integrationType,
				access: PROJECT_THREAD_ACCESS,
			},
		);
	}

	private async executePublishedChat(
		config: ExecuteForChatPublishedConfig,
		runtime: AgentRuntime,
	): Promise<AsyncGenerator<StreamChunk>> {
		const messageContext = await this.preparePublishedMessageContext(config);
		return this.streamChatResponse({
			messageContext,
			access: PROJECT_THREAD_ACCESS,
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			agentId: config.agentId,
			message: config.message,
			modelMessage: config.modelMessage,
			author: config.author,
			attachments: config.attachments,
			memory: config.memory,
			projectId: runtime.projectId,
			source: config.integrationType,
			telemetry: { runType: 'production', configuration: runtime.telemetryConfiguration },
			sandboxPrincipalHash: config.sandboxPrincipalHash,
		});
	}

	private async preparePublishedMessageContext(
		config: ExecuteForChatPublishedConfig,
	): Promise<IntegrationMessageContext | null | undefined> {
		const { messageContext, contextConversation, memory } = config;
		if (!messageContext || !contextConversation) return messageContext;
		const inherited = inheritIntegrationMessageContext(
			messageContext,
			await this.integrationMessageContextService.getLatestForIncoming(memory.threadId),
		);
		await this.integrationMessageContextService.installIncoming(
			inherited,
			memory,
			contextConversation,
		);
		return inherited;
	}

	/**
	 * Execute a published agent for a scheduled task, stamping `source='task'`
	 * and the originating `taskId` on the recorded session for traceability.
	 */
	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		await this.externalHooks.run('agent.preExecute', [config.agentId]);
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'scheduled-task',
			taskId: config.taskId,
		});
		yield* this.withRuntimeLease(
			async () => await this.acquirePublishedTaskRuntime(config, sandboxPrincipalHash),
			(runtime) => this.executePublishedTask(config, runtime, sandboxPrincipalHash),
		);
	}

	private async acquirePublishedTaskRuntime(
		config: ExecuteForTaskPublishedConfig,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): Promise<AgentRuntime> {
		return await this.getRuntimeOrRecordFailure(
			{
				agentId: config.agentId,
				projectId: config.projectId,
				integrationType: 'task',
				usePublishedVersion: true,
				sandboxPrincipalHash,
				allowBackgroundTasks: false,
			},
			{
				threadId: config.memory.threadId,
				userMessage: config.message,
				source: 'task',
				taskId: config.taskId,
				taskVersionId: config.taskVersionId,
				access: PROJECT_THREAD_ACCESS,
			},
		);
	}

	private executePublishedTask(
		config: ExecuteForTaskPublishedConfig,
		runtime: AgentRuntime,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): AsyncGenerator<StreamChunk> {
		return this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			agentId: config.agentId,
			message: config.message,
			memory: config.memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId: config.taskId,
			taskVersionId: config.taskVersionId,
			access: PROJECT_THREAD_ACCESS,
			telemetry: { runType: 'production', configuration: runtime.telemetryConfiguration },
			sandboxPrincipalHash,
		});
	}

	/**
	 * Execute a task on demand against the current (draft) config as the
	 * requesting user.
	 */
	async *executeForTaskNow(config: ExecuteForTaskNowConfig): AsyncGenerator<StreamChunk> {
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: config.user.id,
		});
		yield* this.withRuntimeLease(
			async () => await this.acquireManualTaskRuntime(config, sandboxPrincipalHash),
			(runtime) => this.executeManualTask(config, runtime, sandboxPrincipalHash),
		);
	}

	private async acquireManualTaskRuntime(
		config: ExecuteForTaskNowConfig,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): Promise<AgentRuntime> {
		return await this.getRuntimeOrRecordFailure(
			{
				agentId: config.agentId,
				projectId: config.projectId,
				user: config.user,
				sandboxPrincipalHash,
				allowBackgroundTasks: false,
			},
			{
				threadId: config.memory.threadId,
				userMessage: config.message,
				source: 'task',
				taskId: config.taskId,
				access: PROJECT_THREAD_ACCESS,
			},
		);
	}

	private executeManualTask(
		config: ExecuteForTaskNowConfig,
		runtime: AgentRuntime,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	): AsyncGenerator<StreamChunk> {
		return this.streamChatResponse({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			agentId: config.agentId,
			userId: config.user.id,
			message: config.message,
			memory: config.memory,
			projectId: runtime.projectId,
			source: 'task',
			taskId: config.taskId,
			access: PROJECT_THREAD_ACCESS,
			telemetry: { runType: 'test', configuration: runtime.telemetryConfiguration },
			sandboxPrincipalHash,
		});
	}

	async executeForWake(config: ExecuteForWakeConfig): Promise<void> {
		const prepared = await this.prepareWake(config);
		const stream = this.withRuntimeLease(
			async () => await this.acquireWakeRuntime(config, prepared),
			(runtime) => this.executeWakeTurn(config, runtime, prepared),
		);
		for await (const _chunk of stream) {
			// Complete execution and reply delivery within the runtime lease.
		}
	}

	private async prepareWake(config: ExecuteForWakeConfig): Promise<PreparedWake> {
		const { agentId, projectId, memory, identity } = config;
		const isDraft = identity.type === 'draft';
		const access = isDraft
			? await this.requirePreviewAccess(memory, projectId, agentId, identity.user.id)
			: PROJECT_THREAD_ACCESS;
		if (!isDraft) await this.externalHooks.run('agent.preExecute', [agentId]);

		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;
		const messageContext = await this.integrationMessageContextService.getLatest(memory.threadId);
		const delivery = isDraft
			? undefined
			: await this.getWakeDelivery(agentId, integrationType, messageContext);
		return { isDraft, access, integrationType, messageContext, delivery };
	}

	private async acquireWakeRuntime(
		config: ExecuteForWakeConfig,
		prepared: PreparedWake,
	): Promise<AgentRuntime> {
		const { agentId, projectId, memory, identity, abortSignal } = config;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType: prepared.integrationType,
				usePublishedVersion: !prepared.isDraft,
				...(identity.type === 'draft' ? { user: identity.user } : {}),
				sandboxPrincipalHash: identity.principalHash,
			},
			{
				threadId: memory.threadId,
				userMessage: null,
				source: prepared.integrationType,
				abortSignal,
				access: prepared.access,
			},
		);
	}

	private executeWakeTurn(
		config: ExecuteForWakeConfig,
		runtime: AgentRuntime,
		prepared: PreparedWake,
	): AsyncGenerator<StreamChunk> {
		const { agentId, message, memory, identity, abortSignal, backgroundJobSignal } = config;
		const response = this.streamChatResponse({
			access: prepared.access,
			messageContext: prepared.messageContext,
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			agentId,
			...(identity.type === 'draft' ? { userId: identity.user.id } : {}),
			message,
			memory,
			projectId: runtime.projectId,
			source: prepared.integrationType,
			telemetry: {
				runType: prepared.isDraft ? 'test' : 'production',
				configuration: runtime.telemetryConfiguration,
			},
			abortSignal,
			includeHitlToolDetails: prepared.isDraft,
			sandboxPrincipalHash: identity.principalHash,
			hideUserMessageFromTranscript: true,
			isWakeRun: true,
			backgroundJobSignal,
		});
		return this.streamWakeResponse(response, abortSignal, prepared.delivery);
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
			memory,
			projectId,
			onExecutionRecorded,
			includeHitlToolDetails,
			isWakeRun,
			backgroundJobSignal,
		} = config;
		const { threadId } = memory;

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
			prepare: async () => await this.prepareStartTurn(config),
		});
	}

	private async prepareStartTurn(config: StreamChatResponseConfig) {
		const { agentInstance, agentId, userId, memory, projectId, source } = config;
		const { threadId } = memory;
		const tracing = await this.agentRunTracingService.build({
			agentId,
			projectId,
			threadId,
			userId,
			source: source ?? 'test',
			modelId: modelIdFromSnapshot(agentInstance.snapshot.model),
		});
		const messageContext =
			config.messageContext === undefined
				? await this.integrationMessageContextService.getLatest(threadId)
				: config.messageContext;

		return {
			type: 'start' as const,
			input: this.startTurnInput(config),
			options: this.startTurnOptions(config, messageContext, tracing),
			recording: this.startTurnRecording(config),
		};
	}

	private startTurnOptions(
		config: StreamChatResponseConfig,
		messageContext: IntegrationMessageContext | null,
		tracing: RunTracing,
	) {
		const { agentId, userId, memory, projectId, telemetry, abortSignal, sandboxPrincipalHash } =
			config;
		return {
			persistence: {
				...memory,
				hostMetadata: {
					...encodeAgentSandboxHostMetadata({
						projectId,
						principalHash: sandboxPrincipalHash,
					}),
					...encodeIntegrationMessageContext(messageContext),
				},
			},
			executionCounter: createAgentExecutionCounter(this.telemetry, {
				agentId,
				userId,
				runType: telemetry.runType,
			}),
			...modelStreamStallOptions(this.aiConfig),
			...(tracing ? { telemetry: tracing } : {}),
			...(abortSignal ? { abortSignal } : {}),
		};
	}

	private startTurnRecording(config: StreamChatResponseConfig): StartExecutionParams {
		const {
			agentInstance,
			agentId,
			userId,
			message,
			author,
			attachments,
			memory,
			projectId,
			source,
			taskId,
			taskVersionId,
			telemetry,
			hideUserMessageFromTranscript,
		} = config;
		return {
			threadId: memory.threadId,
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
		};
	}

	private startTurnInput(config: StreamChatResponseConfig) {
		const modelMessage = config.modelMessage ?? config.message;
		return config.attachments?.length
			? buildInboundUserMessage(modelMessage, config.attachments)
			: modelMessage;
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
		session: RuntimeSession,
	): Promise<AgentRuntime> {
		const { onExecutionRecorded, abortSignal, ...recording } = session;
		abortSignal?.throwIfAborted();
		try {
			return await this.runtimeCacheService.getRuntime(params);
		} catch (error) {
			abortSignal?.throwIfAborted();
			await this.recordRuntimeFailure(params, recording, error, onExecutionRecorded, abortSignal);
			throw error;
		}
	}

	private async recordRuntimeFailure(
		params: GetRuntimeParams,
		recording: Omit<RuntimeSession, 'onExecutionRecorded' | 'abortSignal'>,
		error: unknown,
		onExecutionRecorded: ((executionId: string) => void) | undefined,
		abortSignal: AbortSignal | undefined,
	): Promise<void> {
		const { agentId, projectId } = params;
		let agent;
		try {
			agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		} catch (cause) {
			throw new AgentExecutionRecordingError({ phase: 'create', cause, executionError: error });
		}
		abortSignal?.throwIfAborted();
		if (!agent) return;

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
}
