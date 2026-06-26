import { AgentEvent } from '@n8n/agents';
import type { Message, Workspace, ScopedMemoryTaskEvent, AgentEventData } from '@n8n/agents';
import {
	applyBranchReadOnlyOverrides,
	buildProxyHeaders,
	type InstanceAiAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiFileAttachment,
	type InstanceAiWorkflowAttachment,
	type InstanceAiConfirmRequest,
	type InstanceAiEvent,
	type InstanceAiThreadStatusResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SsrfProtectionService } from '@n8n/backend-network';
import { GlobalConfig, SsrfProtectionConfig, type InstanceAiConfig } from '@n8n/config';
import { UserRepository, type User } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	MAX_STEPS,
	createInstanceAgent,
	createAllTools,
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	createScopedWorkspace,
	getPromptWorkspaceRoot,
	getWorkspaceRoot,
	loadInstanceAiRuntimeSkillSource,
	createInstanceAiTraceContext,
	createInternalOperationTraceContext,
	createInstanceAiLivenessPolicyConfig,
	InstanceAiLivenessPolicy,
	McpClientManager,
	createDomainAccessTracker,
	BackgroundTaskManager,
	MemoryTaskRegistry,
	buildAgentTreeFromEvents,
	classifyAttachments,
	buildAttachmentManifest,
	getDateTimeSection,
	isParseableAttachment,
	enrichMessageWithBackgroundTasks,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	applyPlannedTaskPermissions,
	PLANNED_TASK_PERMISSION_OVERRIDES,
	releaseTraceClient,
	resumeAgentRun,
	RunStateRegistry,
	RunDebugBuffer,
	buildRunDebugLabel,
	createRunDebugStepHooks,
	startDetachedDelegateTask,
	streamAgentRun,
	truncateToTitle,
	generateTitleForRun,
	patchThread,
	orchestratorAgentId,
	type ConfirmationData,
	type DomainAccessTracker,
	type ManagedBackgroundTask,
	type McpServerConfig,
	type ModelConfig,
	type OrchestrationContext,
	type InstanceAiTraceContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type PlannedTaskService,
	type PlannedWorkflowVerification,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type ServiceProxyConfig,
	type StreamableAgent,
	type SuspendedRunState,
	type WorkflowBuildOutcome,
	type WorkflowLoopWorkItemRecord,
	type WorkflowSetupRoutingClaim,
	type WorkflowTaskService,
	type WorkflowVerificationObligation,
	type WorkSummary,
	type RunTokenUsage,
	type RunDebugRecord,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
	ThreadTaskStorage,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import { composeLocalMcpServers } from './browser/composite-local-mcp-server';
import { InstanceAiBrowserSessionService } from './browser/instance-ai-browser-session.service';
import { EvalThreadCredentialAllowlistService } from './eval/thread-credential-allowlist.service';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiCreditService } from './instance-ai-credit.service';
import { InstanceAiGatewayService } from './instance-ai-gateway.service';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiRunProbe } from './instance-ai-run-probe';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiTemporaryWorkflowService } from './instance-ai-temporary-workflow.service';
import { InstanceAiTerminalOutcomeService } from './instance-ai-terminal-outcome.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import {
	AUTO_FOLLOW_UP_MESSAGE,
	EDITOR_CONTEXT_OPEN_TAG,
	EDITOR_CONTEXT_CLOSE_TAG,
	CREDENTIAL_CONTEXT_OPEN_TAG,
	CREDENTIAL_CONTEXT_CLOSE_TAG,
	withCurrentDateTime,
} from './internal-messages';
import { INSTANCE_AI_RUN_TIMEOUT_REASON, InstanceAiLivenessService } from './liveness';
import { InstanceAiMcpRegistryService } from './mcp';
import {
	buildInstanceAiObservabilityContext,
	type InstanceAiObservabilityContext,
} from './observability';
import { resolveOutputRedaction } from './output-redaction-config';
import {
	PlannedTaskActionRunner,
	type PlannedBuildFollowUp,
	type PlannedTaskDispatcher,
	type PlannedTaskFollowUpStarter,
	type PlannedTaskRunGate,
	type PlannedTaskRunScope,
	type PlannedTaskView,
	type PlannedWorkflowVerificationGate,
	type PlannedWorkflowVerificationTracker,
} from './planned-task-action-runner';
import { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';
import { InstanceAiThreadGrantRepository } from './repositories/instance-ai-thread-grant.repository';
import { InstanceAiSandboxService, type RuntimeSandboxEntry } from './sandbox';
import { DbIterationLogStorage } from './storage/db-iteration-log-storage';
import { DbSnapshotStorage } from './storage/db-snapshot-storage';
import { TypeORMAgentCheckpointStore } from './storage/typeorm-agent-checkpoint-store';
import { TypeORMAgentMemory } from './storage/typeorm-agent-memory';
import {
	SuspendedRunRestorer,
	type RebuildSuspendedRunOutcome,
	type ResumableOrphan,
} from './suspended-run-restorer.service';
import { SuspendedThreadPersistenceService } from './suspended-thread-persistence.service';
import {
	InstanceAiTracingService,
	type MessageTraceFinalization,
	type OrchestratorResumeReason,
} from './tracing';
import {
	parseWorkflowBuildOutcome,
	WorkflowVerificationObligationService,
} from './workflow-verification-obligation-service';
import { WorkflowVerificationTaskProjector } from './workflow-verification-task-projector';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Renders a message's workflow attachments (e.g. a workflow + execution handed
 * off from the editor) as a context block telling the agent what the user is
 * looking at. Informative only: the agent should greet the user and ask how it
 * can help rather than inspecting the resources up front. The ids stay in the
 * block so they're available once the user actually asks for something.
 * Returns an empty string when there are none.
 */
function buildContextResourcesBlock(workflowAttachments: InstanceAiWorkflowAttachment[]): string {
	if (workflowAttachments.length === 0) return '';
	const lines = workflowAttachments.map((attachment) => {
		const name = attachment.name ? ` "${attachment.name}"` : '';
		// Only mention the execution when one was actually handed off.
		const execution = attachment.executionId
			? `, currently viewing its execution \`${attachment.executionId}\``
			: '';
		return `- Workflow${name} (id: \`${attachment.id}\`)${execution}.`;
	});
	const prose = [
		'The user opened this conversation from the workflow editor, where they are looking at:',
		...lines,
		"Treat this purely as context. Until the user tells you what they need, don't read, inspect, run, or otherwise call tools on these resources, and don't make claims about their contents — just briefly acknowledge what they're working on and ask how you can help.",
	].join('\n');
	// Wrap in EDITOR_CONTEXT_BLOCK so the UI strips it from the visible message
	// (cleanStoredUserMessage) and the parser can reconstruct the attachments on
	// reload from the leading JSON line — keeping the resource durable without
	// persisting it as visible text.
	return `${EDITOR_CONTEXT_OPEN_TAG}\n${JSON.stringify(workflowAttachments)}\n\n${prose}\n${EDITOR_CONTEXT_CLOSE_TAG}`;
}

function buildHandoffContextBlock(context: InstanceAiHandoffContext | undefined): string {
	if (!context) return '';

	const { credential } = context;
	const lines = [
		`- Credential type: \`${credential.credentialType}\` (${credential.displayName}).`,
		credential.id ? `- Existing credential id: \`${credential.id}\`.` : '',
		credential.nodeName ? `- Node name: "${credential.nodeName}".` : '',
		credential.nodeType ? `- Node type: \`${credential.nodeType}\`.` : '',
		credential.documentationUrl ? `- n8n documentation URL: ${credential.documentationUrl}` : '',
		credential.oauthRedirectUrl
			? `- OAuth redirect/callback URL shown in the modal: ${credential.oauthRedirectUrl}`
			: '',
	].filter(Boolean);
	const prose = [
		'The user opened this conversation from the credential setup modal and is asking for setup guidance.',
		...lines,
		'Use this metadata only as setup context. Never ask the user to paste credential secrets into chat. For credential setup docs, load `n8n-docs-assistant` and use `n8n-docs` with `intent: "credential-setup"`.',
	].join('\n');

	return `${CREDENTIAL_CONTEXT_OPEN_TAG}\n${JSON.stringify(context)}\n\n${prose}\n${CREDENTIAL_CONTEXT_CLOSE_TAG}`;
}

function isTelemetryConfigurableAgent(
	agent: unknown,
): agent is { telemetry: (telemetry: unknown) => void } {
	return (
		typeof agent === 'object' &&
		agent !== null &&
		typeof Reflect.get(agent, 'telemetry') === 'function'
	);
}

const INSTANCE_AI_CHECKPOINT_PRUNE_RETRY_MS = 30 * 1000;
const WORKFLOW_SETUP_ROUTING_CLAIM_TTL_MS = 15 * 60 * 1000;

/**
 * Upper bound on how long `shutdown()` will wait for in-flight executeRun /
 * processResumedStream promises to drain after their abortControllers fire.
 * Sized well below n8n's `gracefulShutdownTimeoutInS` (30s default) so a
 * stuck agent can't burn the whole budget here.
 */
const INSTANCE_AI_SHUTDOWN_DRAIN_TIMEOUT_MS = 5 * 1000;

function isTextMessagePart(part: unknown): part is { type: 'text'; text: string } {
	return (
		typeof part === 'object' &&
		part !== null &&
		'type' in part &&
		part.type === 'text' &&
		'text' in part &&
		typeof part.text === 'string'
	);
}

function getUserFacingErrorMessage(error: unknown): string {
	if (error instanceof UserError) {
		return error.message;
	}

	if (error instanceof OperationalError) {
		return 'I hit an operational error before I could finish that response. Please try again.';
	}

	if (error instanceof UnexpectedError) {
		return 'Something went wrong before I could finish that response. Please try again.';
	}

	return 'Something went wrong before I could finish that response. Please try again.';
}

function createInertAbortSignal(): AbortSignal {
	return new AbortController().signal;
}

function getAbortReason(signal: AbortSignal): string {
	const reason = (signal as AbortSignal & { reason?: unknown }).reason;
	if (
		typeof reason === 'object' &&
		reason !== null &&
		'name' in reason &&
		reason.name === 'AbortError'
	) {
		return 'user_cancelled';
	}
	if (reason instanceof Error) return reason.message;
	return typeof reason === 'string' ? reason : 'user_cancelled';
}

const MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD = 5;

function stringifyForContextValue(value: unknown): string {
	if (typeof value === 'string') return value;
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

const PLANNED_TASK_CONTEXT_VALUE_LIMIT = 1_500;

function truncateContextValue(value: string): string {
	if (value.length <= PLANNED_TASK_CONTEXT_VALUE_LIMIT) return value;
	return `${value.slice(0, PLANNED_TASK_CONTEXT_VALUE_LIMIT)}...`;
}

function buildPlannedTaskConversationContext(
	task: PlannedTaskRecord,
	graph: PlannedTaskGraph | undefined,
): string | undefined {
	if (!graph) return undefined;

	const parts: string[] = [
		`Approved plan task: ${task.title}`,
		`Task id: ${task.id}`,
		`Task kind: ${task.kind}`,
		`Plan run id: ${graph.planRunId}`,
	];

	if (task.workflowId) {
		parts.push(`Target workflow id: ${task.workflowId}`);
	}

	const dependencies = graph.tasks.filter((candidate) => task.deps.includes(candidate.id));
	if (dependencies.length > 0) {
		parts.push('Completed dependency context:');
		for (const dependency of dependencies) {
			const dependencyParts = [
				`- ${dependency.id} (${dependency.kind}, ${dependency.status}): ${dependency.title}`,
			];
			if (dependency.result) {
				dependencyParts.push(`result=${truncateContextValue(dependency.result)}`);
			}
			if (dependency.error) {
				dependencyParts.push(`error=${truncateContextValue(dependency.error)}`);
			}
			if (dependency.outcome) {
				dependencyParts.push(
					`outcome=${truncateContextValue(stringifyForContextValue(dependency.outcome))}`,
				);
			}
			parts.push(dependencyParts.join(' '));
		}
	}

	return parts.join('\n');
}

/** Collapse the frontend's typed confirmation union into the flat payload
 *  consumed by native tool resume schemas and sub-agent HITL. Only the fields
 *  relevant to the submitted kind are populated — everything else stays undefined.
 *
 *  Most kinds carry implicit approval (you wouldn't be submitting answers,
 *  selected credentials, or a setup action otherwise) — only `approval`,
 *  `domainAccessDeny`, and `planDeny` carry a denial path. */
function toConfirmationData(request: InstanceAiConfirmRequest): ConfirmationData {
	switch (request.kind) {
		case 'approval':
			return { approved: request.approved, userInput: request.userInput, scope: request.scope };
		case 'domainAccessApprove':
			return { approved: true, domainAccessAction: request.domainAccessAction };
		case 'domainAccessDeny':
			return { approved: false };
		case 'planDeny':
			return { approved: false, denied: true };
		case 'questions':
			return { approved: true, answers: request.answers };
		case 'credentialSelection':
			return { approved: true, credentials: request.credentials };
		case 'resourceDecision':
			return { approved: true, resourceDecision: request.resourceDecision };
		case 'setupWorkflowApply':
			return {
				approved: true,
				action: 'apply',
				nodeCredentials: request.nodeCredentials,
				nodeParameters: request.nodeParameters,
			};
		case 'setupWorkflowTestTrigger':
			return {
				approved: true,
				action: 'test-trigger',
				testTriggerNode: request.testTriggerNode,
				nodeCredentials: request.nodeCredentials,
				nodeParameters: request.nodeParameters,
			};
	}
}

@Service()
export class InstanceAiService {
	private _mcpClientManager?: McpClientManager;
	private readonly _ssrfProtectionConfig: SsrfProtectionConfig;
	private readonly _ssrfProtectionService: SsrfProtectionService;
	private get mcpClientManager(): McpClientManager {
		if (!this._mcpClientManager) {
			this._mcpClientManager = new McpClientManager(
				this._ssrfProtectionConfig.enabled ? this._ssrfProtectionService : undefined,
			);
		}
		return this._mcpClientManager;
	}

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly formBaseUrl: string;

	private readonly runState = new RunStateRegistry<User>();

	private readonly backgroundTasks = new BackgroundTaskManager(
		MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD,
	);

	private readonly memoryTaskRegistry = new MemoryTaskRegistry();

	/** Owns the LangSmith trace-context lifecycle for orchestration runs. */
	private readonly tracing: InstanceAiTracingService;

	/** Errors already sent to Sentry, so a granular boundary report wins over the outer run catch. */
	private readonly reportedErrors = new WeakSet<object>();
	/** Owns the per-thread runtime sandbox/workspace lifecycle. */
	private readonly sandboxService: InstanceAiSandboxService;

	/** Domain-access trackers per thread — persists approvals across runs within a conversation. */
	private readonly domainAccessTrackersByThread = new Map<string, DomainAccessTracker>();

	/** Tracks the iframe pushRef per thread for live execution push events. */
	private readonly threadPushRef = new Map<string, string>();

	/** Counts plan-review confirmations per thread, to tell the first plan apart from later revisions. */
	private readonly planRequestsByThread = new Map<string, number>();

	/** Per-thread promise chain that serializes schedulePlannedTasks calls. */
	private readonly schedulerLocks = new Map<string, Promise<void>>();

	/**
	 * Checkpoint re-entries that could not fire when their parent-tagged child
	 * settled (an orchestrator run was live, or other parent siblings were
	 * still running). Drained from the post-run cleanup path so the checkpoint
	 * is never left orphaned.
	 */
	private readonly pendingCheckpointReentries = new Map<string, Set<string>>();

	private readonly terminalOutcome: InstanceAiTerminalOutcomeService;

	private readonly liveness: InstanceAiLivenessService<SuspendedRunState<User>>;

	/** Owns DB persistence of suspended runs + orphan-confirmation restoration. */
	private readonly suspendedThreads: SuspendedThreadPersistenceService;

	private readonly suspendedRunRestorer: SuspendedRunRestorer;

	private readonly runDebugBuffer = new RunDebugBuffer();

	/** Default IANA timezone for the instance (from GENERIC_TIMEZONE env var). */
	private readonly defaultTimeZone: string;

	private readonly logger: Logger;

	private readonly workflowObligations: WorkflowVerificationObligationService;

	private readonly taskProjector: WorkflowVerificationTaskProjector;

	private checkpointPruneTimer: NodeJS.Timeout | undefined;

	private checkpointPruningStopped = true;

	/**
	 * In-flight `executeRun` / `processResumedStream` promises. Tracked so
	 * `shutdown()` can drain them before n8n closes the DB connection — the
	 * SDK's abort-driven `cleanupRun` and `executeRun`'s `finally` block
	 * both write to the DB during teardown, and racing the connection close
	 * surfaces as `DriverAlreadyReleasedError` for callers.
	 */
	private readonly inFlightExecutions = new Set<Promise<unknown>>();

	/**
	 * Run IDs whose post-stream terminal handling should be skipped when their
	 * abort fires. Populated by `shutdown()` for runs that were sitting on an
	 * inline HITL confirmation, and drained by `shouldPreserveHitlOnShutdown(runId)`.
	 */
	private readonly preserveHitlOnShutdown = new Set<string>();

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly gatewayService: InstanceAiGatewayService,
		private readonly browserSessionService: InstanceAiBrowserSessionService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly checkpointStore: TypeORMAgentCheckpointStore,
		private readonly aiService: AiService,
		private readonly threadGrantRepo: InstanceAiThreadGrantRepository,
		private readonly pendingConfirmationRepo: InstanceAiPendingConfirmationRepository,
		private readonly urlService: UrlService,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
		private readonly dbIterationLogStorage: DbIterationLogStorage,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly telemetry: Telemetry,
		private readonly mcpRegistryService: InstanceAiMcpRegistryService,
		private readonly userRepository: UserRepository,
		private readonly temporaryWorkflowService: InstanceAiTemporaryWorkflowService,
		private readonly errorReporter: ErrorReporter,
		ssrfProtectionConfig: SsrfProtectionConfig,
		ssrfProtectionService: SsrfProtectionService,
		private readonly eventService: EventService,
		private readonly evalCredentialAllowlists: EvalThreadCredentialAllowlistService,
		runProbe: InstanceAiRunProbe,
		private readonly modelService: InstanceAiModelService,
		private readonly creditService: InstanceAiCreditService,
	) {
		this.logger = logger.scoped('instance-ai');
		runProbe.registerActiveRunCountProvider(() => this.runState.activeRunCount());
		this.workflowObligations = new WorkflowVerificationObligationService(this.agentMemory);
		this.taskProjector = new WorkflowVerificationTaskProjector(
			this.agentMemory,
			this.eventBus,
			this.logger,
			this.workflowObligations,
		);
		this.instanceAiConfig = globalConfig.instanceAi;
		this.suspendedThreads = new SuspendedThreadPersistenceService({
			logger: this.logger,
			config: this.instanceAiConfig,
			pendingConfirmationRepo: this.pendingConfirmationRepo,
		});
		this.suspendedRunRestorer = new SuspendedRunRestorer({
			logger: this.logger,
			pendingConfirmationRepo: this.pendingConfirmationRepo,
			runState: this.runState,
			dbSnapshotStorage: this.dbSnapshotStorage,
			eventBus: this.eventBus,
			rebuilder: {
				rebuildSuspendedRun: this.rebuildSuspendedRunFromCheckpoint.bind(this),
				resumeSuspendedRun: this.resumeSuspendedRun.bind(this),
			},
		});
		const livenessPolicyConfig = createInstanceAiLivenessPolicyConfig({
			confirmationTimeoutMs: this.instanceAiConfig.confirmationTimeout,
		});
		this.liveness = new InstanceAiLivenessService<SuspendedRunState<User>>({
			policy: new InstanceAiLivenessPolicy(livenessPolicyConfig),
			backgroundTaskIdleTimeoutMs: livenessPolicyConfig.backgroundTaskIdleTimeoutMs,
			runState: this.runState,
			backgroundTasks: this.backgroundTasks,
			eventBus: this.eventBus,
			logger: this.logger,
			finalizeCancelledSuspendedRun: (suspended, reason) => {
				void this.finalizeCancelledSuspendedRun(suspended, reason);
			},
			onPendingConfirmationRejected: (requestId) => {
				void this.suspendedThreads.dropPendingConfirmation(requestId);
			},
		});
		this.tracing = new InstanceAiTracingService({
			logger: this.logger,
			eventBus: this.eventBus,
			runState: this.runState,
			dbSnapshotStorage: this.dbSnapshotStorage,
			aiService: this.aiService,
		});
		this.sandboxService = new InstanceAiSandboxService({
			config: this.instanceAiConfig,
			logger: this.logger,
			errorReporter: this.errorReporter,
			runState: this.runState,
			backgroundTasks: this.backgroundTasks,
			settingsService: this.settingsService,
			aiService: this.aiService,
		});
		this.terminalOutcome = new InstanceAiTerminalOutcomeService({
			eventBus: this.eventBus,
			dbSnapshotStorage: this.dbSnapshotStorage,
			agentMemory: this.agentMemory,
			telemetry: this.telemetry,
			logger: this.logger,
			runState: this.runState,
			suspendedThreads: this.suspendedThreads,
			tracing: this.tracing,
			publishRunFinish: (threadId, runId, status, reason) => {
				this.publishRunFinish(threadId, runId, status, reason);
			},
			saveAgentTreeSnapshot: async (threadId, runId, snapshotStorage) =>
				await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage),
		});
		this.defaultTimeZone = globalConfig.generic.timezone;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${this.urlService.getInstanceBaseUrl()}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;
		this.formBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.form}`;

		this._ssrfProtectionConfig = ssrfProtectionConfig;
		this._ssrfProtectionService = ssrfProtectionService;

		// When the admin changes MCP settings, tear down existing clients so the
		// next agent run rebuilds them against the new config. In-flight tool
		// calls on disconnected clients will fail — that's accepted: the
		// alternative is leaking clients keyed by stale config until shutdown.
		// We only listen for the MCP-changed flag so unrelated settings saves
		// don't churn live MCP connections.
		this.eventService.on('instance-ai-settings-updated', ({ mcpSettingsChanged }) => {
			if (!mcpSettingsChanged) return;
			if (!this._mcpClientManager) return;
			this._mcpClientManager.disconnect().catch((error: unknown) => {
				this.logger.warn('Failed to disconnect MCP clients after settings change', {
					error: getErrorMessage(error),
				});
			});
		});

		this.liveness.start();
		if (this.instanceSettings.isLeader) this.startCheckpointPruning();
	}

	private async createProxyRunConfig(user: User): Promise<{
		searchProxyConfig?: ServiceProxyConfig;
		tracingProxyConfig?: ServiceProxyConfig;
		tokenManager?: ProxyTokenManager;
		proxyBaseUrl?: string;
	}> {
		if (!this.aiService.isProxyEnabled()) return {};

		const client = await this.aiService.getClient();
		const proxyBaseUrl = client.getApiProxyBaseUrl();
		const tokenManager = new ProxyTokenManager(async () => {
			return await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
		});
		const featureHeaders = buildProxyHeaders({
			feature: 'instance-ai',
			n8nVersion: N8N_VERSION,
		});

		return {
			proxyBaseUrl,
			tokenManager,
			searchProxyConfig: {
				apiUrl: proxyBaseUrl + '/brave-search',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
			tracingProxyConfig: {
				apiUrl: proxyBaseUrl + '/langsmith',
				getAuthHeaders: async () => ({
					...(await tokenManager.getAuthHeaders()),
					...featureHeaders,
				}),
			},
		};
	}

	/**
	 * Full model-resolver chain shared between chat and eval paths. Delegates to
	 * the model service so the eval endpoint gets the same working model the chat
	 * endpoint uses.
	 */
	async resolveAgentModelConfig(user: User): Promise<ModelConfig> {
		return await this.modelService.resolveAgentModelConfig(user);
	}

	/**
	 * Read the user's persisted "always allow" grants for a thread (keys like `executions:run`).
	 * Persisted in `instance_ai_thread_grants` so they survive reload/navigation and are visible
	 * across mains. Returns an empty set on any read error — a missing grant just re-asks, which
	 * is safe.
	 */
	private async loadThreadSessionGrants(threadId: string, userId: string): Promise<Set<string>> {
		try {
			return await this.threadGrantRepo.findKeys(threadId, userId);
		} catch (error) {
			this.logger.warn('Failed to load Instance AI session grants', {
				threadId,
				error: getErrorMessage(error),
			});
			return new Set();
		}
	}

	/**
	 * Persist a per-user, thread-level "always allow" grant. Idempotent across mains via the
	 * composite PK. Best-effort — a failed write just means the user is re-asked next run.
	 */
	private async persistThreadSessionGrant(
		threadId: string,
		userId: string,
		key: string,
	): Promise<void> {
		try {
			await this.threadGrantRepo.grant(threadId, userId, key);
		} catch (error) {
			this.logger.warn('Failed to persist Instance AI session grant', {
				threadId,
				key,
				error: getErrorMessage(error),
			});
		}
	}

	/** Whether the AI service proxy is enabled for credit counting. */
	isProxyEnabled(): boolean {
		return this.modelService.isProxyEnabled();
	}

	/** Get current credit usage from the AI service proxy. */
	async getCredits(user: User): Promise<{ creditsQuota: number; creditsClaimed: number }> {
		return await this.modelService.getCredits(user);
	}

	isEnabled(): boolean {
		return this.settingsService.isAgentEnabled() && !!this.instanceAiConfig.model;
	}

	hasActiveRun(threadId: string): boolean {
		return this.runState.hasLiveRun(threadId);
	}

	getThreadStatus(threadId: string): InstanceAiThreadStatusResponse {
		const status = this.runState.getThreadStatus(
			threadId,
			this.backgroundTasks.getTaskSnapshots(threadId),
		);
		const memoryTasks = this.memoryTaskRegistry.getTasks(threadId);
		return { ...status, memoryTasks };
	}

	private memoryTaskObserverFor(threadId: string): (event: ScopedMemoryTaskEvent) => void {
		return (event) => {
			this.memoryTaskRegistry.handleEvent(threadId, event);
			const pendingTasks = this.memoryTaskRegistry.getTasks(threadId);
			const logContext = {
				threadId,
				taskId: event.task.id,
				taskKind: event.task.taskKind,
				pendingCount: pendingTasks.length,
				...(event.type === 'skipped' ? { reason: event.reason } : {}),
				...(event.type === 'failed' ? { error: getErrorMessage(event.error) } : {}),
				...(event.type === 'completed' &&
				event.value &&
				typeof event.value === 'object' &&
				'status' in event.value &&
				typeof event.value.status === 'string'
					? { outcome: event.value.status }
					: {}),
			};
			this.logger.info(`Observational memory task ${event.type}`, logContext);
		};
	}

	/**
	 * Surface the agent's background/best-effort failures to Sentry. The SDK emits
	 * `AgentEvent.Error` for these but nothing consumed it, so they were lost: memory
	 * observer/reflector/episodic indexing and the eager input / turn-on-suspend
	 * persists all fail silently while the run itself succeeds. We report only the
	 * `source`-tagged events — the main agentic-loop errors (no source) already reach
	 * Sentry via the errored run/stream result, so reporting them here would only
	 * re-tag the same (deduped) error.
	 */
	private subscribeToAgentErrors(
		agent: Awaited<ReturnType<typeof createInstanceAgent>>,
		threadId: string,
		runId: string,
	): void {
		agent.on(AgentEvent.Error, (event: AgentEventData) => {
			if (event.type !== AgentEvent.Error || !event.source) return;
			this.reportInstanceAiError(event.error, {
				component: `instance-ai-${event.source}`,
				threadId,
				runId,
			});
		});
	}

	private reportInstanceAiError(
		error: unknown,
		context: { component: string } & InstanceAiObservabilityContext,
	): void {
		if (typeof error === 'object' && error !== null) {
			if (this.reportedErrors.has(error)) return;
			this.reportedErrors.add(error);
		}
		const observability = buildInstanceAiObservabilityContext(context);
		this.logger.error(`Instance AI error in ${context.component}`, {
			error,
			component: context.component,
			...observability,
		});
		this.errorReporter.error(error, {
			tags: { component: context.component, ...observability },
			extra: observability,
		});
	}

	/** Reports a setup-step failure with a precise component, then re-throws for the run catch to finalize. */
	private async withSetupBoundary<T>(
		component: string,
		context: InstanceAiObservabilityContext,
		fn: () => Promise<T>,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			this.reportInstanceAiError(error, { component, ...context });
			throw error;
		}
	}

	isRunDebugEnabled(): boolean {
		return this.instanceAiConfig.runDebugEnabled;
	}

	private buildOrchestratorAgentStreamOptions(
		user: User,
		threadId: string,
		runId: string,
		signal: AbortSignal,
	): Record<string, unknown> {
		if (this.isRunDebugEnabled()) {
			this.runDebugBuffer.ensure(runId, threadId);
		}
		return {
			maxIterations: MAX_STEPS.ORCHESTRATOR,
			abortSignal: signal,
			// Recover token usage from raw provider events so a stopped/errored run
			// is still billed for the tokens consumed before the stop.
			recoverUsageOnAbort: true,
			persistence: {
				resourceId: user.id,
				threadId,
			},
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
			...(this.isRunDebugEnabled()
				? createRunDebugStepHooks(this.runDebugBuffer, { runId, threadId })
				: {}),
		};
	}

	private buildOrchestratorResumeAgentOptions(
		user: User,
		threadId: string,
		runId: string,
		agentRunId: string,
		toolCallId: string,
	): Record<string, unknown> {
		if (this.isRunDebugEnabled()) {
			this.runDebugBuffer.ensure(runId, threadId);
		}
		return {
			runId: agentRunId,
			toolCallId,
			// Keep billing stopped/errored resumed runs (see stream-options builder).
			recoverUsageOnAbort: true,
			persistence: { resourceId: user.id, threadId },
			...(this.isRunDebugEnabled()
				? createRunDebugStepHooks(this.runDebugBuffer, { runId, threadId })
				: {}),
		};
	}

	getRunDebug(runId: string) {
		return this.runDebugBuffer.get(runId);
	}

	listThreadDebugRuns(threadId: string) {
		return this.runDebugBuffer.listByThread(threadId).map((record: RunDebugRecord) => ({
			runId: record.runId,
			threadId: record.threadId,
			startedAt: record.startedAt,
			stepCount: record.steps.length,
			workflowCodeCount: record.workflowCode.length,
			label: record.label,
		}));
	}

	clearTraceContextsForTest(): void {
		this.tracing.clearTraceContextsForTest();
	}

	async submitLangsmithFeedback(
		user: User,
		threadId: string,
		responseId: string,
		payload: { rating: 'up' | 'down'; comment?: string },
	): Promise<void> {
		await this.tracing.submitLangsmithFeedback(user, threadId, responseId, payload);
	}

	startRun(
		user: User,
		threadId: string,
		message: string,
		attachments?: InstanceAiAttachment[],
		context?: InstanceAiHandoffContext,
		timeZone?: string,
		pushRef?: string,
	): string {
		this.liveness.clearThreadState(threadId);
		const { runId, abortController, messageGroupId } = this.runState.startRun({
			threadId,
			user,
		});

		// Persist the user's time zone so checkpoint / replan / synthesize
		// follow-up runs can reinject it into the system prompt
		// instead of falling back to GENERIC_TIMEZONE.
		if (timeZone) {
			this.runState.setTimeZone(threadId, timeZone);
		}

		if (pushRef !== undefined) {
			this.threadPushRef.set(threadId, pushRef);
		}

		this.startExecuteRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			attachments,
			context,
			messageGroupId,
			timeZone,
		);

		return runId;
	}

	/** Get the current messageGroupId for a thread (used by SSE sync). */
	getMessageGroupId(threadId: string): string | undefined {
		return this.runState.getMessageGroupId(threadId);
	}

	/**
	 * Get the messageGroupId for the thread's live activity.
	 * Prefers the active/suspended run's group, then falls back to the
	 * most recent running background task's group (which was captured
	 * at spawn time and may differ from the thread's current group
	 * if the user started a new turn).
	 */
	getLiveMessageGroupId(threadId: string): string | undefined {
		return this.runState.getLiveMessageGroupId(
			threadId,
			this.backgroundTasks.getTaskSnapshots(threadId),
		);
	}

	/** Get all runIds belonging to a messageGroupId. */
	getRunIdsForMessageGroup(messageGroupId: string): string[] {
		return this.runState.getRunIdsForMessageGroup(messageGroupId);
	}

	/** Get the active runId for a thread. */
	getActiveRunId(threadId: string): string | undefined {
		return this.runState.getActiveRunId(threadId);
	}

	cancelRun(threadId: string, reason = 'user_cancelled'): void {
		const cancelledTasks = this.backgroundTasks.cancelThread(threadId);
		const user = this.runState.getThreadUser(threadId);
		for (const task of cancelledTasks) {
			void this.tracing.finalizeBackgroundTaskTracing(task, 'cancelled');
			this.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId: task.runId,
				agentId: task.agentId,
				payload: {
					role: task.role,
					result: '',
					error: reason === INSTANCE_AI_RUN_TIMEOUT_REASON ? 'Timed out' : 'Cancelled by user',
				},
			});
			void this.terminalOutcome.recordBackgroundTerminalOutcome(task).finally(() => {
				void this.saveAgentTreeSnapshot(
					threadId,
					task.runId,
					this.dbSnapshotStorage,
					true,
					task.messageGroupId,
				);
			});
			if (user) {
				void this.handlePlannedTaskSettlement(user, task, 'cancelled');
			}
		}

		// Clean up any awaiting_approval plan graph for this thread. The user
		// cancelled before approving, so leaving the graph persisted would (a)
		// cause doSchedulePlannedTasks() to republish the stale checklist on
		// every later pass via syncPlannedTasksToUi(). Only target awaiting_approval — active and
		// awaiting_replan graphs have their own settlement logic via the
		// background-task cancellations above.
		void this.cancelAwaitingApprovalPlan(threadId);

		const { active, suspended } = this.runState.cancelThread(threadId);
		if (active) {
			if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON) this.liveness.markRunTimedOut(active.runId);
			active.abortController.abort();
			// inline-kind rows are dropped via the resolve-callback fired by
			// runState.cancelThread; suspended-kind rows (no in-memory
			// resolver) get cleaned up here so the index never outlives the run.
			void this.suspendedThreads.dropPendingConfirmationsForThread(threadId);
			return;
		}

		if (suspended) {
			if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON) this.liveness.markRunTimedOut(suspended.runId);
			suspended.abortController.abort();
			void this.finalizeCancelledSuspendedRun(suspended, reason);
		}

		void this.suspendedThreads.dropPendingConfirmationsForThread(threadId);
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		return this.backgroundTasks.queueCorrection(threadId, taskId, correction);
	}

	/** Cancel a single background task by ID. */
	cancelBackgroundTask(threadId: string, taskId: string): void {
		const task = this.backgroundTasks.cancelTask(threadId, taskId);
		if (!task) return;

		void this.tracing.finalizeBackgroundTaskTracing(task, 'cancelled');
		this.eventBus.publish(threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		// Persist the updated agent tree so cancelled status survives page reload.
		// The onSettled callback in executeTask is skipped for aborted tasks,
		// so we must save the snapshot explicitly here.
		void this.terminalOutcome.recordBackgroundTerminalOutcome(task).finally(() => {
			void this.saveAgentTreeSnapshot(
				threadId,
				task.runId,
				this.dbSnapshotStorage,
				true,
				task.messageGroupId,
			);
		});

		const user = this.runState.getThreadUser(threadId);
		if (user) {
			void this.handlePlannedTaskSettlement(user, task, 'cancelled');
		}
	}

	/** Cancel all background tasks across all threads. Test-only. */
	cancelAllBackgroundTasks(): number {
		const cancelled = this.backgroundTasks.cancelAll();
		for (const task of cancelled) {
			void this.tracing.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		return cancelled.length;
	}

	async startStuckBackgroundTaskForTest(
		user: User,
		threadId: string,
	): Promise<{
		threadId: string;
		runId: string;
		messageGroupId: string;
		taskId: string;
		agentId: string;
		timeoutAt: number;
	}> {
		const messageId = `msg_${nanoid()}`;
		const messageText = 'I started a background workflow-builder task.';
		const { runId, messageGroupId } = this.runState.startRun({ threadId, user });
		if (!messageGroupId) {
			throw new UnexpectedError('Failed to create message group for timeout simulation');
		}
		const taskId = `task_${nanoid()}`;
		const agentId = `agent_${nanoid()}`;

		this.eventBus.publish(threadId, {
			type: 'run-start',
			runId,
			agentId: orchestratorAgentId(runId),
			userId: user.id,
			payload: { messageId, messageGroupId },
		});
		this.eventBus.publish(threadId, {
			type: 'text-delta',
			runId,
			agentId: orchestratorAgentId(runId),
			responseId: `test-background-start:${runId}`,
			payload: { text: messageText },
		});
		this.eventBus.publish(threadId, {
			type: 'agent-spawned',
			runId,
			agentId,
			payload: {
				parentId: orchestratorAgentId(runId),
				role: 'workflow-builder',
				tools: [],
				taskId,
				kind: 'builder',
				title: 'Building workflow',
				subtitle: 'Timeout simulation',
				goal: 'Simulate a stuck background task timeout',
			},
		});

		// Persist the assistant message so the UI can render it after navigation.
		await this.agentMemory.saveMessages({
			threadId,
			resourceId: user.id,
			messages: [
				{
					id: messageId,
					createdAt: new Date(),
					type: 'llm',
					role: 'assistant',
					content: [{ type: 'text', text: messageText }],
				},
			],
		});

		const outcome = this.backgroundTasks.spawn({
			taskId,
			threadId,
			runId,
			role: 'workflow-builder',
			agentId,
			messageGroupId,
			run: async (signal) =>
				await new Promise<string>((resolve) => {
					signal.addEventListener('abort', () => resolve('aborted'), { once: true });
				}),
			onFailed: (task) => {
				this.eventBus.publish(threadId, {
					type: 'agent-completed',
					runId,
					agentId,
					payload: {
						role: task.role,
						result: '',
						error: task.error ?? 'Unknown error',
					},
				});
			},
			onSettled: async (task) => {
				await this.terminalOutcome.recordBackgroundTerminalOutcome(task);
				await this.saveAgentTreeSnapshot(
					threadId,
					runId,
					this.dbSnapshotStorage,
					true,
					messageGroupId,
				);
			},
		});

		if (outcome.status !== 'started') {
			throw new UnexpectedError('Failed to start stuck background task simulation');
		}

		this.runState.clearActiveRun(threadId);
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			userId: user.id,
			payload: { status: 'completed' },
		});

		return {
			threadId,
			runId,
			messageGroupId,
			taskId,
			agentId,
			timeoutAt: outcome.task.lastActivityAt + this.liveness.backgroundTaskIdleTimeoutMs + 1,
		};
	}

	async runLivenessSweepForTest(now?: number): Promise<void> {
		await this.liveness.sweepTimedOutWork(now);
	}

	// ── Gateway lifecycle (delegated to LocalGatewayRegistry) ───────────────

	// ── Test-only trace replay API ───────────────────────────────────────────

	loadTraceEvents(slug: string, events: unknown[]): void {
		this.tracing.loadTraceEvents(slug, events);
	}

	getTraceEvents(slug: string): unknown[] {
		return this.tracing.getTraceEvents(slug);
	}

	hasRunningWorkForTest(): boolean {
		const threadIds = new Set(this.tracing.getTrackedThreadIds());

		for (const threadId of threadIds) {
			if (this.runState.getActiveRunId(threadId)) return true;
			if (this.backgroundTasks.getRunningTasks(threadId).length > 0) return true;
		}

		return false;
	}

	activateTraceSlug(slug: string): void {
		this.tracing.activateTraceSlug(slug);
	}

	clearTraceEvents(slug: string): void {
		this.tracing.clearTraceEvents(slug);
	}

	/**
	 * Remove all in-memory state associated with a thread.
	 * Must be called when a thread is deleted so the maps don't leak.
	 */
	async clearThreadState(threadId: string): Promise<void> {
		this.liveness.clearThreadState(threadId);

		// Clear run-state registry entries (active/suspended runs, confirmations,
		// user, time zone, and message-group mappings).
		const { active, suspended } = this.runState.clearThread(threadId);
		if (active) {
			active.abortController.abort();
			await this.tracing.finalizeRunTracing(active.runId, active.tracing, {
				status: 'cancelled',
				reason: 'thread_cleared',
			});
		}
		if (suspended) {
			suspended.abortController.abort();
			await this.tracing.finalizeRunTracing(suspended.runId, suspended.tracing, {
				status: 'cancelled',
				reason: 'thread_cleared',
			});
		}

		// Cancel background tasks belonging to this thread
		for (const task of this.backgroundTasks.cancelThread(threadId)) {
			task.abortController.abort();
			await this.tracing.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		await this.tracing.finalizeRemainingMessageTraceRoots(threadId, {
			status: 'cancelled',
			reason: 'thread_cleared',
			metadata: { completion_source: 'service_cleanup' },
		});

		this.schedulerLocks.delete(threadId);
		this.domainAccessTrackersByThread.delete(threadId);
		this.evalCredentialAllowlists.clearThread(threadId);
		this.threadPushRef.delete(threadId);
		this.planRequestsByThread.delete(threadId);
		this.memoryTaskRegistry.clearThread(threadId);
		this.tracing.deleteTraceContextsForThread(threadId);
		await this.sandboxService.destroySandbox(threadId);
		await this.temporaryWorkflowService.reapForThreadCleanup(threadId);
		await this.suspendedThreads.dropPendingConfirmationsForThread(threadId);
		this.eventBus.clearThread(threadId);
	}

	async shutdown(): Promise<void> {
		this.stopCheckpointPruning();
		this.liveness.shutdown();

		const { activeRuns, suspendedRuns, pendingThreadIds } = this.runState.shutdown();
		const threadsWithPendingHitl = new Set(pendingThreadIds);
		for (const run of activeRuns) {
			// Runs holding an inline HITL confirmation (`create-tasks`,
			// sub-agent `ask-user`) sit in `activeRuns` because the orchestrator
			// is alive — it's just awaiting the in-process Promise. Their
			// `instance_ai_pending_confirmations` row survives the restart and
			// `handleOrphanedConfirmation` will issue the user-visible
			// `restart_lost_confirmation` UserError + `run-finish` when (if)
			// the user clicks confirm. If we publish run-finish + re-save the
			// snapshot here, we'd permanently overwrite the plan/ask card with
			// a `status: 'cancelled'` tree before the user has a chance to see
			// it on reload.
			if (threadsWithPendingHitl.has(run.threadId)) {
				await this.tracing.finalizeRunTracing(run.runId, run.tracing, {
					status: 'cancelled',
					reason: 'service_shutdown',
				});
				// Record the policy *before* the abort fires so the run's catch
				// handler (which runs synchronously off the abort) sees the
				// flag. The catch path consults `shouldPreserveHitlOnShutdown`
				// and skips the terminal-fallback / run-finish / snapshot
				// writes that would otherwise overwrite the plan/ask card.
				this.preserveHitlOnShutdown.add(run.runId);
				run.abortController.abort();
				continue;
			}

			// Truly mid-stream run: publish run-finish first so the terminal
			// event lands in the event bus before the snapshot reads it;
			// saveAgentTreeSnapshot rebuilds the tree from the bus, so without
			// this order the persisted tree would still look mid-stream after
			// the process is gone.
			this.publishRunFinish(run.threadId, run.runId, 'cancelled', 'service_shutdown');
			await this.persistShutdownSnapshot(run.threadId, run.runId, run.messageGroupId);
			await this.tracing.finalizeRunTracing(run.runId, run.tracing, {
				status: 'cancelled',
				reason: 'service_shutdown',
			});
			run.abortController.abort();
		}
		for (const run of suspendedRuns) {
			// Suspended runs are recoverable from the checkpoint store + pending
			// confirmation index, so leave the run-finish unpublished and the
			// snapshot untouched. We only need to abort the in-process stream;
			// the DB rows are intentionally preserved across restart.
			await this.tracing.finalizeRunTracing(run.runId, run.tracing, {
				status: 'cancelled',
				reason: 'service_shutdown',
			});
			run.abortController.abort();
		}
		for (const task of this.backgroundTasks.cancelAll()) {
			task.abortController.abort();
			await this.tracing.finalizeBackgroundTaskTracing(task, 'cancelled');
		}

		// Drain the now-aborted executeRun / processResumedStream promises
		// before returning. Each one's finally block does DB work
		// (`schedulePlannedTasks`, `dropPendingConfirmationsForThread`) and
		// the SDK's abort-driven `cleanupRun` issues `checkpointStore.delete`,
		// all of which would race the connection close in `exitSuccessFully`
		// and surface as `DriverAlreadyReleasedError` otherwise. Bounded so
		// a hung agent can't block n8n's own graceful-shutdown deadline.
		await this.drainInFlightExecutions(INSTANCE_AI_SHUTDOWN_DRAIN_TIMEOUT_MS);

		const threadsWithTraces = new Set(this.tracing.getTrackedThreadIds());
		for (const threadId of threadsWithTraces) {
			await this.tracing.finalizeRemainingMessageTraceRoots(threadId, {
				status: 'cancelled',
				reason: 'service_shutdown',
				metadata: { completion_source: 'service_cleanup' },
			});
		}

		this.gatewayService.disconnectAll();
		await this.browserSessionService.shutdown();
		this.sandboxService.stopSandboxExpiryTimers();

		// Thread-scoped sandboxes survive service shutdown so a restarted process
		// can reuse them. Explicit thread cleanup and idle TTL remain the
		// teardown paths.

		this.domainAccessTrackersByThread.clear();
		this.tracing.clear();

		this.eventBus.clear();
		await this._mcpClientManager?.disconnect();
		this.logger.debug('Instance AI service shut down');
	}

	@OnLeaderTakeover()
	startCheckpointPruning(): void {
		if (this.checkpointPruneTimer || this.instanceAiConfig.pruneInterval <= 0) return;
		this.checkpointPruningStopped = false;
		this.scheduleCheckpointPrune(0);
	}

	@OnLeaderStepdown()
	stopCheckpointPruning(): void {
		this.checkpointPruningStopped = true;
		clearTimeout(this.checkpointPruneTimer);
		this.checkpointPruneTimer = undefined;
	}

	private scheduleCheckpointPrune(delayMs = this.instanceAiConfig.pruneInterval): void {
		if (this.checkpointPruningStopped) return;
		this.checkpointPruneTimer = setTimeout(() => {
			void this.runScheduledPrune();
		}, delayMs);
		this.checkpointPruneTimer.unref();
	}

	/**
	 * Track a fire-and-forget run so `shutdown()` can wait for its cleanup
	 * (finally block + SDK `cleanupRun`) to finish before the DB closes.
	 * The promise removes itself from the set on settle so the set doesn't
	 * grow unbounded across long-running threads.
	 *
	 * Prefer `startExecuteRun` / `startProcessResumedStream` over calling this
	 * directly — they make tracking unmissable by binding the spawn and the
	 * tracking together in one method.
	 */
	private trackInFlightExecution(promise: Promise<unknown>): void {
		const tracked = promise.finally(() => {
			this.inFlightExecutions.delete(tracked);
		});
		this.inFlightExecutions.add(tracked);
	}

	/**
	 * Single spawn point for the executor — guarantees shutdown can drain the
	 * run before closing the DB. New call sites should always go through this
	 * wrapper rather than invoking `executeRun` directly.
	 */
	private startExecuteRun(...args: Parameters<InstanceAiService['executeRun']>): void {
		this.trackInFlightExecution(this.executeRun(...args));
	}

	/** Same shutdown-drain contract as `startExecuteRun`, for the resume path. */
	private startProcessResumedStream(
		...args: Parameters<InstanceAiService['processResumedStream']>
	): void {
		this.trackInFlightExecution(this.processResumedStream(...args));
	}

	/**
	 * True when `shutdown()` aborted this run with the explicit policy that its
	 * inline-HITL snapshot should be left intact. Used by `executeRun` and
	 * `processResumedStream` to short-circuit the cancelled-path terminal
	 * finalisation (run-finish event + cancelled tree snapshot) that would
	 * otherwise overwrite the plan/ask card the user expects to see on reload.
	 */
	private shouldPreserveHitlOnShutdown(runId: string): boolean {
		return this.preserveHitlOnShutdown.has(runId);
	}

	private async drainInFlightExecutions(timeoutMs: number): Promise<void> {
		if (this.inFlightExecutions.size === 0) return;

		const drain = Promise.allSettled([...this.inFlightExecutions]);
		const timeout = new Promise<'timeout'>((resolve) => {
			setTimeout(() => resolve('timeout'), timeoutMs).unref();
		});

		const outcome = await Promise.race([drain.then(() => 'drained' as const), timeout]);
		if (outcome === 'timeout') {
			this.logger.warn('Timed out waiting for in-flight Instance AI runs to drain', {
				timeoutMs,
				stillInFlight: this.inFlightExecutions.size,
			});
		}
	}

	/**
	 * One tick of the recurring leader prune cycle: expire stale checkpoints,
	 * drop expired pending confirmations, and delete expired conversation
	 * threads, then schedule the next run. A checkpoint failure reschedules
	 * with a shorter retry delay; the confirmation and thread steps swallow
	 * their own errors so they never disrupt the cycle.
	 */
	private async runScheduledPrune(now = Date.now()): Promise<void> {
		const olderThan = new Date(now - this.instanceAiConfig.snapshotRetention);

		try {
			const count = await this.checkpointStore.markExpiredOlderThan(olderThan);
			if (count > 0) {
				this.logger.info('Expired stale Instance AI checkpoints', { count });
			} else {
				this.logger.debug('No stale Instance AI checkpoints to expire');
			}
			await this.suspendedThreads.pruneStalePendingConfirmations(now);
			await this.pruneExpiredThreads();
			this.scheduleCheckpointPrune();
		} catch (error: unknown) {
			this.logger.warn('Failed to expire stale Instance AI checkpoints', {
				error: getErrorMessage(error),
			});
			this.scheduleCheckpointPrune(INSTANCE_AI_CHECKPOINT_PRUNE_RETRY_MS);
		}
	}

	/**
	 * Delete conversation threads older than the configured TTL as part of the
	 * recurring leader prune. Has its own try/catch so a failure here never
	 * disrupts checkpoint pruning or the next scheduled run. No-op when
	 * `threadTtlDays` is 0 (handled inside `cleanupExpiredThreads`).
	 */
	private async pruneExpiredThreads(): Promise<void> {
		try {
			await this.memoryService.cleanupExpiredThreads(
				async (threadId) => await this.clearThreadState(threadId),
			);
		} catch (error: unknown) {
			this.logger.warn('Failed to clean up expired Instance AI conversation threads', {
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Save the in-flight agent tree as a terminal snapshot so the UI doesn't
	 * sit on a half-rendered turn after the process restarts. Best-effort: a
	 * DB write failure here must not block the rest of shutdown.
	 */
	private async persistShutdownSnapshot(
		threadId: string,
		runId: string,
		messageGroupId: string | undefined,
	): Promise<void> {
		try {
			await this.saveAgentTreeSnapshot(
				threadId,
				runId,
				this.dbSnapshotStorage,
				true,
				messageGroupId,
			);
		} catch (error: unknown) {
			this.logger.warn('Failed to persist shutdown snapshot', {
				threadId,
				runId,
				error: getErrorMessage(error),
			});
		}
	}

	private createAgentMemoryOptions() {
		return {
			observationalMemory: {
				observerThresholdTokens: this.instanceAiConfig.observerMessageTokens,
				reflectorThresholdTokens: this.instanceAiConfig.reflectorObservationTokens,
			},
		};
	}

	private createWorkflowTaskServiceWithUiSync(
		threadId: string,
		runId: string,
		workflowTasks: WorkflowTaskCoordinator,
	): WorkflowTaskService {
		const sync = async () => await this.taskProjector.syncFromWorkflowLoop(threadId, runId);

		return {
			reportBuildOutcome: async (outcome) => {
				const action = await workflowTasks.reportBuildOutcome(outcome);
				await sync();
				return action;
			},
			reportVerificationVerdict: async (verdict) => {
				const action = await workflowTasks.reportVerificationVerdict(verdict);
				await sync();
				return action;
			},
			updateBuildOutcome: async (workItemId, update) => {
				await workflowTasks.updateBuildOutcome(workItemId, update);
				await sync();
			},
			getBuildOutcome: async (workItemId) => await workflowTasks.getBuildOutcome(workItemId),
			getWorkflowLoopState: async (workItemId) =>
				await workflowTasks.getWorkflowLoopState(workItemId),
		};
	}

	private trackWorkflowVerificationObligation(
		obligation: WorkflowVerificationObligation,
		event: string,
		extra: Record<string, string | number | boolean | undefined> = {},
	): void {
		try {
			this.telemetry?.track('instance_ai_workflow_verification_obligation', {
				event,
				thread_id: obligation.threadId,
				run_id: obligation.runId,
				task_id: obligation.taskId,
				planned_task_id: obligation.plannedTaskId,
				work_item_id: obligation.workItemId,
				workflow_id: obligation.workflowId,
				source: obligation.source,
				policy: obligation.policy,
				status: obligation.status,
				readiness_status: obligation.readiness?.status,
				setup_status: obligation.setupRequirement?.status,
				has_evidence: obligation.evidence?.attempted === true,
				evidence_success: obligation.evidence?.success,
				blocking_reason: obligation.blockingReason,
				...extra,
			});
		} catch (error) {
			this.logger.warn('Failed to track workflow verification obligation telemetry', {
				threadId: obligation.threadId,
				workItemId: obligation.workItemId,
				error: getErrorMessage(error),
			});
		}
	}

	private buildPlannedTaskFollowUpMessage(
		type: 'synthesize' | 'replan' | 'checkpoint' | 'build-workflow',
		graph: PlannedTaskGraph,
		options: {
			failedTask?: PlannedTaskRecord;
			checkpoint?: PlannedTaskRecord;
			buildTask?: PlannedTaskRecord;
		} = {},
	): string {
		const payload: Record<string, unknown> = {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				title: task.title,
				kind: task.kind,
				status: task.status,
				result: task.result,
				error: task.error,
				outcome: task.outcome,
			})),
		};

		if (options.failedTask) {
			payload.failedTask = {
				id: options.failedTask.id,
				title: options.failedTask.title,
				kind: options.failedTask.kind,
				error: options.failedTask.error,
				result: options.failedTask.result,
			};
		}

		if (options.checkpoint) {
			const depOutcomes = graph.tasks
				.filter((t) => options.checkpoint!.deps.includes(t.id))
				.map((t) => ({
					id: t.id,
					title: t.title,
					kind: t.kind,
					status: t.status,
					result: t.result,
					outcome: t.outcome,
				}));
			payload.checkpoint = {
				id: options.checkpoint.id,
				title: options.checkpoint.title,
				instructions: options.checkpoint.spec,
				dependsOn: depOutcomes,
			};
		}

		if (options.buildTask) {
			payload.buildTask = {
				id: options.buildTask.id,
				title: options.buildTask.title,
				kind: options.buildTask.kind,
				spec: options.buildTask.spec,
				workflowId: options.buildTask.workflowId,
				isSupportingWorkflow: options.buildTask.isSupportingWorkflow,
				deps: options.buildTask.deps,
			};
		}

		return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private buildWorkflowVerificationFollowUpMessage(input: {
		obligation: WorkflowVerificationObligation;
		outcome?: WorkflowBuildOutcome;
		sourceTask?: Pick<
			ManagedBackgroundTask,
			'taskId' | 'role' | 'status' | 'result' | 'error' | 'plannedTaskId' | 'workItemId'
		>;
	}): string {
		const payload = {
			obligation: input.obligation,
			outcome: input.outcome,
			sourceTask: input.sourceTask,
		};

		return `<workflow-verification-follow-up>\n${JSON.stringify(payload, null, 2)}\n</workflow-verification-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private async createPlannedTaskState() {
		const memory = this.agentMemory;
		const taskStorage = new ThreadTaskStorage(memory);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
		return { memory, taskStorage, plannedTaskService };
	}

	/**
	 * Replays any undelivered background-task outcomes for a thread so a
	 * reconnecting client never misses a result that completed while its stream
	 * was closed. Delegates to {@link InstanceAiTerminalOutcomeService}.
	 */
	async replayUndeliveredTerminalOutcomes(
		threadId: string,
		options: { delivery?: 'snapshot' | 'event' } = {},
	): Promise<void> {
		await this.terminalOutcome.replayUndeliveredTerminalOutcomes(threadId, options);
	}

	private async syncPlannedTasksToUi(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		const { taskStorage } = await this.createPlannedTaskState();
		const tasks = await this.taskProjector.projectPlannedTaskList(threadId, graph);
		await taskStorage.save(threadId, tasks);
		this.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId: graph.planRunId,
			agentId: orchestratorAgentId(graph.planRunId),
			payload: { tasks },
		});
	}

	/**
	 * Drop any persisted planned-task graph that is still `awaiting_approval`,
	 * and clear the UI checklist. Called on run cancellation and HITL timeout so
	 * stale approval state doesn't linger. A graph in `active` / `awaiting_replan`
	 * is already in-flight and has its own settlement logic.
	 */
	private async cancelAwaitingApprovalPlan(threadId: string): Promise<void> {
		try {
			const { plannedTaskService, taskStorage } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph || graph.status !== 'awaiting_approval') return;

			await plannedTaskService.clear(threadId);
			await taskStorage.save(threadId, { tasks: [] });
			this.eventBus.publish(threadId, {
				type: 'tasks-update',
				runId: graph.planRunId,
				agentId: orchestratorAgentId(graph.planRunId),
				payload: { tasks: { tasks: [] }, planItems: [] },
			});
		} catch (error) {
			this.logger.warn('Failed to clean up awaiting_approval plan on cancel', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async createExecutionEnvironment(
		user: User,
		threadId: string,
		runId: string,
		abortSignal: AbortSignal,
		messageGroupId?: string,
		pushRef?: string,
		proxyRunConfig?: Awaited<ReturnType<InstanceAiService['createProxyRunConfig']>>,
	) {
		const memory = this.agentMemory;
		const boundProjectId = await memory.getThreadProjectId(threadId);
		if (!boundProjectId) {
			throw new UnexpectedError(
				`Instance AI thread "${threadId}" has no bound project; it must be created via POST /instance-ai/threads before a run can start`,
			);
		}

		const adminSettings = this.settingsService.getAdminSettings();
		const localGatewayDisabledGlobally = adminSettings.localGatewayDisabled;
		const localGatewayDisabledForUser = await this.settingsService.isLocalGatewayDisabledForUser(
			user.id,
		);
		const userGateway = this.gatewayService.findGateway(user.id);

		const { searchProxyConfig, tracingProxyConfig, tokenManager, proxyBaseUrl } =
			proxyRunConfig ?? (await this.createProxyRunConfig(user));

		const context = this.adapterService.createContext(user, {
			searchProxyConfig,
			pushRef,
			threadId,
			projectId: boundProjectId,
			credentialIdAllowlist: this.evalCredentialAllowlists.get(threadId),
		});

		// Merge both local gateway and direct browser-use into a single
		// composite server, since context has a single `localMcpServer`.
		// Perhaps a better solution would be to have multiple local MCP
		// servers? But that requires more changes where `localMcpServer`
		// is currently used
		const gatewayMcpServer =
			!localGatewayDisabledForUser && userGateway?.isConnected ? userGateway : undefined;
		const browserMcpServer = localGatewayDisabledGlobally
			? undefined
			: this.browserSessionService.findMcpServer(user.id);
		const localMcpServer = composeLocalMcpServers(gatewayMcpServer, browserMcpServer);
		if (localMcpServer) {
			context.localMcpServer = localMcpServer;
		}

		context.permissions = this.settingsService.getPermissions();
		if (this.sourceControlPreferencesService.getPreferences().branchReadOnly) {
			context.permissions = applyBranchReadOnlyOverrides(context.permissions);
			context.branchReadOnly = true;
		}

		let domainTracker = this.domainAccessTrackersByThread.get(threadId);
		if (!domainTracker) {
			domainTracker = createDomainAccessTracker();
			this.domainAccessTrackersByThread.set(threadId, domainTracker);
		}
		context.domainAccessTracker = domainTracker;
		context.runId = runId;

		// Per-user, thread-level "always allow" grants are persisted in the DB so they survive
		// reload/navigation and are visible across mains. Load once per run; a tool resuming
		// from a `scope: 'session'` approval persists new grants via `grantSessionToolApproval`.
		// Keep the mutable set so a grant approved mid-run is honored by later calls in the same
		// run — the next run reloads it from the DB anyway.
		const sessionGrants = await this.loadThreadSessionGrants(threadId, user.id);
		context.sessionApprovedToolKeys = sessionGrants;
		context.grantSessionToolApproval = async (key: string) => {
			await this.persistThreadSessionGrant(threadId, user.id, key);
			sessionGrants.add(key);
		};
		if (this.isRunDebugEnabled()) {
			context.recordWorkflowCodeSnapshot = (snapshot) => {
				this.runDebugBuffer.ensure(runId, threadId);
				this.runDebugBuffer.recordWorkflowCode(runId, snapshot);
			};
		}

		browserMcpServer?.setDomainGate({
			tracker: domainTracker,
			runId,
			permissionMode: context.permissions?.fetchUrl,
		});

		// Compute gateway status for the system prompt. The direct browser
		// session contributes a `browser` capability even without the daemon.
		if (localGatewayDisabledGlobally) {
			context.localGatewayStatus = { status: 'disabledGlobally' };
		} else if (gatewayMcpServer || browserMcpServer) {
			const capabilities = new Set<string>();
			if (gatewayMcpServer) {
				for (const { name, enabled } of gatewayMcpServer.getStatus().toolCategories) {
					if (enabled) {
						capabilities.add(name);
					}
				}
			}

			if (browserMcpServer) {
				capabilities.add('browser');
			}

			context.localGatewayStatus = {
				status: 'connected',
				capabilities: [...capabilities],
			};
		} else {
			context.localGatewayStatus = {
				status: localGatewayDisabledForUser ? 'disabled' : 'disconnected',
			};
		}

		const modelId =
			proxyBaseUrl && tokenManager
				? await this.modelService.resolveProxyModel(user, proxyBaseUrl, tokenManager)
				: await this.modelService.resolveAgentModelConfig(user);

		const taskStorage = new ThreadTaskStorage(memory);
		const iterationLog = this.dbIterationLogStorage;
		const snapshotStorage = this.dbSnapshotStorage;
		const workflowLoopStorage = new WorkflowLoopStorage(memory);
		const workflowTasks = this.createWorkflowTaskServiceWithUiSync(
			threadId,
			runId,
			new WorkflowTaskCoordinator(threadId, workflowLoopStorage),
		);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);

		const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
		if (nodeDefDirs.length > 0) {
			setSchemaBaseDirs(nodeDefDirs);
		}

		const baseRuntimeSkills = loadInstanceAiRuntimeSkillSource();
		let runtimeSkills = baseRuntimeSkills;
		let runtimeWorkspace: Workspace | undefined;
		let workspaceRoot: string | undefined;

		const sandboxStatus = this.settingsService.getSandboxStatus();
		if (sandboxStatus.workflowBuilderAvailable) {
			const sandboxConfig = await this.withSetupBoundary(
				'instance-ai-sandbox-setup',
				{ threadId, runId, userId: user.id, messageGroupId },
				async () => await this.sandboxService.resolveSandboxConfig(user),
			);

			if (sandboxConfig.enabled) {
				workspaceRoot = getPromptWorkspaceRoot(sandboxConfig.provider);

				let sandboxEntryPromise: Promise<RuntimeSandboxEntry | undefined> | undefined;
				const getSandboxEntry = async () => {
					sandboxEntryPromise ??= this.sandboxService
						.getOrCreateWorkspaceEntry(threadId, user)
						.catch((error: unknown) => {
							sandboxEntryPromise = undefined;
							throw error;
						});

					return await sandboxEntryPromise;
				};
				const getSetupSandboxEntry = async () => {
					return await this.sandboxService.getOrCreateWorkspace(threadId, user, context);
				};

				const scopeWorkspaceForAgent = async (
					workspace: Workspace | undefined,
				): Promise<Workspace | undefined> => {
					if (!workspace) return undefined;
					const root = await getWorkspaceRoot(workspace);
					return createScopedWorkspace(workspace, root);
				};

				runtimeWorkspace = createLazyRuntimeWorkspace({
					ensureWorkspace: async () =>
						await scopeWorkspaceForAgent((await getSetupSandboxEntry())?.workspace),
				});
				const runtimeSkillWorkspace = createLazyRuntimeWorkspace({
					id: 'instance-ai-runtime-skill-workspace',
					name: 'Instance AI runtime skill workspace',
					ensureWorkspace: async () =>
						await scopeWorkspaceForAgent((await getSandboxEntry())?.workspace),
				});
				runtimeSkills = createLazyWorkspaceRuntimeSkillSource({
					source: baseRuntimeSkills,
					workspace: runtimeSkillWorkspace,
					logger: this.logger,
				});
			}
		}

		context.workspace = runtimeWorkspace;
		context.threadId = threadId;
		context.threadMemory = memory;
		context.trackTelemetry = (eventName, properties) => {
			this.telemetry.track(eventName, properties);
		};
		const domainTools = createAllTools(context);

		const orchestrationContext: OrchestrationContext = {
			threadId,
			runId,
			messageGroupId,
			userId: user.id,
			projectId: boundProjectId,
			orchestratorAgentId: orchestratorAgentId(runId),
			modelId,
			checkpointStore: this.checkpointStore,
			subAgentMaxSteps: this.instanceAiConfig.subAgentMaxSteps,
			eventBus: this.eventBus,
			logger: this.logger,
			outputRedaction: resolveOutputRedaction(this.instanceAiConfig),
			trackTelemetry: (eventName, properties) => {
				this.telemetry.track(eventName, properties);
			},
			domainTools,
			abortSignal,
			taskStorage,
			timeZone: this.defaultTimeZone,
			localMcpServer: context.localMcpServer,
			runtimeSkills,
			runtimeSkillCatalog: baseRuntimeSkills,
			oauth2CallbackUrl: this.oauth2CallbackUrl,
			webhookBaseUrl: this.webhookBaseUrl,
			formBaseUrl: this.formBaseUrl,
			waitForConfirmation: async (requestId: string) => {
				this.runState.touchActiveRun(threadId);
				return await new Promise<ConfirmationData>((resolve) => {
					this.runState.registerPendingConfirmation(requestId, {
						resolve,
						threadId,
						userId: user.id,
						createdAt: Date.now(),
					});

					void this.suspendedThreads.persistPendingConfirmation({
						requestId,
						threadId,
						userId: user.id,
						runId,
						messageGroupId,
						kind: 'inline',
					});

					// Inline HITL (plan approval / sub-agent asks)
					// keeps the orchestrator run active, so the normal suspended/completed
					// snapshot paths do not execute. Queue a snapshot after the current
					// confirmation-request event is published to preserve refresh recovery.
					queueMicrotask(() => {
						void this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
					});
				});
			},
			cancelBackgroundTask: async (taskId) => this.cancelBackgroundTask(threadId, taskId),
			spawnBackgroundTask: (opts) =>
				this.spawnBackgroundTask(runId, opts, snapshotStorage, messageGroupId),
			touchRun: () => this.runState.touchActiveRun(threadId),
			touchBackgroundTask: (taskId) => this.backgroundTasks.touchTask(threadId, taskId),
			plannedTaskService,
			schedulePlannedTasks: async () => await this.schedulePlannedTasks(user, threadId),
			iterationLog,
			sendCorrectionToTask: (taskId, correction) =>
				this.sendCorrectionToTask(threadId, taskId, correction),
			workflowTaskService: workflowTasks,
			workspace: runtimeWorkspace,
			workspaceRoot,
			nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
			domainContext: context,
			tracingProxyConfig,
			memory,
		};

		return {
			context,
			memory,
			taskStorage,
			iterationLog,
			snapshotStorage,
			workflowTasks,
			plannedTaskService,
			modelId,
			orchestrationContext,
		};
	}

	private async dispatchPlannedTask(
		task: PlannedTaskRecord,
		context: OrchestrationContext,
		graph?: PlannedTaskGraph,
	): Promise<void> {
		// Plan approval authorizes the task-family's non-destructive tools,
		// so the sub-agent can execute without a redundant second confirmation.
		const taskContext = this.createPlannedTaskContext(task.kind, context);
		const conversationContext = buildPlannedTaskConversationContext(task, graph);

		let started: { taskId: string; agentId: string; result: string } | null = null;

		if (task.kind === 'delegate') {
			started = await startDetachedDelegateTask(taskContext, {
				title: task.title,
				spec: task.spec,
				tools: task.tools ?? [],
				plannedTaskId: task.id,
				conversationContext,
			});
		}

		if (!started?.taskId) {
			await context.plannedTaskService?.markFailed(context.threadId, task.id, {
				error: started?.result || `Failed to start planned task "${task.title}"`,
			});
			return;
		}

		await context.plannedTaskService?.markRunning(context.threadId, task.id, {
			agentId: started.agentId,
			backgroundTaskId: started.taskId,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await this.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	}

	/**
	 * Creates a task-scoped OrchestrationContext with plan-approved permission
	 * overrides. Rebuilds domain tools so each sub-agent gets its own closure
	 * with the correct permissions, preventing cross-task leakage.
	 */
	private createPlannedTaskContext(
		kind: PlannedTaskRecord['kind'],
		context: OrchestrationContext,
	): OrchestrationContext {
		if (!context.domainContext) return context;

		const taskDomainContext = applyPlannedTaskPermissions(context.domainContext, kind);
		if (taskDomainContext === context.domainContext) return context;

		return {
			...context,
			domainContext: taskDomainContext,
			domainTools: createAllTools(taskDomainContext),
		};
	}

	private collectWorkflowIds(value: unknown, workflowIds: Set<string>): void {
		if (value === null || value === undefined || typeof value !== 'object') return;

		if (Array.isArray(value)) {
			for (const item of value) {
				this.collectWorkflowIds(item, workflowIds);
			}
			return;
		}

		for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
			if (key === 'workflowId' && typeof child === 'string' && child.length > 0) {
				workflowIds.add(child);
				continue;
			}

			if (key === 'supportingWorkflowIds' && Array.isArray(child)) {
				for (const workflowId of child) {
					if (typeof workflowId === 'string' && workflowId.length > 0) {
						workflowIds.add(workflowId);
					}
				}
				continue;
			}

			this.collectWorkflowIds(child, workflowIds);
		}
	}

	private getBuildTaskWorkflowName(task: PlannedTaskRecord): string | undefined {
		if (task.kind !== 'build-workflow') return undefined;

		const titleMatch =
			task.title.match(/^Build '(.+)' workflow$/) ?? task.title.match(/^Build "(.+)" workflow$/);

		return titleMatch?.[1];
	}

	/**
	 * Keep explicit user-requested runs approval-gated when they happen as checkpoint fallback.
	 */
	private checkpointRequiresRunApproval(
		graph: PlannedTaskGraph,
		_checkpoint: PlannedTaskRecord,
	): boolean {
		return graph.postBuildRunApprovalRequired === true;
	}

	/**
	 * Resolve the workflows the checkpoint task is verifying so the runWorkflow
	 * permission override can be scoped. Workflow names are carried as an E2E replay
	 * fallback because runtime workflow IDs can be remapped.
	 */
	private async getCheckpointRunPolicy(
		threadId: string,
		checkpointTaskId: string,
	): Promise<{
		allowedWorkflowIds: ReadonlySet<string>;
		allowedWorkflowNames: ReadonlySet<string>;
		requireApproval: boolean;
	}> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint) {
				return {
					allowedWorkflowIds: new Set(),
					allowedWorkflowNames: new Set(),
					requireApproval: false,
				};
			}
			const deps = new Set(checkpoint.deps);
			const ids = new Set<string>();
			const names = new Set<string>();
			for (const task of graph.tasks) {
				if (!deps.has(task.id)) continue;

				const workflowName = this.getBuildTaskWorkflowName(task);
				if (workflowName) {
					names.add(workflowName);
				}

				if (task.workflowId) {
					ids.add(task.workflowId);
				}
				this.collectWorkflowIds(task.outcome, ids);
			}

			const tracing = this.tracing.getTraceContextForContinuation(threadId);
			for (const workflowId of [...ids]) {
				const remappedWorkflowId = tracing?.idRemapper?.remapOutput(workflowId);
				if (typeof remappedWorkflowId === 'string' && remappedWorkflowId.length > 0) {
					ids.add(remappedWorkflowId);
				}
			}
			return {
				allowedWorkflowIds: ids,
				allowedWorkflowNames: names,
				requireApproval: this.checkpointRequiresRunApproval(graph, checkpoint),
			};
		} catch (error) {
			this.logger.warn('Failed to resolve checkpoint allowed workflow IDs', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				allowedWorkflowIds: new Set(),
				allowedWorkflowNames: new Set(),
				requireApproval: false,
			};
		}
	}

	private async handlePlannedTaskSettlement(
		user: User,
		task: ManagedBackgroundTask,
		status: 'succeeded' | 'failed' | 'cancelled',
	): Promise<void> {
		if (!task.plannedTaskId) return;

		const { plannedTaskService } = await this.createPlannedTaskState();
		let graph: PlannedTaskGraph | null = null;

		if (status === 'succeeded') {
			graph = await plannedTaskService.markSucceeded(task.threadId, task.plannedTaskId, {
				result: task.result,
				outcome: task.outcome,
			});
		} else if (status === 'failed') {
			graph = await plannedTaskService.markFailed(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		} else {
			graph = await plannedTaskService.markCancelled(task.threadId, task.plannedTaskId, {
				error: task.error,
			});
		}

		if (graph) {
			await this.syncPlannedTasksToUi(task.threadId, graph);
		}

		await this.schedulePlannedTasks(user, task.threadId);
	}

	private async maybeStartWorkflowVerificationFollowUp(
		user: User,
		task: ManagedBackgroundTask,
	): Promise<boolean> {
		if (task.role !== 'workflow-builder' || !task.workItemId) return false;

		const obligation = await this.workflowObligations.getObligation(
			task.threadId,
			task.workItemId,
			{
				source: task.plannedTaskId ? 'planned' : 'direct',
				plannedTaskId: task.plannedTaskId,
			},
		);
		if (!obligation) return false;
		this.trackWorkflowVerificationObligation(obligation, 'background_task_settled');

		// Only run a verification follow-up when there is something to verify.
		// Setup (mocked credentials, unresolved placeholders) is handled separately
		// and deterministically by `maybeStartWorkflowSetupFollowUp`.
		if (obligation.status !== 'ready_to_verify' && obligation.status !== 'verifying') {
			return false;
		}

		const outcome = parseWorkflowBuildOutcome(task.outcome);
		const startedRunId = await this.startInternalFollowUpRun(
			user,
			task.threadId,
			this.buildWorkflowVerificationFollowUpMessage({
				obligation,
				outcome,
				sourceTask: {
					taskId: task.taskId,
					role: task.role,
					status: task.status,
					result: task.result,
					error: task.error,
					plannedTaskId: task.plannedTaskId,
					workItemId: task.workItemId,
				},
			}),
			task.messageGroupId,
			false,
			undefined,
			'workflow_verification',
		);

		this.trackWorkflowVerificationObligation(obligation, 'follow_up_start_attempted', {
			follow_up_started: startedRunId.length > 0,
		});

		return startedRunId.length > 0;
	}

	private buildWorkflowSetupFollowUpMessage(obligation: WorkflowVerificationObligation): string {
		const payload = {
			workflowId: obligation.workflowId,
			workItemId: obligation.workItemId,
			setupRequirement: obligation.setupRequirement,
			verificationReadiness: obligation.readiness,
		};
		return `<workflow-setup-required>\n${JSON.stringify(payload, null, 2)}\n</workflow-setup-required>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	/**
	 * Deterministically route a settled direct build to setup when its saved
	 * workflow still needs real credentials or values. Runs after verification so
	 * setup does not depend on the orchestrator choosing to call it. The persisted
	 * claim and `setupRoutedAt` marker make this fire at most once per build, so
	 * concurrent finalization re-entries cannot start duplicate setup runs.
	 */
	private async maybeStartWorkflowSetupFollowUp(user: User, threadId: string): Promise<boolean> {
		const records = await this.listWorkflowLoopRecords(threadId);
		if (records.length === 0) return false;

		for (const record of records) {
			if (record.state.setupRoutedAt) continue;
			if (this.workflowObligations.isPlannedRecord(record)) continue;

			const obligation = this.workflowObligations.obligationFromRecord(threadId, record, {
				source: 'direct',
			});
			const verificationConcluded =
				obligation.status === 'verified' ||
				obligation.status === 'needs_setup' ||
				obligation.status === 'not_verifiable';
			if (!verificationConcluded) continue;
			if (obligation.setupRequirement?.status !== 'required' || !obligation.workflowId) continue;

			const claim = await this.claimWorkItemSetupRouting(threadId, record);
			if (!claim) continue;

			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildWorkflowSetupFollowUpMessage(obligation),
				this.runState.getMessageGroupId(threadId),
				false,
				undefined,
				'workflow_setup',
			);
			if (startedRunId.length === 0) {
				await this.releaseWorkItemSetupRoutingClaim(
					threadId,
					record.state.workItemId,
					claim.claimId,
				);
				return false;
			}

			const marked = await this.markWorkItemSetupRouted(
				threadId,
				record.state.workItemId,
				claim.claimId,
			);
			if (!marked) {
				this.logger.warn('Workflow setup follow-up started but routing marker was not saved', {
					threadId,
					workItemId: record.state.workItemId,
				});
			}
			this.trackWorkflowVerificationObligation(obligation, 'setup_follow_up_started');
			return true;
		}

		return false;
	}

	private async listWorkflowLoopRecords(threadId: string): Promise<WorkflowLoopWorkItemRecord[]> {
		return await new WorkflowLoopStorage(this.agentMemory).listWorkItems(threadId);
	}

	private createWorkflowSetupRoutingClaim(): WorkflowSetupRoutingClaim {
		const claimedAt = new Date();
		const expiresAt = new Date(claimedAt.getTime() + WORKFLOW_SETUP_ROUTING_CLAIM_TTL_MS);
		return {
			claimId: `setup:${nanoid()}`,
			claimedAt: claimedAt.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};
	}

	private async claimWorkItemSetupRouting(
		threadId: string,
		record: WorkflowLoopWorkItemRecord,
	): Promise<WorkflowSetupRoutingClaim | null> {
		const claim = this.createWorkflowSetupRoutingClaim();
		const claimed = await new WorkflowLoopStorage(this.agentMemory).claimSetupRouting(
			threadId,
			record.state.workItemId,
			claim,
		);
		return claimed ? claim : null;
	}

	private async markWorkItemSetupRouted(
		threadId: string,
		workItemId: string,
		claimId: string,
	): Promise<boolean> {
		return await new WorkflowLoopStorage(this.agentMemory).markSetupRouted(
			threadId,
			workItemId,
			claimId,
			new Date().toISOString(),
		);
	}

	private async releaseWorkItemSetupRoutingClaim(
		threadId: string,
		workItemId: string,
		claimId: string,
	): Promise<void> {
		await new WorkflowLoopStorage(this.agentMemory).releaseSetupRoutingClaim(
			threadId,
			workItemId,
			claimId,
		);
	}

	private async startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		messageGroupId?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
		resumeReasonOverride?: OrchestratorResumeReason,
		plannedBuild?: PlannedBuildFollowUp,
	): Promise<string> {
		if (this.runState.hasLiveRun(threadId)) {
			this.logger.warn('Skipping internal follow-up: active run exists', { threadId });
			return '';
		}

		const { runId, abortController } = this.runState.startRun({
			threadId,
			user,
			messageGroupId,
		});

		// Resolve user time zone from the thread's run-state snapshot (captured on the
		// initial user-facing run) before falling back to the instance default. Follow-up
		// runs (checkpoint / replan / synthesize) used to drop this context, which made
		// user-local schedules fall back to "instance default timezone".
		const timeZone = this.runState.getTimeZone(threadId) ?? this.defaultTimeZone;
		const resumeReason: OrchestratorResumeReason =
			resumeReasonOverride ??
			(checkpoint
				? 'planned_checkpoint'
				: isReplanFollowUp
					? 'replan'
					: 'background_task_completed');

		this.startExecuteRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			undefined,
			undefined,
			messageGroupId,
			timeZone,
			isReplanFollowUp,
			checkpoint,
			resumeReason,
			plannedBuild,
		);

		return runId;
	}

	private async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const prev = this.schedulerLocks.get(threadId) ?? Promise.resolve();
		// eslint-disable-next-line @typescript-eslint/promise-function-async
		const current = prev.then(() => this.doSchedulePlannedTasks(user, threadId)).catch(() => {});
		this.schedulerLocks.set(threadId, current);
		await current;
	}

	private createPlannedTaskActionRunner(
		activeUser: User,
		threadId: string,
		plannedTaskService: PlannedTaskService,
	): PlannedTaskActionRunner {
		const scope: PlannedTaskRunScope = { user: activeUser, threadId };
		return new PlannedTaskActionRunner({
			scope,
			plannedTaskService,
			logger: this.logger,
			view: this.createPlannedTaskView(),
			runGate: this.createPlannedTaskRunGate(),
			dispatcher: this.createPlannedTaskDispatcher(),
			followUps: this.createPlannedTaskFollowUps(),
			workflowVerificationGate: this.createPlannedWorkflowVerificationGate(threadId),
			workflowVerificationTracker: this.createPlannedWorkflowVerificationTracker(),
		});
	}

	private createPlannedTaskView(): PlannedTaskView {
		return {
			sync: async (scope, graph) => await this.syncPlannedTasksToUi(scope.threadId, graph),
		};
	}

	private createPlannedTaskRunGate(): PlannedTaskRunGate {
		return {
			hasLiveRun: (threadId) => this.runState.hasLiveRun(threadId),
		};
	}

	private createPlannedTaskDispatcher(): PlannedTaskDispatcher {
		return {
			dispatch: async ({ scope, graph, tasks }) => {
				const context = await this.createPlannedTaskDispatchContext(
					scope.user,
					scope.threadId,
					graph,
				);

				for (const task of tasks) {
					await this.dispatchPlannedTask(task, context, graph);
				}
			},
		};
	}

	private createPlannedTaskFollowUps(): PlannedTaskFollowUpStarter {
		return {
			startReplan: async ({ scope, graph, failedTask }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('replan', graph, { failedTask }),
					graph.messageGroupId,
					true,
					undefined,
					undefined,
					undefined,
				),
			startWorkflowVerification: async ({ scope, graph, verification }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildWorkflowVerificationFollowUpMessage({
						obligation: verification.obligation,
						outcome: verification.outcome,
						sourceTask: this.toWorkflowVerificationSourceTask(verification),
					}),
					graph.messageGroupId,
					false,
					undefined,
					'workflow_verification',
					undefined,
				),
			startSynthesis: async ({ scope, graph }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('synthesize', graph),
					graph.messageGroupId,
					false,
					undefined,
					'synthesize',
					undefined,
				),
			startWorkflowBuild: async ({ scope, graph, task, workItemId }) => {
				const plannedBuild: PlannedBuildFollowUp = {
					isPlannedBuildFollowUp: true,
					buildTaskId: task.id,
					workItemId,
					isSupportingWorkflowTask: task.isSupportingWorkflow === true,
				};

				return await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('build-workflow', graph, { buildTask: task }),
					graph.messageGroupId,
					false,
					undefined,
					undefined,
					plannedBuild,
				);
			},
			startCheckpoint: async ({ scope, graph, task }) =>
				await this.startInternalFollowUpRun(
					scope.user,
					scope.threadId,
					this.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint: task }),
					graph.messageGroupId,
					false,
					{ isCheckpointFollowUp: true, checkpointTaskId: task.id },
					undefined,
					undefined,
				),
		};
	}

	private createPlannedWorkflowVerificationGate(threadId: string): PlannedWorkflowVerificationGate {
		return {
			revalidate: async (verification) =>
				await this.workflowObligations.revalidatePlannedWorkflowVerification(
					threadId,
					verification,
				),
		};
	}

	private toWorkflowVerificationSourceTask(
		verification: PlannedWorkflowVerification,
	): Pick<
		ManagedBackgroundTask,
		'taskId' | 'role' | 'status' | 'result' | 'error' | 'plannedTaskId' | 'workItemId'
	> {
		return {
			taskId: verification.task.backgroundTaskId ?? verification.task.id,
			role: 'workflow-builder',
			status: 'completed',
			result: verification.task.result,
			error: verification.task.error,
			plannedTaskId: verification.task.id,
			workItemId: verification.obligation.workItemId,
		};
	}

	private createPlannedWorkflowVerificationTracker(): PlannedWorkflowVerificationTracker {
		return {
			scheduled: ({ obligation }) =>
				this.trackWorkflowVerificationObligation(obligation, 'planned_verification_scheduled'),
			followUpStartAttempted: ({ obligation }, started) =>
				this.trackWorkflowVerificationObligation(obligation, 'follow_up_start_attempted', {
					follow_up_started: started,
				}),
		};
	}

	private async createPlannedTaskDispatchContext(
		user: User,
		threadId: string,
		graph: PlannedTaskGraph,
	): Promise<OrchestrationContext> {
		const environment = await this.createExecutionEnvironment(
			user,
			threadId,
			graph.planRunId,
			createInertAbortSignal(),
			graph.messageGroupId,
			this.threadPushRef.get(threadId),
		);
		environment.orchestrationContext.tracing = this.tracing.getTraceContext(graph.planRunId);
		return environment.orchestrationContext;
	}

	private async doSchedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const revalidated = await this.revalidateActiveUser(user.id);
		if (!revalidated) {
			this.logger.warn('Cancelling run: user no longer authorized for AI Assistant', {
				userId: user.id,
				threadId,
			});
			this.cancelRun(threadId);
			return;
		}

		const activeUser = revalidated;

		const { plannedTaskService } = await this.createPlannedTaskState();
		const actionRunner = this.createPlannedTaskActionRunner(
			activeUser,
			threadId,
			plannedTaskService,
		);

		while (true) {
			const graph = await plannedTaskService.getGraph(threadId);
			if (!graph) return;

			await this.syncPlannedTasksToUi(threadId, graph);

			const availableSlots = Math.max(
				0,
				MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD -
					this.backgroundTasks.getRunningTasks(threadId).length,
			);
			const pendingWorkflowVerification =
				await this.workflowObligations.findPendingPlannedWorkflowVerification(threadId, graph);
			const action = await plannedTaskService.tick(threadId, {
				availableSlots,
				pendingWorkflowVerification,
			});
			if (action.type === 'none') return;

			const result = await actionRunner.run(action);
			if (result.type !== 'continue-scheduling') return;
		}
	}

	/**
	 * Run body for a fresh orchestrator turn. Never call directly — go through
	 * `startExecuteRun` so the promise is registered with `inFlightExecutions`
	 * and shutdown can drain it before the DB closes.
	 */
	private async executeRun(
		user: User,
		threadId: string,
		runId: string,
		message: string,
		abortController: AbortController,
		attachments?: InstanceAiAttachment[],
		handoffContext?: InstanceAiHandoffContext,
		messageGroupId?: string,
		timeZone?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
		resumeReason?: OrchestratorResumeReason,
		plannedBuild?: PlannedBuildFollowUp,
	): Promise<void> {
		// Split the message's attachments by kind once, here at the agent
		// boundary: files feed the parse-file / content-block path, workflow
		// references feed a context block the agent resolves with its tools.
		// Downstream logic stays single-kind.
		const fileAttachments = (attachments ?? []).filter(
			(attachment): attachment is InstanceAiFileAttachment => attachment.type === 'file',
		);
		const workflowAttachments = (attachments ?? []).filter(
			(attachment): attachment is InstanceAiWorkflowAttachment => attachment.type === 'workflow',
		);

		const signal = abortController.signal;
		let tracing: InstanceAiTraceContext | undefined;
		let messageTraceFinalization: MessageTraceFinalization | undefined;
		let aiCreatedWorkflowIds: Set<string> | undefined;
		let activeSnapshotStorage: DbSnapshotStorage | undefined;
		let messageId = '';

		try {
			messageId = nanoid();
			const traceInput: Record<string, unknown> = {
				message,
				...(fileAttachments.length
					? {
							attachments: fileAttachments.map((attachment) => ({
								mimeType: attachment.mimeType,
								size: attachment.data.length,
							})),
						}
					: {}),
				...(messageGroupId ? { messageGroupId } : {}),
			};

			// Shared with createExecutionEnvironment so one ProxyTokenManager backs tracing + the run.
			const proxyRunConfig = await this.createProxyRunConfig(user);

			// Create the trace before run-start so the SSE event carries traceId (modelId lands at finalization).
			if (resumeReason) {
				tracing = await this.tracing.createOrchestratorResumeTraceContext({
					threadId,
					messageId,
					messageGroupId,
					runId,
					userId: user.id,
					input: traceInput,
					resumeReason,
					metadata: {
						...(checkpoint?.isCheckpointFollowUp
							? { checkpoint_task_id: checkpoint.checkpointTaskId }
							: {}),
						...(plannedBuild?.isPlannedBuildFollowUp
							? { build_task_id: plannedBuild.buildTaskId }
							: {}),
					},
				});
			} else {
				tracing = await createInstanceAiTraceContext({
					threadId,
					messageId,
					messageGroupId,
					runId,
					userId: user.id,
					input: traceInput,
					proxyConfig: proxyRunConfig.tracingProxyConfig,
					n8nVersion: N8N_VERSION,
					workflowSdkVersion: WORKFLOW_SDK_VERSION,
				});
			}

			if (this.isRunDebugEnabled()) {
				this.runDebugBuffer.ensure(runId, threadId, buildRunDebugLabel({ message, resumeReason }));
			}

			// Publish run-start (includes userId for audit trail attribution)
			const traceId = tracing?.rootRun.otelTraceId;
			this.eventBus.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				payload: { messageId, messageGroupId, ...(traceId ? { traceId } : {}) },
			});

			// Check if already cancelled before starting agent work
			if (signal.aborted) {
				this.terminalOutcome.evaluateTerminalResponse(threadId, runId, 'cancelled', {
					messageGroupId,
					correlationId: messageId,
				});
				this.eventBus.publish(threadId, {
					type: 'run-finish',
					runId,
					agentId: orchestratorAgentId(runId),
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				return;
			}

			const staticMcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);
			const registryMcpServers = this.settingsService.isMcpAccessEnabled()
				? await this.withSetupBoundary(
						'instance-ai-mcp-setup',
						{
							threadId,
							runId,
							tracing,
							agentId: orchestratorAgentId(runId),
							userId: user.id,
							messageGroupId,
							messageId,
						},
						async () => await this.mcpRegistryService.getRegistryMcpServers(user),
					)
				: [];
			const mcpServers = [...staticMcpServers, ...registryMcpServers];

			const executionPushRef = this.threadPushRef.get(threadId);
			const environment = await this.createExecutionEnvironment(
				user,
				threadId,
				runId,
				signal,
				messageGroupId,
				executionPushRef,
				proxyRunConfig,
			);
			activeSnapshotStorage = environment.snapshotStorage;
			const {
				context,
				memory,
				taskStorage,
				snapshotStorage,
				workflowTasks,
				plannedTaskService,
				modelId,
				orchestrationContext,
			} = environment;
			aiCreatedWorkflowIds = context.aiCreatedWorkflowIds ??= new Set<string>();
			const isPostPlanFollowUp = isReplanFollowUp || checkpoint?.isCheckpointFollowUp === true;
			// Make the current user message available since memory history only
			// returns previously-saved messages.
			orchestrationContext.currentUserMessage = message;
			orchestrationContext.isReplanFollowUp = isReplanFollowUp;
			orchestrationContext.timeZone = timeZone ?? this.defaultTimeZone;

			if (checkpoint?.isCheckpointFollowUp) {
				orchestrationContext.isCheckpointFollowUp = true;
				orchestrationContext.checkpointTaskId = checkpoint.checkpointTaskId;
				// Plan approval authorizes verification; grant runWorkflow on the adapter context
				// because createInstanceAgent builds domain tools from `context`, not `orchestrationContext.domainContext`.
				context.permissions = {
					...context.permissions,
					...(PLANNED_TASK_PERMISSION_OVERRIDES.checkpoint ?? {}),
				} as typeof context.permissions;
				// Scope the runWorkflow override to the workflows this checkpoint is verifying:
				// the orchestrator can call `executions(action="run")` on a depended-on workflow
				// without HITL, but any other workflow id still requires user approval.
				const runPolicy = await this.getCheckpointRunPolicy(threadId, checkpoint.checkpointTaskId);
				context.allowedRunWorkflowIds = runPolicy.allowedWorkflowIds;
				context.allowedRunWorkflowNames = runPolicy.allowedWorkflowNames;
				context.requireRunWorkflowApproval = runPolicy.requireApproval;
			}

			if (plannedBuild?.isPlannedBuildFollowUp) {
				context.permissions = {
					...context.permissions,
					...(PLANNED_TASK_PERMISSION_OVERRIDES['build-workflow'] ?? {}),
				} as typeof context.permissions;
				context.workflowBuildContext = {
					threadId,
					runId,
					taskId: plannedBuild.buildTaskId,
					workItemId: plannedBuild.workItemId,
					allowPostPlanWorkflowCreate: true,
					isSupportingWorkflowTask: plannedBuild.isSupportingWorkflowTask,
					plannedTaskService,
					workflowTaskService: workflowTasks,
					onBuildOutcome: (outcome) => {
						plannedBuild.savedOutcome = outcome;
					},
				};
			} else {
				context.workflowBuildContext = {
					threadId,
					runId,
					taskId: `build-${runId}`,
					workItemId: `wi_${nanoid(8)}`,
					allowPostPlanWorkflowCreate: isPostPlanFollowUp,
					workflowTaskService: workflowTasks,
				};
			}

			// Thread file attachments into the domain context so parse-file can access them
			if (fileAttachments.length > 0) {
				context.currentUserAttachments = fileAttachments;
			}
			const memoryConfig = this.createAgentMemoryOptions();

			// When trace replay is enabled but LangSmith isn't configured,
			// create a minimal context that only supports replay/record wrapping.
			if (!tracing && process.env.E2E_TESTS === 'true') {
				const { createTraceReplayOnlyContext } = await import('@n8n/instance-ai');
				tracing = createTraceReplayOnlyContext();
			}

			if (tracing) {
				orchestrationContext.tracing = tracing;
				if (this.tracing.getTraceContext(runId) !== tracing) {
					await this.tracing.configureTraceReplayMode(tracing);
					this.runState.attachTracing(threadId, tracing);
					this.tracing.storeTraceContext(runId, threadId, tracing, messageGroupId);
				}
			}

			// Set heuristic title before agent starts — thread always has a title.
			// For an editor hand-off the user text is empty (the workflow is the
			// message), so title it with the workflow name and mark it refined so
			// the LLM title pass doesn't summarize the internal context block.
			const thread = await memory.getThread(threadId);
			if (thread && !thread.title) {
				const handoffTitle = workflowAttachments.find((attachment) => attachment.name)?.name;
				await patchThread(memory, {
					threadId,
					update: ({ metadata }) =>
						handoffTitle
							? {
									title: truncateToTitle(handoffTitle),
									metadata: { ...metadata, titleRefined: true },
								}
							: { title: truncateToTitle(message) },
				});
			}

			const existingTasks = await taskStorage.get(threadId);
			if (existingTasks) {
				this.eventBus.publish(threadId, {
					type: 'tasks-update',
					runId,
					agentId: orchestratorAgentId(runId),
					payload: { tasks: existingTasks },
				});
			}

			const enrichedMessage = await this.buildMessageWithRunningTasks(threadId, message);
			const contextResourcesBlock = buildContextResourcesBlock(workflowAttachments);
			const handoffContextBlock = buildHandoffContextBlock(handoffContext);

			let nonStructuredAttachments: InstanceAiFileAttachment[] = [];
			let attachmentManifest = '';
			let hasParseableAttachment = false;

			if (fileAttachments.length > 0) {
				const classifiedAttachments = classifyAttachments(fileAttachments);
				nonStructuredAttachments = fileAttachments.filter(
					(attachment) => !isParseableAttachment(attachment),
				);
				hasParseableAttachment = classifiedAttachments.some(
					(attachment: { parseable: boolean }) => attachment.parseable,
				);
				attachmentManifest = buildAttachmentManifest(classifiedAttachments);
			}

			const messageBody =
				!message && hasParseableAttachment
					? `The user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${attachmentManifest}`
					: attachmentManifest
						? `${enrichedMessage}\n\n${attachmentManifest}`
						: enrichedMessage;

			// The context block (an editor hand-off) leads the message so the agent
			// knows what the user is looking at. On an empty-text hand-off it is the
			// entire prompt, and the agent greets rather than investigating.
			const messageWithContext = [contextResourcesBlock, handoffContextBlock, messageBody]
				.filter(Boolean)
				.join('\n\n');
			// Carry "now" on the per-turn input, not the cached system prefix, so the prefix stays cacheable.
			// Wrapped so the parser strips it from the displayed user message on history reload.
			const fullMessage = withCurrentDateTime(
				messageWithContext,
				getDateTimeSection(timeZone ?? this.defaultTimeZone),
			);

			const promptBuildRun = tracing
				? await tracing.startChildRun(tracing.messageRun, {
						name: 'prepare: prompt',
						canonicalName: 'instance-ai.prompt_build',
						tags: ['prompt'],
						metadata: { agent_role: 'prompt_build' },
						inputs: {
							message,
							attachmentCount: attachments?.length ?? 0,
						},
					})
				: undefined;
			let streamInput: string | Message[];
			try {
				// Attachments need the explicit message-object shape (text + file blocks);
				// a plain prompt goes through as a string. The SDK assigns the message id
				// and persists the input on receipt.
				if (nonStructuredAttachments.length > 0) {
					const baseContent = [
						{ type: 'text' as const, text: fullMessage },
						...nonStructuredAttachments.map((attachment) => ({
							type: 'file' as const,
							data: attachment.data,
							mediaType: attachment.mimeType,
						})),
					];
					streamInput = [
						{
							role: 'user' as const,
							content: baseContent,
						},
					];
				} else {
					streamInput = fullMessage;
				}

				if (promptBuildRun && tracing) {
					// Redact raw attachment data from trace output — log metadata only
					const traceOutput =
						typeof streamInput === 'string'
							? { fullMessage: streamInput }
							: {
									fullMessage,
									attachmentCount: attachments?.length ?? 0,
									nonStructuredAttachmentCount: nonStructuredAttachments.length,
								};
					await tracing.finishRun(promptBuildRun, {
						outputs: traceOutput,
						metadata: { final_status: 'completed' },
					});
				}
			} catch (error) {
				if (promptBuildRun && tracing) {
					await tracing.failRun(promptBuildRun, error, {
						final_status: 'error',
					});
				}
				throw error;
			}

			if (tracing && tracing.actorRun.id === tracing.rootRun.id) {
				const actorRun = await tracing.startChildRun(tracing.rootRun, {
					name: 'agent: orchestrator',
					canonicalName: 'instance-ai.agent.orchestrator',
					tags: ['orchestrator'],
					metadata: {
						agent_role: 'orchestrator',
						agent_id: orchestratorAgentId(runId),
						execution_mode: 'foreground',
						trace_kind: tracing.traceKind,
					},
					inputs: traceInput,
				});
				tracing.actorRun = actorRun;
				tracing.orchestratorRun = actorRun;
			}

			const agent = await createInstanceAgent({
				modelId,
				context,
				orchestrationContext,
				mcpServers,
				mcpManager: this.mcpClientManager,
				memoryConfig,
				memory,
				checkpointStore: this.checkpointStore,
				onMemoryTaskEvent: this.memoryTaskObserverFor(threadId),
				thinkingEnabled: this.instanceAiConfig.thinkingEnabled,
			});
			this.subscribeToAgentErrors(agent, threadId, runId);

			const streamOptions = this.buildOrchestratorAgentStreamOptions(user, threadId, runId, signal);

			const result = tracing
				? await tracing.withActiveSpan(tracing.actorRun, async () => {
						return await streamAgentRun(agent as StreamableAgent, streamInput, streamOptions, {
							threadId,
							runId,
							agentId: orchestratorAgentId(runId),
							signal,
							eventBus: this.eventBus,
							logger: this.logger,
							onActivity: () => this.runState.touchActiveRun(threadId),
							outputRedaction: resolveOutputRedaction(this.instanceAiConfig),
						});
					})
				: await streamAgentRun(agent as StreamableAgent, streamInput, streamOptions, {
						threadId,
						runId,
						agentId: orchestratorAgentId(runId),
						signal,
						eventBus: this.eventBus,
						logger: this.logger,
						onActivity: () => this.runState.touchActiveRun(threadId),
						outputRedaction: resolveOutputRedaction(this.instanceAiConfig),
					});
			if (result.status === 'suspended') {
				if (result.suspension) {
					this.runState.suspendRun(threadId, {
						runId,
						agentRunId: result.agentRunId,
						agent,
						threadId,
						user,
						toolCallId: result.suspension.toolCallId,
						requestId: result.suspension.requestId,
						abortController,
						messageGroupId,
						createdAt: Date.now(),
						tracing,
						modelId,
						checkpoint,
						plannedBuild,
					});
					void this.suspendedThreads.persistPendingConfirmation({
						requestId: result.suspension.requestId,
						threadId,
						userId: user.id,
						runId,
						messageGroupId,
						kind: 'suspended',
						toolCallId: result.suspension.toolCallId,
						checkpointKey: result.agentRunId,
						checkpointTaskId: checkpoint?.checkpointTaskId,
					});
				}

				// Track intermediate message (text streamed before suspension)
				const intermediateText = await (result.text ?? Promise.resolve(''));
				if (intermediateText) {
					this.telemetry.track('Builder sent message', {
						thread_id: threadId,
						message: intermediateText,
						is_intermediate: true,
					});
				}

				const waitingDecision = this.terminalOutcome.evaluateWaitingResponse(
					threadId,
					runId,
					result.confirmationEvent,
					{
						messageGroupId,
						correlationId: messageId,
					},
				);

				if (waitingDecision?.reason === 'confirmation-invalid') {
					messageTraceFinalization = await this.terminalOutcome.finishInvalidConfirmationRun({
						threadId,
						runId,
						abortController,
						snapshotStorage,
						tracing,
					});
					return;
				}

				if (result.confirmationEvent) {
					this.trackConfirmationRequest(threadId, result.confirmationEvent);
					this.eventBus.publish(threadId, result.confirmationEvent);
				}

				// Persist the agent tree so the confirmation UI survives page refresh.
				// The tree is rebuilt from in-memory events and includes the
				// confirmation-request data that the frontend needs.
				await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
				const suspensionOutputs = {
					status: 'suspended',
					runId,
					...(result.suspension?.requestId ? { requestId: result.suspension.requestId } : {}),
					...(result.suspension?.toolCallId
						? { pendingToolCallId: result.suspension.toolCallId }
						: {}),
					...(result.suspension?.toolName ? { toolName: result.suspension.toolName } : {}),
				};
				await this.tracing.finalizeRunTracing(runId, tracing, {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: {
						completion_source: 'orchestrator',
						...(result.suspension?.requestId ? { request_id: result.suspension.requestId } : {}),
						...(result.suspension?.toolCallId
							? { pending_tool_call_id: result.suspension.toolCallId }
							: {}),
						...(result.suspension?.toolName
							? { pending_tool_name: result.suspension.toolName }
							: {}),
					},
				});
				messageTraceFinalization = {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: {
						completion_source: 'orchestrator',
						...(result.suspension?.requestId ? { request_id: result.suspension.requestId } : {}),
						...(result.suspension?.toolCallId
							? { pending_tool_call_id: result.suspension.toolCallId }
							: {}),
						...(result.suspension?.toolName
							? { pending_tool_name: result.suspension.toolName }
							: {}),
					},
				};
				return;
			}

			// `streamAgentRun` doesn't throw on abort — it returns
			// `status: 'cancelled'`. When the abort came from shutdown's
			// preserve-HITL path, falling through into the normal terminal
			// handling would still call `evaluateTerminalResponse` and
			// `finalizeRun`, both of which rewrite the snapshot. Bail out
			// before either fires so the plan/ask card stays on disk.
			if (result.status === 'cancelled' && this.shouldPreserveHitlOnShutdown(runId)) {
				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			if (result.status === 'errored') {
				this.reportInstanceAiError(result.error ?? new Error('Instance AI stream errored'), {
					component: 'instance-ai-stream',
					threadId,
					runId,
					tracing,
					agentId: orchestratorAgentId(runId),
					userId: user.id,
					messageGroupId,
					messageId,
				});
			}
			this.terminalOutcome.evaluateTerminalResponse(threadId, runId, result.status, {
				messageGroupId,
				correlationId: messageId,
				workSummary: result.workSummary,
				suppressCompletedFallback:
					checkpoint?.isCheckpointFollowUp === true ||
					plannedBuild?.isPlannedBuildFollowUp === true,
			});
			const finalStatus = result.status === 'errored' ? 'error' : result.status;
			await this.tracing.finalizeRunTracing(runId, tracing, {
				status: finalStatus,
				outputText,
				modelId,
			});
			messageTraceFinalization = {
				status: finalStatus,
				outputText,
				modelId,
				metadata: this.tracing.buildMessageTraceMetadata(threadId, runId, { status: finalStatus }),
			};
			const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
				threadId,
				user,
				aiCreatedWorkflowIds,
				this.backgroundTasks.getRunningTasks(threadId).length,
			);
			await this.finalizeRun(threadId, runId, result.status, snapshotStorage, {
				userId: user.id,
				modelId,
				archivedWorkflowIds,
				workSummary: result.workSummary,
				usage: result.usage,
			});

			// Bill token usage for every terminal outcome (completed / cancelled / errored),
			// deduped per run segment. `result.agentRunId` is the segment id; fall back to runId.
			await this.creditService.claimRunUsage(
				user,
				threadId,
				result.agentRunId || runId,
				result.usage?.usage ?? [],
				result.status,
			);

			if (result.status === 'completed') {
				this.telemetry.track('Builder sent message', {
					thread_id: threadId,
					message: outputText,
				});
				this.telemetry.track('Builder satisfied user intent', {
					thread_id: threadId,
				});
			}
		} catch (error) {
			if (signal.aborted) {
				// Shutdown asked us to preserve the HITL card on disk: the
				// service has already finalised tracing and the per-run DB
				// rows (pending_confirmation, snapshot) are the durable
				// signal. Emitting the terminal-fallback text + run-finish
				// here would clobber the plan/ask snapshot the user expects
				// to see on reload, so just bail out.
				if (this.shouldPreserveHitlOnShutdown(runId)) {
					return;
				}
				const runTimeout = this.liveness.consumeRunTimeout(runId);
				const cancellationReason = runTimeout.timedOut
					? INSTANCE_AI_RUN_TIMEOUT_REASON
					: getAbortReason(signal);
				if (cancellationReason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
					this.liveness.publishRunTimeoutNotice(threadId, runId);
				}
				this.terminalOutcome.evaluateTerminalResponse(threadId, runId, 'cancelled', {
					messageGroupId,
					correlationId: messageId,
				});
				await this.tracing.finalizeRunTracing(runId, tracing, {
					status: 'cancelled',
					reason: cancellationReason,
				});
				messageTraceFinalization = {
					status: 'cancelled',
					reason: cancellationReason,
					metadata: this.tracing.buildMessageTraceMetadata(threadId, runId, {
						status: 'cancelled',
						cancellationReason,
						runTimeout,
					}),
				};
				const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
					threadId,
					user,
					aiCreatedWorkflowIds,
					this.backgroundTasks.getRunningTasks(threadId).length,
				);
				this.publishRunFinish(
					threadId,
					runId,
					'cancelled',
					cancellationReason,
					archivedWorkflowIds,
					user.id,
				);
				if (activeSnapshotStorage) {
					await this.saveAgentTreeSnapshot(threadId, runId, activeSnapshotStorage);
				}
				return;
			}

			const errorMessage = getErrorMessage(error);
			const userFacingErrorMessage = getUserFacingErrorMessage(error);

			const errCtx: InstanceAiObservabilityContext = {
				threadId,
				runId,
				tracing,
				agentId: orchestratorAgentId(runId),
				userId: user.id,
				messageGroupId,
				messageId,
			};
			this.logger.error(`Instance AI run error: ${errorMessage}`, {
				error: errorMessage,
				...buildInstanceAiObservabilityContext(errCtx),
			});
			this.reportInstanceAiError(error, { component: 'instance-ai-run', ...errCtx });
			this.terminalOutcome.evaluateTerminalResponse(threadId, runId, 'errored', {
				messageGroupId,
				correlationId: messageId,
				errorMessage: userFacingErrorMessage,
			});
			await this.tracing.finalizeRunTracing(runId, tracing, {
				status: 'error',
				reason: errorMessage,
			});
			messageTraceFinalization = {
				status: 'error',
				reason: errorMessage,
				metadata: this.tracing.buildMessageTraceMetadata(threadId, runId, { status: 'error' }),
			};

			const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
				threadId,
				user,
				aiCreatedWorkflowIds,
				this.backgroundTasks.getRunningTasks(threadId).length,
			);
			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId,
				agentId: orchestratorAgentId(runId),
				payload: {
					status: 'error',
					reason: userFacingErrorMessage,
					...(archivedWorkflowIds.length > 0 ? { archivedWorkflowIds } : {}),
				},
			});
			if (activeSnapshotStorage) {
				await this.saveAgentTreeSnapshot(threadId, runId, activeSnapshotStorage);
			}
		} finally {
			this.runState.clearActiveRun(threadId);
			// Note: don't delete threadPushRef here. Planned tasks (build agent,
			// checkpoint verifications) dispatch later in this same finally and
			// later still in the post-run scheduler — they need the pushRef to
			// route execution events to the user's iframe session. The next
			// startRun overwrites it; thread-cleanup deletes it on dispose.
			this.domainAccessTrackersByThread.get(threadId)?.clearRun(runId);
			if (messageTraceFinalization) {
				await this.tracing.maybeFinalizeRunTraceRoot(runId, messageTraceFinalization);
				if (messageTraceFinalization.status !== 'cancelled') {
					this.liveness.consumeRunTimeout(runId);
				}
			}
			// Post-run planned-task wiring (only when the run is actually ending,
			// not when it merely suspended for HITL):
			//   1. Checkpoint deadlock fallback — if this run was a checkpoint
			//      follow-up and the orchestrator exited without calling
			//      complete-checkpoint, mark the task failed so the scheduler
			//      can transition to awaiting_replan.
			//   2. Unconditional reschedule — drive the next tick. This covers
			//      the case where a background task settled during an ordinary
			//      chat run: its schedulePlannedTasks call may have skipped the
			//      checkpoint branch because hasLiveRun was true. Ticking again
			//      now (with no live run) picks it up. schedulerLocks serializes
			//      this call, and tick() is a no-op when no graph exists.
			if (!this.runState.hasSuspendedRun(threadId)) {
				if (checkpoint?.isCheckpointFollowUp) {
					await this.finalizeCheckpointFollowUp(user, threadId, checkpoint.checkpointTaskId);
				} else if (plannedBuild?.isPlannedBuildFollowUp) {
					await this.finalizePlannedBuildFollowUp(user, threadId, plannedBuild);
				} else {
					await this.schedulePlannedTasks(user, threadId);
				}
				await this.drainPendingCheckpointReentries(user, threadId);
				await this.taskProjector.syncFromWorkflowLoop(threadId, runId);
				await this.maybeStartWorkflowSetupFollowUp(user, threadId);
			}
		}
	}

	/**
	 * Post-run cleanup for a checkpoint follow-up. Ensures the checkpoint task is
	 * terminal (marking it failed if the orchestrator abandoned it) and re-ticks
	 * the scheduler so the next planned action can fire.
	 */
	private queuePendingCheckpointReentry(threadId: string, checkpointTaskId: string): void {
		let set = this.pendingCheckpointReentries.get(threadId);
		if (!set) {
			set = new Set();
			this.pendingCheckpointReentries.set(threadId, set);
		}
		set.add(checkpointTaskId);
	}

	/**
	 * Drain any checkpoint re-entries whose parent-tagged children settled while
	 * an orchestrator run was live (or while other siblings were still running).
	 * Called from the post-run cleanup path in every run-ending `finally` block,
	 * so the checkpoint is never left orphaned when the settlement path could
	 * not fire immediately.
	 */
	private async drainPendingCheckpointReentries(user: User, threadId: string): Promise<void> {
		const set = this.pendingCheckpointReentries.get(threadId);
		if (!set || set.size === 0) return;
		const snapshot = [...set];
		for (const checkpointTaskId of snapshot) {
			// If a new run started while we were draining, stop — the next run's
			// cleanup will pick up the remaining markers.
			if (this.runState.getActiveRunId(threadId) || this.runState.hasSuspendedRun(threadId)) {
				return;
			}
			// A new parent-tagged child is running — let its settlement drive the
			// checkpoint instead of racing another re-entry.
			const siblings = this.backgroundTasks.getRunningTasksByParentCheckpoint(
				threadId,
				checkpointTaskId,
			);
			if (siblings.length > 0) continue;
			set.delete(checkpointTaskId);
			await this.reenterCheckpointById(user, threadId, checkpointTaskId);
		}
		if (set.size === 0) this.pendingCheckpointReentries.delete(threadId);
	}

	/**
	 * Fire a synthetic `<planned-task-follow-up type="checkpoint">` for the
	 * given checkpoint task id when the parent-tagged children that drove it
	 * are no longer running and no new orchestrator run is live. Used by both
	 * the immediate re-entry path (via `maybeReenterParentCheckpoint`) and the
	 * deferred drain (via `drainPendingCheckpointReentries`).
	 */
	private async reenterCheckpointById(
		user: User,
		threadId: string,
		checkpointTaskId: string,
		messageGroupId?: string,
	): Promise<boolean> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint || checkpoint.kind !== 'checkpoint') return false;
			if (checkpoint.status !== 'running') return false;

			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint }),
				messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId },
			);
			if (!startedRunId) return false;
			this.logger.debug('Re-entered checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				messageGroupId,
			});
			return true;
		} catch (error) {
			this.logger.error('Failed to re-enter checkpoint follow-up', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * When a direct background task (builder/research/data-table/delegate)
	 * settles and was spawned inside a checkpoint follow-up, try to re-enter
	 * that checkpoint so the orchestrator can call `complete-checkpoint`.
	 *
	 * Returns `true` only when a follow-up was actually started. Returns
	 * `false` in every other case (checkpoint no longer running, siblings
	 * still in-flight, an orchestrator run is active or suspended, or the
	 * graph no longer has the checkpoint). The caller is responsible for
	 * queuing a deferred re-entry in the false case — never falling through
	 * to a generic `<background-task-completed>` shell, which would re-open
	 * the orphan bug.
	 */
	private async maybeReenterParentCheckpoint(
		user: User,
		threadId: string,
		task: ManagedBackgroundTask,
	): Promise<boolean> {
		const parentCheckpointId = task.parentCheckpointId;
		if (!parentCheckpointId) return false;

		// If other parent-tagged children are still running, let the LAST one
		// re-drive the checkpoint; emitting multiple re-dispatches would race.
		const siblings = this.backgroundTasks
			.getRunningTasksByParentCheckpoint(threadId, parentCheckpointId)
			.filter((t) => t.taskId !== task.taskId);
		if (siblings.length > 0) return false;

		// If a run is live, defer — startInternalFollowUpRun would be rejected
		// and we must not fall through to the shell path.
		if (this.runState.getActiveRunId(threadId) || this.runState.hasSuspendedRun(threadId)) {
			return false;
		}

		return await this.reenterCheckpointById(
			user,
			threadId,
			parentCheckpointId,
			task.messageGroupId,
		);
	}

	private async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (task && task.status === 'running') {
				// If the orchestrator spawned a detached sub-agent inside this
				// checkpoint's turn (builder, research, data-table, delegate) and
				// that child is still running, leave the checkpoint running. The
				// child's settlement path re-emits `orchestrate-checkpoint` so the
				// orchestrator re-enters the same checkpoint context and can then
				// call `complete-checkpoint`.
				const inflightChildren = this.backgroundTasks.getRunningTasksByParentCheckpoint(
					threadId,
					checkpointTaskId,
				);
				if (inflightChildren.length > 0) {
					this.logger.debug(
						'Checkpoint run ended with in-flight child tasks — deferring finalization',
						{
							threadId,
							checkpointTaskId,
							inflightTaskIds: inflightChildren.map((t) => t.taskId),
						},
					);
				} else {
					this.logger.warn('Checkpoint run ended without reporting completion — marking failed', {
						threadId,
						checkpointTaskId,
					});
					await plannedTaskService.markCheckpointFailed(threadId, checkpointTaskId, {
						error: 'Checkpoint run ended without reporting completion',
					});
					const nextGraph = await plannedTaskService.getGraph(threadId);
					if (nextGraph) {
						await this.syncPlannedTasksToUi(threadId, nextGraph);
					}
				}
			}
		} catch (error) {
			this.logger.error('Checkpoint finalization failed', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		await this.schedulePlannedTasks(user, threadId);
	}

	private async finalizePlannedBuildFollowUp(
		user: User,
		threadId: string,
		plannedBuild: PlannedBuildFollowUp,
	): Promise<void> {
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const task = graph?.tasks.find((t) => t.id === plannedBuild.buildTaskId);
			if (task && task.status === 'running') {
				if (plannedBuild.savedOutcome?.submitted === true) {
					await plannedTaskService.markSucceeded(threadId, plannedBuild.buildTaskId, {
						result: plannedBuild.savedOutcome.summary,
						outcome: plannedBuild.savedOutcome,
					});
				} else {
					this.logger.warn('Build workflow follow-up ended without saving — marking failed', {
						threadId,
						buildTaskId: plannedBuild.buildTaskId,
					});
					await plannedTaskService.markFailed(threadId, plannedBuild.buildTaskId, {
						error: 'Workflow build run ended without saving a workflow',
					});
				}
				const nextGraph = await plannedTaskService.getGraph(threadId);
				if (nextGraph) {
					await this.syncPlannedTasksToUi(threadId, nextGraph);
				}
			}
		} catch (error) {
			this.logger.error('Build workflow finalization failed', {
				threadId,
				buildTaskId: plannedBuild.buildTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		await this.schedulePlannedTasks(user, threadId);
	}

	async resolveConfirmation(
		requestingUserId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<boolean> {
		const data = toConfirmationData(request);
		const freshUser = await this.revalidateActiveUser(requestingUserId);
		if (!freshUser) {
			this.runState.rejectPendingConfirmation(requestId);
			const suspended = this.runState.findSuspendedByRequestId(requestId);
			if (suspended?.user.id === requestingUserId) {
				this.cancelRun(suspended.threadId);
			}
			this.logger.warn('Rejecting confirmation: user no longer authorized for AI Assistant', {
				userId: requestingUserId,
				requestId,
			});
			return false;
		}

		if (this.runState.resolvePendingConfirmation(freshUser.id, requestId, data)) {
			void this.suspendedThreads.dropPendingConfirmation(requestId);
			this.logger.debug('Resolved pending confirmation (sub-agent HITL)', {
				requestId,
				approved: data.approved,
			});
			return true;
		}

		this.logger.debug('Pending confirmation not found, trying suspended run resume', {
			requestId,
			approved: data.approved,
		});

		if (await this.resumeSuspendedRun(requestingUserId, requestId, data)) {
			return true;
		}

		// Last resort: the in-memory state is gone, but a persisted index row
		// may still exist from before a process restart. For `suspended`-kind
		// rows we try to rebuild the agent from the DB-backed checkpoint and
		// resume; for `inline`-kind (no checkpoint, just an in-process Promise
		// that died with the previous process) or any rebuild failure we
		// publish a terminal `run-finish` and surface a clear UserError so the
		// client doesn't sit on a stale confirmation card.
		return await this.suspendedRunRestorer.resolveOrphanedConfirmation(
			requestingUserId,
			requestId,
			data,
		);
	}

	/**
	 * Rebuild the in-memory pieces a suspended run needs (user, agent,
	 * execution environment) from a persisted orphan row + checkpoint, and
	 * package them into a `SuspendedRunState`. The caller wraps the result in
	 * `runState.suspendRun` and hands off to `resumeSuspendedRun`.
	 *
	 * Returns a discriminated union so the caller can log a precise reason
	 * per failure mode without inlining each step's try/catch. Logging here
	 * would be premature — the helper has the failure context but not the
	 * routing decision (`tryResumeFromOrphan` decides whether the failure is
	 * worth surfacing to the user vs. just retrying).
	 */
	private async rebuildSuspendedRunFromCheckpoint(
		orphan: ResumableOrphan,
	): Promise<RebuildSuspendedRunOutcome> {
		const user = await this.revalidateActiveUser(orphan.userId);
		if (!user) return { kind: 'no-user' };

		// Bail early if the checkpoint store doesn't have a usable snapshot —
		// `load()` throws UserError for expired tombstones and returns
		// undefined when the row is gone entirely. Either way there's nothing
		// to resume.
		try {
			const state = await this.checkpointStore.load(orphan.checkpointKey);
			if (!state) return { kind: 'no-checkpoint' };
		} catch (error: unknown) {
			return { kind: 'no-checkpoint', error };
		}

		const abortController = new AbortController();
		let environment;
		try {
			environment = await this.createExecutionEnvironment(
				user,
				orphan.threadId,
				orphan.runId,
				abortController.signal,
				orphan.messageGroupId ?? undefined,
				this.threadPushRef.get(orphan.threadId),
			);
		} catch (error: unknown) {
			return { kind: 'env-failure', error };
		}

		const mcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);
		let agent;
		try {
			agent = await createInstanceAgent({
				modelId: environment.modelId,
				context: environment.context,
				orchestrationContext: environment.orchestrationContext,
				mcpServers,
				mcpManager: this.mcpClientManager,
				memoryConfig: this.createAgentMemoryOptions(),
				memory: environment.memory,
				checkpointStore: this.checkpointStore,
				onMemoryTaskEvent: this.memoryTaskObserverFor(orphan.threadId),
				thinkingEnabled: this.instanceAiConfig.thinkingEnabled,
			});
			this.subscribeToAgentErrors(agent, orphan.threadId, orphan.runId);
		} catch (error: unknown) {
			return { kind: 'agent-failure', error };
		}

		return {
			kind: 'ready',
			state: {
				runId: orphan.runId,
				agentRunId: orphan.checkpointKey,
				agent,
				threadId: orphan.threadId,
				user,
				toolCallId: orphan.toolCallId,
				requestId: orphan.requestId,
				abortController,
				messageGroupId: orphan.messageGroupId ?? undefined,
				createdAt: Date.now(),
				tracing: undefined,
				modelId: environment.modelId,
				checkpoint: orphan.checkpointTaskId
					? { isCheckpointFollowUp: true, checkpointTaskId: orphan.checkpointTaskId }
					: undefined,
			},
		};
	}

	private async revalidateActiveUser(userId: string): Promise<User | null> {
		try {
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});
			if (!user || user.disabled) return null;
			const hasInstanceAiMessageScope =
				user.role?.scopes?.some((scope) => scope.slug === 'instanceAi:message') ?? false;
			return hasInstanceAiMessageScope ? user : null;
		} catch (error: unknown) {
			this.logger.warn('Failed to revalidate user', {
				userId,
				error: getErrorMessage(error),
			});
			return null;
		}
	}

	private async resumeSuspendedRun(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
		const suspended = this.runState.findSuspendedByRequestId(requestId);
		if (!suspended) {
			this.logger.warn('Confirmation target not found: no pending confirmation or suspended run', {
				requestId,
				approved: data.approved,
			});
			return false;
		}

		const {
			agent,
			runId,
			agentRunId,
			threadId,
			user,
			toolCallId,
			abortController,
			tracing,
			modelId,
			messageGroupId,
			checkpoint,
			plannedBuild,
		} = suspended;
		if (user.id !== requestingUserId) return false;

		const activeUser = await this.revalidateActiveUser(user.id);
		if (!activeUser) {
			this.logger.warn('Cancelling suspended run: user no longer authorized for AI Assistant', {
				userId: user.id,
				threadId,
				requestId,
			});
			this.cancelRun(threadId);
			return false;
		}

		this.runState.activateSuspendedRun(threadId);

		// The in-memory `suspendedRuns` map carries no resolver callback, so
		// the suspended-kind DB row has to be dropped explicitly here. The
		// inline-kind drop is wired into the Promise resolver in
		// `waitForConfirmation` and fires whether the resolution came from the
		// user, from `cancelThread`, or from a liveness timeout.
		void this.suspendedThreads.dropPendingConfirmation(requestId);

		// setup-workflow uses nodeCredentials (per-node) format for its credentials field;
		// other tools use the flat credentials map. Prefer nodeCredentials when present.
		const credentialsPayload = data.nodeCredentials ?? data.credentials;
		const resumeData = {
			approved: data.approved,
			...(credentialsPayload ? { credentials: credentialsPayload } : {}),
			...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
			...(data.domainAccessAction ? { domainAccessAction: data.domainAccessAction } : {}),
			...(data.action ? { action: data.action } : {}),
			...(data.nodeParameters ? { nodeParameters: data.nodeParameters } : {}),
			...(data.testTriggerNode ? { testTriggerNode: data.testTriggerNode } : {}),
			...(data.answers ? { answers: data.answers } : {}),
			...(data.resourceDecision ? { resourceDecision: data.resourceDecision } : {}),
			...(data.scope ? { scope: data.scope } : {}),
		};

		const resumeTracing = await this.tracing.createOrchestratorResumeTraceContext({
			baseTracing: tracing,
			threadId,
			messageId: nanoid(),
			messageGroupId,
			runId,
			userId: activeUser.id,
			modelId,
			input: {
				requestId,
				toolCallId,
				approved: data.approved,
				resumeFields: Object.keys(resumeData),
			},
			resumeReason: 'approval',
			metadata: {
				request_id: requestId,
				pending_tool_call_id: toolCallId,
				approved: data.approved,
				...(checkpoint?.isCheckpointFollowUp
					? { checkpoint_task_id: checkpoint.checkpointTaskId }
					: {}),
				...(plannedBuild?.isPlannedBuildFollowUp
					? { build_task_id: plannedBuild.buildTaskId }
					: {}),
			},
		});

		this.startProcessResumedStream(agent, resumeData, {
			runId,
			agentRunId,
			threadId,
			user: activeUser,
			toolCallId,
			signal: abortController.signal,
			abortController,
			snapshotStorage: this.dbSnapshotStorage,
			tracing: resumeTracing ?? tracing,
			modelId,
			checkpoint,
			plannedBuild,
		});
		return true;
	}

	/**
	 * Run body for a resumed suspended orchestrator turn. Never call directly
	 * — go through `startProcessResumedStream` so the promise is registered
	 * with `inFlightExecutions` and shutdown can drain it before the DB
	 * closes.
	 */
	private async processResumedStream(
		agent: unknown,
		resumeData: Record<string, unknown>,
		opts: {
			runId: string;
			agentRunId: string;
			threadId: string;
			user: User;
			toolCallId: string;
			signal: AbortSignal;
			abortController: AbortController;
			snapshotStorage: DbSnapshotStorage;
			tracing?: InstanceAiTraceContext;
			modelId?: ModelConfig;
			checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string };
			plannedBuild?: PlannedBuildFollowUp;
		},
	): Promise<void> {
		let messageTraceFinalization: MessageTraceFinalization | undefined;

		try {
			if (opts.tracing?.getTelemetry && isTelemetryConfigurableAgent(agent)) {
				try {
					agent.telemetry(
						opts.tracing.getTelemetry({
							agentRole: 'orchestrator',
							functionId: 'instance-ai.orchestrator',
							executionMode:
								opts.tracing.traceKind === 'orchestrator_resume' ? 'resume' : 'foreground',
						}),
					);
				} catch (error) {
					this.logger.warn('Failed to configure Instance AI resume tracing', {
						error: getErrorMessage(error),
						threadId: opts.threadId,
						runId: opts.runId,
					});
				}
			}

			const resumeOptions = this.buildOrchestratorResumeAgentOptions(
				opts.user,
				opts.threadId,
				opts.runId,
				opts.agentRunId,
				opts.toolCallId,
			);

			const result = opts.tracing
				? await opts.tracing.withActiveSpan(opts.tracing.actorRun, async () => {
						return await resumeAgentRun(agent, resumeData, resumeOptions, {
							threadId: opts.threadId,
							runId: opts.runId,
							agentId: orchestratorAgentId(opts.runId),
							signal: opts.signal,
							eventBus: this.eventBus,
							logger: this.logger,
							agentRunId: opts.agentRunId,
							onActivity: () => this.runState.touchActiveRun(opts.threadId),
							outputRedaction: resolveOutputRedaction(this.instanceAiConfig),
						});
					})
				: await resumeAgentRun(agent, resumeData, resumeOptions, {
						threadId: opts.threadId,
						runId: opts.runId,
						agentId: orchestratorAgentId(opts.runId),
						signal: opts.signal,
						eventBus: this.eventBus,
						logger: this.logger,
						agentRunId: opts.agentRunId,
						onActivity: () => this.runState.touchActiveRun(opts.threadId),
						outputRedaction: resolveOutputRedaction(this.instanceAiConfig),
					});

			if (result.status === 'suspended') {
				if (result.suspension) {
					const resumeMessageGroupId = this.tracing.getMessageGroupId(opts.runId);
					this.runState.suspendRun(opts.threadId, {
						runId: opts.runId,
						agentRunId: result.agentRunId,
						agent,
						threadId: opts.threadId,
						user: opts.user,
						toolCallId: result.suspension.toolCallId,
						requestId: result.suspension.requestId,
						abortController: opts.abortController,
						messageGroupId: resumeMessageGroupId,
						createdAt: Date.now(),
						tracing: opts.tracing,
						...(opts.modelId !== undefined ? { modelId: opts.modelId } : {}),
						checkpoint: opts.checkpoint,
						plannedBuild: opts.plannedBuild,
					});
					void this.suspendedThreads.persistPendingConfirmation({
						requestId: result.suspension.requestId,
						threadId: opts.threadId,
						userId: opts.user.id,
						runId: opts.runId,
						messageGroupId: resumeMessageGroupId,
						kind: 'suspended',
						toolCallId: result.suspension.toolCallId,
						checkpointKey: result.agentRunId,
						checkpointTaskId: opts.checkpoint?.checkpointTaskId,
					});
				}

				// Track intermediate message (text streamed before suspension)
				const intermediateText = await (result.text ?? Promise.resolve(''));
				if (intermediateText) {
					this.telemetry.track('Builder sent message', {
						thread_id: opts.threadId,
						message: intermediateText,
						is_intermediate: true,
					});
				}

				const messageGroupId = this.tracing.getMessageGroupId(opts.runId);
				const waitingDecision = this.terminalOutcome.evaluateWaitingResponse(
					opts.threadId,
					opts.runId,
					result.confirmationEvent,
					{ messageGroupId },
				);

				if (waitingDecision?.reason === 'confirmation-invalid') {
					messageTraceFinalization = await this.terminalOutcome.finishInvalidConfirmationRun({
						threadId: opts.threadId,
						runId: opts.runId,
						abortController: opts.abortController,
						snapshotStorage: opts.snapshotStorage,
						tracing: opts.tracing,
					});
					return;
				}

				if (result.confirmationEvent) {
					this.trackConfirmationRequest(opts.threadId, result.confirmationEvent);
					this.eventBus.publish(opts.threadId, result.confirmationEvent);
				}

				// Persist the refreshed agent tree so repeated HITL waits
				// survive page refresh after a resume as well.
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
				const suspensionOutputs = {
					status: 'suspended',
					runId: opts.runId,
					...(result.suspension?.requestId ? { requestId: result.suspension.requestId } : {}),
					...(result.suspension?.toolCallId
						? { pendingToolCallId: result.suspension.toolCallId }
						: {}),
					...(result.suspension?.toolName ? { toolName: result.suspension.toolName } : {}),
				};
				await this.tracing.finalizeRunTracing(opts.runId, opts.tracing, {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: {
						completion_source: 'orchestrator',
						...(result.suspension?.requestId ? { request_id: result.suspension.requestId } : {}),
						...(result.suspension?.toolCallId
							? { pending_tool_call_id: result.suspension.toolCallId }
							: {}),
						...(result.suspension?.toolName
							? { pending_tool_name: result.suspension.toolName }
							: {}),
					},
				});
				messageTraceFinalization = {
					status: 'suspended',
					outputs: suspensionOutputs,
					metadata: {
						completion_source: 'orchestrator',
						...(result.suspension?.requestId ? { request_id: result.suspension.requestId } : {}),
						...(result.suspension?.toolCallId
							? { pending_tool_call_id: result.suspension.toolCallId }
							: {}),
						...(result.suspension?.toolName
							? { pending_tool_name: result.suspension.toolName }
							: {}),
					},
				};

				return;
			}

			if (result.status === 'cancelled' && this.shouldPreserveHitlOnShutdown(opts.runId)) {
				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			const messageGroupId = this.tracing.getMessageGroupId(opts.runId);
			if (result.status === 'errored') {
				this.reportInstanceAiError(
					result.error ?? new Error('Instance AI resumed stream errored'),
					{
						component: 'instance-ai-stream',
						threadId: opts.threadId,
						runId: opts.runId,
						tracing: opts.tracing,
						agentId: orchestratorAgentId(opts.runId),
						userId: opts.user.id,
						messageGroupId,
					},
				);
			}
			this.terminalOutcome.evaluateTerminalResponse(opts.threadId, opts.runId, result.status, {
				messageGroupId,
				workSummary: result.workSummary,
				suppressCompletedFallback:
					opts.checkpoint?.isCheckpointFollowUp === true ||
					opts.plannedBuild?.isPlannedBuildFollowUp === true,
			});
			const finalStatus = result.status === 'errored' ? 'error' : result.status;
			await this.tracing.finalizeRunTracing(opts.runId, opts.tracing, {
				status: finalStatus,
				outputText,
			});
			messageTraceFinalization = {
				status: finalStatus,
				outputText,
				metadata: this.tracing.buildMessageTraceMetadata(opts.threadId, opts.runId, {
					status: finalStatus,
				}),
			};
			const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
				opts.threadId,
				opts.user,
				undefined,
				this.backgroundTasks.getRunningTasks(opts.threadId).length,
			);
			await this.finalizeRun(opts.threadId, opts.runId, result.status, opts.snapshotStorage, {
				userId: opts.user.id,
				archivedWorkflowIds,
				workSummary: result.workSummary,
				usage: result.usage,
			});

			// Bill token usage for every terminal outcome, deduped per run segment.
			await this.creditService.claimRunUsage(
				opts.user,
				opts.threadId,
				result.agentRunId || opts.runId,
				result.usage?.usage ?? [],
				result.status,
			);

			if (result.status === 'completed') {
				this.telemetry.track('Builder sent message', {
					thread_id: opts.threadId,
					message: outputText,
				});
				this.telemetry.track('Builder satisfied user intent', {
					thread_id: opts.threadId,
				});
			}
		} catch (error) {
			if (opts.signal.aborted) {
				if (this.shouldPreserveHitlOnShutdown(opts.runId)) {
					return;
				}
				const messageGroupId = this.tracing.getMessageGroupId(opts.runId);
				const runTimeout = this.liveness.consumeRunTimeout(opts.runId);
				const cancellationReason = runTimeout.timedOut
					? INSTANCE_AI_RUN_TIMEOUT_REASON
					: getAbortReason(opts.signal);
				if (cancellationReason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
					this.liveness.publishRunTimeoutNotice(opts.threadId, opts.runId);
				}
				this.terminalOutcome.evaluateTerminalResponse(opts.threadId, opts.runId, 'cancelled', {
					messageGroupId,
				});
				await this.tracing.finalizeRunTracing(opts.runId, opts.tracing, {
					status: 'cancelled',
					reason: cancellationReason,
				});
				messageTraceFinalization = {
					status: 'cancelled',
					reason: cancellationReason,
					metadata: this.tracing.buildMessageTraceMetadata(opts.threadId, opts.runId, {
						status: 'cancelled',
						cancellationReason,
						runTimeout,
					}),
				};
				const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
					opts.threadId,
					opts.user,
					undefined,
					this.backgroundTasks.getRunningTasks(opts.threadId).length,
				);
				this.publishRunFinish(
					opts.threadId,
					opts.runId,
					'cancelled',
					cancellationReason,
					archivedWorkflowIds,
					opts.user.id,
				);
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
				return;
			}

			const errorMessage = getErrorMessage(error);
			const userFacingErrorMessage = getUserFacingErrorMessage(error);

			const messageGroupId = this.tracing.getMessageGroupId(opts.runId);
			const errCtx: InstanceAiObservabilityContext = {
				threadId: opts.threadId,
				runId: opts.runId,
				tracing: opts.tracing,
				agentId: orchestratorAgentId(opts.runId),
				userId: opts.user.id,
				messageGroupId,
			};
			this.logger.error(`Instance AI resumed run error: ${errorMessage}`, {
				error: errorMessage,
				...buildInstanceAiObservabilityContext(errCtx),
			});
			this.reportInstanceAiError(error, { component: 'instance-ai-run', ...errCtx });
			this.terminalOutcome.evaluateTerminalResponse(opts.threadId, opts.runId, 'errored', {
				messageGroupId,
				errorMessage: userFacingErrorMessage,
			});
			await this.tracing.finalizeRunTracing(opts.runId, opts.tracing, {
				status: 'error',
				reason: errorMessage,
			});
			messageTraceFinalization = {
				status: 'error',
				reason: errorMessage,
				metadata: this.tracing.buildMessageTraceMetadata(opts.threadId, opts.runId, {
					status: 'error',
				}),
			};

			const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
				opts.threadId,
				opts.user,
				undefined,
				this.backgroundTasks.getRunningTasks(opts.threadId).length,
			);
			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: orchestratorAgentId(opts.runId),
				payload: {
					status: 'error',
					reason: userFacingErrorMessage,
					...(archivedWorkflowIds.length > 0 ? { archivedWorkflowIds } : {}),
				},
			});
			await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
		} finally {
			this.runState.clearActiveRun(opts.threadId);
			// See note in executeRun's finally — keep threadPushRef alive for
			// post-run planned-task dispatch.
			if (messageTraceFinalization) {
				await this.tracing.maybeFinalizeRunTraceRoot(opts.runId, messageTraceFinalization);
				if (messageTraceFinalization.status !== 'cancelled') {
					this.liveness.consumeRunTimeout(opts.runId);
				}
			}
			// Post-run planned-task wiring — mirror the executeRun finally.
			// Resumed ordinary-chat runs also need to drive the scheduler in case
			// a background task settled while they were active or suspended and
			// the orchestrate-checkpoint branch was skipped because of hasLiveRun.
			if (!this.runState.hasSuspendedRun(opts.threadId)) {
				if (opts.checkpoint?.isCheckpointFollowUp) {
					await this.finalizeCheckpointFollowUp(
						opts.user,
						opts.threadId,
						opts.checkpoint.checkpointTaskId,
					);
				} else if (opts.plannedBuild?.isPlannedBuildFollowUp) {
					await this.finalizePlannedBuildFollowUp(opts.user, opts.threadId, opts.plannedBuild);
				} else {
					await this.schedulePlannedTasks(opts.user, opts.threadId);
				}
				await this.drainPendingCheckpointReentries(opts.user, opts.threadId);
				await this.taskProjector.syncFromWorkflowLoop(opts.threadId, opts.runId);
				await this.maybeStartWorkflowSetupFollowUp(opts.user, opts.threadId);
			}
		}
	}

	// ── Background task management ──────────────────────────────────────────

	private spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: DbSnapshotStorage,
		messageGroupIdOverride?: string,
	): SpawnBackgroundTaskResult {
		const outcome = this.backgroundTasks.spawn({
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			messageGroupId: messageGroupIdOverride ?? this.runState.getMessageGroupId(opts.threadId),
			plannedTaskId: opts.plannedTaskId,
			workItemId: opts.workItemId,
			traceContext: opts.traceContext,
			createTraceContext: opts.createTraceContext,
			dedupeKey: opts.dedupeKey,
			parentCheckpointId: opts.parentCheckpointId,
			run: opts.run,
			onLimitReached: async (errorMessage) => {
				await this.tracing.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
					status: 'failed',
					outputs: {
						taskId: opts.taskId,
						agentId: opts.agentId,
						role: opts.role,
					},
					error: errorMessage,
					metadata: {
						...(opts.plannedTaskId ? { planned_task_id: opts.plannedTaskId } : {}),
						...(opts.workItemId ? { work_item_id: opts.workItemId } : {}),
					},
				});
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: {
						role: opts.role,
						result: '',
						error: errorMessage,
					},
				});
			},
			onCompleted: async (task) => {
				await this.tracing.finalizeBackgroundTaskTracing(task, 'completed');
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: task.result ?? '' },
				});

				const user = this.runState.getThreadUser(opts.threadId);
				if (user) {
					await this.handlePlannedTaskSettlement(user, task, 'succeeded');
				}
			},
			onFailed: async (task) => {
				await this.tracing.finalizeBackgroundTaskTracing(task, 'failed');
				this.reportInstanceAiError(new Error(task.error ?? 'Instance AI background task failed'), {
					component: 'instance-ai-background-task',
					threadId: opts.threadId,
					runId,
					tracing: task.traceContext,
					agentId: opts.agentId,
					messageGroupId: task.messageGroupId,
					taskId: task.taskId,
					role: task.role,
				});
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: '', error: task.error ?? 'Unknown error' },
				});

				const user = this.runState.getThreadUser(opts.threadId);
				if (user) {
					await this.handlePlannedTaskSettlement(user, task, 'failed');
				}
			},
			onSettled: async (task) => {
				await this.terminalOutcome.recordBackgroundTerminalOutcome(task);
				await this.saveAgentTreeSnapshot(
					opts.threadId,
					runId,
					snapshotStorage,
					true,
					task.messageGroupId,
				);

				// Auto-follow-up: when the last background task finishes and no
				// orchestrator run is active, resume the orchestrator so it can
				// synthesize results for the user. Planned tasks handle this via
				// schedulePlannedTasks(); this covers direct detached delegate calls.
				if (task.plannedTaskId) return;

				await this.taskProjector.syncFromBackgroundTask(task);

				// Parent-tagged children (patch-builder etc. spawned inside a
				// checkpoint follow-up) must NEVER emit a generic
				// `<background-task-completed>` shell — the orchestrator would
				// land outside the checkpoint context and the checkpoint would
				// be orphaned. Try immediate re-entry; if the run state or
				// still-running siblings block it, queue a deferred marker that
				// the post-run drain hook will pick up.
				const parentCheckpointId = task.parentCheckpointId;
				if (parentCheckpointId) {
					const user = this.runState.getThreadUser(opts.threadId);
					if (!user) {
						this.queuePendingCheckpointReentry(opts.threadId, parentCheckpointId);
						return;
					}
					const reentered = await this.maybeReenterParentCheckpoint(user, opts.threadId, task);
					if (!reentered) {
						this.queuePendingCheckpointReentry(opts.threadId, parentCheckpointId);
					}
					return;
				}

				const remaining = this.backgroundTasks.getRunningTasks(opts.threadId);
				const hasActiveRun = !!this.runState.getActiveRunId(opts.threadId);
				const hasSuspendedRun = this.runState.hasSuspendedRun(opts.threadId);
				if (remaining.length === 0 && !hasActiveRun && !hasSuspendedRun) {
					if (this.liveness.hasTimedOutActiveRunThread(opts.threadId)) {
						this.logger.debug('Skipping background auto-follow-up after active run timeout', {
							threadId: opts.threadId,
							taskId: task.taskId,
						});
						return;
					}

					// Don't auto-respawn a task that timed out — hand back to the user instead.
					if (task.timeoutReason) {
						this.logger.debug('Skipping background auto-follow-up after task timeout', {
							threadId: opts.threadId,
							taskId: task.taskId,
							timeoutReason: task.timeoutReason,
						});
						return;
					}

					const user = this.runState.getThreadUser(opts.threadId);
					if (user) {
						const verificationFollowUpStarted = await this.maybeStartWorkflowVerificationFollowUp(
							user,
							task,
						);
						if (verificationFollowUpStarted) return;

						// Builder already verified (or setup is needed without a verify step):
						// route directly to setup so an unrunnable workflow is never presented
						// as done.
						const setupFollowUpStarted = await this.maybeStartWorkflowSetupFollowUp(
							user,
							task.threadId,
						);
						if (setupFollowUpStarted) return;

						const payload = JSON.stringify(
							{
								role: opts.role,
								status: task.result ? 'completed' : task.error ? 'failed' : 'finished',
								result: task.result ?? undefined,
								outcome: task.outcome ?? undefined,
								error: task.error ?? undefined,
							},
							null,
							2,
						);
						await this.startInternalFollowUpRun(
							user,
							opts.threadId,
							`<background-task-completed>\n${payload}\n</background-task-completed>\n\n${AUTO_FOLLOW_UP_MESSAGE}`,
							task.messageGroupId,
						);
					}
				}
			},
		});

		if (outcome.status === 'started') {
			void this.taskProjector.syncFromBackgroundTask(outcome.task);
			return { status: 'started', taskId: outcome.task.taskId, agentId: outcome.task.agentId };
		}
		if (outcome.status === 'duplicate') {
			this.logger.warn('Background task dispatch deduped — task already in flight', {
				threadId: opts.threadId,
				requestedTaskId: opts.taskId,
				existingTaskId: outcome.existing.taskId,
				plannedTaskId: opts.dedupeKey?.plannedTaskId,
				workflowId: opts.dedupeKey?.workflowId,
				role: opts.role,
			});
			// The sub-agent dispatch tools publish `agent-spawned` and allocate a
			// detached LangSmith trace root BEFORE calling spawnBackgroundTask, so
			// the freshly-generated subAgentId for this deduped attempt already has
			// a phantom sub-agent node in the event stream and an unfinished trace
			// root. Compensate the same way `onLimitReached` does so the agent tree
			// snapshot doesn't keep a ghost child and the trace client is released.
			void this.tracing.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
				status: 'cancelled',
				outputs: {
					taskId: opts.taskId,
					agentId: opts.agentId,
					role: opts.role,
					deduped_to: outcome.existing.taskId,
				},
				metadata: {
					deduped: true,
					existing_task_id: outcome.existing.taskId,
					...(opts.plannedTaskId ? { planned_task_id: opts.plannedTaskId } : {}),
					...(opts.workItemId ? { work_item_id: opts.workItemId } : {}),
				},
			});
			this.eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: {
					role: opts.role,
					result: '',
					error: `Deduped: task already in flight as ${outcome.existing.taskId}`,
				},
			});
			return {
				status: 'duplicate',
				existing: {
					taskId: outcome.existing.taskId,
					agentId: outcome.existing.agentId,
					role: outcome.existing.role,
					plannedTaskId: outcome.existing.plannedTaskId,
					workItemId: outcome.existing.workItemId,
				},
			};
		}
		return { status: 'limit-reached' };
	}

	private async buildMessageWithRunningTasks(threadId: string, message: string): Promise<string> {
		return await enrichMessageWithBackgroundTasks(
			message,
			this.backgroundTasks.getRunningTasks(threadId),
			{
				formatTask: async (task: ManagedBackgroundTask) =>
					`[Running task — ${task.role}]: taskId=${task.taskId}`,
			},
		);
	}

	private trackConfirmationRequest(
		threadId: string,
		confirmationEvent: { payload: Record<string, unknown> },
	): void {
		const payload = confirmationEvent.payload;
		const inputThreadId = nanoid();
		payload.inputThreadId = inputThreadId;

		const inputType = payload.inputType as string | undefined;
		let type: string;
		if (inputType) {
			type = inputType;
		} else if (Array.isArray(payload.setupRequests) && payload.setupRequests.length > 0) {
			type = 'setup';
		} else if (Array.isArray(payload.credentialRequests) && payload.credentialRequests.length > 0) {
			type = 'credential-setup';
		} else {
			type = 'approval';
		}

		let numSteps = 1;
		if (Array.isArray(payload.questions)) {
			numSteps = payload.questions.length;
		} else if (Array.isArray(payload.setupRequests)) {
			numSteps = payload.setupRequests.length;
		} else if (Array.isArray(payload.credentialRequests)) {
			numSteps = payload.credentialRequests.length;
		}

		if (inputType === 'plan-review') {
			// Tell the first plan in a thread apart from later revisions the user asked
			// for. The per-thread counter is cleared on thread cleanup.
			const planCount = (this.planRequestsByThread.get(threadId) ?? 0) + 1;
			this.planRequestsByThread.set(threadId, planCount);
			type = planCount === 1 ? 'first_plan' : 'revised_plan';
			if (Array.isArray(payload.planItems)) {
				numSteps = payload.planItems.length;
			}
		}

		this.telemetry.track('Builder asked for input', {
			thread_id: threadId,
			input_thread_id: inputThreadId,
			type,
			num_steps: numSteps,
		});
	}

	private async finalizeCancelledSuspendedRun(
		suspended: SuspendedRunState<User>,
		reason = 'user_cancelled',
	): Promise<void> {
		const runTimeout =
			reason === INSTANCE_AI_RUN_TIMEOUT_REASON
				? this.liveness.consumeRunTimeout(suspended.runId)
				: undefined;
		if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
			this.liveness.publishRunTimeoutNotice(suspended.threadId, suspended.runId);
		}
		await this.tracing.finalizeRunTracing(suspended.runId, suspended.tracing, {
			status: 'cancelled',
			reason,
		});

		const archivedWorkflowIds = await this.temporaryWorkflowService.reapForRun(
			suspended.threadId,
			suspended.user,
			undefined,
			this.backgroundTasks.getRunningTasks(suspended.threadId).length,
		);
		this.publishRunFinish(
			suspended.threadId,
			suspended.runId,
			'cancelled',
			reason,
			archivedWorkflowIds,
			suspended.user.id,
		);

		// Persist the snapshot so the run-finish event (which clears
		// in-flight tool calls) is reflected in the stored tree.
		await this.saveAgentTreeSnapshot(
			suspended.threadId,
			suspended.runId,
			this.dbSnapshotStorage,
			true,
		);
		await this.tracing.maybeFinalizeRunTraceRoot(suspended.runId, {
			status: 'cancelled',
			reason,
			metadata: this.tracing.buildMessageTraceMetadata(suspended.threadId, suspended.runId, {
				status: 'cancelled',
				cancellationReason: reason,
				...(runTimeout ? { runTimeout } : {}),
			}),
		});

		void this.suspendedThreads.dropPendingConfirmation(suspended.requestId);
	}

	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
		userId?: string,
	): void {
		const effectiveStatus = status === 'errored' ? 'error' : status;
		const hasArchived = archivedWorkflowIds && archivedWorkflowIds.length > 0;
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: {
				status: effectiveStatus,
				...(status === 'cancelled' ? { reason: reason ?? 'user_cancelled' } : {}),
				...(hasArchived ? { archivedWorkflowIds } : {}),
			},
		});
		// success-drop heartbeat; user_id required or PostHog drops instance-only events
		this.telemetry.track('instance_ai_run_finished', {
			thread_id: threadId,
			run_id: runId,
			status: effectiveStatus,
			...(userId ? { user_id: userId } : {}),
		});
	}

	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		snapshotStorage: DbSnapshotStorage,
		options?: {
			userId?: string;
			modelId?: ModelConfig;
			archivedWorkflowIds?: string[];
			workSummary?: WorkSummary;
			usage?: RunTokenUsage;
		},
	): Promise<void> {
		this.publishRunFinish(
			threadId,
			runId,
			status,
			undefined,
			options?.archivedWorkflowIds,
			options?.userId,
		);
		this.emitRunMetrics(threadId, status, options);
		await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
		if (status === 'completed' && options?.userId && options?.modelId) {
			void this.refineTitleIfNeeded(threadId, options.userId, options.modelId);
		}
	}

	/** Emit a typed event consumed by the Prometheus Instance AI metrics collector. */
	private emitRunMetrics(
		threadId: string,
		status: 'completed' | 'cancelled' | 'errored',
		options?: { modelId?: ModelConfig; workSummary?: WorkSummary; usage?: RunTokenUsage },
	): void {
		const startedAt = this.runState.getActiveRun(threadId)?.startedAt;
		this.eventService.emit('instance-ai-run-finished', {
			status: status === 'errored' ? 'error' : status,
			durationMs: startedAt !== undefined ? Date.now() - startedAt : undefined,
			model: typeof options?.modelId === 'string' ? options.modelId : 'custom',
			toolCalls: options?.workSummary?.totalToolCalls ?? 0,
			toolErrors: options?.workSummary?.totalToolErrors ?? 0,
			...(options?.usage ? { usage: options.usage } : {}),
		});
	}

	/**
	 * Refine the thread title with an LLM-generated version after a run completes.
	 * Fires asynchronously and is best-effort — the heuristic title remains if this fails.
	 */
	private async refineTitleIfNeeded(
		threadId: string,
		userId: string,
		modelId: ModelConfig,
	): Promise<void> {
		try {
			const memory = this.agentMemory;
			const thread = await memory.getThread(threadId);
			if (!thread?.title) return;

			// Skip if thread already has an LLM-refined title
			if (thread.metadata?.titleRefined) return;

			// Concat recent user messages so retries after a trivial first message
			// (e.g. "hey") have enough signal to produce a good title.
			const history = await memory.getMessages(threadId, { limit: 5 });
			const userTexts = history.flatMap((m) => {
				if (!('role' in m) || m.role !== 'user') return [];
				const text = this.extractStoredMessageText(m.content);
				return text.length > 0 ? [text] : [];
			});
			if (userTexts.length === 0) return;
			const userText = userTexts.join('\n');

			const baseTracing = this.tracing.getTraceContextForContinuation(threadId);
			const titleTracing = await createInternalOperationTraceContext({
				threadId,
				conversationId: threadId,
				messageId: `internal:title:${threadId}`,
				runId: `title-${nanoid()}`,
				userId,
				modelId,
				operationName: 'thread_title',
				input: {
					message_count: userTexts.length,
					source: 'thread_title_refinement',
				},
				proxyConfig: baseTracing?.proxyConfig,
				metadata: {
					n8n_version: N8N_VERSION || undefined,
					operation_name: 'thread_title',
					trigger: 'run_completed',
				},
			});
			const titleTelemetry = titleTracing?.getTelemetry?.({
				agentRole: 'thread_title',
				functionId: 'instance-ai.thread_title',
				executionMode: 'internal',
				metadata: {
					operation_name: 'thread_title',
				},
			});
			let llmTitle: string | null;
			if (titleTracing) {
				try {
					llmTitle = await titleTracing.withActiveSpan(titleTracing.rootRun, async () => {
						const title = await generateTitleForRun(modelId, userText, {
							...(titleTelemetry ? { telemetry: titleTelemetry } : {}),
						});
						if (title) {
							await titleTracing.finishRun(titleTracing.rootRun, {
								outputs: { title },
								metadata: { final_status: 'completed' },
							});
						} else {
							await titleTracing.finishRun(titleTracing.rootRun, {
								outputs: { title: null },
								metadata: { final_status: 'skipped' },
							});
						}
						return title;
					});
				} finally {
					releaseTraceClient(titleTracing.rootRun.traceId);
				}
			} else {
				llmTitle = await generateTitleForRun(modelId, userText);
			}
			if (!llmTitle) return;

			await patchThread(memory, {
				threadId,
				update: ({ metadata }) => ({
					title: llmTitle,
					metadata: { ...metadata, titleRefined: true },
				}),
			});

			// Push SSE event so frontend updates immediately
			this.eventBus.publish(threadId, {
				type: 'thread-title-updated',
				runId: '',
				agentId: 'orchestrator',
				payload: { title: llmTitle },
			});
		} catch (error) {
			this.logger.warn('Failed to refine thread title', {
				threadId,
				error: getErrorMessage(error),
			});
			// Non-fatal — heuristic title remains
		}
	}

	private extractStoredMessageText(content: unknown): string {
		if (typeof content === 'string') return content;
		if (Array.isArray(content)) {
			return content.flatMap((part) => (isTextMessagePart(part) ? [part.text] : [])).join('\n');
		}
		return '';
	}

	/**
	 * Build an agent tree from in-memory events and persist it as a thread metadata snapshot.
	 * @param isUpdate If true, updates the existing snapshot for this runId (background task completion).
	 */
	private async saveAgentTreeSnapshot(
		threadId: string,
		runId: string,
		snapshotStorage: DbSnapshotStorage,
		isUpdate = false,
		overrideMessageGroupId?: string,
	): Promise<void> {
		try {
			const messageGroupId = overrideMessageGroupId ?? this.runState.getMessageGroupId(threadId);

			let events: InstanceAiEvent[];
			let groupRunIds: string[] | undefined;
			if (messageGroupId) {
				groupRunIds = this.getRunIdsForMessageGroup(messageGroupId);
				if (groupRunIds.length === 0) {
					const snapshot = await snapshotStorage.getLatest(threadId, { messageGroupId, runId });
					groupRunIds = snapshot?.runIds?.length ? snapshot.runIds : [runId];
				}
				events = this.eventBus.getEventsForRuns(threadId, groupRunIds);
			} else {
				events = this.eventBus.getEventsForRun(threadId, runId);
			}
			if (isUpdate && events.length === 0) {
				this.logger.warn('Skipped updating empty Instance AI agent tree snapshot', {
					threadId,
					runId,
					messageGroupId,
				});
				return;
			}
			const agentTree = buildAgentTreeFromEvents(events);

			const tracing = this.tracing.getTraceContext(runId);
			const saveOptions = {
				messageGroupId,
				runIds: groupRunIds,
				traceId: tracing?.rootRun.otelTraceId,
				spanId: tracing?.rootRun.otelSpanId,
				langsmithRunId: tracing?.rootRun.id,
				langsmithTraceId: tracing?.rootRun.traceId,
			};

			if (isUpdate) {
				await snapshotStorage.updateLast(threadId, agentTree, runId, saveOptions);
			} else {
				await snapshotStorage.save(threadId, agentTree, runId, saveOptions);
			}
		} catch (error) {
			this.logger.warn('Failed to save agent tree snapshot', {
				threadId,
				runId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
		});
	}
}
