import {
	UNLIMITED_CREDITS,
	buildProxyHeaders,
	type InstanceAiAttachment,
	type InstanceAiConfirmRequest,
	type InstanceAiEvent,
	type InstanceAiThreadStatusResponse,
	type InstanceAiGatewayCapabilities,
	type McpToolCallResult,
	type ToolCategory,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { AiBuilderTemporaryWorkflowRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	createMemory,
	McpClientManager,
	BuilderSandboxFactory,
	BackgroundTaskManager,
	buildAgentTreeFromEvents,
	InstanceAiTerminalResponseGuard,
	createInstanceAiLivenessPolicyConfig,
	InstanceAiLivenessPolicy,
	submitLangsmithUserFeedback,
	RunStateRegistry,
	generateTitleForRun,
	patchThread,
	type ConfirmationData,
	type DomainAccessTracker,
	type ManagedBackgroundTask,
	type ModelConfig,
	type InstanceAiTraceContext,
	type ServiceProxyConfig,
	type SuspendedRunState,
	type TerminalResponseDecision,
	type TerminalResponseStatus,
	type WorkSummary,
} from '@n8n/instance-ai';
import { hasGlobalScope } from '@n8n/permissions';
import { ErrorReporter } from 'n8n-core';
import { nanoid } from 'nanoid';
import type * as Undici from 'undici';
import { v5 as uuidv5 } from 'uuid';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { Push } from '@/push';
import { AiService } from '@/services/ai.service';

import { DbSnapshotStorage } from './storage/db-snapshot-storage';
import { DbIterationLogStorage } from './storage/db-iteration-log-storage';
import { InstanceAiCompactionService } from './compaction.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';
import { SsrfProtectionService } from '@/services/ssrf/ssrf-protection.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import {
	InstanceAiTraceService,
	type MessageTraceFinalization,
} from './tracing/instance-ai-trace.service';
import { InstanceAiTerminalOutcomeService } from './terminal-outcomes/instance-ai-terminal-outcome.service';
import { InstanceAiPlannedTaskService } from './planned-tasks/instance-ai-planned-task.service';
import { InstanceAiCheckpointService } from './checkpoint/instance-ai-checkpoint.service';
import { InstanceAiCleanupService } from './cleanup/instance-ai-cleanup.service';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { LocalGatewayRegistry } from './filesystem';
import type { LocalGateway } from './filesystem';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { INSTANCE_AI_RUN_TIMEOUT_REASON, InstanceAiLivenessService } from './liveness';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';
import { InstanceAiBackgroundTaskService } from './background-tasks/instance-ai-background-task.service';
import { InstanceAiRunExecutionService } from './run-execution/instance-ai-run-execution.service';
import { InstanceAiSandboxService } from './sandbox/instance-ai-sandbox.service';
import { TypeORMCompositeStore } from './storage/typeorm-composite-store';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';

// Stable UUID namespace for deterministic feedback IDs. Submitting the same
// (key, responseId) pair twice produces the same feedback UUID so LangSmith
// upserts the record (thumbs-down → later text comment = one record, not two).
const INSTANCE_AI_FEEDBACK_NAMESPACE = 'c5be4c87-5b6e-49ed-afe1-9c5c1f99a5c0';
const MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD = 5;

/**
 * When HTTP_PROXY / HTTPS_PROXY is set (e.g. in e2e tests with MockServer),
 * return a fetch function that routes requests through the proxy. Node.js's
 * globalThis.fetch does not respect these env vars, so AI SDK providers would
 * bypass the proxy without this.
 */
function getProxyFetch(): typeof globalThis.fetch | undefined {
	const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
	if (!proxyUrl) return undefined;

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { ProxyAgent } = require('undici') as typeof Undici;
	const dispatcher = new ProxyAgent(proxyUrl);
	return (async (url: string | URL | Request, init?: RequestInit) =>
		await globalThis.fetch(url, {
			...init,
			// @ts-expect-error dispatcher is a valid undici option for Node.js fetch
			dispatcher,
		})) as typeof globalThis.fetch;
}

/** Collapse the frontend's typed confirmation union into the flat payload
 *  consumed by Mastra tool resume schemas and sub-agent HITL. Only the fields
 *  relevant to the submitted kind are populated — everything else stays undefined.
 *
 *  Most kinds carry implicit approval (you wouldn't be submitting answers,
 *  selected credentials, or a setup action otherwise) — only `approval` and
 *  `domainAccessDeny` actually carry a denial path. */
function toConfirmationData(request: InstanceAiConfirmRequest): ConfirmationData {
	switch (request.kind) {
		case 'approval':
			return { approved: request.approved, userInput: request.userInput };
		case 'domainAccessApprove':
			return { approved: true, domainAccessAction: request.domainAccessAction };
		case 'domainAccessDeny':
			return { approved: false };
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
	private readonly mcpClientManager: McpClientManager;

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly formBaseUrl: string;

	private readonly runState = new RunStateRegistry<User>();

	private readonly liveness: InstanceAiLivenessService<SuspendedRunState<User>>;

	private readonly backgroundTaskService: InstanceAiBackgroundTaskService;

	private readonly sandboxService: InstanceAiSandboxService;

	private readonly traceService: InstanceAiTraceService;

	private readonly terminalOutcomeService: InstanceAiTerminalOutcomeService;

	private readonly plannedTaskService: InstanceAiPlannedTaskService;

	private readonly checkpointService: InstanceAiCheckpointService;

	private readonly cleanupService: InstanceAiCleanupService;

	private readonly runExecutionService: InstanceAiRunExecutionService;

	/** Per-user Local Gateway connections. Handles pairing tokens, session keys, and tool dispatch. */
	private readonly gatewayRegistry = new LocalGatewayRegistry();

	/** Domain-access trackers per thread — persists approvals across runs within a conversation. */
	private readonly domainAccessTrackersByThread = new Map<string, DomainAccessTracker>();

	/** Tracks the iframe pushRef per thread for live execution push events. */
	private readonly threadPushRef = new Map<string, string>();

	/** In-memory guard to prevent double credit counting within the same process. */
	private readonly creditedThreads = new Set<string>();

	/** Default IANA timezone for the instance (from GENERIC_TIMEZONE env var). */
	private readonly defaultTimeZone: string;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly compositeStore: TypeORMCompositeStore,
		private readonly compactionService: InstanceAiCompactionService,
		private readonly aiService: AiService,
		private readonly push: Push,
		private readonly threadRepo: InstanceAiThreadRepository,
		private readonly urlService: UrlService,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
		private readonly dbIterationLogStorage: DbIterationLogStorage,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly telemetry: Telemetry,
		private readonly userRepository: UserRepository,
		private readonly aiBuilderTemporaryWorkflowRepository: AiBuilderTemporaryWorkflowRepository,
		private readonly errorReporter: ErrorReporter,
		ssrfProtectionConfig: SsrfProtectionConfig,
		ssrfProtectionService: SsrfProtectionService,
		private readonly eventService: EventService,
	) {
		this.logger = logger.scoped('instance-ai');
		this.instanceAiConfig = globalConfig.instanceAi;
		const backgroundTasks = new BackgroundTaskManager(MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD);
		const livenessPolicyConfig = createInstanceAiLivenessPolicyConfig({
			confirmationTimeoutMs: this.instanceAiConfig.confirmationTimeout,
		});
		this.liveness = new InstanceAiLivenessService<SuspendedRunState<User>>({
			policy: new InstanceAiLivenessPolicy(livenessPolicyConfig),
			backgroundTaskIdleTimeoutMs: livenessPolicyConfig.backgroundTaskIdleTimeoutMs,
			runState: this.runState,
			backgroundTasks,
			eventBus: this.eventBus,
			logger: this.logger,
			finalizeCancelledSuspendedRun: (suspended, reason) => {
				void this.finalizeCancelledSuspendedRun(suspended, reason);
			},
		});
		this.defaultTimeZone = globalConfig.generic.timezone;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${this.urlService.getInstanceBaseUrl()}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;
		this.formBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.form}`;

		this.mcpClientManager = new McpClientManager(
			ssrfProtectionConfig.enabled ? ssrfProtectionService : undefined,
		);

		// When the admin changes MCP settings, tear down existing clients so the
		// next agent run rebuilds them against the new config. In-flight tool
		// calls on disconnected clients will fail — that's accepted: the
		// alternative is leaking clients keyed by stale config until shutdown.
		// We only listen for the MCP-changed flag so unrelated settings saves
		// don't churn live MCP connections.
		this.eventService.on('instance-ai-settings-updated', ({ mcpSettingsChanged }) => {
			if (!mcpSettingsChanged) return;
			this.mcpClientManager.disconnect().catch((error: unknown) => {
				this.logger.warn('Failed to disconnect MCP clients after settings change', {
					error: getErrorMessage(error),
				});
			});
		});

		this.sandboxService = new InstanceAiSandboxService({
			instanceAiConfig: this.instanceAiConfig,
			aiService: this.aiService,
			settingsService: this.settingsService,
			logger: this.logger,
			errorReporter: this.errorReporter,
		});
		this.traceService = new InstanceAiTraceService(this.logger);
		this.terminalOutcomeService = new InstanceAiTerminalOutcomeService({
			orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
			dbSnapshotStorage: this.dbSnapshotStorage,
			eventBus: this.eventBus,
			telemetry: this.telemetry,
			logger: this.logger,
			createMemoryConfig: () => this.createMemoryConfig(),
		});
		this.cleanupService = new InstanceAiCleanupService({
			backgroundTasks,
			aiBuilderTemporaryWorkflowRepository: this.aiBuilderTemporaryWorkflowRepository,
			adapterService: this.adapterService,
			threadRepo: this.threadRepo,
			userRepository: this.userRepository,
			compositeStore: this.compositeStore,
			logger: this.logger,
		});
		this.backgroundTaskService = new InstanceAiBackgroundTaskService({
			orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
			backgroundTasks,
			runState: this.runState,
			liveness: this.liveness,
			eventBus: this.eventBus,
			logger: this.logger,
			dbSnapshotStorage: this.dbSnapshotStorage,
			finalizeDetachedTraceRun: async (taskId, traceContext, options) =>
				await this.finalizeDetachedTraceRun(taskId, traceContext, options),
			finalizeBackgroundTaskTracing: async (task, status) =>
				await this.finalizeBackgroundTaskTracing(task, status),
			handlePlannedTaskSettlement: async (user, task, status) =>
				await this.handlePlannedTaskSettlement(user, task, status),
			recordBackgroundTerminalOutcome: async (task) =>
				await this.terminalOutcomeService.recordBackgroundTerminalOutcome(task),
			saveAgentTreeSnapshot: async (
				threadId,
				runId,
				snapshotStorage,
				isUpdate,
				overrideMessageGroupId,
			) =>
				await this.saveAgentTreeSnapshot(
					threadId,
					runId,
					snapshotStorage,
					isUpdate,
					overrideMessageGroupId,
				),
			startInternalFollowUpRun: async (user, threadId, message, researchMode, messageGroupId) =>
				await this.startInternalFollowUpRun(user, threadId, message, researchMode, messageGroupId),
			queuePendingCheckpointReentry: (threadId, checkpointTaskId) =>
				this.queuePendingCheckpointReentry(threadId, checkpointTaskId),
			maybeReenterParentCheckpoint: async (user, threadId, task) =>
				await this.maybeReenterParentCheckpoint(user, threadId, task),
			cancelAwaitingApprovalPlan: async (threadId) =>
				await this.cancelAwaitingApprovalPlan(threadId),
			finalizeCancelledSuspendedRun: async (suspended, reason) =>
				await this.finalizeCancelledSuspendedRun(suspended, reason),
		});
		this.runExecutionService = new InstanceAiRunExecutionService({
			instanceAiConfig: this.instanceAiConfig,
			defaultTimeZone: this.defaultTimeZone,
			oauth2CallbackUrl: this.oauth2CallbackUrl,
			webhookBaseUrl: this.webhookBaseUrl,
			formBaseUrl: this.formBaseUrl,
			adapterService: this.adapterService,
			eventBus: this.eventBus,
			settingsService: this.settingsService,
			compositeStore: this.compositeStore,
			compactionService: this.compactionService,
			aiService: this.aiService,
			dbSnapshotStorage: this.dbSnapshotStorage,
			dbIterationLogStorage: this.dbIterationLogStorage,
			sourceControlPreferencesService: this.sourceControlPreferencesService,
			telemetry: this.telemetry,
			logger: this.logger,
			mcpClientManager: this.mcpClientManager,
			runState: this.runState,
			backgroundTasks,
			gatewayRegistry: this.gatewayRegistry,
			domainAccessTrackersByThread: this.domainAccessTrackersByThread,
			threadPushRef: this.threadPushRef,
			liveness: this.liveness,
			sandboxService: this.sandboxService,
			traceService: this.traceService,
			createMemoryConfig: () => this.createMemoryConfig(),
			ensureThreadExists: async (memory, threadId, resourceId) =>
				await this.ensureThreadExists(memory, threadId, resourceId),
			resolveProxyModel: async (user, proxyBaseUrl, tokenManager) =>
				await this.resolveProxyModel(user, proxyBaseUrl, tokenManager),
			resolveAgentModelConfig: async (user) => await this.resolveAgentModelConfig(user),
			getOrCreateWorkspace: async (threadId, user) =>
				await this.getOrCreateWorkspace(threadId, user),
			createBuilderFactory: async (user) => await this.createBuilderFactory(user),
			cancelBackgroundTask: (threadId, taskId) =>
				this.backgroundTaskService.cancelBackgroundTask(threadId, taskId),
			spawnBackgroundTask: (runId, opts, snapshotStorage, messageGroupIdOverride) =>
				this.backgroundTaskService.spawnBackgroundTask(
					runId,
					opts,
					snapshotStorage,
					messageGroupIdOverride,
				),
			sendCorrectionToTask: (threadId, taskId, correction) =>
				this.backgroundTaskService.sendCorrectionToTask(threadId, taskId, correction),
			getCheckpointAllowedWorkflowIds: async (threadId, checkpointTaskId) =>
				await this.getCheckpointAllowedWorkflowIds(threadId, checkpointTaskId),
			evaluateTerminalResponse: (threadId, runId, status, options) =>
				this.evaluateTerminalResponse(threadId, runId, status, options),
			evaluateWaitingResponse: (threadId, runId, confirmationEvent, options) =>
				this.evaluateWaitingResponse(threadId, runId, confirmationEvent, options),
			finishInvalidConfirmationRun: async (args) => await this.finishInvalidConfirmationRun(args),
			configureTraceReplayMode: async (tracing) => await this.configureTraceReplayMode(tracing),
			storeTraceContext: (runId, threadId, tracing, messageGroupId) =>
				this.storeTraceContext(runId, threadId, tracing, messageGroupId),
			finalizeRunTracing: async (runId, tracing, options) =>
				await this.finalizeRunTracing(runId, tracing, options),
			maybeFinalizeRunTraceRoot: async (runId, options) =>
				await this.maybeFinalizeRunTraceRoot(runId, options),
			reapAiTemporaryFromRun: async (threadId, user, createdWorkflowIds) =>
				await this.reapAiTemporaryFromRun(threadId, user, createdWorkflowIds),
			finalizeRun: async (threadId, runId, status, snapshotStorage, options) =>
				await this.finalizeRun(threadId, runId, status, snapshotStorage, options),
			publishRunFinish: (threadId, runId, status, reason, archivedWorkflowIds) =>
				this.publishRunFinish(threadId, runId, status, reason, archivedWorkflowIds),
			saveAgentTreeSnapshot: async (
				threadId,
				runId,
				snapshotStorage,
				isUpdate,
				overrideMessageGroupId,
			) =>
				await this.saveAgentTreeSnapshot(
					threadId,
					runId,
					snapshotStorage,
					isUpdate,
					overrideMessageGroupId,
				),
			countCreditsIfFirst: async (user, threadId, runId) =>
				await this.countCreditsIfFirst(user, threadId, runId),
			cleanupMastraSnapshots: async (mastraRunId) => await this.cleanupMastraSnapshots(mastraRunId),
			schedulePlannedTasks: async (user, threadId) =>
				await this.schedulePlannedTasks(user, threadId),
			drainPendingCheckpointReentries: async (user, threadId) =>
				await this.drainPendingCheckpointReentries(user, threadId),
			finalizeCheckpointFollowUp: async (user, threadId, checkpointTaskId) =>
				await this.finalizeCheckpointFollowUp(user, threadId, checkpointTaskId),
		});
		this.plannedTaskService = new InstanceAiPlannedTaskService({
			orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
			maxConcurrentBackgroundTasksPerThread: MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD,
			defaultTimeZone: this.defaultTimeZone,
			eventBus: this.eventBus,
			logger: this.logger,
			runState: this.runState,
			backgroundTasks,
			createMemoryConfig: () => this.createMemoryConfig(),
			revalidateActiveUser: async (userId) => await this.revalidateActiveUser(userId),
			cancelRun: (threadId) => this.cancelRun(threadId),
			createExecutionEnvironment: async (...args) => {
				const environment = await this.createExecutionEnvironment(...args);
				environment.orchestrationContext.tracing = this.getTraceContext(args[2]);
				return environment;
			},
			executeRun: (args) => {
				void this.executeRun(
					args.user,
					args.threadId,
					args.runId,
					args.message,
					args.abortController,
					args.researchMode,
					undefined,
					args.messageGroupId,
					args.timeZone,
					args.isReplanFollowUp,
					args.checkpoint,
				);
			},
			getThreadPushRef: (threadId) => this.threadPushRef.get(threadId),
		});
		this.checkpointService = new InstanceAiCheckpointService({
			backgroundTasks,
			runState: this.runState,
			logger: this.logger,
			createPlannedTaskState: async () => await this.plannedTaskService.createPlannedTaskState(),
			buildPlannedTaskFollowUpMessage: (type, graph, options) =>
				this.plannedTaskService.buildPlannedTaskFollowUpMessage(type, graph, options),
			startInternalFollowUpRun: async (...args) =>
				await this.plannedTaskService.startInternalFollowUpRun(...args),
			syncPlannedTasksToUi: async (threadId, graph) =>
				await this.plannedTaskService.syncPlannedTasksToUi(threadId, graph),
			schedulePlannedTasks: async (user, threadId) =>
				await this.plannedTaskService.schedulePlannedTasks(user, threadId),
		});

		this.liveness.start();
	}

	private async createBuilderFactory(user: User): Promise<BuilderSandboxFactory | undefined> {
		return await this.sandboxService.createBuilderFactory(user);
	}

	/** Get or create a sandbox + workspace for a thread. Returns undefined when sandbox is disabled. */
	private async getOrCreateWorkspace(threadId: string, user: User) {
		return await this.sandboxService.getOrCreateWorkspace(threadId, user);
	}

	/**
	 * Fetch a fresh proxy auth token and return the client + Authorization headers.
	 * Each caller gets a unique token (separate nanoid) for audit tracking.
	 */
	private async getProxyAuth(user: User) {
		return await this.sandboxService.getProxyAuth(user);
	}

	/**
	 * Full model-resolver chain shared between chat and eval paths.
	 *
	 * Mirrors the resolution used in `processMessage`:
	 *   1. AI service proxy (when enabled) — wraps with proxy auth.
	 *   2. HTTP_PROXY (when set, e.g. e2e tests) — wraps with proxy fetch.
	 *   3. Env vars / user credential — raw settings resolution.
	 *
	 * Call this instead of `settingsService.resolveModelConfig` directly so
	 * the eval endpoint gets the same working model the chat endpoint uses.
	 */
	async resolveAgentModelConfig(user: User): Promise<ModelConfig> {
		if (this.aiService.isProxyEnabled()) {
			const client = await this.aiService.getClient();
			const proxyBaseUrl = client.getApiProxyBaseUrl();
			const tokenManager = new ProxyTokenManager(async () => {
				return await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
			});
			return await this.resolveProxyModel(user, proxyBaseUrl, tokenManager);
		}
		const httpProxyModel = await this.resolveHttpProxyModel(user);
		if (httpProxyModel) return httpProxyModel;
		return await this.settingsService.resolveModelConfig(user);
	}

	/**
	 * Build model config. When the AI service proxy is enabled, returns a native
	 * Anthropic LanguageModelV2 instance pointing at the proxy.
	 *
	 * We use `@ai-sdk/anthropic` directly instead of returning a `{ url }` config
	 * object because Mastra's model router forces all configs with a `url` through
	 * `createOpenAICompatible`, which sends requests to `/chat/completions`.
	 * The proxy may forward to Vertex AI, which only supports the native Anthropic
	 * Messages API (`/v1/messages`), not the OpenAI-compatible endpoint.
	 *
	 * Auth headers are injected via a custom `fetch` wrapper so that each
	 * request gets a fresh-or-cached token from the ProxyTokenManager,
	 * avoiding 401s on long-running agent turns.
	 */
	private async resolveProxyModel(
		user: User,
		proxyBaseUrl: string,
		tokenManager: ProxyTokenManager,
	): Promise<ModelConfig> {
		const modelName = await this.settingsService.resolveModelName(user);
		const { createAnthropic } = await import('@ai-sdk/anthropic');
		const provider = createAnthropic({
			baseURL: proxyBaseUrl + '/anthropic/v1',
			apiKey: 'proxy-managed',
			fetch: async (input, init) => {
				const headers = new Headers(init?.headers);
				const auth = await tokenManager.getAuthHeaders();
				for (const [k, v] of Object.entries(auth)) {
					headers.set(k, v);
				}
				for (const [k, v] of Object.entries(
					buildProxyHeaders({ feature: 'instance-ai', n8nVersion: N8N_VERSION }),
				)) {
					headers.set(k, v);
				}
				return await globalThis.fetch(input, { ...init, headers });
			},
		});
		return provider(modelName);
	}

	/**
	 * When HTTP_PROXY is set (e.g. e2e tests with MockServer), build the model
	 * with a proxy-aware fetch so the AI SDK routes through the proxy. Mastra's
	 * ModelRouter doesn't pass `fetch` to providers, so we must do it here.
	 * Returns undefined if no HTTP_PROXY is set or the model isn't anthropic.
	 */
	private async resolveHttpProxyModel(user: User): Promise<ModelConfig | undefined> {
		const proxyFetch = getProxyFetch();
		if (!proxyFetch) return undefined;

		const config = await this.settingsService.resolveModelConfig(user);
		const modelId = typeof config === 'string' ? config : 'id' in config ? config.id : null;
		if (!modelId) return undefined;

		const [provider, ...rest] = modelId.split('/');
		const modelName = rest.join('/');
		const apiKey = typeof config === 'object' && 'apiKey' in config ? config.apiKey : undefined;
		const baseURL = typeof config === 'object' && 'url' in config ? config.url : undefined;
		if (provider !== 'anthropic') return undefined;

		const { createAnthropic } = await import('@ai-sdk/anthropic');
		return createAnthropic({
			apiKey,
			baseURL: baseURL || undefined,
			fetch: proxyFetch,
		})(modelName);
	}

	/**
	 * Count one credit for the first completed orchestrator run in a thread.
	 * Subsequent messages in the same thread are free.
	 *
	 * Race-condition mitigation strategy:
	 * - In-memory Set (`creditedThreads`) prevents concurrent calls within
	 *   the same process from both passing the check.
	 * - DB metadata (`creditCounted: true`) survives process restarts.
	 * - markBuilderSuccess is idempotent on the proxy side, so a theoretical
	 *   double-count after a crash mid-save is harmless.
	 */
	private async countCreditsIfFirst(user: User, threadId: string, runId: string): Promise<void> {
		if (!this.aiService.isProxyEnabled()) return;

		// Fast in-memory check — prevents the read-then-write race within a single process.
		if (this.creditedThreads.has(threadId)) return;

		let thread: Awaited<ReturnType<InstanceAiThreadRepository['findOneBy']>>;
		try {
			thread = await this.threadRepo.findOneBy({ id: threadId });
		} catch (error) {
			this.logger.warn('Failed to check Instance AI credit status', {
				threadId,
				runId,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!thread) return;
		if (thread.metadata?.creditCounted) {
			this.creditedThreads.add(threadId); // Sync in-memory with DB state
			return;
		}

		try {
			this.creditedThreads.add(threadId); // Claim before async work
			const { client, headers: authHeaders } = await this.getProxyAuth(user);
			const info = await client.markBuilderSuccess({ id: user.id }, authHeaders);
			if (info) {
				thread.metadata = { ...thread.metadata, creditCounted: true };
				await this.threadRepo.save(thread);
				this.push.sendToUsers(
					{
						type: 'updateInstanceAiCredits',
						data: { creditsQuota: info.creditsQuota, creditsClaimed: info.creditsClaimed },
					},
					[user.id],
				);
			}
		} catch (error) {
			this.creditedThreads.delete(threadId); // Allow retry on failure
			this.logger.warn('Failed to count Instance AI credits', {
				error: getErrorMessage(error),
				threadId,
				runId,
			});
		}
	}

	/** Whether the AI service proxy is enabled for credit counting. */
	isProxyEnabled(): boolean {
		return this.aiService.isProxyEnabled();
	}

	/** Get current credit usage from the AI service proxy. */
	async getCredits(user: User): Promise<{ creditsQuota: number; creditsClaimed: number }> {
		if (!this.aiService.isProxyEnabled()) {
			return { creditsQuota: UNLIMITED_CREDITS, creditsClaimed: 0 };
		}
		const client = await this.aiService.getClient();
		return await client.getBuilderInstanceCredits({ id: user.id });
	}

	isEnabled(): boolean {
		return this.settingsService.isAgentEnabled() && !!this.instanceAiConfig.model;
	}

	hasActiveRun(threadId: string): boolean {
		return this.runState.hasLiveRun(threadId);
	}

	getThreadStatus(threadId: string): InstanceAiThreadStatusResponse {
		return this.runState.getThreadStatus(
			threadId,
			this.backgroundTaskService.getTaskSnapshots(threadId),
		);
	}

	private storeTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
		this.traceService.storeTraceContext(runId, threadId, tracing, messageGroupId);
	}

	private getTraceContext(runId: string): InstanceAiTraceContext | undefined {
		return this.traceService.getTraceContext(runId);
	}

	private async configureTraceReplayMode(tracing: InstanceAiTraceContext): Promise<void> {
		await this.traceService.configureTraceReplayMode(tracing);
	}

	private async maybeFinalizeRunTraceRoot(
		runId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		await this.traceService.maybeFinalizeRunTraceRoot(runId, options);
	}

	private async finalizeRemainingMessageTraceRoots(
		threadId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		await this.traceService.finalizeRemainingMessageTraceRoots(threadId, options);
	}

	private deleteTraceContextsForThread(threadId: string): void {
		this.traceService.deleteTraceContextsForThread(threadId);
	}

	private async finalizeDetachedTraceRun(
		taskId: string,
		traceContext: InstanceAiTraceContext | undefined,
		options: {
			status: 'completed' | 'failed' | 'cancelled';
			outputs?: Record<string, unknown>;
			error?: string;
			metadata?: Record<string, unknown>;
		},
	): Promise<void> {
		await this.traceService.finalizeDetachedTraceRun(taskId, traceContext, options);
	}

	private async finalizeRunTracing(
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		options: MessageTraceFinalization,
	): Promise<void> {
		await this.traceService.finalizeRunTracing(runId, tracing, options);
	}

	private async finalizeBackgroundTaskTracing(
		task: ManagedBackgroundTask,
		status: 'completed' | 'failed' | 'cancelled',
	): Promise<void> {
		await this.traceService.finalizeBackgroundTaskTracing(task, status);
	}

	async submitLangsmithFeedback(
		user: User,
		threadId: string,
		responseId: string,
		payload: { rating: 'up' | 'down'; comment?: string },
	): Promise<void> {
		const anchor = await this.dbSnapshotStorage.findLangsmithAnchor(threadId, responseId);
		if (!anchor) {
			this.logger.debug('No LangSmith anchor for feedback; skipping annotation', {
				threadId,
				responseId,
			});
			return;
		}

		let tracingProxyConfig: ServiceProxyConfig | undefined;
		if (this.aiService.isProxyEnabled()) {
			try {
				const client = await this.aiService.getClient();
				const baseUrl = client.getApiProxyBaseUrl();
				const manager = new ProxyTokenManager(
					async () =>
						await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() }),
				);
				tracingProxyConfig = {
					apiUrl: baseUrl + '/langsmith',
					getAuthHeaders: async () => await manager.getAuthHeaders(),
				};
			} catch (error) {
				this.logger.warn('Failed to build LangSmith proxy config for feedback', {
					threadId,
					responseId,
					error: getErrorMessage(error),
				});
				return;
			}
		}

		const key = 'user_score';
		const feedbackId = uuidv5(`${key}:${responseId}`, INSTANCE_AI_FEEDBACK_NAMESPACE);

		try {
			await submitLangsmithUserFeedback({
				langsmithRunId: anchor.langsmithRunId,
				langsmithTraceId: anchor.langsmithTraceId,
				key,
				score: payload.rating === 'up' ? 1 : 0,
				value: payload.rating,
				comment: payload.comment,
				feedbackId,
				sourceInfo: {
					thread_id: threadId,
					response_id: responseId,
					user_id: user.id,
					rating: payload.rating,
				},
				proxyConfig: tracingProxyConfig,
			});
		} catch (error) {
			this.logger.warn('Failed to submit LangSmith feedback', {
				threadId,
				responseId,
				error: getErrorMessage(error),
			});
		}
	}

	startRun(
		user: User,
		threadId: string,
		message: string,
		researchMode?: boolean,
		attachments?: InstanceAiAttachment[],
		timeZone?: string,
		pushRef?: string,
	): string {
		this.liveness.clearThreadState(threadId);
		const { runId, abortController, messageGroupId } = this.runState.startRun({
			threadId,
			user,
			researchMode,
		});

		// Persist the user's time zone so checkpoint / replan / synthesize
		// follow-up runs can reinject it into the planner and system prompt
		// instead of falling back to GENERIC_TIMEZONE.
		if (timeZone) {
			this.runState.setTimeZone(threadId, timeZone);
		}

		if (pushRef !== undefined) {
			this.threadPushRef.set(threadId, pushRef);
		}

		void this.executeRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			attachments,
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
			this.backgroundTaskService.getTaskSnapshots(threadId),
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
		this.backgroundTaskService.cancelRun(threadId, reason);
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		return this.backgroundTaskService.sendCorrectionToTask(threadId, taskId, correction);
	}

	/** Cancel a single background task by ID. */
	cancelBackgroundTask(threadId: string, taskId: string): void {
		this.backgroundTaskService.cancelBackgroundTask(threadId, taskId);
	}

	/**
	 * Re-fetch the user from DB and verify they're still authorized to use
	 * AI Assistant. Used at async-boundary entry points (planned-task scheduling,
	 * suspended-run resume) where the spawn-time user snapshot may have gone
	 * stale. Returns null if the user no longer exists, has been disabled, or
	 * lost the `instanceAi:message` global scope.
	 */
	private async revalidateActiveUser(userId: string): Promise<User | null> {
		try {
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});
			if (!user || user.disabled) return null;
			if (!hasGlobalScope(user, 'instanceAi:message')) return null;
			return user;
		} catch (error) {
			this.logger.warn('Failed to revalidate user', {
				userId,
				error: getErrorMessage(error),
			});
			return null;
		}
	}

	/** Cancel all background tasks across all threads. Test-only. */
	cancelAllBackgroundTasks(): number {
		return this.backgroundTaskService.cancelAllBackgroundTasks();
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
		return await this.backgroundTaskService.startStuckBackgroundTaskForTest(user, threadId);
	}

	async runLivenessSweepForTest(now?: number): Promise<void> {
		await this.liveness.sweepTimedOutWork(now);
	}

	// ── Gateway lifecycle (delegated to LocalGatewayRegistry) ───────────────

	// ── Test-only trace replay API ───────────────────────────────────────────

	loadTraceEvents(slug: string, events: unknown[]): void {
		this.traceService.loadTraceEvents(slug, events);
	}

	getTraceEvents(slug: string): unknown[] {
		return this.traceService.getTraceEvents(slug);
	}

	activateTraceSlug(slug: string): void {
		this.traceService.activateTraceSlug(slug);
	}

	clearTraceEvents(slug: string): void {
		this.traceService.clearTraceEvents(slug);
	}

	getUserIdForApiKey(key: string): string | undefined {
		return this.gatewayRegistry.getUserIdForApiKey(key);
	}

	generatePairingToken(userId: string): string {
		return this.gatewayRegistry.generatePairingToken(userId);
	}

	getGatewayApiKeyExpiresAt(userId: string, key: string): Date | null {
		return this.gatewayRegistry.getApiKeyExpiresAt(userId, key);
	}

	getPairingToken(userId: string): string | null {
		return this.gatewayRegistry.getPairingToken(userId);
	}

	consumePairingToken(userId: string, token: string): string | null {
		return this.gatewayRegistry.consumePairingToken(userId, token);
	}

	getActiveSessionKey(userId: string): string | null {
		return this.gatewayRegistry.getActiveSessionKey(userId);
	}

	clearActiveSessionKey(userId: string): void {
		this.gatewayRegistry.clearActiveSessionKey(userId);
	}

	getLocalGateway(userId: string): LocalGateway {
		return this.gatewayRegistry.getGateway(userId);
	}

	initGateway(userId: string, data: InstanceAiGatewayCapabilities): void {
		this.gatewayRegistry.initGateway(userId, data);
		this.telemetry.track('User connected to Computer Use', {
			user_id: userId,
			tool_groups: data.toolCategories.filter((c) => c.enabled).map((c) => c.name),
		});
	}

	resolveGatewayRequest(
		userId: string,
		requestId: string,
		result?: McpToolCallResult,
		error?: string,
	): boolean {
		return this.gatewayRegistry.resolveGatewayRequest(userId, requestId, result, error);
	}

	disconnectGateway(userId: string): void {
		this.gatewayRegistry.disconnectGateway(userId);
	}

	/** Disconnect all connected gateways and return the user IDs that were connected. */
	disconnectAllGateways(): string[] {
		const connectedUserIds = this.gatewayRegistry.getConnectedUserIds();
		this.gatewayRegistry.disconnectAll();
		return connectedUserIds;
	}

	isLocalGatewayDisabled(): boolean {
		return this.settingsService.isLocalGatewayDisabled();
	}

	getGatewayStatus(userId: string): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: ToolCategory[];
	} {
		return this.gatewayRegistry.getGatewayStatus(userId);
	}

	startDisconnectTimer(userId: string, onDisconnect: () => void): void {
		this.gatewayRegistry.startDisconnectTimer(userId, onDisconnect);
	}

	clearDisconnectTimer(userId: string): void {
		this.gatewayRegistry.clearDisconnectTimer(userId);
	}

	/**
	 * Remove all in-memory state associated with a thread.
	 * Must be called when a thread is deleted so the maps don't leak.
	 */
	async clearThreadState(threadId: string): Promise<void> {
		// Clear run-state registry entries (active/suspended runs, confirmations,
		// user, research mode, and message-group mappings).
		const { active, suspended } = this.runState.clearThread(threadId);
		if (active) {
			active.abortController.abort();
			await this.finalizeRunTracing(active.runId, active.tracing, {
				status: 'cancelled',
				reason: 'thread_cleared',
			});
		}
		if (suspended) {
			suspended.abortController.abort();
			await this.finalizeRunTracing(suspended.runId, suspended.tracing, {
				status: 'cancelled',
				reason: 'thread_cleared',
			});
		}

		await this.backgroundTaskService.cancelThreadForCleanup(threadId);
		await this.finalizeRemainingMessageTraceRoots(threadId, {
			status: 'cancelled',
			reason: 'thread_cleared',
			metadata: { completion_source: 'service_cleanup' },
		});

		this.creditedThreads.delete(threadId);
		this.plannedTaskService.clearThread(threadId);
		this.checkpointService.clearThread(threadId);
		this.terminalOutcomeService.clearThread(threadId);
		this.liveness.clearThreadState(threadId);
		this.domainAccessTrackersByThread.delete(threadId);
		this.threadPushRef.delete(threadId);
		this.deleteTraceContextsForThread(threadId);
		await this.sandboxService.cleanupThread(threadId, 'thread_cleared');
		await this.reapAiTemporaryForThreadCleanup(threadId);
		this.eventBus.clearThread(threadId);
	}

	async shutdown(): Promise<void> {
		this.liveness.shutdown();

		const { activeRuns, suspendedRuns } = this.runState.shutdown();
		for (const run of activeRuns) {
			run.abortController.abort();
			await this.finalizeRunTracing(run.runId, run.tracing, {
				status: 'cancelled',
				reason: 'service_shutdown',
			});
		}
		for (const run of suspendedRuns) {
			run.abortController.abort();
			await this.finalizeRunTracing(run.runId, run.tracing, {
				status: 'cancelled',
				reason: 'service_shutdown',
			});
		}
		await this.backgroundTaskService.cancelAllForShutdown();
		const threadsWithTraces = this.traceService.getThreadIdsWithTraces();
		for (const threadId of threadsWithTraces) {
			await this.finalizeRemainingMessageTraceRoots(threadId, {
				status: 'cancelled',
				reason: 'service_shutdown',
				metadata: { completion_source: 'service_cleanup' },
			});
		}

		this.gatewayRegistry.disconnectAll();

		await this.sandboxService.cleanupAll('service_shutdown');

		this.domainAccessTrackersByThread.clear();
		this.traceService.clear();

		this.eventBus.clear();
		await this.mcpClientManager.disconnect();
		this.logger.debug('Instance AI service shut down');
	}

	private createMemoryConfig() {
		return {
			storage: this.compositeStore,
			embedderModel: this.instanceAiConfig.embedderModel || undefined,
			lastMessages: this.instanceAiConfig.lastMessages,
			semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
		};
	}

	private async ensureThreadExists(
		memory: ReturnType<typeof createMemory>,
		threadId: string,
		resourceId: string,
	): Promise<void> {
		const existingThread = await memory.getThreadById({ threadId });
		if (existingThread) return;

		const now = new Date();
		await memory.saveThread({
			thread: {
				id: threadId,
				resourceId,
				title: '',
				createdAt: now,
				updatedAt: now,
			},
		});
	}

	private evaluateTerminalResponse(
		threadId: string,
		runId: string,
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options: {
			messageGroupId?: string;
			correlationId?: string;
			workSummary?: WorkSummary;
			errorMessage?: string;
		} = {},
	): TerminalResponseDecision | undefined {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: ORCHESTRATOR_AGENT_ID,
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateTerminal(
			this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			status,
			{
				workSummary: options.workSummary,
				errorMessage: options.errorMessage,
			},
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	private evaluateWaitingResponse(
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options: { messageGroupId?: string; correlationId?: string } = {},
	): TerminalResponseDecision | undefined {
		const guard = new InstanceAiTerminalResponseGuard({
			runId,
			rootAgentId: ORCHESTRATOR_AGENT_ID,
			messageGroupId: options.messageGroupId,
			correlationId: options.correlationId,
		});
		const decision = guard.evaluateWaiting(
			this.getTerminalGuardEvents(threadId, runId, options.messageGroupId),
			confirmationEvent,
		);
		this.handleTerminalResponseDecision(threadId, runId, decision, options.messageGroupId);
		return decision;
	}

	private getTerminalGuardEvents(
		threadId: string,
		runId: string,
		messageGroupId?: string,
	): InstanceAiEvent[] {
		if (!messageGroupId) return this.eventBus.getEventsForRun(threadId, runId);

		const groupRunIds = this.getRunIdsForMessageGroup(messageGroupId);
		return groupRunIds.length > 0
			? this.eventBus.getEventsForRuns(threadId, groupRunIds)
			: this.eventBus.getEventsForRun(threadId, runId);
	}

	private handleTerminalResponseDecision(
		threadId: string,
		runId: string,
		decision: TerminalResponseDecision,
		messageGroupId?: string,
	): void {
		this.telemetry.track('instance_ai_terminal_response_decision', {
			thread_id: threadId,
			run_id: runId,
			message_group_id: messageGroupId,
			source: 'terminal_guard',
			status: decision.status,
			action: decision.action,
			reason: decision.reason,
			visibility_source: decision.visibilitySource,
		});

		if (decision.reason === 'completed-after-error') {
			this.logger.warn('completed_after_error_event', {
				threadId,
				runId,
				messageGroupId,
			});
		}

		if (decision.reason === 'confirmation-invalid') {
			this.logger.warn('invalid_confirmation_payload', {
				threadId,
				runId,
				messageGroupId,
			});
		}

		if (decision.action === 'emit' && decision.event) {
			this.eventBus.publish(threadId, decision.event);
		}
	}

	private async finishInvalidConfirmationRun(args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: DbSnapshotStorage;
		tracing?: InstanceAiTraceContext;
	}): Promise<MessageTraceFinalization> {
		this.runState.cancelThread(args.threadId);
		args.abortController.abort();
		await this.finalizeRunTracing(args.runId, args.tracing, {
			status: 'error',
			reason: 'invalid_confirmation_payload',
		});
		this.publishRunFinish(
			args.threadId,
			args.runId,
			'errored',
			'I need your input to continue, but I could not display the prompt. Please try again.',
		);
		await this.saveAgentTreeSnapshot(args.threadId, args.runId, args.snapshotStorage);
		return {
			status: 'error',
			reason: 'invalid_confirmation_payload',
			metadata: { completion_source: 'orchestrator' },
		};
	}

	async replayUndeliveredTerminalOutcomes(
		threadId: string,
		options: { delivery?: 'snapshot' | 'event' } = {},
	): Promise<void> {
		await this.terminalOutcomeService.replayUndeliveredTerminalOutcomes(threadId, options);
	}

	/**
	 * Drop any persisted planned-task graph that is still `awaiting_approval`,
	 * and clear the UI checklist. Called on run cancellation and HITL timeout so
	 * stale approval state doesn't linger. A graph in `active` / `awaiting_replan`
	 * is already in-flight and has its own settlement logic.
	 */
	private async cancelAwaitingApprovalPlan(threadId: string): Promise<void> {
		await this.plannedTaskService.cancelAwaitingApprovalPlan(threadId);
	}

	private async createExecutionEnvironment(
		user: User,
		threadId: string,
		runId: string,
		abortSignal: AbortSignal,
		researchMode?: boolean,
		messageGroupId?: string,
		pushRef?: string,
	) {
		return await this.runExecutionService.createExecutionEnvironment(
			user,
			threadId,
			runId,
			abortSignal,
			researchMode,
			messageGroupId,
			pushRef,
		);
	}

	/**
	 * Resolve the workflow IDs the checkpoint task is verifying so the runWorkflow
	 * permission override can be scoped. Walks the checkpoint's `dependsOn` to find
	 * the build-workflow tasks it depends on and reads their `outcome.workflowId`.
	 * Returns an empty set when the graph is missing or the checkpoint has no
	 * resolved workflow deps (in which case the override applies broadly via the
	 * `allowList === undefined` short-circuit only if we don't set the field).
	 */
	private async getCheckpointAllowedWorkflowIds(
		threadId: string,
		checkpointTaskId: string,
	): Promise<ReadonlySet<string>> {
		return await this.plannedTaskService.getCheckpointAllowedWorkflowIds(
			threadId,
			checkpointTaskId,
		);
	}

	private async handlePlannedTaskSettlement(
		user: User,
		task: ManagedBackgroundTask,
		status: 'succeeded' | 'failed' | 'cancelled',
	): Promise<void> {
		await this.plannedTaskService.handlePlannedTaskSettlement(user, task, status);
	}

	private async startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		researchMode: boolean | undefined,
		messageGroupId?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
	): Promise<string> {
		return await this.plannedTaskService.startInternalFollowUpRun(
			user,
			threadId,
			message,
			researchMode,
			messageGroupId,
			isReplanFollowUp,
			checkpoint,
		);
	}

	private async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		await this.plannedTaskService.schedulePlannedTasks(user, threadId);
	}

	private async executeRun(
		user: User,
		threadId: string,
		runId: string,
		message: string,
		abortController: AbortController,
		researchMode?: boolean,
		attachments?: InstanceAiAttachment[],
		messageGroupId?: string,
		timeZone?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
	): Promise<void> {
		await this.runExecutionService.executeRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			attachments,
			messageGroupId,
			timeZone,
			isReplanFollowUp,
			checkpoint,
		);
	}

	/**
	 * Post-run cleanup for a checkpoint follow-up. Ensures the checkpoint task is
	 * terminal (marking it failed if the orchestrator abandoned it) and re-ticks
	 * the scheduler so the next planned action can fire.
	 */
	private queuePendingCheckpointReentry(threadId: string, checkpointTaskId: string): void {
		this.checkpointService.queuePendingCheckpointReentry(threadId, checkpointTaskId);
	}

	/**
	 * Drain any checkpoint re-entries whose parent-tagged children settled while
	 * an orchestrator run was live (or while other siblings were still running).
	 * Called from the post-run cleanup path in every run-ending `finally` block,
	 * so the checkpoint is never left orphaned when the settlement path could
	 * not fire immediately.
	 */
	private async drainPendingCheckpointReentries(user: User, threadId: string): Promise<void> {
		await this.checkpointService.drainPendingCheckpointReentries(user, threadId);
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
		return await this.checkpointService.maybeReenterParentCheckpoint(user, threadId, task);
	}

	private async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
	): Promise<void> {
		await this.checkpointService.finalizeCheckpointFollowUp(user, threadId, checkpointTaskId);
	}

	async resolveConfirmation(
		requestingUserId: string,
		requestId: string,
		request: InstanceAiConfirmRequest,
	): Promise<boolean> {
		const data = toConfirmationData(request);

		// Revalidate the requesting user before resolving any confirmation. The
		// captured user snapshot may have gone stale since the run was started or
		// suspended; if the user has been disabled or lost the
		// `instanceAi:message` scope, both inline/sub-agent approvals and
		// suspended-run resumes must be denied.
		const revalidated = await this.revalidateActiveUser(requestingUserId);
		if (!revalidated) {
			this.logger.warn('Rejecting confirmation: user no longer authorized for AI Assistant', {
				userId: requestingUserId,
				requestId,
			});
			this.runState.rejectPendingConfirmation(requestId);
			const suspended = this.runState.findSuspendedByRequestId(requestId);
			if (suspended && suspended.user.id === requestingUserId) {
				this.cancelRun(suspended.threadId);
			}
			return false;
		}

		if (this.runState.resolvePendingConfirmation(requestingUserId, requestId, data)) {
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

		return await this.resumeSuspendedRun(requestingUserId, requestId, data);
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
			mastraRunId,
			threadId,
			user,
			toolCallId,
			abortController,
			tracing,
			checkpoint,
		} = suspended;
		if (user.id !== requestingUserId) return false;

		const revalidated = await this.revalidateActiveUser(user.id);
		if (!revalidated) {
			this.logger.warn('Cancelling suspended run: user no longer authorized for AI Assistant', {
				userId: user.id,
				threadId,
				requestId,
			});
			this.cancelRun(threadId);
			return false;
		}

		this.runState.activateSuspendedRun(threadId);

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
		};

		// Pass the freshly revalidated user forward so downstream permission
		// checks see current scopes, not the snapshot captured at suspend time.
		void this.processResumedStream(agent, resumeData, {
			runId,
			mastraRunId,
			threadId,
			user: revalidated,
			toolCallId,
			signal: abortController.signal,
			abortController,
			snapshotStorage: this.dbSnapshotStorage,
			tracing,
			checkpoint,
		});
		return true;
	}

	private async processResumedStream(
		agent: unknown,
		resumeData: Record<string, unknown>,
		opts: {
			runId: string;
			mastraRunId: string;
			threadId: string;
			user: User;
			toolCallId: string;
			signal: AbortSignal;
			abortController: AbortController;
			snapshotStorage: DbSnapshotStorage;
			tracing?: InstanceAiTraceContext;
			checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string };
		},
	): Promise<void> {
		await this.runExecutionService.processResumedStream(agent, resumeData, opts);
	}

	/**
	 * Archive any workflow the agent created for this thread that still carries
	 * the AI-builder temporary marker. The orchestrator clears the marker on the
	 * main deliverable before run-finish, so anything still marked is a
	 * stepping-stone — chunk, scratch, or sub-workflow the user never sees in
	 * the workflows list. Soft delete: a mistaken reap is recoverable from the
	 * archive view.
	 *
	 * Best-effort. Individual archive failures are logged but do not block
	 * the run-finish emit.
	 */
	private async reapAiTemporaryFromRun(
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
	): Promise<string[]> {
		return await this.cleanupService.reapAiTemporaryFromRun(threadId, user, createdWorkflowIds);
	}

	private async finalizeCancelledSuspendedRun(
		suspended: SuspendedRunState<User>,
		reason = 'user_cancelled',
	): Promise<void> {
		if (reason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
			this.liveness.publishRunTimeoutNotice(suspended.threadId, suspended.runId);
		}
		await this.finalizeRunTracing(suspended.runId, suspended.tracing, {
			status: 'cancelled',
			reason,
		});

		const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
			suspended.threadId,
			suspended.user,
			undefined,
		);
		this.publishRunFinish(
			suspended.threadId,
			suspended.runId,
			'cancelled',
			reason,
			archivedWorkflowIds,
		);

		// Persist the snapshot so the run-finish event (which clears
		// in-flight tool calls) is reflected in the stored tree.
		await this.saveAgentTreeSnapshot(
			suspended.threadId,
			suspended.runId,
			this.dbSnapshotStorage,
			true,
		);
		if (suspended.mastraRunId) {
			void this.cleanupMastraSnapshots(suspended.mastraRunId);
		}
		await this.maybeFinalizeRunTraceRoot(suspended.runId, {
			status: 'cancelled',
			reason,
			metadata: { completion_source: 'orchestrator' },
		});
	}

	private async reapAiTemporaryForThreadCleanup(threadId: string): Promise<void> {
		await this.cleanupService.reapAiTemporaryForThreadCleanup(threadId);
	}

	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
	): void {
		const effectiveStatus = status === 'errored' ? 'error' : status;
		const hasArchived = archivedWorkflowIds && archivedWorkflowIds.length > 0;
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload: {
				status: effectiveStatus,
				...(status === 'cancelled' ? { reason: reason ?? 'user_cancelled' } : {}),
				...(hasArchived ? { archivedWorkflowIds } : {}),
			},
		});
	}

	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		snapshotStorage: DbSnapshotStorage,
		options?: { userId?: string; modelId?: ModelConfig; archivedWorkflowIds?: string[] },
	): Promise<void> {
		this.publishRunFinish(threadId, runId, status, undefined, options?.archivedWorkflowIds);
		await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
		if (status === 'completed' && options?.userId && options?.modelId) {
			void this.refineTitleIfNeeded(threadId, options.userId, options.modelId);
		}
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
			const memory = createMemory(this.createMemoryConfig());
			const thread = await memory.getThreadById({ threadId });
			if (!thread?.title) return;

			// Skip if thread already has an LLM-refined title
			if (thread.metadata?.titleRefined) return;

			// Concat all recalled user messages so retries after a trivial first message
			// (e.g. "hey") have enough signal to produce a good title.
			const result = await memory.recall({ threadId, resourceId: userId, perPage: 5 });
			const userTexts = result.messages
				.filter((m) => m.role === 'user')
				.map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));
			if (userTexts.length === 0) return;
			const userText = userTexts.join('\n');

			const llmTitle = await generateTitleForRun(modelId, userText);
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
				agentId: ORCHESTRATOR_AGENT_ID,
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

	/**
	 * Remove Mastra workflow snapshots left behind after a run completes.
	 *
	 * Mastra's `executionWorkflow` and `agentic-loop` workflows only persist
	 * snapshots on suspension (`shouldPersistSnapshot` returns true only for
	 * status "suspended") and never clean them up on completion. This leaves
	 * orphaned "suspended" rows that accumulate over time.
	 */
	private async cleanupMastraSnapshots(mastraRunId: string): Promise<void> {
		await this.cleanupService.cleanupMastraSnapshots(mastraRunId);
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

			const tracing = this.traceService.getTraceContext(runId);
			const saveOptions = {
				messageGroupId,
				runIds: groupRunIds,
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
}
