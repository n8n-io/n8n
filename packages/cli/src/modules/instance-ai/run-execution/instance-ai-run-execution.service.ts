import {
	applyBranchReadOnlyOverrides,
	buildProxyHeaders,
	type InstanceAiAttachment,
	type InstanceAiEvent,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import {
	MAX_STEPS,
	createInstanceAgent,
	createAllTools,
	createMemory,
	createInstanceAiTraceContext,
	createDomainAccessTracker,
	classifyAttachments,
	buildAttachmentManifest,
	isParseableAttachment,
	enrichMessageWithBackgroundTasks,
	MastraTaskStorage,
	PlannedTaskCoordinator,
	PlannedTaskStorage,
	PLANNED_TASK_PERMISSION_OVERRIDES,
	resumeAgentRun,
	streamAgentRun,
	truncateToTitle,
	patchThread,
	type BackgroundTaskManager,
	type ConfirmationData,
	type DomainAccessTracker,
	type InstanceAiTraceContext,
	type ManagedBackgroundTask,
	type McpClientManager,
	type McpServerConfig,
	type ModelConfig,
	type OrchestrationContext,
	type RunStateRegistry,
	type ServiceProxyConfig,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type StreamableAgent,
	type SuspendedRunState,
	type TerminalResponseDecision,
	type TerminalResponseStatus,
	type WorkSummary,
	WorkflowTaskCoordinator,
	WorkflowLoopStorage,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { N8N_VERSION, WORKFLOW_SDK_VERSION } from '@/constants';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { AiService } from '@/services/ai.service';
import { ProxyTokenManager } from '@/services/proxy-token-manager';

import type { InstanceAiCompactionService } from '../compaction.service';
import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import type { LocalGatewayRegistry } from '../filesystem';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import type { InstanceAiLivenessService } from '../liveness';
import { INSTANCE_AI_RUN_TIMEOUT_REASON } from '../liveness';
import type { InstanceAiSandboxService } from '../sandbox/instance-ai-sandbox.service';
import type { DbIterationLogStorage } from '../storage/db-iteration-log-storage';
import type { DbSnapshotStorage } from '../storage/db-snapshot-storage';
import type { TypeORMCompositeStore } from '../storage/typeorm-composite-store';
import type {
	InstanceAiTraceService,
	MessageTraceFinalization,
} from '../tracing/instance-ai-trace.service';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
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

function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';

export type InstanceAiRunExecutionServiceDeps = {
	instanceAiConfig: InstanceAiConfig;
	defaultTimeZone: string;
	oauth2CallbackUrl: string;
	webhookBaseUrl: string;
	formBaseUrl: string;
	adapterService: InstanceAiAdapterService;
	eventBus: InProcessEventBus;
	settingsService: InstanceAiSettingsService;
	compositeStore: TypeORMCompositeStore;
	compactionService: InstanceAiCompactionService;
	aiService: AiService;
	dbSnapshotStorage: DbSnapshotStorage;
	dbIterationLogStorage: DbIterationLogStorage;
	sourceControlPreferencesService: SourceControlPreferencesService;
	telemetry: { track: (eventName: string, properties?: Record<string, unknown>) => void };
	logger: Logger;
	mcpClientManager: McpClientManager;
	runState: RunStateRegistry<User>;
	backgroundTasks: BackgroundTaskManager;
	gatewayRegistry: LocalGatewayRegistry;
	domainAccessTrackersByThread: Map<string, DomainAccessTracker>;
	threadPushRef: Map<string, string>;
	liveness: InstanceAiLivenessService<SuspendedRunState<User>>;
	sandboxService: InstanceAiSandboxService;
	traceService: InstanceAiTraceService;
	createMemoryConfig: () => Parameters<typeof createMemory>[0];
	ensureThreadExists: (
		memory: ReturnType<typeof createMemory>,
		threadId: string,
		resourceId: string,
	) => Promise<void>;
	resolveProxyModel: (
		user: User,
		proxyBaseUrl: string,
		tokenManager: ProxyTokenManager,
	) => Promise<ModelConfig>;
	resolveAgentModelConfig: (user: User) => Promise<ModelConfig>;
	getOrCreateWorkspace: (
		threadId: string,
		user: User,
	) => Promise<{ workspace: OrchestrationContext['workspace'] } | undefined>;
	createBuilderFactory: (user: User) => Promise<OrchestrationContext['builderSandboxFactory']>;
	cancelBackgroundTask: (threadId: string, taskId: string) => void;
	spawnBackgroundTask: (
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: DbSnapshotStorage,
		messageGroupIdOverride?: string,
	) => SpawnBackgroundTaskResult;
	sendCorrectionToTask: (
		threadId: string,
		taskId: string,
		correction: string,
	) => 'queued' | 'task-completed' | 'task-not-found';
	getCheckpointAllowedWorkflowIds: (
		threadId: string,
		checkpointTaskId: string,
	) => Promise<ReadonlySet<string>>;
	evaluateTerminalResponse: (
		threadId: string,
		runId: string,
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options?: {
			messageGroupId?: string;
			correlationId?: string;
			workSummary?: WorkSummary;
			errorMessage?: string;
		},
	) => TerminalResponseDecision | undefined;
	evaluateWaitingResponse: (
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options?: { messageGroupId?: string; correlationId?: string },
	) => TerminalResponseDecision | undefined;
	finishInvalidConfirmationRun: (args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: DbSnapshotStorage;
		tracing?: InstanceAiTraceContext;
	}) => Promise<MessageTraceFinalization>;
	configureTraceReplayMode: (tracing: InstanceAiTraceContext) => Promise<void>;
	storeTraceContext: (
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	) => void;
	finalizeRunTracing: (
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		options: MessageTraceFinalization,
	) => Promise<void>;
	maybeFinalizeRunTraceRoot: (runId: string, options: MessageTraceFinalization) => Promise<void>;
	reapAiTemporaryFromRun: (
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
	) => Promise<string[]>;
	finalizeRun: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		snapshotStorage: DbSnapshotStorage,
		options?: { userId?: string; modelId?: ModelConfig; archivedWorkflowIds?: string[] },
	) => Promise<void>;
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
	) => void;
	saveAgentTreeSnapshot: (
		threadId: string,
		runId: string,
		snapshotStorage: DbSnapshotStorage,
		isUpdate?: boolean,
		overrideMessageGroupId?: string,
	) => Promise<void>;
	countCreditsIfFirst: (user: User, threadId: string, runId: string) => Promise<void>;
	cleanupMastraSnapshots: (mastraRunId: string) => Promise<void>;
	schedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
	drainPendingCheckpointReentries: (user: User, threadId: string) => Promise<void>;
	finalizeCheckpointFollowUp: (
		user: User,
		threadId: string,
		checkpointTaskId: string,
	) => Promise<void>;
};

export class InstanceAiRunExecutionService {
	constructor(private readonly deps: InstanceAiRunExecutionServiceDeps) {}

	private get instanceAiConfig() {
		return this.deps.instanceAiConfig;
	}
	private get defaultTimeZone() {
		return this.deps.defaultTimeZone;
	}
	private get oauth2CallbackUrl() {
		return this.deps.oauth2CallbackUrl;
	}
	private get webhookBaseUrl() {
		return this.deps.webhookBaseUrl;
	}
	private get formBaseUrl() {
		return this.deps.formBaseUrl;
	}
	private get adapterService() {
		return this.deps.adapterService;
	}
	private get eventBus() {
		return this.deps.eventBus;
	}
	private get settingsService() {
		return this.deps.settingsService;
	}
	private get compositeStore() {
		return this.deps.compositeStore;
	}
	private get compactionService() {
		return this.deps.compactionService;
	}
	private get aiService() {
		return this.deps.aiService;
	}
	private get dbSnapshotStorage() {
		return this.deps.dbSnapshotStorage;
	}
	private get dbIterationLogStorage() {
		return this.deps.dbIterationLogStorage;
	}
	private get sourceControlPreferencesService() {
		return this.deps.sourceControlPreferencesService;
	}
	private get telemetry() {
		return this.deps.telemetry;
	}
	private get logger() {
		return this.deps.logger;
	}
	private get mcpClientManager() {
		return this.deps.mcpClientManager;
	}
	private get runState() {
		return this.deps.runState;
	}
	private get backgroundTasks() {
		return this.deps.backgroundTasks;
	}
	private get gatewayRegistry() {
		return this.deps.gatewayRegistry;
	}
	private get domainAccessTrackersByThread() {
		return this.deps.domainAccessTrackersByThread;
	}
	private get threadPushRef() {
		return this.deps.threadPushRef;
	}
	private get liveness() {
		return this.deps.liveness;
	}
	private get sandboxService() {
		return this.deps.sandboxService;
	}
	private get traceService() {
		return this.deps.traceService;
	}

	private createMemoryConfig(): Parameters<typeof createMemory>[0] {
		return this.deps.createMemoryConfig();
	}
	private async ensureThreadExists(
		memory: ReturnType<typeof createMemory>,
		threadId: string,
		resourceId: string,
	): Promise<void> {
		await this.deps.ensureThreadExists(memory, threadId, resourceId);
	}
	private async resolveProxyModel(
		user: User,
		proxyBaseUrl: string,
		tokenManager: ProxyTokenManager,
	): Promise<ModelConfig> {
		return await this.deps.resolveProxyModel(user, proxyBaseUrl, tokenManager);
	}
	private async resolveAgentModelConfig(user: User): Promise<ModelConfig> {
		return await this.deps.resolveAgentModelConfig(user);
	}
	private async getOrCreateWorkspace(threadId: string, user: User) {
		return await this.deps.getOrCreateWorkspace(threadId, user);
	}
	private async createBuilderFactory(user: User) {
		return await this.deps.createBuilderFactory(user);
	}
	private cancelBackgroundTask(threadId: string, taskId: string): void {
		this.deps.cancelBackgroundTask(threadId, taskId);
	}
	private spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: DbSnapshotStorage,
		messageGroupIdOverride?: string,
	): SpawnBackgroundTaskResult {
		return this.deps.spawnBackgroundTask(runId, opts, snapshotStorage, messageGroupIdOverride);
	}
	private sendCorrectionToTask(
		threadId: string,
		taskId: string,
		correction: string,
	): 'queued' | 'task-completed' | 'task-not-found' {
		return this.deps.sendCorrectionToTask(threadId, taskId, correction);
	}
	private async getCheckpointAllowedWorkflowIds(
		threadId: string,
		checkpointTaskId: string,
	): Promise<ReadonlySet<string>> {
		return await this.deps.getCheckpointAllowedWorkflowIds(threadId, checkpointTaskId);
	}
	private evaluateTerminalResponse(
		threadId: string,
		runId: string,
		status: Exclude<TerminalResponseStatus, 'waiting'>,
		options?: {
			messageGroupId?: string;
			correlationId?: string;
			workSummary?: WorkSummary;
			errorMessage?: string;
		},
	): TerminalResponseDecision | undefined {
		return this.deps.evaluateTerminalResponse(threadId, runId, status, options);
	}
	private evaluateWaitingResponse(
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options?: { messageGroupId?: string; correlationId?: string },
	): TerminalResponseDecision | undefined {
		return this.deps.evaluateWaitingResponse(threadId, runId, confirmationEvent, options);
	}
	private async finishInvalidConfirmationRun(args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: DbSnapshotStorage;
		tracing?: InstanceAiTraceContext;
	}): Promise<MessageTraceFinalization> {
		return await this.deps.finishInvalidConfirmationRun(args);
	}
	private async configureTraceReplayMode(tracing: InstanceAiTraceContext): Promise<void> {
		await this.deps.configureTraceReplayMode(tracing);
	}
	private storeTraceContext(
		runId: string,
		threadId: string,
		tracing: InstanceAiTraceContext,
		messageGroupId?: string,
	): void {
		this.deps.storeTraceContext(runId, threadId, tracing, messageGroupId);
	}
	private async finalizeRunTracing(
		runId: string,
		tracing: InstanceAiTraceContext | undefined,
		options: MessageTraceFinalization,
	): Promise<void> {
		await this.deps.finalizeRunTracing(runId, tracing, options);
	}
	private async maybeFinalizeRunTraceRoot(
		runId: string,
		options: MessageTraceFinalization,
	): Promise<void> {
		await this.deps.maybeFinalizeRunTraceRoot(runId, options);
	}
	private async reapAiTemporaryFromRun(
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
	): Promise<string[]> {
		return await this.deps.reapAiTemporaryFromRun(threadId, user, createdWorkflowIds);
	}
	private async finalizeRun(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		snapshotStorage: DbSnapshotStorage,
		options?: { userId?: string; modelId?: ModelConfig; archivedWorkflowIds?: string[] },
	): Promise<void> {
		await this.deps.finalizeRun(threadId, runId, status, snapshotStorage, options);
	}
	private publishRunFinish(
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
		archivedWorkflowIds?: string[],
	): void {
		this.deps.publishRunFinish(threadId, runId, status, reason, archivedWorkflowIds);
	}
	private async saveAgentTreeSnapshot(
		threadId: string,
		runId: string,
		snapshotStorage: DbSnapshotStorage,
		isUpdate?: boolean,
		overrideMessageGroupId?: string,
	): Promise<void> {
		await this.deps.saveAgentTreeSnapshot(
			threadId,
			runId,
			snapshotStorage,
			isUpdate,
			overrideMessageGroupId,
		);
	}
	private async countCreditsIfFirst(user: User, threadId: string, runId: string): Promise<void> {
		await this.deps.countCreditsIfFirst(user, threadId, runId);
	}
	private async cleanupMastraSnapshots(mastraRunId: string): Promise<void> {
		await this.deps.cleanupMastraSnapshots(mastraRunId);
	}
	private async schedulePlannedTasks(user: User, threadId: string): Promise<void> {
		await this.deps.schedulePlannedTasks(user, threadId);
	}
	private async drainPendingCheckpointReentries(user: User, threadId: string): Promise<void> {
		await this.deps.drainPendingCheckpointReentries(user, threadId);
	}
	private async finalizeCheckpointFollowUp(
		user: User,
		threadId: string,
		checkpointTaskId: string,
	): Promise<void> {
		await this.deps.finalizeCheckpointFollowUp(user, threadId, checkpointTaskId);
	}

	async createExecutionEnvironment(
		user: User,
		threadId: string,
		runId: string,
		abortSignal: AbortSignal,
		researchMode?: boolean,
		messageGroupId?: string,
		pushRef?: string,
	) {
		const localGatewayDisabledGlobally =
			this.settingsService.getAdminSettings().localGatewayDisabled;
		const localGatewayDisabledForUser = await this.settingsService.isLocalGatewayDisabledForUser(
			user.id,
		);
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
		if (!localGatewayDisabledForUser && userGateway?.isConnected) {
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
		if (localGatewayDisabledGlobally) {
			context.localGatewayStatus = { status: 'disabledGlobally' };
		} else if (!localGatewayDisabledForUser && userGateway?.isConnected) {
			context.localGatewayStatus = {
				status: 'connected',
				capabilities: userGateway
					.getStatus()
					.toolCategories.filter(({ enabled }) => enabled)
					.map(({ name }) => name),
			};
		} else {
			context.localGatewayStatus = {
				status: localGatewayDisabledForUser ? 'disabled' : 'disconnected',
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
			trackTelemetry: (eventName, properties) => {
				this.telemetry.track(eventName, properties);
			},
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
			touchRun: () => this.runState.touchActiveRun(threadId),
			touchBackgroundTask: (taskId) => this.backgroundTasks.touchTask(threadId, taskId),
			plannedTaskService,
			schedulePlannedTasks: async () => await this.schedulePlannedTasks(user, threadId),
			iterationLog,
			sendCorrectionToTask: (taskId, correction) =>
				this.sendCorrectionToTask(threadId, taskId, correction),
			workflowTaskService: workflowTasks,
			workspace: sandboxEntry?.workspace,
			builderSandboxFactory: await this.createBuilderFactory(user),
			builderSandboxSessionRegistry: this.sandboxService.getSessionRegistry(),
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

	async executeRun(
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
		let activeSnapshotStorage: DbSnapshotStorage | undefined;
		let messageId = '';

		try {
			messageId = nanoid();

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
				this.evaluateTerminalResponse(threadId, runId, 'cancelled', {
					messageGroupId,
					correlationId: messageId,
				});
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
			const environment = await this.createExecutionEnvironment(
				user,
				threadId,
				runId,
				signal,
				researchMode,
				messageGroupId,
				executionPushRef,
			);
			activeSnapshotStorage = environment.snapshotStorage;
			const { context, memory, taskStorage, snapshotStorage, modelId, orchestrationContext } =
				environment;
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
				n8nVersion: N8N_VERSION,
				workflowSdkVersion: WORKFLOW_SDK_VERSION,
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
				mcpManager: this.mcpClientManager,
				memoryConfig,
				memory,
				disableDeferredTools: true,
				timeZone: timeZone ?? this.defaultTimeZone,
			});

			const enrichedMessage = await this.buildMessageWithRunningTasks(threadId, message);
			// Parseable formats (csv/tsv/json/xlsx/text/markdown/html/pdf/docx) go
			// through parse-file; image/* is sent to the model as raw multimodal
			// content. Anything else has been rejected upstream by the controller —
			// but we filter defensively here so corrupt requests cannot pollute
			// LLM memory.
			let multimodalAttachments: InstanceAiAttachment[] = [];
			let attachmentManifest = '';
			let hasParseableAttachment = false;

			if (attachments && attachments.length > 0) {
				const classifiedAttachments = classifyAttachments(attachments);
				multimodalAttachments = attachments.filter(
					(attachment) =>
						!isParseableAttachment(attachment) && attachment.mimeType.startsWith('image/'),
				);
				hasParseableAttachment = classifiedAttachments.some(
					(attachment: { parseable: boolean }) => attachment.parseable,
				);
				attachmentManifest = buildAttachmentManifest(classifiedAttachments);
			}

			const messageWithoutSummary =
				!message && hasParseableAttachment
					? `The user attached file(s) without a message. Inspect the first parseable attachment with parse-file and provide a concise summary.\n\n${attachmentManifest}`
					: attachmentManifest
						? `${enrichedMessage}\n\n${attachmentManifest}`
						: enrichedMessage;
			const messageWithoutSummaryTokens = estimateTokens(messageWithoutSummary);

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
							currentInputTokens: messageWithoutSummaryTokens,
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
					0.8,
					{
						label: 'orchestrator-current-input',
						text: messageWithoutSummary,
					},
				);
				if (contextCompactionRun && tracing) {
					await tracing.finishRun(contextCompactionRun, {
						outputs: {
							summarized: Boolean(conversationSummary),
							summary: conversationSummary ?? '',
							currentInputTokens: messageWithoutSummaryTokens,
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
				// Compose runtime input: conversation summary → background tasks → user message
				const fullMessage = conversationSummary
					? `${conversationSummary}\n\n${messageWithoutSummary}`
					: messageWithoutSummary;

				// Only include image attachments as raw multimodal content. Parseable
				// formats are handled by the parse-file tool; everything else has
				// been rejected at the controller boundary.
				if (multimodalAttachments.length > 0) {
					streamInput = [
						{
							role: 'user' as const,
							content: [
								{ type: 'text' as const, text: fullMessage },
								...multimodalAttachments.map((attachment) => ({
									type: 'file' as const,
									data: attachment.data,
									mimeType: attachment.mimeType,
								})),
							],
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
									multimodalAttachmentCount: multimodalAttachments.length,
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
								onActivity: () => this.runState.touchActiveRun(threadId),
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
							onActivity: () => this.runState.touchActiveRun(threadId),
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

				const waitingDecision = this.evaluateWaitingResponse(
					threadId,
					runId,
					result.confirmationEvent,
					{
						messageGroupId,
						correlationId: messageId,
					},
				);

				if (waitingDecision?.reason === 'confirmation-invalid') {
					messageTraceFinalization = await this.finishInvalidConfirmationRun({
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
				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			this.evaluateTerminalResponse(threadId, runId, result.status, {
				messageGroupId,
				correlationId: messageId,
				workSummary: result.workSummary,
			});
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
				const cancellationReason = this.liveness.consumeRunTimedOut(runId)
					? INSTANCE_AI_RUN_TIMEOUT_REASON
					: getAbortReason(signal);
				if (cancellationReason === INSTANCE_AI_RUN_TIMEOUT_REASON) {
					this.liveness.publishRunTimeoutNotice(threadId, runId);
				}
				this.evaluateTerminalResponse(threadId, runId, 'cancelled', {
					messageGroupId,
					correlationId: messageId,
				});
				await this.finalizeRunTracing(runId, tracing, {
					status: 'cancelled',
					reason: cancellationReason,
				});
				messageTraceFinalization = {
					status: 'cancelled',
					reason: cancellationReason,
					metadata: { completion_source: 'orchestrator' },
				};
				const archivedWorkflowIds = await this.reapAiTemporaryFromRun(
					threadId,
					user,
					aiCreatedWorkflowIds,
				);
				this.publishRunFinish(
					threadId,
					runId,
					'cancelled',
					cancellationReason,
					archivedWorkflowIds,
				);
				if (activeSnapshotStorage) {
					await this.saveAgentTreeSnapshot(threadId, runId, activeSnapshotStorage);
				}
				return;
			}

			const errorMessage = getErrorMessage(error);
			const userFacingErrorMessage = getUserFacingErrorMessage(error);

			this.logger.error('Instance AI run error', {
				error: errorMessage,
				threadId,
				runId,
			});
			this.evaluateTerminalResponse(threadId, runId, 'errored', {
				messageGroupId,
				correlationId: messageId,
				errorMessage: userFacingErrorMessage,
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
			//      now (with no live run) picks it up. The planned-task service
			//      serializes this call, and tick() is a no-op when no graph exists.
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

	async processResumedStream(
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
								onActivity: () => this.runState.touchActiveRun(opts.threadId),
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
							onActivity: () => this.runState.touchActiveRun(opts.threadId),
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
						messageGroupId: this.traceService.getMessageGroupId(opts.runId),
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

				const messageGroupId = this.traceService.getMessageGroupId(opts.runId);
				const waitingDecision = this.evaluateWaitingResponse(
					opts.threadId,
					opts.runId,
					result.confirmationEvent,
					{ messageGroupId },
				);

				if (waitingDecision?.reason === 'confirmation-invalid') {
					messageTraceFinalization = await this.finishInvalidConfirmationRun({
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

				return;
			}

			const outputText = await (result.text ?? Promise.resolve(''));
			const messageGroupId = this.traceService.getMessageGroupId(opts.runId);
			this.evaluateTerminalResponse(opts.threadId, opts.runId, result.status, {
				messageGroupId,
				workSummary: result.workSummary,
			});
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
				const messageGroupId = this.traceService.getMessageGroupId(opts.runId);
				this.evaluateTerminalResponse(opts.threadId, opts.runId, 'cancelled', {
					messageGroupId,
				});
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
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
				return;
			}

			const errorMessage = getErrorMessage(error);
			const userFacingErrorMessage = getUserFacingErrorMessage(error);

			this.logger.error('Instance AI resumed run error', {
				error: errorMessage,
				threadId: opts.threadId,
				runId: opts.runId,
			});
			const messageGroupId = this.traceService.getMessageGroupId(opts.runId);
			this.evaluateTerminalResponse(opts.threadId, opts.runId, 'errored', {
				messageGroupId,
				errorMessage: userFacingErrorMessage,
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

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
		});
	}
}
