import { type Agent as RuntimeAgent, type SerializableAgentState } from '@n8n/agents';
import type {
	AgentBackgroundJobSignal,
	AgentMessageAuthor,
	AgentChatMessagesResponse,
	BudgetGuardrailConfig,
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
import type { AgentChatSurface, AgentSessionMode } from './utils/agent-thread-access';
import {
	isTaskRunMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
	userIdFromProductionChatMemoryResourceId,
} from './utils/agent-memory-scope';
import {
	chatSurfaceMemoryResourceId,
	N8N_CHAT_PRODUCTION_SOURCE,
} from './utils/agent-thread-access';
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
import { AgentsSettingsService } from './agents-settings.service';
import { buildAgentConfigurationTelemetry } from './agent-telemetry';
import { AgentTurnExecutionService, type AgentTurnRequest } from './agent-turn-execution.service';
import { withBudgetGuardrail } from './budget-guardrail';
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
import {
	BACKGROUND_APPROVAL_RUN_PREFIX,
	BACKGROUND_PAUSE_USER_TURN_KEY,
} from './background/sub-agent-background-state';
import type { ToolRegistry } from './tool-registry';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import type { AgentExecutionAdmission } from './types/agent-queued-message';
import type { AgentExecutionStreamChunk } from './types/agent-steering';
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
	onExecutionStarted?: (executionId: string, sessionId: string, inputMessageIds: string[]) => void;
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
	/** Preview chat sends the approaching-budget card. The run continues. */
	onBudgetNotice?: () => void;
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

export interface ExecuteForN8nChatPublishedConfig
	extends ChatExecutionInput,
		ChatExecutionCallbacks {
	user: User;
	abortSignal?: AbortSignal;
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
	/** The chat surface this resume runs under. Undefined for integrations. */
	chatSurface?: AgentChatSurface;
	/** Preview chat sends the approaching-budget card. The run continues. */
	onBudgetNotice?: () => void;
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
	pauseReport?: boolean;
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
	/** Saved budget from the reconstructed runtime. Absent when the config has none. */
	budget?: BudgetGuardrailConfig;
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
	/** The chat surface this turn runs under. Undefined for integrations and tasks. */
	chatSurface?: AgentChatSurface;
	/** Preview chat sends the approaching-budget card. The run continues. */
	onBudgetNotice?: () => void;
	abortSignal?: AbortSignal;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	/** Hide the internal wake instruction from the execution transcript. */
	hideUserMessageFromTranscript?: boolean;
	/** Prevent this wake run from triggering another wake. */
	isWakeRun?: boolean;
	pauseReport?: boolean;
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
	scope: ResumeScope;
}

type ResumeChatConfig = ResumeForChatConfig & { usePublishedVersion: boolean };
type DraftChatConfig = ExecuteForChatConfig & { sessionMode: AgentSessionMode };

/**
 * The access, sandbox, and runtime scope for a run on one chat channel —
 * preview or n8n Chat. `preparePreviewChat` and `prepareN8nChat` build this
 * once per channel so execute, resume, wake, and approval delivery share the
 * same rules.
 */
interface ChatChannelSetup {
	/**
	 * The chat surface a person watches the run in. Unset for draft runs that
	 * are not the preview chat (MCP, AI Assistant test calls, "Run now").
	 */
	surface?: AgentChatSurface;
	access: AgentThreadAccess;
	sandboxPrincipalHash: AgentSandboxPrincipalHash;
	/** n8n Chat checkpoints always carry a sandbox scope, even with sandboxes disabled. */
	alwaysSandboxed: boolean;
	/** The persisted execution label. Only n8n Chat has one fixed value; preview callers keep their own. */
	source?: string;
	runtime: {
		usePublishedVersion: boolean;
		integrationType: string;
		/** n8n Chat only: telemetry and the runtime cache key name the chatting user. */
		attributionUserId?: string;
		/** Preview only: tools and credentials are scoped to the user. */
		user?: User;
		/** Preview only: the runtime gets the preview chat's extra instruction. */
		previewChat?: boolean;
	};
}

/**
 * Who a resumed checkpoint belongs to, and which user and attribution its
 * rebuilt runtime uses. A chat channel's `ChatChannelSetup` fits this shape;
 * project-scoped threads (chat integrations, draft task runs) build their own.
 */
interface ResumeScope {
	access: AgentThreadAccess;
	source?: string;
	runtime: Pick<ChatChannelSetup['runtime'], 'user' | 'attributionUserId'>;
}

/** Which sandbox scope a resumed checkpoint must carry. */
interface ResumeSandboxRule {
	/** Require the scope even when sandboxes are disabled. */
	always: boolean;
	/**
	 * Set when the scope must name this run's user. An unset `principalHash`
	 * means the run has no user, so no scope matches.
	 */
	owner?: { principalHash: AgentSandboxPrincipalHash | undefined };
}

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
		private readonly settingsService: AgentsSettingsService,
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
		const { scope, sandboxPrincipalHash } = await this.resolveResumeScope(config, memoryScope);
		return { memoryScope, sandboxPrincipalHash, scope };
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

	/**
	 * Check that the caller may resume this checkpoint, and pick the scope its
	 * runtime is rebuilt with. Draft and n8n Chat threads use their channel's
	 * setup. Every other thread must be project-scoped.
	 */
	private async resolveResumeScope(
		config: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
	): Promise<Pick<ResumeCheckpoint, 'scope' | 'sandboxPrincipalHash'>> {
		const { agentId, projectId, runId, user, usePublishedVersion, chatSurface } = config;
		const notThisChat = () => new UserError(`Checkpoint ${runId} does not belong to this chat`);
		const isDraft = !usePublishedVersion && !isTaskRunMemoryResourceId(memoryScope.resourceId);
		if (isDraft || chatSurface === 'n8n-chat') {
			if (!user) throw notThisChat();
			const thread = {
				agentId,
				projectId,
				threadId: memoryScope.threadId,
				resourceId: memoryScope.resourceId,
				sessionMode: 'existing' as const,
				denied: notThisChat,
			};
			const setup = isDraft
				? await this.preparePreviewChat({
						...thread,
						user,
						previewChat: chatSurface === 'preview',
					})
				: await this.prepareN8nChat({
						...thread,
						userId: user.id,
						// `resumeForChat` already checked publication before the checkpoint
						// lookup. A resume keeps the old behavior of not querying it again.
						skipPublishedCheck: true,
					});
			const sandboxPrincipalHash = this.checkResumeSandbox(config, memoryScope, {
				always: setup.alwaysSandboxed,
				owner: { principalHash: setup.sandboxPrincipalHash },
			});
			return { scope: setup, sandboxPrincipalHash };
		}
		const thread = await this.agentExecutionService.findThreadById(memoryScope.threadId);
		if (
			userIdFromDraftChatMemoryResourceId(memoryScope.resourceId) ||
			userIdFromProductionChatMemoryResourceId(memoryScope.resourceId) ||
			!thread ||
			thread.projectId !== projectId ||
			thread.agentId !== agentId ||
			thread.accessScope !== 'project'
		) {
			throw notThisChat();
		}
		// A draft task run ("Run now") stays bound to the user who started it.
		const owner = usePublishedVersion ? undefined : user;
		const sandboxPrincipalHash = this.checkResumeSandbox(config, memoryScope, {
			always: false,
			owner: usePublishedVersion
				? undefined
				: {
						principalHash: owner
							? hashAgentSandboxPrincipal({ type: 'n8n-user', userId: owner.id })
							: undefined,
					},
		});
		return {
			scope: { access: { accessScope: 'project', ownerId: null }, runtime: { user: owner } },
			sandboxPrincipalHash,
		};
	}

	private checkResumeSandbox(
		{ projectId, runId }: ResumeChatConfig,
		memoryScope: ResumeCheckpoint['memoryScope'],
		rule: ResumeSandboxRule,
	): AgentSandboxPrincipalHash | undefined {
		const sandboxScope = decodeAgentSandboxHostMetadata(memoryScope.hostMetadata);
		const sandboxPrincipalHash = sandboxScope?.principalHash;
		if (
			(this.agentSandboxRuntimeService.isEnabled() || rule.always) &&
			(!sandboxScope ||
				sandboxScope.projectId !== projectId ||
				!sandboxPrincipalHash ||
				(rule.owner !== undefined &&
					(!rule.owner.principalHash || sandboxPrincipalHash !== rule.owner.principalHash)))
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
	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<AgentExecutionStreamChunk> {
		const resume = { ...config, usePublishedVersion: config.usePublishedVersion ?? true };
		// Check this before the job/checkpoint lookups below, so an unpublished agent
		// always gets this error first, whatever state those lookups would hit.
		if (
			resume.chatSurface === 'n8n-chat' &&
			!(await this.agentRepository.isN8nChatPublished(resume.agentId, resume.projectId))
		) {
			throw new UserError('This agent is not available in n8n Chat');
		}
		if (await this.resumeBackgroundForChat(resume)) return;
		const checkpoint = await this.loadResumeCheckpoint(resume);
		// n8n Chat has one canonical source; the caller doesn't need to pass it.
		const run = { ...resume, source: resume.source ?? checkpoint.scope.source };
		yield* this.withRuntimeLease(
			async () => await this.getResumeRuntime(run, checkpoint),
			(runtime) => this.resumeRuntimeTurn(run, checkpoint, runtime),
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
		const { scope } = await this.resolveResumeScope(resume, memoryScope);
		// n8n Chat is a direct conversation, not an external platform integration,
		// so it has no inbound message context to match against.
		if (resume.chatSurface === undefined && resume.usePublishedVersion) {
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
		// Preview runs resolve credentials as their user. n8n Chat and integrations resolve them project-wide.
		const credentialUser = scope.runtime.user;
		await Container.get(SubAgentBackgroundRunner).resume(
			job,
			{ token: config.toolCallId, resumeData: config.resumeData },
			{
				projectId: config.projectId,
				parentAgentId: job.parentAgentId,
				credentialProvider: new AgentsCredentialProvider(
					Container.get(CredentialsService),
					config.projectId,
					credentialUser,
					job.subAgentId ?? undefined,
				),
				runType: resume.usePublishedVersion ? 'production' : 'test',
				workflowToolExecutionMode: resume.usePublishedVersion ? 'integrated' : 'manual',
				user: credentialUser,
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
			await this.preparePreviewChat({
				agentId: config.agentId,
				projectId: config.projectId,
				threadId: config.memory.threadId,
				resourceId: config.memory.resourceId,
				user: config.identity.user,
				sessionMode: 'existing',
			});
			return;
		}
		const productionUserId = userIdFromProductionChatMemoryResourceId(config.memory.resourceId);
		if (productionUserId) {
			// The n8n Chat UI reads approvals from the background-tasks list route, so delivery needs only an access check.
			await this.prepareN8nChat({
				agentId: config.agentId,
				projectId: config.projectId,
				threadId: config.memory.threadId,
				resourceId: config.memory.resourceId,
				userId: productionUserId,
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
	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<AgentExecutionStreamChunk> {
		const sessionMode = config.sessionMode ?? 'new';
		const setup = await this.preparePreviewChat({
			agentId: config.agentId,
			projectId: config.projectId,
			threadId: config.memory.threadId,
			resourceId: config.memory.resourceId,
			user: config.user,
			previewChat: config.previewChat,
			sessionMode,
		});
		const draft = { ...config, sessionMode };
		yield* this.withRuntimeLease(
			async () => await this.getDraftChatRuntime(draft, setup),
			async (runtime) => await this.streamDraftChatResponse(draft, runtime, setup),
		);
	}

	/**
	 * Execute a published agent for a chat integration (Slack, Telegram, …).
	 *
	 * Loads the published snapshot — never the draft.
	 */
	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<AgentExecutionStreamChunk> {
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
						resourceId: memory.resourceId,
						userMessage: message,
						author,
						attachments,
						messageOrigin: {
							integrationConnectionId: config.messageContext?.integrationConnectionId,
							platformMessageId: config.messageContext?.messageId,
						},
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
					budget: runtime.budget,
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

	async *executeForN8nChatPublished(
		config: ExecuteForN8nChatPublishedConfig,
	): AsyncGenerator<AgentExecutionStreamChunk> {
		const {
			agentId,
			projectId,
			message,
			memory,
			attachments,
			user,
			abortSignal,
			sessionMode = 'new',
		} = config;
		const setup = await this.prepareN8nChat({
			agentId,
			projectId,
			threadId: memory.threadId,
			resourceId: memory.resourceId,
			userId: user.id,
			sessionMode,
		});
		await this.externalHooks.run('agent.preExecute', [agentId]);
		yield* this.withRuntimeLease(
			async () =>
				await this.getRuntimeOrRecordFailure(
					{
						agentId,
						projectId,
						integrationType: setup.runtime.integrationType,
						usePublishedVersion: setup.runtime.usePublishedVersion,
						sandboxPrincipalHash: setup.sandboxPrincipalHash,
						attributionUserId: setup.runtime.attributionUserId,
					},
					{
						threadId: memory.threadId,
						resourceId: memory.resourceId,
						userMessage: message,
						attachments,
						source: setup.source,
						access: setup.access,
						sessionMode,
						abortSignal,
						admittedExecution: config.admittedExecution,
					},
				),
			async (runtime) => {
				const messageContext = this.createN8nChatMessageContext(memory, user.id);
				return this.streamChatResponse({
					admittedExecution: config.admittedExecution,
					access: setup.access,
					messageContext,
					onAdmitted: async () =>
						await this.integrationMessageContextService.setLatest(
							memory.threadId,
							memory.resourceId,
							messageContext,
						),
					agentInstance: runtime.agent,
					toolRegistry: runtime.toolRegistry,
					mcpServerAttributions: runtime.mcpServerAttributions,
					budget: runtime.budget,
					agentId,
					projectId,
					message,
					memory,
					attachments,
					userId: user.id,
					chatSurface: setup.surface,
					source: setup.source,
					telemetry: { runType: 'production', configuration: runtime.telemetryConfiguration },
					sandboxPrincipalHash: setup.sandboxPrincipalHash,
					sessionMode,
					abortSignal,
					onExecutionStarted: config.onExecutionStarted,
					onExecutionRecorded: config.onExecutionRecorded,
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
	): AsyncGenerator<AgentExecutionStreamChunk> {
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
						resourceId: memory.resourceId,
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
					budget: runtime.budget,
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
	async *executeForTaskNow(
		config: ExecuteForTaskNowConfig,
	): AsyncGenerator<AgentExecutionStreamChunk> {
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
						resourceId: memory.resourceId,
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
					budget: runtime.budget,
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
		const productionUserId = isDraft
			? undefined
			: userIdFromProductionChatMemoryResourceId(memory.resourceId);
		// Draft and n8n Chat wakes run on their chat channel. Other published
		// wakes belong to a chat integration and reply through it.
		let setup: ChatChannelSetup | undefined;
		if (productionUserId && !isDraft) {
			if (
				identity.integrationType !== N8N_CHAT_INTEGRATION_TYPE ||
				identity.principalHash !==
					hashAgentSandboxPrincipal({ type: 'n8n-user', userId: productionUserId })
			) {
				throw new OperationalError('Production n8n Chat wake identity is no longer valid');
			}
			try {
				setup = await this.prepareN8nChat({
					agentId,
					projectId: config.projectId,
					threadId: memory.threadId,
					resourceId: memory.resourceId,
					userId: productionUserId,
					sessionMode: 'existing',
				});
			} catch {
				// A silent return would mark these job results consumed and lose them.
				throw new OperationalError('Production n8n Chat wake identity is no longer valid');
			}
		}
		if (isDraft) {
			setup = await this.preparePreviewChat({
				agentId,
				projectId: config.projectId,
				threadId: memory.threadId,
				resourceId: memory.resourceId,
				user: identity.user,
				sessionMode: 'existing',
			});
		} else {
			await this.externalHooks.run('agent.preExecute', [agentId]);
		}
		const access: AgentThreadAccess = setup?.access ?? { accessScope: 'project', ownerId: null };
		const integrationType = isDraft ? N8N_CHAT_INTEGRATION_TYPE : identity.integrationType;
		const messageContext = await this.integrationMessageContextService.getLatest(memory.threadId);
		const delivery = setup
			? undefined
			: await this.getWakeDelivery(agentId, integrationType, messageContext);
		const stream = this.withRuntimeLease(
			async () => await this.getWakeRuntime(config, setup, access, integrationType),
			(runtime) =>
				this.streamWakeResponse(
					this.streamWakeTurn(config, runtime, setup, access, integrationType, messageContext),
					abortSignal,
					delivery,
					messageContext?.interactingUserId,
				),
		);
		for await (const _chunk of stream) {
			// Complete execution and reply delivery within the runtime lease.
		}
	}

	private async *streamWakeResponse(
		stream: AsyncGenerator<AgentExecutionStreamChunk>,
		abortSignal: AbortSignal,
		delivery?: { bridge: AgentChatBridge; threadId: string },
		cardRecipientId?: string,
	): AsyncGenerator<AgentExecutionStreamChunk> {
		const chunks: AgentExecutionStreamChunk[] = [];
		let runError: unknown;
		for await (const chunk of stream) {
			if (delivery) chunks.push(chunk);
			if (chunk.type === 'error') runError = chunk.error;
			if (chunk.type === 'finish' && chunk.finishReason === 'error') runError ??= chunk;
			if (chunk.type === 'finish' && chunk.guardrail?.code === 'background-pause-report')
				runError ??= chunk;
			yield chunk;
		}
		// Leave failed job results pending so the caller can retry delivery.
		if (runError !== undefined) {
			throw new OperationalError('Background job wake failed', { cause: runError });
		}
		abortSignal.throwIfAborted();
		if (delivery)
			await delivery.bridge.deliverWakeResponse(delivery.threadId, chunks, cardRecipientId);
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
	async *streamChatResponse(
		config: StreamChatResponseConfig,
	): AsyncGenerator<AgentExecutionStreamChunk> {
		// Admitted runs and background continuations can finish after Agents is disabled.
		if (!config.admittedExecution && !config.isWakeRun) {
			await this.settingsService.assertEnabled();
		}
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
			onExecutionRecorded: config.onExecutionRecorded,
			chatSurface: config.chatSurface,
			isWakeRun: config.isWakeRun,
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
		) =>
			| AsyncGenerator<AgentExecutionStreamChunk>
			| Promise<AsyncGenerator<AgentExecutionStreamChunk>>,
	): AsyncGenerator<AgentExecutionStreamChunk> {
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
			| 'resourceId'
			| 'messageOrigin'
			| 'hideUserMessageFromTranscript'
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
			isWakeRun?: boolean;
		},
	): Promise<AgentRuntime> {
		const {
			onExecutionRecorded,
			abortSignal,
			automaticContinuationRunId,
			admittedExecution,
			isWakeRun,
			...recording
		} = session;
		abortSignal?.throwIfAborted();
		if (!admittedExecution && !recording.resumeRunId && !isWakeRun) {
			await this.settingsService.assertEnabled();
		}
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
				const failed = {
					...recording,
					agentId,
					agentName: selected.schema?.name ?? agent.name,
					projectId,
					telemetry: {
						userId: params.attributionUserId ?? params.user?.id,
						runType: params.usePublishedVersion ? ('production' as const) : ('test' as const),
						configuration: buildAgentConfigurationTelemetry(selected),
					},
				};
				if (admittedExecution) {
					await this.turnExecutionService.recordFailedAdmission(admittedExecution, failed, error);
				} else {
					await this.turnExecutionService.recordFailedStart(failed, error, onExecutionRecorded, {
						previewChat: params.previewChat,
						automaticContinuationRunId,
					});
				}
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
			usePublishedVersion,
			onExecutionRecorded,
			abortSignal,
			chatSurface,
		} = config;
		const previewChat = chatSurface === 'preview';
		const { memoryScope, sandboxPrincipalHash, scope } = checkpoint;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				usePublishedVersion,
				integrationType,
				user: scope.runtime.user,
				attributionUserId: scope.runtime.attributionUserId,
				...(sandboxPrincipalHash ? { sandboxPrincipalHash } : {}),
				previewChat,
			},
			{
				threadId: memoryScope.threadId,
				resourceId: memoryScope.resourceId,
				resumeRunId: runId,
				userMessage: null,
				source,
				onExecutionRecorded,
				abortSignal,
				access: scope.access,
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
			chatSurface: config.chatSurface,
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
			options: withBudgetGuardrail(
				this.createResumeOptions(config, memoryScope, messageContext, tracing),
				{
					budget: runtime.budget,
					sessionId: memoryScope.threadId,
					agentId: config.agentId,
					...(config.chatSurface === 'preview' && config.onBudgetNotice
						? { onNotice: config.onBudgetNotice }
						: {}),
				},
			),
			recording: this.createResumeRecording(config, checkpoint, runtime, executionSource),
		};
	}

	private async getResumeTracing(
		config: ResumeChatConfig,
		threadId: string,
		runtime: AgentRuntime,
	) {
		const { agentId, projectId, source, user } = config;
		// Recover the original source only when tracing needs it. `resumeForChat`
		// already resolved the n8n Chat source, so this only runs for other callers.
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
		{ memoryScope, scope }: ResumeCheckpoint,
		runtime: AgentRuntime,
		executionSource: string | undefined,
	): StartExecutionParams {
		const { agentId, projectId, user, usePublishedVersion } = config;
		const threadId = memoryScope.threadId;
		const runType = usePublishedVersion ? 'production' : 'test';
		return {
			access: scope.access,
			threadId,
			agentId,
			agentName: runtime.agent.name,
			resourceId: memoryScope.resourceId,
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

	/**
	 * Validate access and build the memory, sandbox, and runtime scope for a
	 * run in the in-app preview chat. `prepareN8nChat` is its n8n Chat
	 * counterpart; together they keep each channel's setup rules in one place.
	 */
	private async preparePreviewChat(params: {
		agentId: string;
		projectId: string;
		threadId: string;
		/** The memory scope the caller expects this run to use. Must match the user's own draft scope. */
		resourceId: string;
		user: User;
		previewChat?: boolean;
		sessionMode: AgentSessionMode;
		/** Produces the error thrown for an inaccessible thread. Defaults to 'Session not found'. */
		denied?: () => Error;
	}): Promise<ChatChannelSetup> {
		const { agentId, projectId, threadId, resourceId, user, previewChat, sessionMode, denied } =
			params;
		const fail = denied ?? (() => new UserError('Session not found'));
		if (
			resourceId !== chatSurfaceMemoryResourceId('preview', user.id) ||
			!(await this.agentExecutionService.canUseDraftThread(threadId, projectId, agentId, user.id, {
				previewChat,
				sessionMode,
			}))
		) {
			throw fail();
		}
		return {
			surface: previewChat ? 'preview' : undefined,
			access: { accessScope: 'user', ownerId: user.id },
			sandboxPrincipalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id }),
			alwaysSandboxed: false,
			runtime: {
				usePublishedVersion: false,
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				user,
				previewChat,
			},
		};
	}

	/**
	 * Validate access and build the memory, sandbox, and runtime scope for a
	 * run in n8n Chat. `prepareN8nChat` and `preparePreviewChat` keep each
	 * channel's setup rules in one place.
	 */
	private async prepareN8nChat(params: {
		agentId: string;
		projectId: string;
		threadId: string;
		/** The memory scope the caller expects this run to use. Must match the user's own n8n Chat scope. */
		resourceId: string;
		userId: string;
		sessionMode: AgentSessionMode;
		/** Skip the publish check. Only for resume, which already checked it. */
		skipPublishedCheck?: boolean;
		/** Produces the error thrown for an inaccessible thread. Defaults to 'Session not found'. */
		denied?: () => Error;
	}): Promise<ChatChannelSetup> {
		const {
			agentId,
			projectId,
			threadId,
			resourceId,
			userId,
			sessionMode,
			skipPublishedCheck,
			denied,
		} = params;
		if (
			!skipPublishedCheck &&
			!(await this.agentRepository.isN8nChatPublished(agentId, projectId))
		) {
			throw new UserError('This agent is not available in n8n Chat');
		}
		const fail = denied ?? (() => new UserError('Session not found'));
		if (resourceId !== chatSurfaceMemoryResourceId('n8n-chat', userId)) {
			throw fail();
		}
		if (
			!(await this.agentExecutionService.canUseProductionChatThread(
				threadId,
				projectId,
				agentId,
				userId,
				sessionMode,
			))
		) {
			throw fail();
		}
		return {
			surface: 'n8n-chat',
			access: { accessScope: 'user', ownerId: userId },
			sandboxPrincipalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId }),
			alwaysSandboxed: true,
			source: N8N_CHAT_PRODUCTION_SOURCE,
			runtime: {
				usePublishedVersion: true,
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				attributionUserId: userId,
			},
		};
	}

	private async getDraftChatRuntime(config: DraftChatConfig, setup: ChatChannelSetup) {
		const {
			agentId,
			projectId,
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
				integrationType: setup.runtime.integrationType,
				user: setup.runtime.user,
				sandboxPrincipalHash: setup.sandboxPrincipalHash,
				previewChat: setup.runtime.previewChat,
			},
			{
				threadId: memory.threadId,
				resourceId: memory.resourceId,
				access: setup.access,
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
		setup: ChatChannelSetup,
	) {
		const {
			agentId,
			user,
			memory,
			message,
			attachments,
			source,
			onExecutionRecorded,
			abortSignal,
			sessionMode,
		} = config;
		const messageContext = this.createN8nChatMessageContext(memory, user.id);
		return this.streamChatResponse({
			admittedExecution: config.admittedExecution,
			onAdmitted: async () =>
				await this.integrationMessageContextService.setLatest(
					memory.threadId,
					memory.resourceId,
					messageContext,
				),
			access: setup.access,
			messageContext,
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			budget: runtime.budget,
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
			chatSurface: setup.surface,
			onBudgetNotice: config.onBudgetNotice,
			onExecutionStarted: config.onExecutionStarted,
			sandboxPrincipalHash: setup.sandboxPrincipalHash,
			sessionMode,
		});
	}

	private createN8nChatMessageContext(
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
			...(config.chatSurface !== undefined &&
			!config.isWakeRun &&
			!config.hideUserMessageFromTranscript
				? { [BACKGROUND_PAUSE_USER_TURN_KEY]: true }
				: {}),
		};

		return {
			type: 'start',
			input,
			options: withBudgetGuardrail(
				{
					persistence: { threadId, resourceId, hostMetadata },
					...(config.pauseReport
						? {
								toolsEnabled: false,
								guardrails: {
									hooks: [
										{
											beforeTool: async () => ({
												action: 'stop' as const,
												code: 'background-pause-report',
											}),
										},
									],
								},
							}
						: {}),
					executionCounter: createAgentExecutionCounter(this.telemetry, {
						agentId,
						userId,
						runType: telemetry.runType,
					}),
					...modelStreamStallOptions(this.aiConfig),
					...(tracing ? { telemetry: tracing } : {}),
					...(abortSignal ? { abortSignal } : {}),
				},
				{
					budget: config.budget,
					sessionId: threadId,
					agentId,
					...(config.chatSurface === 'preview' && config.onBudgetNotice
						? { onNotice: config.onBudgetNotice }
						: {}),
				},
			),
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
			userMessage: message,
			resourceId: memory.resourceId,
			hideUserMessageFromTranscript,
			...(config.messageContext && {
				messageOrigin: {
					integrationConnectionId: config.messageContext.integrationConnectionId,
					platformMessageId: config.messageContext.messageId,
				},
			}),
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
		setup: ChatChannelSetup | undefined,
		access: AgentThreadAccess,
		integrationType: string,
	) {
		const { agentId, projectId, memory, identity, abortSignal } = config;
		return await this.getRuntimeOrRecordFailure(
			{
				agentId,
				projectId,
				integrationType,
				usePublishedVersion: identity.type !== 'draft',
				...(setup?.runtime.attributionUserId
					? { attributionUserId: setup.runtime.attributionUserId }
					: {}),
				...(setup?.runtime.user ? { user: setup.runtime.user } : {}),
				sandboxPrincipalHash: identity.principalHash,
			},
			{
				threadId: memory.threadId,
				resourceId: memory.resourceId,
				userMessage: config.message,
				hideUserMessageFromTranscript: true,
				isWakeRun: true,
				source: setup?.source ?? integrationType,
				abortSignal,
				access,
				sessionMode: 'existing',
			},
		);
	}

	private streamWakeTurn(
		config: ExecuteForWakeConfig,
		runtime: AgentRuntime,
		setup: ChatChannelSetup | undefined,
		access: AgentThreadAccess,
		integrationType: string,
		messageContext: IntegrationMessageContext | null,
	) {
		const { agentId, message, memory, identity, abortSignal } = config;
		return this.streamChatResponse({
			access,
			messageContext,
			agentInstance: runtime.agent,
			toolRegistry: runtime.toolRegistry,
			mcpServerAttributions: runtime.mcpServerAttributions,
			budget: runtime.budget,
			agentId,
			...(access.ownerId ? { userId: access.ownerId } : {}),
			message,
			memory,
			projectId: runtime.projectId,
			source: setup?.source ?? integrationType,
			chatSurface: setup?.surface,
			telemetry: {
				runType: identity.type === 'draft' ? 'test' : 'production',
				configuration: runtime.telemetryConfiguration,
			},
			abortSignal,
			sandboxPrincipalHash: identity.principalHash,
			hideUserMessageFromTranscript: true,
			isWakeRun: true,
			pauseReport: config.pauseReport,
			sessionMode: 'existing',
			backgroundJobSignal: config.backgroundJobSignal,
		});
	}
}
