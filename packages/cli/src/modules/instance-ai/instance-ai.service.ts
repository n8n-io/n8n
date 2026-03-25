import type {
	InstanceAiAttachment,
	InstanceAiEvent,
	InstanceAiThreadStatusResponse,
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
	TaskList,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UrlService } from '@/services/url.service';
import {
	createInstanceAgent,
	createAllTools,
	createMemory,
	createSandbox,
	createWorkspace,
	McpClientManager,
	BuilderSandboxFactory,
	SnapshotManager,
	createDomainAccessTracker,
	BackgroundTaskManager,
	buildAgentTreeFromEvents,
	enrichMessageWithBackgroundTasks,
	MastraTaskStorage,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	resumeAgentRun,
	RunStateRegistry,
	startBuildWorkflowAgentTask,
	startDataTableAgentTask,
	startDetachedDelegateTask,
	startResearchAgentTask,
	streamAgentRun,
	type ConfirmationData,
	type DomainAccessTracker,
	type ManagedBackgroundTask,
	type McpServerConfig,
	type ModelConfig,
	type OrchestrationContext,
	type PlannedTaskGraph,
	type PlannedTaskRecord,
	type SandboxConfig,
	type SpawnBackgroundTaskOptions,
	type StreamableAgent,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { InProcessEventBus } from './event-bus/in-process-event-bus';
import type { LocalGateway } from './filesystem';
import { LocalGatewayRegistry, LocalFilesystemProvider } from './filesystem';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';
import { TypeORMCompositeStore } from './storage/typeorm-composite-store';
import type { TypeORMWorkflowsStorage } from './storage/typeorm-workflows-storage';
import { DbSnapshotStorage } from './storage/db-snapshot-storage';
import { DbIterationLogStorage } from './storage/db-iteration-log-storage';
import { InstanceAiCompactionService } from './compaction.service';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createInertAbortSignal(): AbortSignal {
	return new AbortController().signal;
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';
const MAX_CONCURRENT_BACKGROUND_TASKS_PER_THREAD = 5;

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

	/** Active sandboxes keyed by thread ID — persisted across messages within a conversation. */
	private readonly sandboxes = new Map<
		string,
		{ sandbox: ReturnType<typeof createSandbox>; workspace: ReturnType<typeof createWorkspace> }
	>();

	/** Singleton local filesystem provider — created lazily when filesystem config is enabled. */
	private localFsProvider?: LocalFilesystemProvider;

	/** Per-user Local Gateway connections. Handles pairing tokens, session keys, and tool dispatch. */
	private readonly gatewayRegistry = new LocalGatewayRegistry();

	/** Domain-access trackers per thread — persists approvals across runs within a conversation. */
	private readonly domainAccessTrackersByThread = new Map<string, DomainAccessTracker>();

	/** Pre-warmed image manager for builder sandboxes (Daytona only). */
	private snapshotManager?: SnapshotManager;

	/** Factory for creating per-builder ephemeral sandboxes. */
	private builderSandboxFactory?: BuilderSandboxFactory;

	/** Periodic sweep that auto-rejects timed-out HITL confirmations. */
	private confirmationTimeoutInterval?: NodeJS.Timeout;

	/** Default IANA timezone for the instance (from GENERIC_TIMEZONE env var). */
	private readonly defaultTimeZone: string;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly compositeStore: TypeORMCompositeStore,
		private readonly compactionService: InstanceAiCompactionService,
		private readonly urlService: UrlService,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
		private readonly dbIterationLogStorage: DbIterationLogStorage,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
		this.defaultTimeZone = globalConfig.generic.timezone;
		const editorBaseUrl = globalConfig.editorBaseUrl || `http://localhost:${globalConfig.port}`;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${editorBaseUrl.replace(/\/$/, '')}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${this.urlService.getWebhookBaseUrl()}${globalConfig.endpoints.webhook}`;

		// Initialize per-builder sandbox factory from env vars (credential-based config resolves at runtime)
		const sbxConfig = this.getSandboxConfigFromEnv();
		if (sbxConfig.enabled && sbxConfig.provider === 'daytona') {
			this.snapshotManager = new SnapshotManager(sbxConfig.image);
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig, this.snapshotManager);
		} else if (sbxConfig.enabled) {
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig);
		}

		this.startConfirmationTimeoutSweep();
	}

	private startConfirmationTimeoutSweep(): void {
		const timeoutMs = 10 * Time.minutes.toMilliseconds;

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

	private async resolveSandboxConfig(user: User): Promise<SandboxConfig> {
		const base = this.getSandboxConfigFromEnv();
		if (!base.enabled) return base;
		const daytona = await this.settingsService.resolveDaytonaConfig(user);
		return {
			...base,
			daytonaApiUrl: daytona.apiUrl ?? base.daytonaApiUrl,
			daytonaApiKey: daytona.apiKey ?? base.daytonaApiKey,
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
	private async getOrCreateWorkspace(threadId: string, user: User) {
		const existing = this.sandboxes.get(threadId);
		if (existing) return existing;

		const config = await this.resolveSandboxConfig(user);
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

	/** Local filesystem is only available when an explicit base path is configured. */
	isLocalFilesystemAvailable(): boolean {
		return !!this.instanceAiConfig.filesystemPath?.trim();
	}

	/** Return the configured filesystem root directory, or null if not configured. */
	getLocalFilesystemDirectory(): string | null {
		const basePath = this.instanceAiConfig.filesystemPath?.trim();
		return basePath || null;
	}

	hasActiveRun(threadId: string): boolean {
		return this.runState.hasLiveRun(threadId);
	}

	getThreadStatus(threadId: string): InstanceAiThreadStatusResponse {
		return this.runState.getThreadStatus(threadId, this.backgroundTasks.getTaskSnapshots(threadId));
	}

	startRun(
		user: User,
		threadId: string,
		message: string,
		researchMode?: boolean,
		attachments?: InstanceAiAttachment[],
		timeZone?: string,
	): string {
		const { runId, abortController, messageGroupId } = this.runState.startRun({
			threadId,
			user,
			researchMode,
		});

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
			this.eventBus.publish(threadId, {
				type: 'agent-completed',
				runId: task.runId,
				agentId: task.agentId,
				payload: { role: task.role, result: '', error: 'Cancelled by user' },
			});
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
			this.eventBus.publish(threadId, {
				type: 'run-finish',
				runId: suspended.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { status: 'cancelled', reason: 'user_cancelled' },
			});
			if (suspended.mastraRunId) {
				void this.cleanupMastraSnapshots(suspended.mastraRunId);
			}
		}
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		return this.backgroundTasks.queueCorrection(taskId, correction);
	}

	/** Cancel a single background task by ID. */
	cancelBackgroundTask(threadId: string, taskId: string): void {
		const task = this.backgroundTasks.cancelTask(threadId, taskId);
		if (!task) return;

		this.eventBus.publish(threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		const user = this.runState.getThreadUser(threadId);
		if (user) {
			void this.handlePlannedTaskSettlement(user, task, 'cancelled');
		}
	}

	// ── Gateway lifecycle (delegated to LocalGatewayRegistry) ───────────────

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
		return this.settingsService.isFilesystemDisabled();
	}

	getGatewayStatus(userId: string): {
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
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
		if (active) active.abortController.abort();
		if (suspended) suspended.abortController.abort();

		// Cancel background tasks belonging to this thread
		for (const task of this.backgroundTasks.cancelThread(threadId)) {
			task.abortController.abort();
		}

		this.domainAccessTrackersByThread.delete(threadId);
		await this.destroySandbox(threadId);
		this.eventBus.clearThread(threadId);
	}

	async shutdown(): Promise<void> {
		if (this.confirmationTimeoutInterval) {
			clearInterval(this.confirmationTimeoutInterval);
			this.confirmationTimeoutInterval = undefined;
		}

		const { activeRuns, suspendedRuns } = this.runState.shutdown();
		for (const run of activeRuns) run.abortController.abort();
		for (const run of suspendedRuns) run.abortController.abort();
		for (const task of this.backgroundTasks.cancelAll()) task.abortController.abort();

		this.gatewayRegistry.disconnectAll();

		// Destroy all active sandboxes
		const sandboxCleanups = [...this.sandboxes.keys()].map(
			async (threadId) => await this.destroySandbox(threadId),
		);
		await Promise.allSettled(sandboxCleanups);

		this.domainAccessTrackersByThread.clear();

		this.snapshotManager?.invalidate();
		this.eventBus.clear();
		await this.mcpClientManager.disconnect();
		this.logger.debug('Instance AI service shut down');
	}

	private createMemoryConfig(titleModel?: string) {
		return {
			storage: this.compositeStore,
			embedderModel: this.instanceAiConfig.embedderModel || undefined,
			lastMessages: this.instanceAiConfig.lastMessages,
			semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
			titleModel,
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

	private async createPlannedTaskState(titleModel?: string) {
		const memory = createMemory(this.createMemoryConfig(titleModel));
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
	) {
		const localGatewayDisabled = this.settingsService.isFilesystemDisabled();
		const userGateway = this.gatewayRegistry.findGateway(user.id);
		const localFilesystemService =
			!localGatewayDisabled && !userGateway?.isConnected && this.isLocalFilesystemAvailable()
				? this.getLocalFsProvider()
				: undefined;
		const context = this.adapterService.createContext(user, localFilesystemService);
		if (!localGatewayDisabled && userGateway?.isConnected) {
			context.localMcpServer = userGateway;
		}
		context.permissions = this.settingsService.getPermissions();

		let domainTracker = this.domainAccessTrackersByThread.get(threadId);
		if (!domainTracker) {
			domainTracker = createDomainAccessTracker();
			this.domainAccessTrackersByThread.set(threadId, domainTracker);
		}
		context.domainAccessTracker = domainTracker;
		context.runId = runId;

		const modelId = await this.resolveModel(user);
		const titleModel = typeof modelId === 'string' ? modelId : modelId.id;
		const memory = createMemory(this.createMemoryConfig(titleModel));
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
			domainTools,
			abortSignal,
			taskStorage,
			researchMode,
			browserMcpConfig: this.instanceAiConfig.browserMcp
				? { name: 'chrome-devtools', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'] }
				: undefined,
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
				});
			},
			cancelBackgroundTask: async (taskId) => this.cancelBackgroundTask(threadId, taskId),
			spawnBackgroundTask: (opts) =>
				this.spawnBackgroundTask(runId, opts, snapshotStorage, messageGroupId),
			plannedTaskService,
			schedulePlannedTasks: async () => await this.schedulePlannedTasks(user, threadId),
			iterationLog,
			sendCorrectionToTask: (taskId, correction) => this.sendCorrectionToTask(taskId, correction),
			workflowTaskService: workflowTasks,
			workspace: sandboxEntry?.workspace,
			builderSandboxFactory: this.builderSandboxFactory,
			nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
			domainContext: context,
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
		let started: { taskId: string; agentId: string; result: string } | null = null;

		switch (task.kind) {
			case 'build-workflow':
				started = await startBuildWorkflowAgentTask(context, {
					task: task.spec,
					workflowId: task.workflowId,
					plannedTaskId: task.id,
				});
				break;
			case 'manage-data-tables':
				started = startDataTableAgentTask(context, {
					task: task.spec,
					plannedTaskId: task.id,
				});
				break;
			case 'research':
				started = startResearchAgentTask(context, {
					goal: task.title,
					constraints: task.spec,
					plannedTaskId: task.id,
				});
				break;
			case 'delegate':
				started = await startDetachedDelegateTask(context, {
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

		for (const task of action.tasks) {
			await this.dispatchPlannedTask(task, environment.orchestrationContext);
		}

		await this.schedulePlannedTasks(user, threadId);
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
		const mastraRunId = '';

		try {
			// Publish run-start (includes userId for audit trail attribution)
			this.eventBus.publish(threadId, {
				type: 'run-start',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				userId: user.id,
				payload: { messageId: nanoid(), messageGroupId },
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

			const { context, memory, taskStorage, snapshotStorage, modelId, orchestrationContext } =
				await this.createExecutionEnvironment(
					user,
					threadId,
					runId,
					signal,
					researchMode,
					messageGroupId,
				);
			const memoryConfig = this.createMemoryConfig(
				typeof modelId === 'string' ? modelId : modelId.id,
			);

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
			const conversationSummary = await this.compactionService.prepareCompactedContext(
				threadId,
				memory,
				modelId,
				this.instanceAiConfig.lastMessages ?? 20,
			);
			this.eventBus.publish(threadId, {
				type: 'status',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { message: '' },
			});

			const enrichedMessage = await this.buildMessageWithRunningTasks(threadId, message);

			// Compose runtime input: conversation summary → background tasks → user message
			const fullMessage = conversationSummary
				? `${conversationSummary}\n\n${enrichedMessage}`
				: enrichedMessage;

			// Build multimodal message when attachments are present
			const streamInput =
				attachments && attachments.length > 0
					? [
							{
								role: 'user' as const,
								content: [
									{ type: 'text' as const, text: fullMessage },
									...attachments.map((a) => ({
										type: 'file' as const,
										data: a.data,
										mimeType: a.mimeType,
									})),
								],
							},
						]
					: fullMessage;

			const result = await streamAgentRun(
				agent as StreamableAgent,
				streamInput,
				{
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
				},
			);

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
						createdAt: Date.now(),
					});
				}

				return;
			}

			await this.finalizeRun(threadId, runId, result.status, snapshotStorage);
		} catch (error) {
			if (signal.aborted) {
				this.publishRunFinish(threadId, runId, 'cancelled', 'user_cancelled');
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI run error', {
				error: errorMessage,
				threadId,
				runId,
			});

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
			this.domainAccessTrackersByThread.get(threadId)?.clearRun(runId);
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
			return true;
		}

		return await this.resumeSuspendedRun(requestingUserId, requestId, data);
	}

	private async resumeSuspendedRun(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): Promise<boolean> {
		const suspended = this.runState.findSuspendedByRequestId(requestId);
		if (!suspended) return false;

		const { agent, runId, mastraRunId, threadId, user, toolCallId, abortController } = suspended;
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
		},
	): Promise<void> {
		try {
			const result = await resumeAgentRun(
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
						createdAt: Date.now(),
					});
				}

				return;
			}

			await this.finalizeRun(opts.threadId, opts.runId, result.status, opts.snapshotStorage);
		} catch (error) {
			if (opts.signal.aborted) {
				this.publishRunFinish(opts.threadId, opts.runId, 'cancelled', 'user_cancelled');
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI resumed run error', {
				error: errorMessage,
				threadId: opts.threadId,
				runId: opts.runId,
			});

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
			run: opts.run,
			onLimitReached: (errorMessage) => {
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
							const summary = task.result
								? `Background task "${opts.role}" completed: ${task.result}`
								: task.error
									? `Background task "${opts.role}" failed: ${task.error}`
									: `Background task "${opts.role}" finished.`;
							await this.startInternalFollowUpRun(
								user,
								opts.threadId,
								`<background-task-completed>\n${summary}\n</background-task-completed>\n\n${AUTO_FOLLOW_UP_MESSAGE}`,
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

	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled',
		reason?: string,
	): void {
		this.eventBus.publish(threadId, {
			type: 'run-finish',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload: status === 'cancelled' ? { status, reason: reason ?? 'user_cancelled' } : { status },
		});
	}

	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled',
		snapshotStorage: DbSnapshotStorage,
	): Promise<void> {
		this.publishRunFinish(threadId, runId, status);
		if (status === 'completed') {
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
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
