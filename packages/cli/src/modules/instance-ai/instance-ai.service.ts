import {
	UNLIMITED_CREDITS,
	applyBranchReadOnlyOverrides,
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
import { Time } from '@n8n/constants';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
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
	releaseTraceClient,
	resumeAgentRun,
	RunStateRegistry,
	startBuildWorkflowAgentTask,
	startDataTableAgentTask,
	startDetachedDelegateTask,
	startResearchAgentTask,
	streamAgentRun,
	truncateToTitle,
	generateThreadTitle,
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
	type ServiceProxyConfig,
	type StreamableAgent,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import type * as Undici from 'undici';

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
			return new BuilderSandboxFactory(config, new SnapshotManager(config.image, this.logger));
		}

		return new BuilderSandboxFactory(config);
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

		const thread = await this.threadRepo.findOneBy({ id: threadId });
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

		const { active, suspended } = this.runState.cancelThread(threadId);
		if (active) {
			active.abortController.abort();
			return;
		}

		if (suspended) {
			suspended.abortController.abort();
			void this.finalizeRunTracing(suspended.runId, suspended.tracing, {
				status: 'cancelled',
				reason: 'user_cancelled',
			});
			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId: suspended.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { status: 'cancelled', reason: 'user_cancelled' },
			});
			// Persist the snapshot so the run-finish event (which clears
			// in-flight tool calls) is reflected in the stored tree.
			void this.saveAgentTreeSnapshot(threadId, suspended.runId, this.dbSnapshotStorage, true);
			if (suspended.mastraRunId) {
				void this.cleanupMastraSnapshots(suspended.mastraRunId);
			}
			void this.maybeFinalizeRunTraceRoot(suspended.runId, {
				status: 'cancelled',
				reason: 'user_cancelled',
				metadata: { completion_source: 'orchestrator' },
			});
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
		type: 'synthesize' | 'replan',
		graph: PlannedTaskGraph,
		failedTask?: PlannedTaskRecord,
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

		if (failedTask) {
			payload.failedTask = {
				id: failedTask.id,
				title: failedTask.title,
				kind: failedTask.kind,
				error: failedTask.error,
				result: failedTask.result,
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

	private async createExecutionEnvironment(
		user: User,
		threadId: string,
		runId: string,
		abortSignal: AbortSignal,
		researchMode?: boolean,
		messageGroupId?: string,
		pushRef?: string,
	) {
		const localGatewayDisabled = this.settingsService.isLocalGatewayDisabled();
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
			searchProxyConfig = {
				apiUrl: proxyBaseUrl + '/brave-search',
				getAuthHeaders: async () => await manager.getAuthHeaders(),
			};
			tracingProxyConfig = {
				apiUrl: proxyBaseUrl + '/langsmith',
				getAuthHeaders: async () => await manager.getAuthHeaders(),
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
				: ((await this.resolveHttpProxyModel(user)) ??
					(await this.settingsService.resolveModelConfig(user)));
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

		void this.executeRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			undefined,
			messageGroupId,
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
			await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('replan', action.graph, action.failedTask),
				this.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
			);
			return;
		}

		if (action.type === 'synthesize') {
			await this.syncPlannedTasksToUi(threadId, action.graph);
			await this.startInternalFollowUpRun(
				user,
				threadId,
				this.buildPlannedTaskFollowUpMessage('synthesize', action.graph),
				this.runState.getThreadResearchMode(threadId),
				action.graph.messageGroupId,
			);
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
	): Promise<void> {
		const signal = abortController.signal;
		let mastraRunId = '';
		let tracing: InstanceAiTraceContext | undefined;
		let messageTraceFinalization: MessageTraceFinalization | undefined;

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
			// Make the current user message available to sub-agents (e.g. planner)
			// since memory.recall() only returns previously-saved messages.
			orchestrationContext.currentUserMessage = message;

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
				workspace: orchestrationContext.workspace,
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
			await this.finalizeRun(threadId, runId, result.status, snapshotStorage, {
				userId: user.id,
				modelId,
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
				this.publishRunFinish(threadId, runId, 'cancelled', 'user_cancelled');
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

			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
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
		}
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

		const { agent, runId, mastraRunId, threadId, user, toolCallId, abortController, tracing } =
			suspended;
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
			await this.finalizeRun(opts.threadId, opts.runId, result.status, opts.snapshotStorage);

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
				this.publishRunFinish(opts.threadId, opts.runId, 'cancelled', 'user_cancelled');
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

			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
				},
			});
		} finally {
			this.runState.clearActiveRun(opts.threadId);
			this.threadPushRef.delete(opts.threadId);
			if (messageTraceFinalization) {
				await this.maybeFinalizeRunTraceRoot(opts.runId, messageTraceFinalization);
			}
		}
	}

	// ── Background task management ──────────────────────────────────────────

	private spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: DbSnapshotStorage,
		messageGroupIdOverride?: string,
	): void {
		this.backgroundTasks.spawn({
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			messageGroupId: messageGroupIdOverride ?? this.runState.getMessageGroupId(opts.threadId),
			plannedTaskId: opts.plannedTaskId,
			workItemId: opts.workItemId,
			traceContext: opts.traceContext,
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
				if (!task.plannedTaskId) {
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
				}
			},
		});
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

	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
	): void {
		const effectiveStatus = status === 'errored' ? 'error' : status;
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload:
				status === 'cancelled'
					? { status: effectiveStatus, reason: reason ?? 'user_cancelled' }
					: { status: effectiveStatus },
		});
	}

	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		snapshotStorage: DbSnapshotStorage,
		options?: { userId?: string; modelId?: ModelConfig },
	): Promise<void> {
		this.publishRunFinish(threadId, runId, status);
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

			// Get first user message
			const result = await memory.recall({ threadId, resourceId: userId, perPage: 5 });
			const firstUserMsg = result.messages.find((m) => m.role === 'user');
			if (!firstUserMsg) return;
			const userText =
				typeof firstUserMsg.content === 'string'
					? firstUserMsg.content
					: JSON.stringify(firstUserMsg.content);

			const llmTitle = await generateThreadTitle(modelId, userText);
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

			if (isUpdate) {
				await snapshotStorage.updateLast(threadId, agentTree, runId, messageGroupId, groupRunIds);
			} else {
				await snapshotStorage.save(threadId, agentTree, runId, messageGroupId, groupRunIds);
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
