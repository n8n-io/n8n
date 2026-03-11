import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import {
	createInstanceAgent,
	createAllTools,
	createMemory,
	createSandbox,
	createWorkspace,
	McpClientManager,
	mapMastraChunkToEvent,
	PlanAutoTracker,
	BuilderSandboxFactory,
	SnapshotManager,
} from '@n8n/instance-ai';
import type {
	McpServerConfig,
	ModelConfig,
	OrchestrationContext,
	SandboxConfig,
	SpawnBackgroundTaskOptions,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';

import type {
	InstanceAiThreadStatusResponse,
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
} from '@n8n/api-types';

import { LocalGateway, LocalFilesystemProvider } from './filesystem';
import { buildAgentTreeFromEvents } from './agent-tree-builder';
import { AgentTreeSnapshotStorage } from './agent-tree-snapshot';
import { InProcessEventBus } from './event-bus/in-process-event-bus';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { MastraIterationLogStorage } from './iteration-log-storage';
import { MastraPlanStorage } from './plan-storage';

interface ActiveRun {
	runId: string;
	abortController: AbortController;
}

interface SuspendedRun {
	runId: string;
	mastraRunId: string; // Mastra's internal runId — required for resumeStream snapshot lookup
	agent: unknown; // Mastra Agent instance — typed as unknown since Agent type is complex
	threadId: string;
	user: User;
	toolCallId: string;
	requestId: string;
	abortController: AbortController;
}

interface ConfirmationData {
	approved: boolean;
	credentialId?: string;
	credentials?: Record<string, string>;
	autoSetup?: { credentialType: string };
	userInput?: string;
}

interface PendingConfirmation {
	resolve: (data: ConfirmationData) => void;
	threadId: string;
	userId: string;
}

interface BackgroundTask {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	result?: string;
	error?: string;
	startedAt: number;
	abortController: AbortController;
	/** User corrections queued for mid-flight delivery to the running task. */
	corrections: string[];
	/** How many automatic follow-up runs preceded this task (0 = user-initiated). */
	chainDepth: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Detect whether the builder agent already ran and verified the workflow itself.
 * The sandbox builder executes `run-workflow` after `submit-workflow` as part of
 * its mandatory process. If the result text mentions a successful execution,
 * we can skip the redundant orchestrator-level verification round-trip.
 */
function builderSelfTestedSuccessfully(result: string | undefined): boolean {
	if (!result) return false;
	const lower = result.toLowerCase();
	// Builder reports execution success — common patterns from sandbox builder output
	const hasExecutionSignal =
		lower.includes('execution') &&
		(lower.includes('success') || lower.includes('completed') || lower.includes('passed'));
	// Builder reports an error — self-test was attempted but failed
	const hasError =
		lower.startsWith('error:') ||
		lower.includes('execution failed') ||
		lower.includes('runtime error');
	return hasExecutionSignal && !hasError;
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';

@Service()
export class InstanceAiService {
	private readonly mcpClientManager = new McpClientManager();

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly dbType: string;

	private readonly postgresConfig: {
		user: string;
		password: string;
		host: string;
		port: number;
		database: string;
	};

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly activeRuns = new Map<string, ActiveRun>();

	private readonly suspendedRuns = new Map<string, SuspendedRun>();

	private readonly pendingSubAgentConfirmations = new Map<string, PendingConfirmation>();

	private readonly backgroundTasks = new Map<string, BackgroundTask>();

	/** Active sandboxes keyed by thread ID — persisted across messages within a conversation. */
	private readonly sandboxes = new Map<
		string,
		{ sandbox: ReturnType<typeof createSandbox>; workspace: ReturnType<typeof createWorkspace> }
	>();

	/** Singleton local filesystem provider — created lazily when filesystem config is enabled. */
	private localFsProvider?: LocalFilesystemProvider;

	/** Singleton local gateway — proxies MCP tool calls to the connected local client (e.g. fs-proxy). */
	private readonly localGateway = new LocalGateway();

	/** When true, filesystem tools are suppressed regardless of gateway/local availability. */
	private filesystemDisabled = false;

	/** Timer for graceful gateway disconnect (allows brief SSE reconnects). */
	private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

	private readonly DISCONNECT_GRACE_MS = 10_000;

	/** One-time pairing token generated via the UI — consumed on gateway/init. */
	private pairingToken: { token: string; createdAt: number } | null = null;

	/** Pairing tokens expire after 5 minutes. */
	private readonly PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;

	/** Server-issued session key — replaces the pairing token after init. */
	private activeSessionKey: string | null = null;

	/** Tracks the last user per thread so background task completions can auto-trigger follow-up runs. */
	private readonly threadUsers = new Map<string, User>();

	/** Tracks the last researchMode setting per thread for follow-up runs. */
	private readonly threadResearchMode = new Map<string, boolean>();

	/** Pre-warmed image manager for builder sandboxes (Daytona only). */
	private snapshotManager?: SnapshotManager;

	/** Factory for creating per-builder ephemeral sandboxes. */
	private builderSandboxFactory?: BuilderSandboxFactory;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly settingsService: InstanceAiSettingsService,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
		this.dbType = globalConfig.database.type;
		this.postgresConfig = globalConfig.database.postgresdb;
		const editorBaseUrl = globalConfig.editorBaseUrl || `http://localhost:${globalConfig.port}`;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${editorBaseUrl.replace(/\/$/, '')}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${editorBaseUrl.replace(/\/$/, '')}/${globalConfig.endpoints.webhook}`;

		// Initialize per-builder sandbox factory
		const sbxConfig = this.sandboxConfig;
		if (sbxConfig.enabled && sbxConfig.provider === 'daytona') {
			this.snapshotManager = new SnapshotManager(sbxConfig.image);
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig, this.snapshotManager);
		} else if (sbxConfig.enabled) {
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig);
		}
	}

	private get sandboxConfig(): SandboxConfig {
		const {
			sandboxEnabled,
			sandboxProvider,
			daytonaApiUrl,
			daytonaApiKey,
			sandboxImage,
			sandboxTimeout,
		} = this.instanceAiConfig;
		return {
			enabled: sandboxEnabled,
			provider: sandboxProvider as 'daytona' | 'local',
			daytonaApiUrl: daytonaApiUrl || undefined,
			daytonaApiKey: daytonaApiKey || undefined,
			image: sandboxImage || undefined,
			timeout: sandboxTimeout,
		};
	}

	/** Lazily create the local filesystem provider (singleton). */
	private getLocalFsProvider(): LocalFilesystemProvider {
		if (!this.localFsProvider) {
			const basePath = this.instanceAiConfig.filesystemPath || undefined;
			this.localFsProvider = new LocalFilesystemProvider(basePath);
		}
		return this.localFsProvider;
	}

	/** Get or create a sandbox + workspace for a thread. Returns undefined when sandbox is disabled. */
	private getOrCreateWorkspace(threadId: string) {
		const existing = this.sandboxes.get(threadId);
		if (existing) return existing;

		const config = this.sandboxConfig;
		if (!config.enabled) return undefined;

		const sandbox = createSandbox(config);
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

	/** Build model config: plain string for built-in providers, object for custom endpoints. */
	private async resolveModel(user: User): Promise<ModelConfig> {
		return await this.settingsService.resolveModelConfig(user);
	}

	isEnabled(): boolean {
		return !!this.instanceAiConfig.model;
	}

	/** Auto-detect whether local filesystem access is useful.
	 *  1. FILESYSTEM_PATH explicitly set → local FS (restricted to that path)
	 *  2. Container detected → gateway only (no useful local files)
	 *  3. Bare metal (default) → local FS (unrestricted) */
	isLocalFilesystemAvailable(): boolean {
		if (this.instanceAiConfig.filesystemPath?.trim()) return true;
		return !this.isContainerEnvironment();
	}

	/** Return the local filesystem root directory, or null if local FS is not available. */
	getLocalFilesystemDirectory(): string | null {
		if (!this.isLocalFilesystemAvailable()) return null;
		const explicit = this.instanceAiConfig.filesystemPath?.trim();
		return explicit || homedir();
	}

	private isContainerEnvironment(): boolean {
		return (
			existsSync('/.dockerenv') || !!process.env.KUBERNETES_SERVICE_HOST || !!process.env.container
		);
	}

	hasActiveRun(threadId: string): boolean {
		return this.activeRuns.has(threadId) || this.suspendedRuns.has(threadId);
	}

	getThreadStatus(threadId: string): InstanceAiThreadStatusResponse {
		const hasActiveRun = this.activeRuns.has(threadId);
		const isSuspended = this.suspendedRuns.has(threadId);
		const bgTasks = [...this.backgroundTasks.values()]
			.filter((t) => t.threadId === threadId)
			.map((t) => ({
				taskId: t.taskId,
				role: t.role,
				agentId: t.agentId,
				status: t.status,
				startedAt: t.startedAt,
			}));
		return { hasActiveRun, isSuspended, backgroundTasks: bgTasks };
	}

	startRun(user: User, threadId: string, message: string, researchMode?: boolean): string {
		const runId = `run_${nanoid()}`;
		const abortController = new AbortController();

		this.activeRuns.set(threadId, { runId, abortController });
		this.threadUsers.set(threadId, user);
		if (researchMode !== undefined) {
			this.threadResearchMode.set(threadId, researchMode);
		}

		// Reset chain depth on user-initiated runs so the circuit breaker
		// starts fresh. Auto-follow-up runs use the internal (continue) message
		// which preserves chain depth via the background task inheritance.
		if (message !== AUTO_FOLLOW_UP_MESSAGE) {
			this.resetChainDepths(threadId);
		}

		// Fire-and-forget — errors handled inside executeRun
		void this.executeRun(user, threadId, runId, message, abortController, researchMode);

		return runId;
	}

	/** Reset chain depths for all non-running tasks on a thread (called on user-initiated runs). */
	private resetChainDepths(threadId: string): void {
		for (const task of this.backgroundTasks.values()) {
			if (task.threadId === threadId) {
				task.chainDepth = 0;
			}
		}
	}

	cancelRun(threadId: string): void {
		// Clean up sub-agent confirmations for this thread
		for (const [reqId, pending] of this.pendingSubAgentConfirmations) {
			if (pending.threadId === threadId) {
				pending.resolve({ approved: false });
				this.pendingSubAgentConfirmations.delete(reqId);
			}
		}

		// Cancel background tasks for this thread
		this.cancelBackgroundTasks(threadId);

		const active = this.activeRuns.get(threadId);
		if (active) {
			active.abortController.abort();
			// run-finish with status=cancelled is published by executeRun's catch block
			return;
		}

		const suspended = this.suspendedRuns.get(threadId);
		if (suspended) {
			suspended.abortController.abort();
			this.suspendedRuns.delete(threadId);
			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId: suspended.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { status: 'cancelled', reason: 'user_cancelled' },
			});
		}
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(taskId: string, correction: string): void {
		const task = this.backgroundTasks.get(taskId);
		if (!task || task.status !== 'running') return;
		task.corrections.push(correction);
	}

	/** Cancel a single background task by ID. */
	cancelBackgroundTask(threadId: string, taskId: string): void {
		const task = this.backgroundTasks.get(taskId);
		if (!task || task.threadId !== threadId || task.status !== 'running') return;

		task.abortController.abort();
		task.status = 'cancelled';

		this.eventBus.publish(threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		this.backgroundTasks.delete(taskId);
	}

	// ── Gateway lifecycle ─────────────────────────────────────────────────

	/** Generate a one-time pairing token for UI-initiated connections. */
	generatePairingToken(): string {
		// If there's an active session key, return it so the daemon can reconnect
		// without losing its authenticated session (e.g. after a page reload).
		if (this.activeSessionKey) {
			return this.activeSessionKey;
		}
		// Reuse existing valid token (prevents race conditions between concurrent callers)
		const existing = this.getPairingToken();
		if (existing) return existing;

		const token = `gw_${nanoid(32)}`;
		this.pairingToken = { token, createdAt: Date.now() };
		return token;
	}

	/** Get the current pairing token (for auth validation during init). Returns null if expired/consumed. */
	getPairingToken(): string | null {
		if (!this.pairingToken) return null;
		if (Date.now() - this.pairingToken.createdAt > this.PAIRING_TOKEN_TTL_MS) {
			this.pairingToken = null;
			return null;
		}
		return this.pairingToken.token;
	}

	/**
	 * Consume the pairing token and issue a session key.
	 * Returns the session key on success, or null if the token is invalid/expired.
	 */
	consumePairingToken(token: string): string | null {
		const valid = this.getPairingToken();
		if (!valid || valid !== token) return null;

		this.pairingToken = null; // Consumed — cannot be reused
		this.activeSessionKey = `sess_${nanoid(32)}`;
		return this.activeSessionKey;
	}

	/** Get the active session key (for SSE + response auth). */
	getActiveSessionKey(): string | null {
		return this.activeSessionKey;
	}

	/** Clear the active session key (e.g. after explicit disconnect). */
	clearActiveSessionKey(): void {
		this.activeSessionKey = null;
	}

	/** Return the filesystem gateway (used by the controller for SSE subscription). */
	getLocalGateway(): LocalGateway {
		return this.localGateway;
	}

	/** Initialize gateway from a daemon's MCP capabilities upload. */
	initGateway(data: InstanceAiGatewayCapabilities): void {
		this.clearDisconnectTimer();
		this.filesystemDisabled = false; // Re-enable on new connection
		this.localGateway.init(data);
	}

	/** Resolve a pending gateway filesystem request. */
	resolveGatewayRequest(requestId: string, result?: McpToolCallResult, error?: string): boolean {
		return this.localGateway.resolveRequest(requestId, result, error);
	}

	/** Disconnect the gateway (called when daemon SSE disconnects). */
	disconnectGateway(): void {
		this.localGateway.disconnect();
	}

	/** Disable all filesystem access (gateway + local).
	 *  Keeps gateway alive so toggling back on restores proxy access immediately. */
	disableFilesystem(): void {
		this.filesystemDisabled = true;
	}

	/** Re-enable filesystem access. */
	enableFilesystem(): void {
		this.filesystemDisabled = false;
	}

	isFilesystemDisabled(): boolean {
		return this.filesystemDisabled;
	}

	/** Return gateway connection status for the frontend. */
	getGatewayStatus(): { connected: boolean; connectedAt: string | null; directory: string | null } {
		return this.localGateway.getStatus();
	}

	/** Start a grace-period timer. If the daemon doesn't reconnect, fully disconnect the gateway. */
	startDisconnectTimer(onDisconnect: () => void): void {
		this.clearDisconnectTimer();
		this.disconnectTimer = setTimeout(() => {
			this.disconnectTimer = null;
			this.disconnectGateway();
			this.activeSessionKey = null;
			onDisconnect();
		}, this.DISCONNECT_GRACE_MS);
	}

	/** Cancel a pending disconnect timer (e.g. daemon reconnected in time). */
	clearDisconnectTimer(): void {
		if (this.disconnectTimer) {
			clearTimeout(this.disconnectTimer);
			this.disconnectTimer = null;
		}
	}

	async shutdown(): Promise<void> {
		this.clearDisconnectTimer();
		for (const [, run] of this.activeRuns) run.abortController.abort();
		this.activeRuns.clear();

		for (const [, run] of this.suspendedRuns) run.abortController.abort();
		this.suspendedRuns.clear();

		for (const [, task] of this.backgroundTasks) task.abortController.abort();
		this.backgroundTasks.clear();

		this.localGateway.disconnect();

		for (const [, pending] of this.pendingSubAgentConfirmations) {
			pending.resolve({ approved: false });
		}
		this.pendingSubAgentConfirmations.clear();

		// Destroy all active sandboxes
		const sandboxCleanups = [...this.sandboxes.keys()].map(
			async (threadId) => await this.destroySandbox(threadId),
		);
		await Promise.allSettled(sandboxCleanups);

		this.snapshotManager?.invalidate();
		this.eventBus.clear();
		await this.mcpClientManager.disconnect();
		this.logger.debug('Instance AI service shut down');
	}

	private async executeRun(
		user: User,
		threadId: string,
		runId: string,
		message: string,
		abortController: AbortController,
		researchMode?: boolean,
	): Promise<void> {
		const signal = abortController.signal;
		let planTracker: PlanAutoTracker | null = null;

		try {
			// Publish run-start (includes userId for audit trail attribution)
			this.eventBus.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				userId: user.id,
				payload: { messageId: nanoid() },
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

			const localFilesystemService =
				!this.filesystemDisabled &&
				!this.localGateway.isConnected &&
				this.isLocalFilesystemAvailable()
					? this.getLocalFsProvider()
					: undefined;
			const context = this.adapterService.createContext(user, localFilesystemService);
			if (!this.filesystemDisabled && this.localGateway.isConnected) {
				context.localMcpServer = this.localGateway;
			}
			context.permissions = this.settingsService.getPermissions();
			const mcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);
			const postgresUrl = this.buildPostgresUrl();

			const modelId = await this.resolveModel(user);
			const titleModel = typeof modelId === 'string' ? modelId : modelId.id;

			const memoryConfig = {
				postgresUrl,
				embedderModel: this.instanceAiConfig.embedderModel || undefined,
				lastMessages: this.instanceAiConfig.lastMessages,
				semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
				titleModel,
			};

			// Create memory instance and share it between agent, plan storage, iteration log, and snapshot storage
			const memory = createMemory(memoryConfig);
			const planStorage = new MastraPlanStorage(memory);
			const iterationLog = new MastraIterationLogStorage(memory);
			const snapshotStorage = new AgentTreeSnapshotStorage(memory);

			// Replay existing plan to the new run's agentTree so the frontend shows it immediately
			const existingPlan = await planStorage.get(threadId);
			if (existingPlan) {
				this.eventBus.publish(threadId, {
					type: 'plan-update',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { plan: existingPlan },
				});
			}

			// Auto-track plan progress based on tool events (deterministic, no LLM dependency)
			planTracker = new PlanAutoTracker(
				threadId,
				runId,
				ORCHESTRATOR_AGENT_ID,
				this.eventBus,
				planStorage,
				iterationLog,
			);
			planTracker.start();

			// Configure workflow-sdk schema validation dirs for build-workflow tool
			const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
			if (nodeDefDirs.length > 0) {
				setSchemaBaseDirs(nodeDefDirs);
			}

			// Build domain tools for orchestration context (delegate needs them)
			const domainTools = createAllTools(context);

			// Get or create sandbox workspace for this thread (persists across messages)
			const sandboxEntry = this.getOrCreateWorkspace(threadId);

			const orchestrationContext: OrchestrationContext = {
				threadId,
				runId,
				userId: user.id,
				orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
				modelId,
				postgresUrl,
				subAgentMaxSteps: this.instanceAiConfig.subAgentMaxSteps,
				eventBus: this.eventBus,
				domainTools,
				abortSignal: signal,
				planStorage,
				researchMode,
				browserMcpConfig: this.instanceAiConfig.browserMcp
					? { name: 'chrome-devtools', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'] }
					: undefined,
				oauth2CallbackUrl: this.oauth2CallbackUrl,
				webhookBaseUrl: this.webhookBaseUrl,
				waitForConfirmation: async (requestId: string) => {
					return await new Promise<ConfirmationData>((resolve) => {
						this.pendingSubAgentConfirmations.set(requestId, {
							resolve,
							threadId,
							userId: user.id,
						});
					});
				},
				cancelBackgroundTask: async (taskId) => this.cancelBackgroundTask(threadId, taskId),
				spawnBackgroundTask: (opts) => this.spawnBackgroundTask(runId, opts, snapshotStorage),
				iterationLog,
				sendCorrectionToTask: (taskId, correction) => this.sendCorrectionToTask(taskId, correction),
				workspace: sandboxEntry?.workspace,
				builderSandboxFactory: this.builderSandboxFactory,
				nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
				domainContext: context,
			};

			const agent = await createInstanceAgent({
				modelId,
				context,
				orchestrationContext,
				mcpServers,
				memoryConfig,
				memory,
				workspace: sandboxEntry?.workspace,
			});

			// Inject completed/running background task context into the message
			const enrichedMessage = this.enrichMessageWithBackgroundTasks(threadId, message);

			const result = await agent.stream(enrichedMessage, {
				abortSignal: signal,
				memory: {
					resource: user.id,
					thread: threadId,
				},
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			});

			// Capture Mastra's internal runId — needed for resumeStream snapshot lookup
			const mastraRunId = (result as { runId?: string }).runId ?? '';

			let lastSuspension: { toolCallId: string; requestId: string } | null = null;

			for await (const chunk of result.fullStream) {
				if (signal.aborted) break;

				// Track tool-call-suspended for post-loop handling
				// Cast to unknown because Mastra's stream type union doesn't include
				// tool-call-suspended, but the runtime chunk can still carry this type
				const raw = chunk as unknown;
				if (isRecord(raw) && raw.type === 'tool-call-suspended') {
					const sp = isRecord(raw.payload) ? raw.payload : {};
					const suspPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : {};
					const tcId = typeof sp.toolCallId === 'string' ? sp.toolCallId : '';
					const reqId =
						typeof suspPayload.requestId === 'string' && suspPayload.requestId
							? suspPayload.requestId
							: tcId;
					if (reqId && tcId) {
						lastSuspension = { toolCallId: tcId, requestId: reqId };
					}
				}

				const event = mapMastraChunkToEvent(runId, ORCHESTRATOR_AGENT_ID, chunk);
				if (event) {
					this.eventBus.publish(threadId, event);
				}
			}

			// Stream ended due to tool suspension — save state and exit without run-finish
			if (lastSuspension && !signal.aborted) {
				planTracker?.stop();
				this.activeRuns.delete(threadId);
				this.suspendedRuns.set(threadId, {
					runId,
					mastraRunId,
					agent,
					threadId,
					user,
					toolCallId: lastSuspension.toolCallId,
					requestId: lastSuspension.requestId,
					abortController,
				});
				return;
			}

			planTracker?.stop();

			if (signal.aborted) {
				this.eventBus.publish(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
			} else {
				// Publish run-finish
				this.eventBus.publish(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'completed' },
				});
			}

			// Save agent tree snapshot for session restore
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
		} catch (error) {
			planTracker?.stop();

			// Mastra throws AbortError when the signal is aborted — treat as cancellation
			if (signal.aborted) {
				this.eventBus.publish(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				return;
			}

			this.logger.error('Instance AI run error', {
				error: error instanceof Error ? error.message : String(error),
				threadId,
				runId,
			});

			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: error instanceof Error ? error.message : String(error),
				},
			});
		} finally {
			this.activeRuns.delete(threadId);
		}
	}

	async resolveConfirmation(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
		// Branch 1: Sub-agent confirmation (pending promise)
		const pending = this.pendingSubAgentConfirmations.get(requestId);
		if (pending) {
			if (pending.userId !== requestingUserId) return false;
			this.pendingSubAgentConfirmations.delete(requestId);
			pending.resolve(data);
			return true;
		}

		// Branch 2: Orchestrator-level suspension (resume stream)
		return await this.resumeSuspendedRun(requestingUserId, requestId, data);
	}

	private async resumeSuspendedRun(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
		const suspended = this.findSuspendedByRequestId(requestId);
		if (!suspended) return false;

		const { agent, runId, mastraRunId, threadId, user, toolCallId, abortController } = suspended;
		if (user.id !== requestingUserId) return false;

		this.suspendedRuns.delete(threadId);
		this.activeRuns.set(threadId, { runId, abortController });

		const resumeData = {
			approved: data.approved,
			...(data.credentialId ? { credentialId: data.credentialId } : {}),
			...(data.credentials ? { credentials: data.credentials } : {}),
			...(data.autoSetup ? { autoSetup: data.autoSetup } : {}),
			...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
		};

		// Create snapshot storage for saving agent tree after resumed run completes
		const memory = createMemory({
			postgresUrl: this.buildPostgresUrl(),
			embedderModel: this.instanceAiConfig.embedderModel || undefined,
			lastMessages: this.instanceAiConfig.lastMessages,
			semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
		});
		const snapshotStorage = new AgentTreeSnapshotStorage(memory);

		void this.processResumedStream(agent, resumeData, {
			runId,
			mastraRunId,
			threadId,
			user,
			toolCallId,
			signal: abortController.signal,
			abortController,
			snapshotStorage,
		});
		return true;
	}

	private findSuspendedByRequestId(requestId: string): SuspendedRun | undefined {
		for (const [, run] of this.suspendedRuns) {
			if (run.requestId === requestId) return run;
		}
		return undefined;
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
			snapshotStorage: AgentTreeSnapshotStorage;
		},
	): Promise<void> {
		try {
			const resumable = agent as {
				resumeStream: (
					data: Record<string, unknown>,
					options: Record<string, unknown>,
				) => Promise<{ runId?: string; fullStream: AsyncIterable<unknown> }>;
			};
			const resumed = await resumable.resumeStream(resumeData, {
				runId: opts.mastraRunId, // Must use Mastra's runId — snapshot lookup key
				toolCallId: opts.toolCallId,
				memory: { resource: opts.user.id, thread: opts.threadId },
			});

			// Track Mastra's runId for potential nested suspension
			const resumedMastraRunId =
				(typeof resumed.runId === 'string' ? resumed.runId : '') || opts.mastraRunId;

			let lastSuspension: { toolCallId: string; requestId: string } | null = null;

			for await (const chunk of resumed.fullStream) {
				if (opts.signal.aborted) break;

				// Check for nested suspension
				if (isRecord(chunk) && chunk.type === 'tool-call-suspended') {
					const sp = isRecord(chunk.payload) ? chunk.payload : {};
					const suspPayload = isRecord(sp.suspendPayload) ? sp.suspendPayload : {};
					const tcId = typeof sp.toolCallId === 'string' ? sp.toolCallId : '';
					const reqId =
						typeof suspPayload.requestId === 'string' && suspPayload.requestId
							? suspPayload.requestId
							: tcId;
					if (reqId && tcId) {
						lastSuspension = { toolCallId: tcId, requestId: reqId };
					}
				}

				const event = mapMastraChunkToEvent(opts.runId, ORCHESTRATOR_AGENT_ID, chunk);
				if (event) this.eventBus.publish(opts.threadId, event);
			}

			if (lastSuspension && !opts.signal.aborted) {
				this.activeRuns.delete(opts.threadId);
				this.suspendedRuns.set(opts.threadId, {
					runId: opts.runId,
					mastraRunId: resumedMastraRunId,
					agent,
					threadId: opts.threadId,
					user: opts.user,
					toolCallId: lastSuspension.toolCallId,
					requestId: lastSuspension.requestId,
					abortController: opts.abortController,
				});
				return;
			}

			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: opts.signal.aborted
					? { status: 'cancelled', reason: 'user_cancelled' }
					: { status: 'completed' },
			});

			// Save agent tree snapshot for session restore
			await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
		} catch (error) {
			if (opts.signal.aborted) {
				this.eventBus.publish(opts.threadId, {
					type: 'run-finish',
					runId: opts.runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				return;
			}

			this.logger.error('Instance AI resumed run error', {
				error: error instanceof Error ? error.message : String(error),
				threadId: opts.threadId,
				runId: opts.runId,
			});

			this.eventBus.publish(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: error instanceof Error ? error.message : String(error),
				},
			});
		} finally {
			this.activeRuns.delete(opts.threadId);
		}
	}

	// ── Background task management ──────────────────────────────────────────

	/** Maximum concurrent background tasks per thread to prevent resource exhaustion. */
	private readonly MAX_BACKGROUND_TASKS_PER_THREAD = 5;

	private spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: AgentTreeSnapshotStorage,
	): void {
		// Enforce per-thread concurrent task limit
		const runningCount = [...this.backgroundTasks.values()].filter(
			(t) => t.threadId === opts.threadId && t.status === 'running',
		).length;
		if (runningCount >= this.MAX_BACKGROUND_TASKS_PER_THREAD) {
			this.eventBus.publish(opts.threadId, {
				type: 'agent-completed',
				runId,
				agentId: opts.agentId,
				payload: {
					role: opts.role,
					result: '',
					error: `Cannot start background task: limit of ${this.MAX_BACKGROUND_TASKS_PER_THREAD} concurrent tasks reached. Wait for existing tasks to complete.`,
				},
			});
			return;
		}

		const abortController = new AbortController();

		// Inherit chain depth from the deepest completed/failed task in this thread,
		// incremented by 1 so each generation of auto-follow-up tasks advances the counter.
		// User-initiated runs reset depths to 0 (see startRun), so this only accumulates
		// during automatic follow-up chains.
		const currentMaxDepth = this.getMaxChainDepth(opts.threadId) + 1;

		const task: BackgroundTask = {
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			status: 'running',
			startedAt: Date.now(),
			abortController,
			corrections: [],
			chainDepth: currentMaxDepth,
		};
		this.backgroundTasks.set(opts.taskId, task);

		// Create a drain function that atomically drains queued corrections
		const drainCorrections = (): string[] => {
			const pending = [...task.corrections];
			task.corrections.length = 0;
			return pending;
		};

		// Fire-and-forget — runs detached from the orchestrator stream
		void (async () => {
			try {
				const result = await opts.run(abortController.signal, drainCorrections);
				task.status = 'completed';
				task.result = result;
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result },
				});
			} catch (error) {
				if (abortController.signal.aborted) return;
				const errorMessage = error instanceof Error ? error.message : String(error);
				task.status = 'failed';
				task.error = errorMessage;
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: '', error: errorMessage },
				});
			}
			// Re-save snapshot so the completed/failed background agent is captured
			await this.saveAgentTreeSnapshot(opts.threadId, runId, snapshotStorage, true);

			// Auto-trigger a follow-up orchestrator run so results are delivered without
			// the user needing to send another message. Only triggers when:
			// 1. No orchestrator run is currently active for this thread
			// 2. We have a stored user reference for the thread
			this.maybeFollowUpAfterBackgroundTask(opts.threadId);
		})();
	}

	/** Collect and drain completed/failed tasks for a thread. */
	private drainCompletedTasks(threadId: string): BackgroundTask[] {
		const completed: BackgroundTask[] = [];
		for (const [taskId, task] of this.backgroundTasks) {
			if (task.threadId === threadId && task.status !== 'running') {
				completed.push(task);
				this.backgroundTasks.delete(taskId);
			}
		}
		return completed;
	}

	/** Get running tasks for a thread (for status injection). */
	private getRunningTasks(threadId: string): BackgroundTask[] {
		return [...this.backgroundTasks.values()].filter(
			(t) => t.threadId === threadId && t.status === 'running',
		);
	}

	/** Prepend completed/running background task info to a user message. */
	private enrichMessageWithBackgroundTasks(threadId: string, message: string): string {
		const completedTasks = this.drainCompletedTasks(threadId);
		const runningTasks = this.getRunningTasks(threadId);

		if (completedTasks.length === 0 && runningTasks.length === 0) return message;

		const parts: string[] = [];

		for (const task of completedTasks) {
			if (task.status === 'completed') {
				let resultLine = `[Background task completed — ${task.role}]: ${task.result}`;
				// Signal auto-verification for completed workflow builds — but skip
				// if the builder already self-tested successfully (sandbox builders
				// run the workflow as part of their process).
				if (task.role === 'workflow-builder') {
					if (builderSelfTestedSuccessfully(task.result)) {
						resultLine +=
							'\n\nThe builder already tested this workflow successfully. Report completion to the user — no additional verification needed.';
					} else {
						resultLine +=
							"\n\nVERIFICATION REQUIRED: Run this workflow to verify it works before telling the user it's done. Delegate a verification sub-agent with tools [run-workflow, get-execution, debug-execution, get-workflow].";
					}
				}
				parts.push(resultLine);
			} else if (task.status === 'cancelled') {
				parts.push(`[Background task stopped by user — ${task.role}, task: ${task.taskId}]`);
			} else {
				parts.push(`[Background task failed — ${task.role}]: ${task.error}`);
			}
		}

		for (const task of runningTasks) {
			parts.push(`[Background task in progress — ${task.role}, task: ${task.taskId}]`);
		}

		return `<background-tasks>\n${parts.join('\n')}\n</background-tasks>\n\n${message}`;
	}

	/** Maximum number of automatic follow-up runs before stopping and waiting for user input. */
	private readonly MAX_AUTO_FOLLOW_UP_DEPTH = 3;

	/** Get the maximum chain depth across all non-running tasks for a thread. */
	private getMaxChainDepth(threadId: string): number {
		let max = 0;
		for (const task of this.backgroundTasks.values()) {
			if (task.threadId === threadId && task.status !== 'running') {
				max = Math.max(max, task.chainDepth);
			}
		}
		return max;
	}

	/**
	 * After a background task completes, check if the orchestrator should automatically
	 * start a follow-up run to deliver results to the user.
	 *
	 * Circuit breaker: stops auto-follow-ups after MAX_AUTO_FOLLOW_UP_DEPTH iterations
	 * to prevent infinite build → verify → fail → rebuild loops.
	 */
	private maybeFollowUpAfterBackgroundTask(threadId: string): void {
		// Don't trigger if there's already an active run — results will be picked up naturally
		if (this.activeRuns.has(threadId)) return;

		// Don't trigger if the run is suspended (awaiting confirmation)
		if (this.suspendedRuns.has(threadId)) return;

		// Need a stored user to start a run
		const user = this.threadUsers.get(threadId);
		if (!user) return;

		// Circuit breaker: check if we've exceeded the maximum auto-follow-up depth.
		// Each follow-up increments chainDepth on new background tasks. When the deepest
		// completed task exceeds the limit, stop and wait for user input.
		const maxDepth = this.getMaxChainDepth(threadId);
		if (maxDepth >= this.MAX_AUTO_FOLLOW_UP_DEPTH) {
			this.logger.debug(
				'Circuit breaker: max auto-follow-up depth reached, waiting for user input',
				{ threadId, maxDepth, limit: this.MAX_AUTO_FOLLOW_UP_DEPTH },
			);
			return;
		}

		this.logger.debug('Auto-triggering follow-up run after background task completion', {
			threadId,
			chainDepth: maxDepth + 1,
		});

		// Start a new run with a minimal continuation prompt.
		// enrichMessageWithBackgroundTasks() will prepend the completed task results.
		const researchMode = this.threadResearchMode.get(threadId);
		this.startRun(user, threadId, AUTO_FOLLOW_UP_MESSAGE, researchMode);
	}

	/** Cancel all background tasks for a thread. */
	private cancelBackgroundTasks(threadId: string): void {
		for (const [taskId, task] of this.backgroundTasks) {
			if (task.threadId === threadId && task.status === 'running') {
				task.abortController.abort();
				this.backgroundTasks.delete(taskId);
			}
		}
	}

	/**
	 * Build an agent tree from in-memory events and persist it as a thread metadata snapshot.
	 * @param isUpdate If true, updates the existing snapshot for this runId (background task completion).
	 */
	private async saveAgentTreeSnapshot(
		threadId: string,
		runId: string,
		snapshotStorage: AgentTreeSnapshotStorage,
		isUpdate = false,
	): Promise<void> {
		try {
			const runEvents = this.eventBus.getEventsForRun(threadId, runId);
			const agentTree = buildAgentTreeFromEvents(runEvents);

			if (isUpdate) {
				await snapshotStorage.updateLast(threadId, agentTree, runId);
			} else {
				await snapshotStorage.save(threadId, agentTree, runId);
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

	private buildPostgresUrl(): string {
		if (this.dbType === 'postgresdb') {
			const pg = this.postgresConfig;
			return `postgresql://${encodeURIComponent(pg.user)}:${encodeURIComponent(pg.password)}@${pg.host}:${pg.port}/${encodeURIComponent(pg.database)}`;
		}
		// Fallback for SQLite — use a local file-based store path
		return 'file:instance-ai-memory.db';
	}
}
