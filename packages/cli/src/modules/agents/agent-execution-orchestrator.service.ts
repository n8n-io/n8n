import {
	type Agent as RuntimeAgent,
	type SerializableAgentState,
	type StreamChunk,
} from '@n8n/agents';
import type {
	AgentBackgroundJobSignal,
	AgentMessageAuthor,
	AgentChatMessagesResponse,
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
import {
	AgentChatExecutionService,
	type CancelSuspendedRunParams,
} from './agent-chat-execution.service';
import type { AgentThreadAccess } from './entities/agent-execution-thread.entity';
import type { AgentSessionMode } from './utils/agent-thread-access';
import {
	draftChatMemoryResourceId,
	isTaskRunMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';
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
	isAgentSandboxPrincipalHash,
	type AgentSandboxPrincipalHash,
} from './agent-sandbox-principal';
import { AgentSandboxRuntimeService } from './agent-sandbox-runtime.service';
import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { AgentTurnExecutionService, type AgentTurnRequest } from './agent-turn-execution.service';
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
import { AgentBackgroundJobRepository } from './repositories/agent-background-job.repository';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { BACKGROUND_APPROVAL_RUN_PREFIX } from './background/sub-agent-background-state';
import type { ToolRegistry } from './tool-registry';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import type { AgentExecutionAdmission } from './types/agent-queued-message';
import { createAgentExecutionCounter } from './utils/agent-execution-counter';
import { getPublishedAgentSnapshot } from './utils/agent-published-snapshot';
import { buildInboundUserMessage } from './utils/inbound-attachments';
import { executionsToMessagesDto } from './utils/execution-to-message-mapper';

export interface AgentMemoryScope {
	threadId: string;
	resourceId: string;
}

interface AgentExecutionInput {
	agentId: string;
	projectId: string;
	/** User message recorded in the execution transcript. */
	message: string;
	/** Memory scope for this execution. Task runs use a separate resource ID. */
	memory: AgentMemoryScope;
}

interface ChatExecutionInput extends AgentExecutionInput {
	admittedExecution?: AgentExecutionAdmission;
	abortSignal?: AbortSignal;
	sessionMode?: AgentSessionMode;
	/** Stored attachments for the user turn. */
	attachments?: StoredAttachmentRef[];
}

interface ChatExecutionCallbacks {
	onExecutionStarted?: (executionId: string, sessionId: string) => void;
	/** Runs after the turn is stored. Adds the execution ID to the SSE done event. */
	onExecutionRecorded?: (executionId: string) => void;
}

export interface ExecuteForChatConfig extends ChatExecutionInput, ChatExecutionCallbacks {
	/**
	 * The calling n8n user — used to gate node/workflow tools by their access,
	 * and for RBAC / credential resolution and telemetry attribution. Always
	 * present: the in-app test chat only runs behind an authenticated session
	 * (`AgentChatController.chat` always has `req.user`).
	 */
	user: User;
	/** Identifies the surface that started the draft test run. */
	source?: string;
	/**
	 * Set by the in-app preview chat, which builds the runtime with an extra
	 * instruction saying the agent cannot change its own setup. Other draft
	 * callers (AI Assistant test calls, MCP, "Run now") leave it unset.
	 */
	previewChat?: boolean;
	abortSignal?: AbortSignal;
}

export interface ExecuteForChatPublishedConfig extends ChatExecutionInput {
	messageContext?: IntegrationMessageContext | null;
	/** Platform conversation metadata scope. Execution memory can belong to a task. */
	contextConversation?: SessionBinding;
	/** What the model receives when it differs from `message`, e.g. with an author label or thread history. */
	modelMessage?: string;
	/** Chat platform user who wrote the turn; shown as the sender in the sessions view. */
	author?: AgentMessageAuthor;
	integrationType?: string;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	// No `user` field here: a published chat integration (Slack, Telegram, …)
	// run is triggered by an inbound platform event, not an interactive n8n
	// session — there is no n8n `User` to attach. The admin who published the
	// agent is the one who approved its
	// tools, and Layer A's node denylist (`EphemeralNodeExecutor`) still
	// applies regardless.
}

export interface ResumeForChatConfig extends ChatExecutionCallbacks {
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
	/** Allows an automatic preview resume to overlap its predecessor's finalization. */
	automaticPreviewContinuation?: boolean;
	abortSignal?: AbortSignal;
}

export interface ExecuteForTaskPublishedConfig extends AgentExecutionInput {
	/** The scheduled task this run belongs to; stamped on the session for traceability. */
	taskId: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId: string;
}

export interface ExecuteForTaskNowConfig extends AgentExecutionInput {
	/**
	 * The calling n8n user — used to gate node/workflow tools by their
	 * access, and for RBAC / credential resolution and recorded on the
	 * session. Always present: manual "Run now" is triggered by an authenticated
	 * `AgentTasksController.runTaskNow` request, threaded down via
	 * `AgentTaskService.runNow(agentId, taskId, user)`.
	 */
	user: User;
	/** The task this manual run belongs to; stamped on the session for traceability. */
	taskId: string;
}

export interface ExecuteForWakeConfig extends AgentExecutionInput {
	backgroundJobSignal: AgentBackgroundJobSignal;
	abortSignal: AbortSignal;
	identity:
		| { type: 'draft'; user: User; principalHash: AgentSandboxPrincipalHash }
		| {
				type: 'published';
				integrationType: string;
				principalHash: AgentSandboxPrincipalHash;
		  };
}

export interface StreamChatResponseConfig extends ChatExecutionInput, ChatExecutionCallbacks {
	onAdmitted?: () => Promise<void>;
	access: AgentThreadAccess;
	messageContext?: IntegrationMessageContext | null;
	agentInstance: RuntimeAgent;
	toolRegistry: ToolRegistry;
	/** See `AgentRuntime.mcpServerAttributions`. */
	mcpServerAttributions: Map<string, string>;
	userId?: string;
	/** What the model receives when it differs from `message`. */
	modelMessage?: string;
	/** Chat platform user who wrote the turn; shown as the sender in the sessions view. */
	author?: AgentMessageAuthor;
	source?: string;
	taskId?: string;
	taskVersionId?: string;
	telemetry: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
	previewChat?: boolean;
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
interface ResumeCheckpoint {
	memoryScope: NonNullable<SerializableAgentState['persistence']>;
	sandboxPrincipalHash: AgentSandboxPrincipalHash | undefined;
	access: AgentThreadAccess;
}

type ResumeChatConfig = ResumeForChatConfig & { usePublishedVersion: boolean };
type DraftChatConfig = ExecuteForChatConfig & { sessionMode: AgentSessionMode };

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
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly backgroundJobRepository: AgentBackgroundJobRepository,
		private readonly backgroundJobService: AgentBackgroundJobService,
	) {}

	async getSessionMode(threadId: string): Promise<AgentSessionMode> {
		return await this.agentExecutionService.getSessionMode(threadId);
	}

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
	}): Promise<Pick<AgentChatMessagesResponse, 'messages' | 'activeExecutionId'> | null> {
		const { threadId, projectId, agentId, userId } = params;
		const detail = await this.agentExecutionService.getThreadDetail(
			threadId,
			projectId,
			agentId,
			userId,
		);
		if (!detail) return null;
		return {
			messages: executionsToMessagesDto(detail.executions),
			activeExecutionId:
				detail.executions.findLast((execution) => execution.status === 'running')?.id ?? null,
		};
	}

	async cancelChatRun(params: CancelSuspendedRunParams): Promise<boolean> {
		return await this.chatExecutionService.cancelSuspended(params);
	}

	private async loadResumeCheckpoint(config: ResumeChatConfig): Promise<ResumeCheckpoint> {
		const memoryScope = await this.loadResumeMemory(config);
		const access = await this.resolveResumeAccess(config, memoryScope);
		const sandboxPrincipalHash = this.validateResumeSandbox(config, memoryScope);
		return { memoryScope, sandboxPrincipalHash, access };
	}

	private async loadResumeMemory({ agentId, runId, expectedMemory }: ResumeChatConfig) {
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
		return memoryScope;
	}

	private async resolveResumeAccess(
		{ agentId, projectId, runId, user, usePublishedVersion, previewChat }: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
	): Promise<AgentThreadAccess> {
		const isPreview = !usePublishedVersion && !isTaskRunMemoryResourceId(memoryScope.resourceId);
		let access: AgentThreadAccess = { accessScope: 'project', ownerId: null };
		if (isPreview) {
			if (
				!user ||
				memoryScope.resourceId !== draftChatMemoryResourceId(user.id) ||
				!(await this.agentExecutionService.canUseDraftThread(
					memoryScope.threadId,
					projectId,
					agentId,
					user.id,
					{ previewChat, sessionMode: 'existing' },
				))
			) {
				throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
			}
			access = { accessScope: 'user', ownerId: user.id };
		} else {
			const thread = await this.agentExecutionService.findThreadById(memoryScope.threadId);
			if (
				userIdFromDraftChatMemoryResourceId(memoryScope.resourceId) ||
				!thread ||
				thread.projectId !== projectId ||
				thread.agentId !== agentId ||
				thread.accessScope !== 'project'
			) {
				throw new UserError(`Checkpoint ${runId} does not belong to this chat`);
			}
		}
		return access;
	}

	private validateResumeSandbox(
		{ projectId, runId, user, usePublishedVersion }: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
	): AgentSandboxPrincipalHash | undefined {
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
		return sandboxPrincipalHash;
	}

	/**
	 * Resume a suspended tool call and yield the resulting stream chunks.
	 * Used by chat integration handlers to continue an agent run after
	 * a human-in-the-loop action (button click, modal submission).
	 */
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		if (await this.resumeBackgroundForChat(config)) return;
		const resume = { ...config, usePublishedVersion: config.usePublishedVersion ?? true };
		const checkpoint = await this.loadResumeCheckpoint(resume);
		yield* this.withRuntimeLease(
			async () => await this.getResumeRuntime(resume, checkpoint),
			(runtime) => this.resumeRuntimeTurn(resume, checkpoint, runtime),
		);
	}

	async resumeBackgroundForChat(config: ResumeForChatConfig): Promise<boolean> {
		if (!config.runId.startsWith(BACKGROUND_APPROVAL_RUN_PREFIX)) return false;
		const job = await this.backgroundJobRepository.findById(
			config.runId.slice(BACKGROUND_APPROVAL_RUN_PREFIX.length),
		);
		if (!job || job.parentAgentId !== config.agentId || job.status !== 'suspended') {
			throw new UserError('This background approval is no longer available');
		}
		const resume = { ...config, usePublishedVersion: config.usePublishedVersion ?? true };
		const approval = await this.backgroundJobService.getApproval(job);
		if (
			!approval ||
			approval.token !== config.toolCallId ||
			!isAgentSandboxPrincipalHash(job.parentPrincipalHash) ||
			approval.scope.projectId !== config.projectId
		) {
			throw new UserError('This background approval is no longer available');
		}
		const memoryScope = {
			threadId: job.parentThreadId,
			resourceId: job.parentResourceId,
			hostMetadata: encodeAgentSandboxHostMetadata({
				projectId: config.projectId,
				principalHash: job.parentPrincipalHash,
			}),
		};
		if (
			(config.expectedMemory?.threadId !== undefined &&
				config.expectedMemory.threadId !== memoryScope.threadId) ||
			(config.expectedMemory?.resourceId !== undefined &&
				config.expectedMemory.resourceId !== memoryScope.resourceId)
		) {
			throw new UserError('This background approval does not belong to this chat');
		}
		await this.resolveResumeAccess(resume, memoryScope);
		this.validateResumeSandbox(resume, memoryScope);
		if (resume.usePublishedVersion) {
			const expected = approval.metadata.messageContext;
			const actual = config.messageContext;
			const destination = expected?.replyTarget ?? expected?.target;
			if (
				!expected ||
				!actual ||
				actual.platform !== expected.platform ||
				actual.integrationConnectionId !== expected.integrationConnectionId ||
				!destination?.threadId ||
				actual.target.threadId !== destination.threadId
			) {
				throw new UserError('This background approval does not belong to this chat');
			}
		}
		const { SubAgentBackgroundRunner } = await import(
			'./background/sub-agent-background-runner.js'
		);
		const { AgentsCredentialProvider } = await import('./adapters/agents-credential-provider.js');
		const { CredentialsService } = await import('@/credentials/credentials.service.js');
		await Container.get(SubAgentBackgroundRunner).resume(
			job,
			{ token: config.toolCallId, resumeData: config.resumeData },
			{
				projectId: config.projectId,
				parentAgentId: job.parentAgentId,
				credentialProvider: new AgentsCredentialProvider(
					Container.get(CredentialsService),
					config.projectId,
					config.user,
					job.subAgentId ?? undefined,
				),
				runType: resume.usePublishedVersion ? 'production' : 'test',
				workflowToolExecutionMode: resume.usePublishedVersion ? 'integrated' : 'manual',
				user: config.user,
			},
		);
		return true;
	}

	async deliverBackgroundApproval(
		config: Pick<ExecuteForWakeConfig, 'agentId' | 'projectId' | 'memory' | 'identity'>,
		title: string,
		approval: NonNullable<Awaited<ReturnType<AgentBackgroundJobService['getApproval']>>>,
	): Promise<void> {
		if (config.identity.type === 'draft') {
			await this.assertDraftChatAccess({
				...config,
				user: config.identity.user,
				sessionMode: 'existing',
			});
			return;
		}
		const delivery = await this.getWakeDelivery(
			config.agentId,
			config.identity.integrationType,
			approval.metadata.messageContext,
		);
		await delivery.bridge.deliverBackgroundApproval(delivery.threadId, {
			jobId: approval.metadata.jobId,
			title,
			token: approval.token,
			toolCall: {
				type: 'tool-call-suspended',
				runId: approval.runId,
				toolCallId: approval.pending.toolCallId,
				toolName: approval.pending.toolName,
				input: approval.pending.input,
				suspendPayload: approval.pending.suspendPayload,
				resumeSchema: approval.pending.resumeSchema,
			},
		});
	}

	/**
	 * Execute an agent for the in-app test chat and yield stream chunks.
	 */
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		const draft = { ...config, sessionMode: config.sessionMode ?? 'new' };
		const sandboxPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: config.user.id,
		});
		await this.assertDraftChatAccess(draft);
		const access: AgentThreadAccess = { accessScope: 'user', ownerId: config.user.id };
		yield* this.withRuntimeLease(
			async () => await this.getDraftChatRuntime(draft, access, sandboxPrincipalHash),
			async (runtime) =>
				await this.streamDraftChatResponse(draft, runtime, access, sandboxPrincipalHash),
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
			sessionMode = 'new',
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
						sessionMode,
						admittedExecution: config.admittedExecution,
					},
				),
			async (runtime) => {
				let messageContext = config.messageContext;
				if (messageContext && config.contextConversation) {
					messageContext = inheritIntegrationMessageContext(
						messageContext,
						await this.integrationMessageContextService.getLatestForIncoming(memory.threadId),
					);
				}
				const selectedContext = messageContext;
				const conversation = config.contextConversation;
				return this.streamChatResponse({
					admittedExecution: config.admittedExecution,
					abortSignal: config.abortSignal,
					onAdmitted:
						selectedContext && conversation
							? async () =>
									await this.integrationMessageContextService.installIncoming(
										selectedContext,
										memory,
										conversation,
									)
							: undefined,
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
					sessionMode,
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
		const { agentId, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		const access: AgentThreadAccess = isDraft
			? { accessScope: 'user', ownerId: identity.user.id }
			: { accessScope: 'project', ownerId: null };
		if (isDraft) {
			await this.assertDraftChatAccess({ ...config, user: identity.user, sessionMode: 'existing' });
		} else {
			await this.externalHooks.run('agent.preExecute', [agentId]);
		}
		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;
		const messageContext = await this.integrationMessageContextService.getLatest(memory.threadId);
		const delivery = isDraft
			? undefined
			: await this.getWakeDelivery(agentId, integrationType, messageContext);
		const stream = this.withRuntimeLease(
			async () => await this.getWakeRuntime(config, access, integrationType),
			(runtime) =>
				this.streamWakeResponse(
					this.streamWakeTurn(config, runtime, access, integrationType, messageContext),
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
		yield* this.turnExecutionService.execute({
			admittedExecution: config.admittedExecution,
			onAdmitted: config.onAdmitted,
			agentInstance: config.agentInstance,
			toolRegistry: config.toolRegistry,
			mcpServerAttributions: config.mcpServerAttributions,
			context: {
				projectId: config.projectId,
				agentId: config.agentId,
				threadId: config.memory.threadId,
			},
			backgroundJobSignal: config.backgroundJobSignal,
			includeHitlToolDetails: config.includeHitlToolDetails,
			onExecutionRecorded: config.onExecutionRecorded,
			previewChat: config.previewChat,
			onExecutionStarted: config.onExecutionStarted,
			onSettled: config.isWakeRun
				? undefined
				: async () => await this.requestPendingBackgroundWake(config.memory.threadId),
			prepare: async () => await this.prepareChatTurn(config),
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
			| 'sessionMode'
			| 'resumeRunId'
		> & {
			admittedExecution?: AgentExecutionAdmission;
			onExecutionRecorded?: (executionId: string) => void;
			abortSignal?: AbortSignal;
			automaticContinuationRunId?: string;
		},
	): Promise<AgentRuntime> {
		const {
			onExecutionRecorded,
			abortSignal,
			automaticContinuationRunId,
			admittedExecution,
			...recording
		} = session;
		abortSignal?.throwIfAborted();
		try {
			return await this.runtimeCacheService.getRuntime(params);
		} catch (error) {
			if (admittedExecution) throw error;
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
					{ previewChat: params.previewChat, automaticContinuationRunId },
				);
			}
			throw error;
		}
	}

	private async getResumeRuntime(config: ResumeChatConfig, checkpoint: ResumeCheckpoint) {
		const {
			agentId,
			projectId,
			runId,
			source,
			integrationType,
			user,
			usePublishedVersion,
			onExecutionRecorded,
			abortSignal,
			previewChat,
		} = config;
		const { memoryScope, sandboxPrincipalHash, access } = checkpoint;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				usePublishedVersion,
				integrationType,
				user: usePublishedVersion ? undefined : user,
				...(sandboxPrincipalHash ? { sandboxPrincipalHash } : {}),
				previewChat,
			},
			{
				threadId: memoryScope.threadId,
				resumeRunId: runId,
				userMessage: null,
				source,
				onExecutionRecorded,
				abortSignal,
				access,
				automaticContinuationRunId:
					previewChat && config.automaticPreviewContinuation ? runId : undefined,
				sessionMode: 'existing',
			},
		);
	}

	private resumeRuntimeTurn(
		config: ResumeChatConfig,
		checkpoint: ResumeCheckpoint,
		runtime: AgentRuntime,
	) {
		const threadId = checkpoint.memoryScope.threadId;
		return this.turnExecutionService.execute({
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			context: { projectId: config.projectId, agentId: config.agentId, threadId },
			includeHitlToolDetails: !config.usePublishedVersion,
			previewChat: config.previewChat,
			automaticPreviewContinuation: config.automaticPreviewContinuation,
			onExecutionStarted: config.onExecutionStarted,
			onExecutionRecorded: config.onExecutionRecorded,
			onSettled: async (suspended) => {
				if (!suspended) await this.requestPendingBackgroundWake(threadId);
			},
			prepare: async () => await this.prepareChatResume(config, checkpoint, runtime),
		});
	}

	private async prepareChatResume(
		config: ResumeChatConfig,
		checkpoint: ResumeCheckpoint,
		runtime: AgentRuntime,
	): Promise<AgentTurnRequest> {
		const { memoryScope } = checkpoint;
		const { executionSource, tracing } = await this.getResumeTracing(
			config,
			memoryScope.threadId,
			runtime,
		);
		const messageContext = await this.resolveResumeMessageContext(config, memoryScope);
		return {
			type: 'resume',
			resumeData: config.resumeData,
			options: this.createResumeOptions(config, memoryScope, messageContext, tracing),
			recording: this.createResumeRecording(config, checkpoint, runtime, executionSource),
		};
	}

	private async getResumeTracing(
		config: ResumeChatConfig,
		threadId: string,
		runtime: AgentRuntime,
	) {
		const { agentId, projectId, source, user } = config;
		// Recover the original source only when tracing needs it.
		const suspendedExecution =
			this.agentRunTracingService.enabled && source === undefined
				? await this.agentExecutionService.findLatestSuspendedRun(threadId)
				: undefined;
		const executionSource = source ?? suspendedExecution?.source ?? undefined;
		const tracing = await this.agentRunTracingService.build({
			agentId,
			projectId,
			threadId,
			userId: user?.id,
			source: executionSource ?? 'unknown',
			modelId: modelIdFromSnapshot(runtime.agent.snapshot.model),
		});
		return { executionSource, tracing };
	}

	private createResumeOptions(
		config: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
		selectedContext: IntegrationMessageContext | null,
		tracing: Awaited<ReturnType<AgentRunTracingService['build']>>,
	): Extract<AgentTurnRequest, { type: 'resume' }>['options'] {
		const { runId, toolCallId, agentId, user, usePublishedVersion, abortSignal } = config;
		const runType = usePublishedVersion ? 'production' : 'test';
		const conversation = config.contextConversation;
		return {
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
		};
	}

	private createResumeRecording(
		config: ResumeChatConfig,
		{ memoryScope, access }: ResumeCheckpoint,
		runtime: AgentRuntime,
		executionSource: string | undefined,
	): StartExecutionParams {
		const { agentId, projectId, user, usePublishedVersion } = config;
		const threadId = memoryScope.threadId;
		const runType = usePublishedVersion ? 'production' : 'test';
		return {
			access,
			threadId,
			agentId,
			agentName: runtime.agent.name,
			projectId,
			userMessage: null,
			sessionMode: 'existing',
			...(executionSource !== undefined ? { source: executionSource } : {}),
			telemetry: {
				userId: user?.id,
				runType,
				configuration: runtime.telemetryConfiguration,
			},
		};
	}

	private async resolveResumeMessageContext(
		config: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
	) {
		let messageContext = config.messageContext;
		if (messageContext === undefined) {
			messageContext = await this.integrationMessageContextService.getForResume(memoryScope);
		} else if (messageContext && config.contextConversation) {
			messageContext = inheritIntegrationMessageContext(
				messageContext,
				await this.integrationMessageContextService.getForResume(memoryScope),
			);
		}
		return messageContext;
	}

	private async assertDraftChatAccess({
		agentId,
		projectId,
		memory,
		user,
		previewChat,
		sessionMode,
	}: Pick<
		DraftChatConfig,
		'agentId' | 'projectId' | 'memory' | 'user' | 'previewChat' | 'sessionMode'
	>): Promise<void> {
		if (
			memory.resourceId !== draftChatMemoryResourceId(user.id) ||
			!(await this.agentExecutionService.canUseDraftThread(
				memory.threadId,
				projectId,
				agentId,
				user.id,
				{ previewChat, sessionMode },
			))
		) {
			throw new UserError('Session not found');
		}
	}

	private async getDraftChatRuntime(
		config: DraftChatConfig,
		access: AgentThreadAccess,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	) {
		const {
			agentId,
			projectId,
			user,
			previewChat,
			memory,
			message,
			attachments,
			source,
			onExecutionRecorded,
			abortSignal,
			sessionMode,
		} = config;
		return await this.getRuntimeOrRecordFailure(
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
				admittedExecution: config.admittedExecution,
				userMessage: message,
				attachments,
				source,
				onExecutionRecorded,
				abortSignal,
				sessionMode,
			},
		);
	}

	private async streamDraftChatResponse(
		config: DraftChatConfig,
		runtime: AgentRuntime,
		access: AgentThreadAccess,
		sandboxPrincipalHash: AgentSandboxPrincipalHash,
	) {
		const {
			agentId,
			user,
			message,
			attachments,
			memory,
			source,
			onExecutionRecorded,
			abortSignal,
			previewChat,
			sessionMode,
		} = config;
		const messageContext = this.createDraftMessageContext(memory, user.id);
		return this.streamChatResponse({
			admittedExecution: config.admittedExecution,
			onAdmitted: async () =>
				await this.integrationMessageContextService.setLatest(
					memory.threadId,
					memory.resourceId,
					messageContext,
				),
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
			previewChat,
			onExecutionStarted: config.onExecutionStarted,
			sandboxPrincipalHash,
			sessionMode,
		});
	}

	private createDraftMessageContext(
		memory: AgentMemoryScope,
		userId: string,
	): IntegrationMessageContext {
		return {
			integrationConnectionId: N8N_CHAT_INTEGRATION_TYPE,
			platform: N8N_CHAT_INTEGRATION_TYPE,
			target: { type: 'dm', userId, threadId: memory.threadId },
			interactingUserId: userId,
			updatedAt: new Date().toISOString(),
		};
	}

	private async prepareChatTurn(config: StreamChatResponseConfig): Promise<AgentTurnRequest> {
		const {
			agentInstance,
			agentId,
			userId,
			message,
			modelMessage = message,
			attachments,
			memory,
			projectId,
			source,
			telemetry,
			abortSignal,
			sandboxPrincipalHash,
		} = config;
		const { threadId, resourceId } = memory;
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
			recording: this.createChatRecording(config),
		};
	}

	private createChatRecording(config: StreamChatResponseConfig): StartExecutionParams {
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
			sessionMode,
		} = config;
		const { threadId } = memory;
		return {
			threadId,
			access: config.access,
			agentId,
			agentName: agentInstance.name,
			projectId,
			userMessage: hideUserMessageFromTranscript ? null : message,
			sessionMode,
			author,
			attachments,
			source,
			taskId,
			taskVersionId,
			telemetry: { ...telemetry, userId },
		};
	}

	private async getWakeRuntime(
		config: ExecuteForWakeConfig,
		access: AgentThreadAccess,
		integrationType: string,
	) {
		const { agentId, projectId, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		return await this.getRuntimeOrRecordFailure(
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
				sessionMode: 'existing',
			},
		);
	}

	private streamWakeTurn(
		config: ExecuteForWakeConfig,
		runtime: AgentRuntime,
		access: AgentThreadAccess,
		integrationType: string,
		messageContext: IntegrationMessageContext | null,
	) {
		const { agentId, message, memory, identity, abortSignal } = config;
		const isDraft = identity.type === 'draft';
		return this.streamChatResponse({
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
			sessionMode: 'existing',
			backgroundJobSignal: config.backgroundJobSignal,
		});
	}
}
