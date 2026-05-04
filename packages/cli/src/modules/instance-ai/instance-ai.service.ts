import {
	UNLIMITED_CREDITS,
	applyBranchReadOnlyOverrides,
	buildProxyHeaders,
	type InstanceAiAttachment,
	type InstanceAiEvent,
	type InstanceAiThreadStatusResponse,
	type InstanceAiGatewayCapabilities,
	type McpToolCallResult,
	type ToolCategory,
	type TaskList,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ErrorReporter } from 'n8n-core';
import { Time } from '@n8n/constants';
import type { InstanceAiConfig } from '@n8n/config';
import { AiBuilderTemporaryWorkflowRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UrlService } from '@/services/url.service';
import {
	MAX_STEPS,
	createInstanceAgent,
	createAllTools,
	createMemory,
	createSandbox,
	createWorkspace,
	createInstanceAiTraceContext,
	McpClientManager,
	BuilderSandboxFactory,
	SnapshotManager,
	createDomainAccessTracker,
	BackgroundTaskManager,
	buildAgentTreeFromEvents,
	classifyAttachments,
	buildAttachmentManifest,
	isStructuredAttachment,
	enrichMessageWithBackgroundTasks,
	MastraTaskStorage,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	applyPlannedTaskPermissions,
	PLANNED_TASK_PERMISSION_OVERRIDES,
	releaseTraceClient,
	submitLangsmithUserFeedback,
	resumeAgentRun,
	RunStateRegistry,
	startBuildWorkflowAgentTask,
	startDataTableAgentTask,
	startDetachedDelegateTask,
	startResearchAgentTask,
	streamAgentRun,
	truncateToTitle,
	generateTitleForRun,
	patchThread,
	type ConfirmationData,
	type DomainAccessTracker,
	type ManagedBackgroundTask,
	type McpServerConfig,
	type ModelConfig,
	type OrchestrationContext,
	type InstanceAiTraceContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type SandboxConfig,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type ServiceProxyConfig,
	type StreamableAgent,
	type SuspendedRunState,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import type * as Undici from 'undici';
import { v5 as uuidv5 } from 'uuid';

import { N8N_VERSION } from '@/constants';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { AiService } from '@/services/ai.service';
import { Push } from '@/push';
import { Telemetry } from '@/telemetry';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { LocalGateway } from './filesystem';
import { LocalGatewayRegistry } from './filesystem';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';
import { TypeORMCompositeStore } from './storage/typeorm-composite-store';
import type { TypeORMWorkflowsStorage } from './storage/typeorm-workflows-storage';
import { DbSnapshotStorage } from './storage/db-snapshot-storage';
import { DbIterationLogStorage } from './storage/db-iteration-log-storage';
import { InstanceAiCompactionService } from './compaction.service';
import { ProxyTokenManager } from './proxy-token-manager';
import { InstanceAiThreadRepository } from './repositories/instance-ai-thread.repository';
import { TraceReplayState } from './trace-replay-state';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createInertAbortSignal(): AbortSignal {
	return new AbortController().signal;
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

interface MessageTraceFinalization {
	status: 'completed' | 'cancelled' | 'error';
	outputText?: string;
	reason?: string;
	modelId?: ModelConfig;
	outputs?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	error?: string;
}

@Service()
export class InstanceAiService {
	private readonly mcpClientManager = new McpClientManager();

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly runState = new RunStateRegistry<User>();

	private readonly backgroundTasks = new BackgroundTaskManager(
		MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD,
	);

	/** Trace contexts keyed by the n8n run ID that started the orchestration turn. */
	private readonly traceContextsByRunId = new Map<
		string,
		{
			threadId: string;
			messageGroupId?: string;
			tracing: InstanceAiTraceContext;
			traceSlug?: string;
		}
	>();
	/** Active sandboxes keyed by thread ID — persisted across messages within a conversation. */
	private readonly sandboxes = new Map<
		string,
		{
			sandbox: Awaited<ReturnType<typeof createSandbox>>;
			workspace: ReturnType<typeof createWorkspace>;
		}
	>();

	/** Per-user Local Gateway connections. Handles pairing tokens, session keys, and tool dispatch. */
	private readonly gatewayRegistry = new LocalGatewayRegistry();

	/** Domain-access trackers per thread — persists approvals across runs within a conversation. */
	private readonly domainAccessTrackersByThread = new Map<string, DomainAccessTracker>();

	/** Tracks the iframe pushRef per thread for live execution push events. */
	private readonly threadPushRef = new Map<string, string>();

	/** Per-thread promise chain that serializes schedulePlannedTasks calls. */
	private readonly schedulerLocks = new Map<string, Promise<void>>();

	/**
	 * Checkpoint re-entries that could not fire when their parent-tagged child
	 * settled (an orchestrator run was live, or other parent siblings were
	 * still running). Drained from the post-run cleanup path so the checkpoint
	 * is never left orphaned.
	 */
	private readonly pendingCheckpointReentries = new Map<string, Set<string>>();

	/** Periodic sweep that auto-rejects timed-out HITL confirmations. */
	private confirmationTimeoutInterval?: NodeJS.Timeout;

	/** In-memory guard to prevent double credit counting within the same process. */
	private readonly creditedThreads = new Set<string>();

	/** Test-only trace replay state (slugs, events, shared TraceIndex/IdRemapper). */
	private readonly traceReplay = new TraceReplayState();

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
	) {
		this.logger = logger.scoped('instance-ai');
		this.instanceAiConfig = globalConfig.instanceAi;
		this.defaultTimeZone = globalConfig.generic.timezone;
		const editorBaseUrl = globalConfig.editorBaseUrl || `http://localhost:${globalConfig.port}`;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${editorBaseUrl.replace(/\/$/, '')}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;

		this.startConfirmationTimeoutSweep();
	}

	private startConfirmationTimeoutSweep(): void {
		const timeoutMs = this.instanceAiConfig.confirmationTimeout;
		if (timeoutMs <= 0) return;

		this.confirmationTimeoutInterval = setInterval(() => {
			const { suspendedThreadIds, confirmationRequestIds } = this.runState.sweepTimedOut(timeoutMs);

			for (const threadId of suspendedThreadIds) {
				this.logger.debug('Auto-rejecting timed-out suspended run', { threadId });
				this.cancelRun(threadId);
			}

			for (const reqId of confirmationRequestIds) {
				this.logger.debug('Auto-rejecting timed-out sub-agent confirmation', {
					requestId: reqId,
				});
				this.runState.rejectPendingConfirmation(reqId);
			}
		}, Time.minutes.toMilliseconds);
	}

	private getSandboxConfigFromEnv(): SandboxConfig {
		const {
			sandboxEnabled,
			sandboxProvider,
			daytonaApiUrl,
			daytonaApiKey,
			n8nSandboxServiceUrl,
			n8nSandboxServiceApiKey,
			sandboxImage,
			sandboxTimeout,
		} = this.instanceAiConfig;
		if (!sandboxEnabled) {
			return {
				enabled: false,
				provider:
					sandboxProvider === 'n8n-sandbox'
						? 'n8n-sandbox'
						: sandboxProvider === 'daytona'
							? 'daytona'
							: 'local',
				timeout: sandboxTimeout,
			};
		}

		if (sandboxProvider === 'daytona') {
			return {
				enabled: true,
				provider: 'daytona',
				daytonaApiUrl: daytonaApiUrl || undefined,
				daytonaApiKey: daytonaApiKey || undefined,
				image: sandboxImage || undefined,
				n8nVersion: N8N_VERSION || undefined,
				timeout: sandboxTimeout,
			};
		}

		if (sandboxProvider === 'n8n-sandbox') {
			return {
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: n8nSandboxServiceUrl || undefined,
				apiKey: n8nSandboxServiceApiKey || undefined,
				timeout: sandboxTimeout,
			};
		}

		return {
			enabled: true,
			provider: 'local',
			timeout: sandboxTimeout,
		};
	}

	private async resolveSandboxConfig(user: User): Promise<SandboxConfig> {
		const base = this.getSandboxConfigFromEnv();
		if (!base.enabled) return base;
		if (base.provider === 'daytona') {
			// If AI assistant service is available, route Daytona calls through its sandbox proxy
			if (this.aiService.isProxyEnabled()) {
				const client = await this.aiService.getClient();
				const proxyConfig = await client.getSandboxProxyConfig();
				return {
					...base,
					daytonaApiUrl: client.getSandboxProxyBaseUrl(),
					image: proxyConfig.image,
					getAuthToken: async () => {
						const token = await client.getBuilderApiProxyToken(
							{ id: user.id },
							{ userMessageId: nanoid() },
						);

						return token.accessToken;
					},
				};
			}

			// Direct mode: Daytona credentials from env vars or admin credential
			const daytona = await this.settingsService.resolveDaytonaConfig(user);
			return {
				...base,
				daytonaApiUrl: daytona.apiUrl ?? base.daytonaApiUrl,
				daytonaApiKey: daytona.apiKey ?? base.daytonaApiKey,
			};
		}
		if (base.provider === 'n8n-sandbox') {
			const sandbox = await this.settingsService.resolveN8nSandboxConfig(user);
			return {
				...base,
				serviceUrl: sandbox.serviceUrl ?? base.serviceUrl,
				apiKey: sandbox.apiKey ?? base.apiKey,
			};
		}
		return base;
	}

	private async createBuilderFactory(user: User): Promise<BuilderSandboxFactory | undefined> {
		const config = await this.resolveSandboxConfig(user);
		if (!config.enabled) return undefined;

		if (config.provider === 'daytona') {
			return new BuilderSandboxFactory(
				config,
				new SnapshotManager(config.image, this.logger, config.n8nVersion, this.errorReporter),
				this.logger,
				this.errorReporter,
			);
		}

		return new BuilderSandboxFactory(config, undefined, this.logger);
	}

	/** Get or create a sandbox + workspace for a thread. Returns undefined when sandbox is disabled. */
	private async getOrCreateWorkspace(threadId: string, user: User) {
		const existing = this.sandboxes.get(threadId);
		if (existing) return existing;

		const config = await this.resolveSandboxConfig(user);
		if (!config.enabled) return undefined;

		const sandbox = await createSandbox(config);
		const workspace = createWorkspace(sandbox);
		if (!sandbox || !workspace) return undefined;

		const entry = { sandbox, workspace };
		this.sandboxes.set(threadId, entry);
		return entry;
	}

	/** Destroy and remove the sandbox for a thread. */
	private async destroySandbox(threadId: string): Promise<void> {
		const entry = this.sandboxes.get(threadId);
		if (!entry?.sandbox) return;

		this.sandboxes.delete(threadId);
		try {
			if ('destroy' in entry.sandbox && typeof entry.sandbox.destroy === 'function') {
				await (entry.sandbox.destroy as () => Promise<void>)();
			}
		} catch (error) {
			this.logger.warn('Failed to destroy sandbox', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Fetch a fresh proxy auth token and return the client + Authorization headers.
	 * Each caller gets a unique token (separate nanoid) for audit tracking.
	 */
	private async getProxyAuth(user: User) {
		const client = await this.aiService.getClient();
		const token = await client.getBuilderApiProxyToken(
			{ id: user.id },
			{ userMessageId: nanoid() },
		);
		return {
			client,
			headers: { Authorization: `${token.tokenType} ${token.accessToken}` },
		};
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
		return this.runState.getThreadStatus(threadId, this.backgroundTasks.getTaskSnapshots(threadId));
	}

	private storeTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
		this.traceContextsByRunId.set(runId, {
			threadId,
			messageGroupId,
			tracing,
			traceSlug: this.traceReplay.getActiveSlug(),
		});
	}

	private getTraceContext(runId: string): InstanceAiTraceContext | undefined {
		return this.traceContextsByRunId.get(runId)?.tracing;
	}

	private async configureTraceReplayMode(tracing: InstanceAiTraceContext): Promise<void> {
		await this.traceReplay.configureReplayMode(tracing);
	}

	private async finalizeMessageTraceRoot(
		runId: string,
		tracing: InstanceAiTraceContext,
		options: MessageTraceFinalization,
	): Promise<void> {
		if (tracing.rootRun.endTime) return;

		const outputs = options.outputs ?? {
			status: options.status,
			runId,
			...(options.outputText ? { response: options.outputText } : {}),
			...(options.reason ? { reason: options.reason } : {}),
		};
		const metadata = {
			final_status: options.status,
			...(options.modelId !== undefined ? { model_id: options.modelId } : {}),
			...options.metadata,
		};

		try {
			await tracing.finishRun(tracing.rootRun, {
				outputs,
				metadata,
				...(options.error
					? { error: options.error }
					: options.status === 'error' && options.reason
						? { error: options.reason }
						: {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI message trace root', {
				runId,
				threadId: tracing.rootRun.metadata?.thread_id,
				error: getErrorMessage(error),
			});
		} finally {
			releaseTraceClient(tracing.rootRun.traceId);
		}
	}

	private async maybeFinalizeRunTraceRoot(
		runId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		const tracing = this.getTraceContext(runId);
		if (!tracing) return;
		await this.finalizeMessageTraceRoot(runId, tracing, options);
	}

	private async finalizeRemainingMessageTraceRoots(
		threadId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		const finalizedMessageRuns = new Set<string>();

		for (const [runId, entry] of this.traceContextsByRunId) {
			if (entry.threadId !== threadId) continue;
			if (finalizedMessageRuns.has(entry.tracing.rootRun.id)) continue;

			finalizedMessageRuns.add(entry.tracing.rootRun.id);
			await this.finalizeMessageTraceRoot(runId, entry.tracing, options);
		}
	}

	private deleteTraceContextsForThread(threadId: string): void {
		for (const [runId, entry] of this.traceContextsByRunId) {
			if (entry.threadId === threadId) {
				releaseTraceClient(entry.tracing.rootRun.traceId);
				// Preserve recorded trace events in the slug-scoped store
				// so the test fixture teardown can still retrieve them via GET.
				if (entry.tracing.traceWriter && entry.traceSlug) {
					this.traceReplay.preserveWriterEvents(
						entry.traceSlug,
						entry.tracing.traceWriter.getEvents(),
					);
				}
				this.traceContextsByRunId.delete(runId);
			}
		}
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
		if (!traceContext) return;

		try {
			await traceContext.finishRun(traceContext.rootRun, {
				outputs: {
					status: options.status,
					...options.outputs,
				},
				metadata: {
					final_status: options.status,
					...options.metadata,
				},
				...(options.error ? { error: options.error } : {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI detached trace run', {
				taskId,
				traceRunId: traceContext.rootRun.id,
				error: getErrorMessage(error),
			});
		} finally {
			releaseTraceClient(traceContext.rootRun.traceId);
		}
	}

	private async finalizeRunTracing(
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		options: MessageTraceFinalization,
	): Promise<void> {
		if (!tracing) return;

		const outputs = {
			status: options.status,
			runId,
			...(options.outputText ? { response: options.outputText } : {}),
			...(options.reason ? { reason: options.reason } : {}),
		};

		const metadata = {
			final_status: options.status,
			...(options.modelId !== undefined ? { model_id: options.modelId } : {}),
		};

		try {
			await tracing.finishRun(tracing.actorRun, {
				outputs,
				metadata,
				...(options.status === 'error' && options.reason ? { error: options.reason } : {}),
			});
		} catch (error) {
			this.logger.warn('Failed to finalize Instance AI run tracing', {
				runId,
				threadId: tracing.actorRun.metadata?.thread_id,
				error: getErrorMessage(error),
			});
		}
	}

	private async finalizeBackgroundTaskTracing(
		task: ManagedBackgroundTask,
		status: 'completed' | 'failed' | 'cancelled',
	): Promise<void> {
		await this.finalizeDetachedTraceRun(task.taskId, task.traceContext, {
			status,
			outputs: {
				taskId: task.taskId,
				agentId: task.agentId,
				role: task.role,
				...(task.result ? { result: task.result } : {}),
			},
			...(status === 'failed' && task.error ? { error: task.error } : {}),
			metadata: {
				...(task.plannedTaskId ? { planned_task_id: task.plannedTaskId } : {}),
				...(task.workItemId ? { work_item_id: task.workItemId } : {}),
			},
		});
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

	cancelRun(threadId: string): void {
		const cancelledTasks = this.backgroundTasks.cancelThread(threadId);
		const user = this.runState.getThreadUser(threadId);
		for (const task of cancelledTasks) {
			void this.finalizeBackgroundTaskTracing(task, 'cancelled');
			this.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId: task.runId,
				agentId: task.agentId,
				payload: { role: task.role, result: '', error: 'Cancelled by user' },
			});
			void this.saveAgentTreeSnapshot(
				threadId,
				task.runId,
				this.dbSnapshotStorage,
				true,
				task.messageGroupId,
			);
			if (user) {
				void this.handlePlannedTaskSettlement(user, task, 'cancelled');
			}
		}

		// Clean up any awaiting_approval plan graph for this thread. The user
		// cancelled before approving, so leaving the graph persisted would (a)
		// cause doSchedulePlannedTasks() to republish the stale checklist on
		// every later pass via syncPlannedTasksToUi(), and (b) incorrectly let a
		// future unrelated create-tasks call bypass the replan-only guard via
		// threadHasExistingPlan(). Only target awaiting_approval — active and
		// awaiting_replan graphs have their own settlement logic via the
		// background-task cancellations above.
		void this.cancelAwaitingApprovalPlan(threadId);

		const { active, suspended } = this.runState.cancelThread(threadId);
		if (active) {
			active.abortController.abort();
			return;
		}

		if (suspended) {
			suspended.abortController.abort();
			void this.finalizeCancelledSuspendedRun(suspended);
		}
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

		void this.finalizeBackgroundTaskTracing(task, 'cancelled');
		this.eventBus.publish(threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		// Persist the updated agent tree so cancelled status survives page reload.
		// The onSettled callback in executeTask is skipped for aborted tasks,
		// so we must save the snapshot explicitly here.
		void this.saveAgentTreeSnapshot(
			threadId,
			task.runId,
			this.dbSnapshotStorage,
			true,
			task.messageGroupId,
		);

		const user = this.runState.getThreadUser(threadId);
		if (user) {
			void this.handlePlannedTaskSettlement(user, task, 'cancelled');
		}
	}

	/** Cancel all background tasks across all threads. Test-only. */
	cancelAllBackgroundTasks(): number {
		const cancelled = this.backgroundTasks.cancelAll();
		for (const task of cancelled) {
			void this.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		return cancelled.length;
	}

	// ── Gateway lifecycle (delegated to LocalGatewayRegistry) ───────────────

	// ── Test-only trace replay API ───────────────────────────────────────────

	loadTraceEvents(slug: string, events: unknown[]): void {
		this.traceReplay.loadEvents(slug, events);
	}

	getTraceEvents(slug: string): unknown[] {
		return this.traceReplay.getEventsWithWriterFallback(slug, this.traceContextsByRunId.values());
	}

	activateTraceSlug(slug: string): void {
		this.traceReplay.activateSlug(slug);
	}

	clearTraceEvents(slug: string): void {
		this.traceReplay.clearEvents(slug);
	}

	getUserIdForApiKey(key: string): string | undefined {
		return this.gatewayRegistry.getUserIdForApiKey(key);
	}

	generatePairingToken(userId: string): string {
		return this.gatewayRegistry.generatePairingToken(userId);
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

		// Cancel background tasks belonging to this thread
		for (const task of this.backgroundTasks.cancelThread(threadId)) {
			task.abortController.abort();
			await this.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		await this.finalizeRemainingMessageTraceRoots(threadId, {
			status: 'cancelled',
			reason: 'thread_cleared',
			metadata: { completion_source: 'service_cleanup' },
		});

		this.creditedThreads.delete(threadId);
		this.schedulerLocks.delete(threadId);
		this.domainAccessTrackersByThread.delete(threadId);
		this.threadPushRef.delete(threadId);
		this.deleteTraceContextsForThread(threadId);
		await this.destroySandbox(threadId);
		await this.reapAiTemporaryForThreadCleanup(threadId);
		this.eventBus.clearThread(threadId);
	}

	async shutdown(): Promise<void> {
		if (this.confirmationTimeoutInterval) {
			clearInterval(this.confirmationTimeoutInterval);
			this.confirmationTimeoutInterval = undefined;
		}

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
		for (const task of this.backgroundTasks.cancelAll()) {
			task.abortController.abort();
			await this.finalizeBackgroundTaskTracing(task, 'cancelled');
		}
		const threadsWithTraces = new Set(
			[...this.traceContextsByRunId.values()].map((entry) => entry.threadId),
		);
		for (const threadId of threadsWithTraces) {
			await this.finalizeRemainingMessageTraceRoots(threadId, {
				status: 'cancelled',
				reason: 'service_shutdown',
				metadata: { completion_source: 'service_cleanup' },
			});
		}

		this.gatewayRegistry.disconnectAll();

		// Destroy all active sandboxes
		const sandboxCleanups = [...this.sandboxes.keys()].map(
			async (threadId) => await this.destroySandbox(threadId),
		);
		await Promise.allSettled(sandboxCleanups);

		this.domainAccessTrackersByThread.clear();
		this.traceContextsByRunId.clear();

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

	private projectPlannedTaskList(graph: PlannedTaskGraph): TaskList {
		return {
			tasks: graph.tasks.map((task) => ({
				id: task.id,
				description: task.title,
				status:
					task.status === 'planned'
						? 'todo'
						: task.status === 'running'
							? 'in_progress'
							: task.status === 'succeeded'
								? 'done'
								: task.status,
			})),
		};
	}

	private buildPlannedTaskFollowUpMessage(
		type: 'synthesize' | 'replan' | 'checkpoint',
		graph: PlannedTaskGraph,
		options: { failedTask?: PlannedTaskRecord; checkpoint?: PlannedTaskRecord } = {},
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

		return `<planned-task-follow-up type="${type}">\n${JSON.stringify(payload, null, 2)}\n</planned-task-follow-up>\n\n${AUTO_FOLLOW_UP_MESSAGE}`;
	}

	private async createPlannedTaskState() {
		const memory = createMemory(this.createMemoryConfig());
		const taskStorage = new MastraTaskStorage(memory);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);
		return { memory, taskStorage, plannedTaskService };
	}

	private async syncPlannedTasksToUi(threadId: string, graph: PlannedTaskGraph): Promise<void> {
		const { taskStorage } = await this.createPlannedTaskState();
		const tasks = this.projectPlannedTaskList(graph);
		await taskStorage.save(threadId, tasks);
		this.eventBus.publish(threadId, {
			type: 'tasks-update',
			runId: graph.planRunId,
			agentId: ORCHESTRATOR_AGENT_ID,
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
				agentId: ORCHESTRATOR_AGENT_ID,
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
		researchMode?: boolean,
		messageGroupId?: string,
		pushRef?: string,
	) {
		const localGatewayDisabled = await this.settingsService.isLocalGatewayDisabledForUser(user.id);
		const userGateway = this.gatewayRegistry.findGateway(user.id);

		// When the proxy is enabled, create a single ProxyTokenManager and
		// AiAssistantClient that are shared across model, search, and tracing
		// configs.  The token manager caches the JWT and refreshes it
		// transparently before it expires.
		let searchProxyConfig: ServiceProxyConfig | undefined;
		let tracingProxyConfig: ServiceProxyConfig | undefined;
		let tokenManager: ProxyTokenManager | undefined;
		let proxyBaseUrl: string | undefined;
		if (this.aiService.isProxyEnabled()) {
			const client = await this.aiService.getClient();
			proxyBaseUrl = client.getApiProxyBaseUrl();
			const manager = new ProxyTokenManager(async () => {
				return await client.getBuilderApiProxyToken({ id: user.id }, { userMessageId: nanoid() });
			});
			tokenManager = manager;
			const featureHeaders = buildProxyHeaders({
				feature: 'instance-ai',
				n8nVersion: N8N_VERSION,
			});
			searchProxyConfig = {
				apiUrl: proxyBaseUrl + '/brave-search',
				getAuthHeaders: async () => ({
					...(await manager.getAuthHeaders()),
					...featureHeaders,
				}),
			};
			tracingProxyConfig = {
				apiUrl: proxyBaseUrl + '/langsmith',
				getAuthHeaders: async () => ({
					...(await manager.getAuthHeaders()),
					...featureHeaders,
				}),
			};
		}

		const context = this.adapterService.createContext(user, {
			searchProxyConfig,
			pushRef,
			threadId,
		});
		if (!localGatewayDisabled && userGateway?.isConnected) {
			context.localMcpServer = userGateway;
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

		// Compute gateway status for the system prompt
		if (localGatewayDisabled) {
			context.localGatewayStatus = { status: 'disabled' };
		} else if (userGateway?.isConnected) {
			context.localGatewayStatus = { status: 'connected' };
		} else {
			context.localGatewayStatus = {
				status: 'disconnected',
				capabilities: ['filesystem', 'browser'],
			};
		}

		const modelId =
			proxyBaseUrl && tokenManager
				? await this.resolveProxyModel(user, proxyBaseUrl, tokenManager)
				: await this.resolveAgentModelConfig(user);
		const memory = createMemory(this.createMemoryConfig());
		await this.ensureThreadExists(memory, threadId, user.id);

		const taskStorage = new MastraTaskStorage(memory);
		const iterationLog = this.dbIterationLogStorage;
		const snapshotStorage = this.dbSnapshotStorage;
		const workflowLoopStorage = new WorkflowLoopStorage(memory);
		const workflowTasks = new WorkflowTaskCoordinator(threadId, workflowLoopStorage);
		const plannedTaskStorage = new PlannedTaskStorage(memory);
		const plannedTaskService = new PlannedTaskCoordinator(plannedTaskStorage);

		const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
		if (nodeDefDirs.length > 0) {
			setSchemaBaseDirs(nodeDefDirs);
		}

		const domainTools = createAllTools(context);
		const sandboxEntry = await this.getOrCreateWorkspace(threadId, user);

		const orchestrationContext: OrchestrationContext = {
			threadId,
			runId,
			messageGroupId,
			userId: user.id,
			orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
			modelId,
			storage: this.compositeStore,
			subAgentMaxSteps: this.instanceAiConfig.subAgentMaxSteps,
			eventBus: this.eventBus,
			logger: this.logger,
			domainTools,
			abortSignal,
			taskStorage,
			researchMode,
			timeZone: this.defaultTimeZone,
			browserMcpConfig: this.instanceAiConfig.browserMcp
				? { name: 'chrome-devtools', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'] }
				: undefined,
			localMcpServer: context.localMcpServer,
			oauth2CallbackUrl: this.oauth2CallbackUrl,
			webhookBaseUrl: this.webhookBaseUrl,
			waitForConfirmation: async (requestId: string) => {
				return await new Promise<ConfirmationData>((resolve) => {
					this.runState.registerPendingConfirmation(requestId, {
						resolve,
						threadId,
						userId: user.id,
						createdAt: Date.now(),
					});

					// Inline HITL (planner questions / plan approval / sub-agent asks)
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
			plannedTaskService,
			schedulePlannedTasks: async () => await this.schedulePlannedTasks(user, threadId),
			iterationLog,
			sendCorrectionToTask: (taskId, correction) =>
				this.sendCorrectionToTask(threadId, taskId, correction),
			workflowTaskService: workflowTasks,
			workspace: sandboxEntry?.workspace,
			builderSandboxFactory: await this.createBuilderFactory(user),
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
			sandboxEntry,
		};
	}

	private async dispatchPlannedTask(
		task: PlannedTaskRecord,
		context: OrchestrationContext,
	): Promise<void> {
		// Plan approval authorizes the task-family's non-destructive tools,
		// so the sub-agent can execute without a redundant second confirmation.
		const taskContext = this.createPlannedTaskContext(task.kind, context);

		let started: { taskId: string; agentId: string; result: string } | null = null;

		switch (task.kind) {
			case 'build-workflow':
				started = await startBuildWorkflowAgentTask(taskContext, {
					task: task.spec,
					workflowId: task.workflowId,
					plannedTaskId: task.id,
				});
				break;
			case 'manage-data-tables':
				started = await startDataTableAgentTask(taskContext, {
					task: task.spec,
					plannedTaskId: task.id,
				});
				break;
			case 'research':
				started = await startResearchAgentTask(taskContext, {
					goal: task.title,
					constraints: task.spec,
					plannedTaskId: task.id,
				});
				break;
			case 'delegate':
				started = await startDetachedDelegateTask(taskContext, {
					title: task.title,
					spec: task.spec,
					tools: task.tools ?? [],
					plannedTaskId: task.id,
				});
				break;
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
		try {
			const { plannedTaskService } = await this.createPlannedTaskState();
			const graph = await plannedTaskService.getGraph(threadId);
			const checkpoint = graph?.tasks.find((t) => t.id === checkpointTaskId);
			if (!graph || !checkpoint) return new Set();
			const deps = new Set(checkpoint.deps);
			const allowed = new Set<string>();
			for (const task of graph.tasks) {
				if (!deps.has(task.id)) continue;
				const workflowId = task.outcome?.workflowId;
				if (typeof workflowId === 'string' && workflowId.length > 0) {
					allowed.add(workflowId);
				}
			}
			return allowed;
		} catch (error) {
			this.logger.warn('Failed to resolve checkpoint allowed workflow IDs', {
				threadId,
				checkpointTaskId,
				error: error instanceof Error ? error.message : String(error),
			});
			return new Set();
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

	private async startInternalFollowUpRun(
		user: User,
		threadId: string,
		message: string,
		researchMode: boolean | undefined,
		messageGroupId?: string,
		isReplanFollowUp: boolean = false,
		checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
	): Promise<string> {
		if (this.runState.hasLiveRun(threadId)) {
			this.logger.warn('Skipping internal follow-up: active run exists', { threadId });
			return '';
		}

		const { runId, abortController } = this.runState.startRun({
			threadId,
			user,
			researchMode,
			messageGroupId,
		});

		// Resolve user time zone from the thread's run-state snapshot (captured on the
		// initial user-facing run) before falling back to the instance default. Follow-up
		// runs (checkpoint / replan / synthesize) used to drop this context, which made
		// the planner emit "instance default timezone" for user-local schedules.
		const timeZone = this.runState.getTimeZone(threadId) ?? this.defaultTimeZone;

		void this.executeRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			undefined,
			messageGroupId,
			timeZone,
			isReplanFollowUp,
			checkpoint,
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

	private async doSchedulePlannedTasks(user: User, threadId: string): Promise<void> {
		const { plannedTaskService } = await this.createPlannedTaskState();
		const graph = await plannedTaskService.getGraph(threadId);
		if (!graph) return;

		await this.syncPlannedTasksToUi(threadId, graph);

		const availableSlots = Math.max(
			0,
			MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD -
				this.backgroundTasks.getRunningTasks(threadId).length,
		);
		const action = await plannedTaskService.tick(threadId, { availableSlots });
		if (action.type === 'none') return;

		if (action.type === 'replan') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('replan', action.graph, {
					failedTask: action.failedTask,
				}),
				this.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
				true,
			);
			// tick() already transitioned the graph to `awaiting_replan`. If the
			// follow-up run couldn't start (live run present), revert the status
			// so the next schedulePlannedTasks() pass can re-emit this action.
			// Without this, tick() returns `none` for non-active graphs and the
			// replan is silently lost.
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'synthesize') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('synthesize', action.graph),
				this.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
			);
			// Same rollback as replan: tick() transitioned to `completed`, but if
			// the synthesize follow-up didn't actually start, revert so the next
			// tick can emit it again.
			if (!startedRunId) {
				await plannedTaskService.revertToActive(threadId);
			}
			return;
		}

		if (action.type === 'orchestrate-checkpoint') {
			// Defer if a run is already active or suspended. The currently-live
			// run's post-finally reschedule hook will pick this checkpoint up.
			if (this.runState.hasLiveRun(threadId)) {
				return;
			}

			const checkpoint = action.tasks[0];

			// Mark running before starting the follow-up so complete-checkpoint
			// (which requires status === 'running') always sees the correct state.
			// If startInternalFollowUpRun no-ops below (tight race), we roll back
			// the transition to avoid leaving the task in a phantom 'running' state.
			await plannedTaskService.markRunning(threadId, checkpoint.id, {
				agentId: ORCHESTRATOR_AGENT_ID,
			});
			const graphAfterMark = (await plannedTaskService.getGraph(threadId)) ?? action.graph;
			await this.syncPlannedTasksToUi(threadId, graphAfterMark);

			const checkpointRecord =
				graphAfterMark.tasks.find((t) => t.id === checkpoint.id) ?? checkpoint;

			const startedRunId = await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('checkpoint', graphAfterMark, {
					checkpoint: checkpointRecord,
				}),
				this.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: checkpoint.id },
			);

			if (!startedRunId) {
				// Rare race: the outer hasLiveRun check passed but the inner guard
				// in startInternalFollowUpRun did not (another path started a run
				// between our two checks). Revert the checkpoint back to `planned`
				// so the next scheduler tick re-emits `orchestrate-checkpoint` —
				// marking it `failed` here would cascade cancel to every dependent
				// and destroy downstream work even though nothing actually failed.
				this.logger.warn(
					'Checkpoint follow-up run did not start — reverting checkpoint to planned for retry',
					{ threadId, checkpointTaskId: checkpoint.id },
				);
				await plannedTaskService.revertCheckpointToPlanned(threadId, checkpoint.id);
			}
			return;
		}

		const environment = await this.createExecutionEnvironment(
			user,
			threadId,
			action.graph.planRunId,
			createInertAbortSignal(),
			this.runState.getThreadResearchMode(threadId),
			action.graph.messageGroupId,
		);
		environment.orchestrationContext.tracing = this.getTraceContext(action.graph.planRunId);

		for (const task of action.tasks) {
			await this.dispatchPlannedTask(task, environment.orchestrationContext);
		}

		await this.doSchedulePlannedTasks(user, threadId);
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
		const signal = abortController.signal;
		let mastraRunId = '';
		let tracing: InstanceAiTraceContext | undefined;
		let messageTraceFinalization: MessageTraceFinalization | undefined;
		let aiCreatedWorkflowIds: Set<string> | undefined;

		try {
			const messageId = nanoid();

			// Publish run-start (includes userId for audit trail attribution)
			this.eventBus.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				userId: user.id,
				payload: { messageId, messageGroupId },
			});

			// Check if already cancelled before starting agent work
			if (signal.aborted) {
				this.eventBus.publish(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				return;
			}

			const mcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);

			const executionPushRef = this.threadPushRef.get(threadId);
			const { context, memory, taskStorage, snapshotStorage, modelId, orchestrationContext } =
				await this.createExecutionEnvironment(
					user,
					threadId,
					runId,
					signal,
					researchMode,
					messageGroupId,
					executionPushRef,
				);
			aiCreatedWorkflowIds = context.aiCreatedWorkflowIds ??= new Set<string>();
			// Make the current user message available to sub-agents (e.g. planner)
			// since memory.recall() only returns previously-saved messages.
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
				context.allowedRunWorkflowIds = await this.getCheckpointAllowedWorkflowIds(
					threadId,
					checkpoint.checkpointTaskId,
				);
			}

			// Thread attachments into the domain context so parse-file can access them
			if (attachments && attachments.length > 0) {
				context.currentUserAttachments = attachments;
			}
			const memoryConfig = this.createMemoryConfig();
			const traceInput = {
				message,
				...(attachments?.length
					? {
							attachments: attachments.map((attachment) => ({
								mimeType: attachment.mimeType,
								size: attachment.data.length,
							})),
						}
					: {}),
				...(researchMode !== undefined ? { researchMode } : {}),
				...(messageGroupId ? { messageGroupId } : {}),
			};
			tracing = await createInstanceAiTraceContext({
				threadId,
				messageId,
				messageGroupId,
				runId,
				userId: user.id,
				modelId,
				input: traceInput,
				proxyConfig: orchestrationContext.tracingProxyConfig,
			});

			// When trace replay is enabled but LangSmith isn't configured,
			// create a minimal context that only supports replay/record wrapping.
			if (!tracing && process.env.E2E_TESTS === 'true') {
				const { createTraceReplayOnlyContext } = await import('@n8n/instance-ai');
				tracing = createTraceReplayOnlyContext();
			}

			if (tracing) {
				await this.configureTraceReplayMode(tracing);
				orchestrationContext.tracing = tracing;
				this.runState.attachTracing(threadId, tracing);
				this.storeTraceContext(runId, threadId, tracing, messageGroupId);
			}

			// Set heuristic title before agent starts — thread always has a title
			const thread = await memory.getThreadById({ threadId });
			if (thread && !thread.title) {
				await patchThread(memory, {
					threadId,
					update: () => ({ title: truncateToTitle(message) }),
				});
			}

			const existingTasks = await taskStorage.get(threadId);
			if (existingTasks) {
				this.eventBus.publish(threadId, {
					type: 'tasks-update',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { tasks: existingTasks },
				});
			}

			const agent = await createInstanceAgent({
				modelId,
				context,
				orchestrationContext,
				mcpServers,
				memoryConfig,
				memory,
				disableDeferredTools: true,
				timeZone: timeZone ?? this.defaultTimeZone,
			});

			// Compact older conversation history into a summary (best-effort, non-blocking on failure)
			this.eventBus.publish(threadId, {
				type: 'status',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { message: 'Recalling conversation...' },
			});
			const contextCompactionRun = tracing
				? await tracing.startChildRun(tracing.actorRun, {
						name: 'context_compaction',
						tags: ['context'],
						metadata: { agent_role: 'context_compaction' },
						inputs: {
							threadId,
							lastMessages: this.instanceAiConfig.lastMessages ?? 20,
						},
					})
				: undefined;
			let conversationSummary: string | null | undefined;
			try {
				conversationSummary = await this.compactionService.prepareCompactedContext(
					threadId,
					memory,
					modelId,
					this.instanceAiConfig.lastMessages ?? 20,
				);
				if (contextCompactionRun && tracing) {
					await tracing.finishRun(contextCompactionRun, {
						outputs: {
							summarized: Boolean(conversationSummary),
							summary: conversationSummary ?? '',
						},
						metadata: { final_status: 'completed' },
					});
				}
			} catch (error) {
				if (contextCompactionRun && tracing) {
					await tracing.failRun(contextCompactionRun, error, {
						final_status: 'error',
					});
				}
				throw error;
			}
			this.eventBus.publish(threadId, {
				type: 'status',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { message: '' },
			});

			const promptBuildRun = tracing
				? await tracing.startChildRun(tracing.actorRun, {
						name: 'prompt_build',
						tags: ['prompt'],
						metadata: { agent_role: 'prompt_build' },
						inputs: {
							message,
							hasConversationSummary: Boolean(conversationSummary),
							attachmentCount: attachments?.length ?? 0,
						},
					})
				: undefined;
			let streamInput:
				| string
				| Array<{
						role: 'user';
						content: Array<
							{ type: 'text'; text: string } | { type: 'file'; data: string; mimeType: string }
						>;
				  }>;
			try {
				const enrichedMessage = await this.buildMessageWithRunningTasks(threadId, message);

				// Compose runtime input: conversation summary → background tasks → user message
				let fullMessage = conversationSummary
					? `${conversationSummary}\n\n${enrichedMessage}`
					: enrichedMessage;

				// Classify attachments: structured (csv/tsv/json) go through parse-file,
				// non-structured keep the existing multimodal file path.
				if (attachments && attachments.length > 0) {
					const classified = classifyAttachments(attachments);
					const nonStructured = attachments.filter((a) => !isStructuredAttachment(a));
					const hasParseable = classified.some((c: { parseable: boolean }) => c.parseable);

					// Build compact manifest for structured attachments
					const manifest = buildAttachmentManifest(classified);

					// For attachment-only messages, synthesize a stub
					if (!message && hasParseable) {
						fullMessage = conversationSummary
							? `${conversationSummary}\n\nThe user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${manifest}`
							: `The user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${manifest}`;
					} else {
						fullMessage = `${fullMessage}\n\n${manifest}`;
					}

					// Only include non-structured attachments as raw multimodal content
					if (nonStructured.length > 0) {
						streamInput = [
							{
								role: 'user' as const,
								content: [
									{ type: 'text' as const, text: fullMessage },
									...nonStructured.map((a) => ({
										type: 'file' as const,
										data: a.data,
										mimeType: a.mimeType,
									})),
								],
							},
						];
					} else {
						streamInput = fullMessage;
					}
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
									nonStructuredAttachmentCount:
										attachments?.filter((a) => !isStructuredAttachment(a)).length ?? 0,
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

			const result = tracing
				? await tracing.withRunTree(tracing.actorRun, async () => {
						return await streamAgentRun(
							agent as StreamableAgent,
							streamInput,
							{
								maxSteps: MAX_STEPS.ORCHESTRATOR,
								abortSignal: signal,
								memory: {
									resource: user.id,
									thread: threadId,
								},
								providerOptions: {
									anthropic: { cacheControl: { type: 'ephemeral' } },
								},
							},
							{
								threadId,
								runId,
								agentId: ORCHESTRATOR_AGENT_ID,
								signal,
								eventBus: this.eventBus,
								logger: this.logger,
							},
						);
					})
				: await streamAgentRun(
						agent as StreamableAgent,
						streamInput,
						{
							maxSteps: MAX_STEPS.ORCHESTRATOR,
							abortSignal: signal,
							memory: {
								resource: user.id,
								thread: threadId,
							},
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
						},
						{
							threadId,
							runId,
							agentId: ORCHESTRATOR_AGENT_ID,
							signal,
							eventBus: this.eventBus,
							logger: this.logger,
						},
					);
			mastraRunId = result.mastraRunId;

			if (result.status === 'suspended') {
				if (result.suspension) {
					this.runState.suspendRun(threadId, {
						runId,
						mastraRunId: result.mastraRunId,
						agent,
						threadId,
						user,
						toolCallId: result.suspension.toolCallId,
						requestId: result.suspension.requestId,
						abortController,
						messageGroupId,
						createdAt: Date.now(),
						tracing,
						checkpoint,
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

				if (result.confirmationEvent) {
					this.trackConfirmationRequest(threadId, result.confirmationEvent);
					this.eventBus.publish(threadId, result.confirmationEvent);
				}

				// Persist the agent tree so the confirmation UI survives page refresh.
				// The tree is rebuilt from in-memory events and includes the
				// confirmation-request data that the frontend needs.
				await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			const finalStatus = result.status === 'errored' ? 'error' : result.status;
			await this.finalizeRunTracing(runId, tracing, {
				status: finalStatus,
				outputText,
				modelId,
			});
			messageTraceFinalization = {
				status: finalStatus,
				outputText,
				modelId,
				metadata: { completion_source: 'orchestrator' },
			};
			const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
				threadId,
				user,
				aiCreatedWorkflowIds,
			);
			await this.finalizeRun(threadId, runId, result.status, snapshotStorage, {
				userId: user.id,
				modelId,
				archivedWorkflowIds,
			});

			// Count credits on first completed run per thread
			if (result.status === 'completed') {
				await this.countCreditsIfFirst(user, threadId, runId);
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
				await this.finalizeRunTracing(runId, tracing, {
					status: 'cancelled',
					reason: 'user_cancelled',
				});
				messageTraceFinalization = {
					status: 'cancelled',
					reason: 'user_cancelled',
					metadata: { completion_source: 'orchestrator' },
				};
				const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
					threadId,
					user,
					aiCreatedWorkflowIds,
				);
				this.publishRunFinish(threadId, runId, 'cancelled', 'user_cancelled', archivedWorkflowIds);
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI run error', {
				error: errorMessage,
				threadId,
				runId,
			});
			await this.finalizeRunTracing(runId, tracing, {
				status: 'error',
				reason: errorMessage,
			});
			messageTraceFinalization = {
				status: 'error',
				reason: errorMessage,
				metadata: { completion_source: 'orchestrator' },
			};

			const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
				threadId,
				user,
				aiCreatedWorkflowIds,
			);
			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
					...(archivedWorkflowIds.length > 0 ? { archivedWorkflowIds } : {}),
				},
			});
		} finally {
			this.runState.clearActiveRun(threadId);
			this.threadPushRef.delete(threadId);
			this.domainAccessTrackersByThread.get(threadId)?.clearRun(runId);
			if (messageTraceFinalization) {
				await this.maybeFinalizeRunTraceRoot(runId, messageTraceFinalization);
			}
			// Clean up Mastra workflow snapshots unless the run is suspended (needed for resume).
			// Mastra only persists snapshots on suspension and never deletes them on completion.
			if (!this.runState.hasSuspendedRun(threadId) && mastraRunId) {
				void this.cleanupMastraSnapshots(mastraRunId);
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
				} else {
					await this.schedulePlannedTasks(user, threadId);
				}
				await this.drainPendingCheckpointReentries(user, threadId);
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
				this.runState.getThreadResearchMode(threadId),
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

	async resolveConfirmation(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
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

		this.runState.activateSuspendedRun(threadId);

		// setup-workflow uses nodeCredentials (per-node) format for its credentials field;
		// other tools use the flat credentials map. Prefer nodeCredentials when present.
		const credentialsPayload = data.nodeCredentials ?? data.credentials;
		const resumeData = {
			approved: data.approved,
			...(data.credentialId ? { credentialId: data.credentialId } : {}),
			...(credentialsPayload ? { credentials: credentialsPayload } : {}),
			...(data.autoSetup ? { autoSetup: data.autoSetup } : {}),
			...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
			...(data.domainAccessAction ? { domainAccessAction: data.domainAccessAction } : {}),
			...(data.action ? { action: data.action } : {}),
			...(data.nodeParameters ? { nodeParameters: data.nodeParameters } : {}),
			...(data.testTriggerNode ? { testTriggerNode: data.testTriggerNode } : {}),
			...(data.answers ? { answers: data.answers } : {}),
			...(data.resourceDecision ? { resourceDecision: data.resourceDecision } : {}),
		};

		void this.processResumedStream(agent, resumeData, {
			runId,
			mastraRunId,
			threadId,
			user,
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
		let messageTraceFinalization: MessageTraceFinalization | undefined;

		try {
			const result = opts.tracing
				? await opts.tracing.withRunTree(opts.tracing.actorRun, async () => {
						return await resumeAgentRun(
							agent,
							resumeData,
							{
								runId: opts.mastraRunId,
								toolCallId: opts.toolCallId,
								memory: { resource: opts.user.id, thread: opts.threadId },
							},
							{
								threadId: opts.threadId,
								runId: opts.runId,
								agentId: ORCHESTRATOR_AGENT_ID,
								signal: opts.signal,
								eventBus: this.eventBus,
								logger: this.logger,
								mastraRunId: opts.mastraRunId,
							},
						);
					})
				: await resumeAgentRun(
						agent,
						resumeData,
						{
							runId: opts.mastraRunId,
							toolCallId: opts.toolCallId,
							memory: { resource: opts.user.id, thread: opts.threadId },
						},
						{
							threadId: opts.threadId,
							runId: opts.runId,
							agentId: ORCHESTRATOR_AGENT_ID,
							signal: opts.signal,
							eventBus: this.eventBus,
							logger: this.logger,
							mastraRunId: opts.mastraRunId,
						},
					);

			if (result.status === 'suspended') {
				if (result.suspension) {
					this.runState.suspendRun(opts.threadId, {
						runId: opts.runId,
						mastraRunId: result.mastraRunId,
						agent,
						threadId: opts.threadId,
						user: opts.user,
						toolCallId: result.suspension.toolCallId,
						requestId: result.suspension.requestId,
						abortController: opts.abortController,
						messageGroupId: this.traceContextsByRunId.get(opts.runId)?.messageGroupId,
						createdAt: Date.now(),
						tracing: opts.tracing,
						checkpoint: opts.checkpoint,
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

				if (result.confirmationEvent) {
					this.trackConfirmationRequest(opts.threadId, result.confirmationEvent);
					this.eventBus.publish(opts.threadId, result.confirmationEvent);
				}

				// Persist the refreshed agent tree so repeated HITL waits
				// survive page refresh after a resume as well.
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);

				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			const finalStatus = result.status === 'errored' ? 'error' : result.status;
			await this.finalizeRunTracing(opts.runId, opts.tracing, {
				status: finalStatus,
				outputText,
			});
			messageTraceFinalization = {
				status: finalStatus,
				outputText,
				metadata: { completion_source: 'orchestrator' },
			};
			const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
				opts.threadId,
				opts.user,
				undefined,
			);
			await this.finalizeRun(opts.threadId, opts.runId, result.status, opts.snapshotStorage, {
				archivedWorkflowIds,
			});

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
				await this.finalizeRunTracing(opts.runId, opts.tracing, {
					status: 'cancelled',
					reason: 'user_cancelled',
				});
				messageTraceFinalization = {
					status: 'cancelled',
					reason: 'user_cancelled',
					metadata: { completion_source: 'orchestrator' },
				};
				const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
					opts.threadId,
					opts.user,
					undefined,
				);
				this.publishRunFinish(
					opts.threadId,
					opts.runId,
					'cancelled',
					'user_cancelled',
					archivedWorkflowIds,
				);
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI resumed run error', {
				error: errorMessage,
				threadId: opts.threadId,
				runId: opts.runId,
			});
			await this.finalizeRunTracing(opts.runId, opts.tracing, {
				status: 'error',
				reason: errorMessage,
			});
			messageTraceFinalization = {
				status: 'error',
				reason: errorMessage,
				metadata: { completion_source: 'orchestrator' },
			};

			const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
				opts.threadId,
				opts.user,
				undefined,
			);
			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
					...(archivedWorkflowIds.length > 0 ? { archivedWorkflowIds } : {}),
				},
			});
		} finally {
			this.runState.clearActiveRun(opts.threadId);
			this.threadPushRef.delete(opts.threadId);
			if (messageTraceFinalization) {
				await this.maybeFinalizeRunTraceRoot(opts.runId, messageTraceFinalization);
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
				} else {
					await this.schedulePlannedTasks(opts.user, opts.threadId);
				}
				await this.drainPendingCheckpointReentries(opts.user, opts.threadId);
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
			dedupeKey: opts.dedupeKey,
			parentCheckpointId: opts.parentCheckpointId,
			run: opts.run,
			onLimitReached: async (errorMessage) => {
				await this.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
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
				await this.finalizeBackgroundTaskTracing(task, 'completed');
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
				await this.finalizeBackgroundTaskTracing(task, 'failed');
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
				// schedulePlannedTasks(); this covers direct build-workflow-with-agent calls.
				if (task.plannedTaskId) return;

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
					const user = this.runState.getThreadUser(opts.threadId);
					if (user) {
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
							this.runState.getThreadResearchMode(opts.threadId),
							task.messageGroupId,
						);
					}
				}
			},
		});

		if (outcome.status === 'started') {
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
			void this.finalizeDetachedTraceRun(opts.taskId, opts.traceContext, {
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

		this.telemetry.track('Builder asked for input', {
			thread_id: threadId,
			input_thread_id: inputThreadId,
			type,
			num_steps: numSteps,
		});
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
		let markedWorkflows: Array<{ workflowId: string }> = [];
		try {
			markedWorkflows = await this.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to inspect AI-builder temporary workflows during run finish', {
				threadId,
				error: getErrorMessage(error),
			});
		}
		const workflowIds = new Set([
			...markedWorkflows.map(({ workflowId }) => workflowId),
			...(createdWorkflowIds ?? []),
		]);
		if (workflowIds.size === 0) return [];

		return await this.archiveAiTemporaryWorkflows(threadId, user, workflowIds);
	}

	private async archiveAiTemporaryWorkflows(
		threadId: string,
		user: User,
		workflowIds: Set<string>,
	): Promise<string[]> {
		const adapter = this.adapterService.createContext(user, { threadId });
		const archived: string[] = [];
		for (const workflowId of workflowIds) {
			try {
				const didArchive = await adapter.workflowService.archiveIfAiTemporary(workflowId);
				if (didArchive) archived.push(workflowId);
			} catch (error) {
				this.logger.warn('Failed to reap AI-builder temporary workflow', {
					threadId,
					workflowId,
					error: getErrorMessage(error),
				});
			}
		}
		return archived;
	}

	private async finalizeCancelledSuspendedRun(suspended: SuspendedRunState<User>): Promise<void> {
		await this.finalizeRunTracing(suspended.runId, suspended.tracing, {
			status: 'cancelled',
			reason: 'user_cancelled',
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
			'user_cancelled',
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
			reason: 'user_cancelled',
			metadata: { completion_source: 'orchestrator' },
		});
	}

	private async reapAiTemporaryForThreadCleanup(threadId: string): Promise<void> {
		let markedWorkflows: Array<{ workflowId: string }>;
		try {
			markedWorkflows = await this.aiBuilderTemporaryWorkflowRepository.findByThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to inspect AI-builder temporary workflows during thread cleanup', {
				threadId,
				error: getErrorMessage(error),
			});
			return;
		}

		if (markedWorkflows.length === 0) return;

		let thread: Awaited<ReturnType<InstanceAiThreadRepository['findOneBy']>>;
		try {
			thread = await this.threadRepo.findOneBy({ id: threadId });
		} catch (error) {
			this.logger.warn('Failed to load thread owner for AI-builder temporary workflow cleanup', {
				threadId,
				markedWorkflowCount: markedWorkflows.length,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!thread?.resourceId) {
			this.logger.warn('Skipping AI-builder temporary workflow cleanup for thread without owner', {
				threadId,
				markedWorkflowCount: markedWorkflows.length,
			});
			return;
		}

		let user: User | null;
		try {
			user = await this.userRepository.findOneBy({ id: thread.resourceId });
		} catch (error) {
			this.logger.warn('Failed to load user for AI-builder temporary workflow cleanup', {
				threadId,
				userId: thread.resourceId,
				markedWorkflowCount: markedWorkflows.length,
				error: getErrorMessage(error),
			});
			return;
		}
		if (!user) {
			this.logger.warn('Skipping AI-builder temporary workflow cleanup for missing thread owner', {
				threadId,
				userId: thread.resourceId,
				markedWorkflowCount: markedWorkflows.length,
			});
			return;
		}

		await this.archiveAiTemporaryWorkflows(
			threadId,
			user,
			new Set(markedWorkflows.map(({ workflowId }) => workflowId)),
		);
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
		if (status === 'completed') {
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
			if (options?.userId && options?.modelId) {
				void this.refineTitleIfNeeded(threadId, options.userId, options.modelId);
			}
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
		try {
			const workflowsStorage = this.compositeStore.stores.workflows as TypeORMWorkflowsStorage;
			await workflowsStorage.deleteAllByRunId(mastraRunId);
		} catch (error) {
			this.logger.warn('Failed to clean up Mastra workflow snapshots', {
				mastraRunId,
				error: getErrorMessage(error),
			});
		}
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
				events = this.eventBus.getEventsForRuns(threadId, groupRunIds);
			} else {
				events = this.eventBus.getEventsForRun(threadId, runId);
			}
			const agentTree = buildAgentTreeFromEvents(events);

			const tracing = this.traceContextsByRunId.get(runId)?.tracing;
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

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
		});
	}
}
