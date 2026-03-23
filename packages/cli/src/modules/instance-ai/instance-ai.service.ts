import type {
	InstanceAiAttachment,
	InstanceAiEvent,
	InstanceAiThreadStatusResponse,
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	createInstanceAgent,
	createAllTools,
	createMemory,
	createSandbox,
	createWorkspace,
	McpClientManager,
	BuilderSandboxFactory,
	SnapshotManager,
	workflowBuildOutcomeSchema,
	createDomainAccessTracker,
	AgentTreeSnapshotStorage,
	BackgroundTaskManager,
	buildAgentTreeFromEvents,
	enrichMessageWithBackgroundTasks,
	formatWorkflowLoopGuidance,
	MastraIterationLogStorage,
	MastraTaskStorage,
	resumeAgentRun,
	RunStateRegistry,
	streamAgentRun,
	WorkflowLoopRuntime,
	WorkflowLoopStorage,
} from '@n8n/instance-ai';
import type {
	ConfirmationData,
	DomainAccessTracker,
	McpServerConfig,
	ModelConfig,
	OrchestrationContext,
	SandboxConfig,
	SpawnBackgroundTaskOptions,
	VerificationResult,
	WorkflowBuildOutcome,
	StreamableAgent,
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
import { InstanceAiCompactionService } from './compaction.service';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Try to parse a record as a WorkflowBuildOutcome. Returns undefined if invalid. */
function parseOutcome(raw: unknown): WorkflowBuildOutcome | undefined {
	const result = workflowBuildOutcomeSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';

@Service()
export class InstanceAiService {
	private readonly mcpClientManager = new McpClientManager();

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly oauth2CallbackUrl: string;

	private readonly webhookBaseUrl: string;

	private readonly runState = new RunStateRegistry<User>();

	private readonly backgroundTasks = new BackgroundTaskManager();

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

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly eventBus: InProcessEventBus,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly compositeStore: TypeORMCompositeStore,
		private readonly compactionService: InstanceAiCompactionService,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
		const editorBaseUrl = globalConfig.editorBaseUrl || `http://localhost:${globalConfig.port}`;
		const restEndpoint = globalConfig.endpoints.rest;
		this.oauth2CallbackUrl = `${editorBaseUrl.replace(/\/$/, '')}/${restEndpoint}/oauth2-credential/callback`;
		this.webhookBaseUrl = `${editorBaseUrl.replace(/\/$/, '')}/${globalConfig.endpoints.webhook}`;

		// Initialize per-builder sandbox factory from env vars (credential-based config resolves at runtime)
		const sbxConfig = this.getSandboxConfigFromEnv();
		if (sbxConfig.enabled && sbxConfig.provider === 'daytona') {
			this.snapshotManager = new SnapshotManager(sbxConfig.image);
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig, this.snapshotManager);
		} else if (sbxConfig.enabled) {
			this.builderSandboxFactory = new BuilderSandboxFactory(sbxConfig);
		}
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
	): string {
		if (message !== AUTO_FOLLOW_UP_MESSAGE) {
			this.backgroundTasks.resetChainDepths(threadId);
		}

		const { runId, abortController, messageGroupId } = this.runState.startRun({
			threadId,
			user,
			researchMode,
			autoFollowUp: message === AUTO_FOLLOW_UP_MESSAGE,
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
		this.backgroundTasks.cancelThread(threadId);
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
		}
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(taskId: string, correction: string): void {
		this.backgroundTasks.queueCorrection(taskId, correction);
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

	async shutdown(): Promise<void> {
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
		attachments?: InstanceAiAttachment[],
		messageGroupId?: string,
	): Promise<void> {
		const signal = abortController.signal;

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

			// Domain-access tracker: get or create for this thread, set runId
			let domainTracker = this.domainAccessTrackersByThread.get(threadId);
			if (!domainTracker) {
				domainTracker = createDomainAccessTracker();
				this.domainAccessTrackersByThread.set(threadId, domainTracker);
			}
			context.domainAccessTracker = domainTracker;
			context.runId = runId;

			const mcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);

			const modelId = await this.resolveModel(user);
			const titleModel = typeof modelId === 'string' ? modelId : modelId.id;

			const memoryConfig = {
				storage: this.compositeStore,
				embedderModel: this.instanceAiConfig.embedderModel || undefined,
				lastMessages: this.instanceAiConfig.lastMessages,
				semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
				titleModel,
			};

			// Create memory instance and share it between agent, task storage, iteration log,
			// snapshot storage, and workflow loop storage
			const memory = createMemory(memoryConfig);
			const existingThread = await memory.getThreadById({ threadId });
			if (!existingThread) {
				const now = new Date();
				await memory.saveThread({
					thread: {
						id: threadId,
						resourceId: user.id,
						title: '',
						createdAt: now,
						updatedAt: now,
					},
				});
			}
			const taskStorage = new MastraTaskStorage(memory);
			const iterationLog = new MastraIterationLogStorage(memory);
			const snapshotStorage = new AgentTreeSnapshotStorage(memory);
			const workflowLoopStorage = new WorkflowLoopStorage(memory);
			const workflowLoopRuntime = new WorkflowLoopRuntime(workflowLoopStorage);

			// Replay existing tasks to the new run's agentTree so the frontend shows them immediately
			const existingTasks = await taskStorage.get(threadId);
			if (existingTasks) {
				this.eventBus.publish(threadId, {
					type: 'tasks-update',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { tasks: existingTasks },
				});
			}

			// Configure workflow-sdk schema validation dirs for build-workflow tool
			const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
			if (nodeDefDirs.length > 0) {
				setSchemaBaseDirs(nodeDefDirs);
			}

			// Build domain tools for orchestration context (delegate needs them)
			const domainTools = createAllTools(context);

			// Get or create sandbox workspace for this thread (persists across messages)
			const sandboxEntry = await this.getOrCreateWorkspace(threadId, user);

			const orchestrationContext: OrchestrationContext = {
				threadId,
				runId,
				userId: user.id,
				orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
				modelId,
				storage: this.compositeStore,
				subAgentMaxSteps: this.instanceAiConfig.subAgentMaxSteps,
				eventBus: this.eventBus,
				domainTools,
				abortSignal: signal,
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
						});
					});
				},
				cancelBackgroundTask: async (taskId) => this.cancelBackgroundTask(threadId, taskId),
				spawnBackgroundTask: (opts) => this.spawnBackgroundTask(runId, opts, snapshotStorage),
				iterationLog,
				sendCorrectionToTask: (taskId, correction) => this.sendCorrectionToTask(taskId, correction),
				reportVerificationVerdict: async (verdict: VerificationResult) =>
					await workflowLoopRuntime.applyVerificationVerdict(threadId, verdict),
				getWorkItemBuildOutcome: async (workItemId: string) => {
					const item = await workflowLoopStorage.getWorkItem(threadId, workItemId);
					return item?.lastBuildOutcome ?? undefined;
				},
				updateWorkItemBuildOutcome: async (workItemId: string, update) => {
					const item = await workflowLoopStorage.getWorkItem(threadId, workItemId);
					if (!item?.lastBuildOutcome) return;
					const updatedOutcome = { ...item.lastBuildOutcome, ...update };
					await workflowLoopStorage.saveWorkItem(
						threadId,
						item.state,
						item.attempts,
						updatedOutcome,
					);
				},
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
				disableDeferredTools: true,
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

			const enrichedMessage = await this.buildMessageWithBackgroundTasks(
				threadId,
				message,
				workflowLoopRuntime,
			);

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

		const resumeData = {
			approved: data.approved,
			...(data.credentialId ? { credentialId: data.credentialId } : {}),
			...(data.credentials ? { credentials: data.credentials } : {}),
			...(data.autoSetup ? { autoSetup: data.autoSetup } : {}),
			...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
			...(data.domainAccessAction ? { domainAccessAction: data.domainAccessAction } : {}),
		};

		// Create snapshot storage for saving agent tree after resumed run completes
		const memory = createMemory({
			storage: this.compositeStore,
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
		snapshotStorage: AgentTreeSnapshotStorage,
	): void {
		this.backgroundTasks.spawn({
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			messageGroupId: this.runState.getMessageGroupId(opts.threadId),
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
			},
			onFailed: async (task) => {
				this.eventBus.publish(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: '', error: task.error ?? 'Unknown error' },
				});
			},
			onSettled: async (task) => {
				await this.saveAgentTreeSnapshot(
					opts.threadId,
					runId,
					snapshotStorage,
					true,
					task.messageGroupId,
				);
				this.maybeFollowUpAfterBackgroundTask(opts.threadId);
			},
		});
	}

	private async buildMessageWithBackgroundTasks(
		threadId: string,
		message: string,
		workflowLoopRuntime: WorkflowLoopRuntime,
	): Promise<string> {
		return await enrichMessageWithBackgroundTasks(
			message,
			this.backgroundTasks.drainCompletedTasks(threadId),
			this.backgroundTasks.getRunningTasks(threadId),
			{
				formatCompletedTask: async (task) => {
					let resultLine = `[Background task completed — ${task.role}]: ${task.result ?? ''}`;
					if (task.role !== 'workflow-builder') return resultLine;

					const outcome = parseOutcome(task.outcome);
					if (!outcome) {
						resultLine +=
							'\n\nVERIFICATION: If a workflow was built, run it to verify before reporting to the user.';
						return resultLine;
					}

					const action = await workflowLoopRuntime.applyBuildOutcome(task.threadId, outcome);
					resultLine += `\n\n${formatWorkflowLoopGuidance(action, { workItemId: outcome.workItemId })}`;
					return resultLine;
				},
			},
		);
	}

	private maybeFollowUpAfterBackgroundTask(threadId: string): void {
		const hasActiveRun = this.runState.hasActiveRun(threadId);
		const hasSuspendedRun = this.runState.hasSuspendedRun(threadId);
		const maxDepth = this.backgroundTasks.getMaxChainDepth(threadId);
		const user = this.runState.getThreadUser(threadId);
		if (!user) return;

		if (!this.backgroundTasks.canAutoFollowUp(threadId, { hasActiveRun, hasSuspendedRun })) {
			if (!hasActiveRun && !hasSuspendedRun) {
				this.logger.debug(
					'Circuit breaker: max auto-follow-up depth reached, waiting for user input',
					{ threadId, maxDepth, limit: 3 },
				);
			}
			return;
		}

		this.logger.debug('Auto-triggering follow-up run after background task completion', {
			threadId,
			chainDepth: maxDepth + 1,
		});

		const researchMode = this.runState.getThreadResearchMode(threadId);
		this.startRun(user, threadId, AUTO_FOLLOW_UP_MESSAGE, researchMode);
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
		snapshotStorage: AgentTreeSnapshotStorage,
	): Promise<void> {
		this.publishRunFinish(threadId, runId, status);
		if (status === 'completed') {
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
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
