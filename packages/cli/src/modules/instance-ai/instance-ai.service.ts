import type {
	InstanceAiAttachment,
	AgentRunState,
	InstanceAiEvent,
	InstanceAiMessage,
	InstanceAiStreamDeltaFrame,
	InstanceAiStreamFrame,
	InstanceAiStreamSyncFrame,
	InstanceAiGatewayCapabilities,
	McpToolCallResult,
	InstanceAiQuestionResponse,
	InstanceAiPhaseArtifact,
	InstanceAiPhaseSpec,
	InstanceAiPlanExecutionContext,
	InstanceAiPlanSpec,
	InstanceAiTaskKind,
	InstanceAiTaskOutcome,
	InstanceAiTaskRun,
	InstanceAiTargetResource,
} from '@n8n/api-types';
import {
	createInitialState,
	instanceAiTaskOutcomeSchema,
	reduceEvent,
	toAgentTree,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import {
	addPlanArtifact,
	createInstanceAgent,
	createAllTools,
	createMemory,
	createSandbox,
	createWorkspace,
	McpClientManager,
	mapMastraChunkToEvent,
	BuilderSandboxFactory,
	SnapshotManager,
	createDomainAccessTracker,
	derivePlanStatus,
	getPhaseExecution,
	getRunnablePhaseIds,
	patchPlanPhase,
	reconcilePlanPhases,
	startBuildWorkflowAgentTask,
	startDataTableAgentTask,
	startResearchWithAgentTask,
} from '@n8n/instance-ai';
import type {
	DomainAccessTracker,
	McpServerConfig,
	ModelConfig,
	OrchestrationContext,
	SandboxConfig,
	SpawnBackgroundTaskOptions,
} from '@n8n/instance-ai';
import { setSchemaBaseDirs } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { AgentTreeSnapshotStorage } from './agent-tree-snapshot';
import { LocalGateway, LocalFilesystemProvider } from './filesystem';
import { InstanceAiMemoryService } from './instance-ai-memory.service';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiAdapterService } from './instance-ai.adapter.service';
import { MastraIterationLogStorage } from './iteration-log-storage';
import { MastraPlanStorage } from './plan-storage';
import {
	InstanceAiPlanStateRepository,
	InstanceAiRunSnapshotRepository,
	InstanceAiTaskRunRepository,
} from './repositories';
import { TypeORMCompositeStore } from './storage/typeorm-composite-store';
import { MastraTaskRunStorage } from './task-run-storage';
import { MastraTaskStorage } from './task-storage';

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
	mockCredentials?: boolean;
	userInput?: string;
	answers?: InstanceAiQuestionResponse[];
	domainAccessAction?: string;
}

interface PendingConfirmation {
	resolve: (data: ConfirmationData) => void;
	threadId: string;
	userId: string;
	runId: string;
	messageGroupId?: string;
}

interface BackgroundTask {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	kind: InstanceAiTaskKind;
	title: string;
	subtitle?: string;
	goal?: string;
	targetResource?: InstanceAiTargetResource;
	status: 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled';
	result?: string;
	error?: string;
	startedAt: number;
	updatedAt: number;
	completedAt?: number;
	abortController: AbortController;
	/** User corrections queued for mid-flight delivery to the running task. */
	corrections: string[];
	/** The messageGroupId this task belongs to — captured at spawn time, not the thread's current one. */
	messageGroupId?: string;
	/** Typed outcome for task-driven coordination. */
	outcome?: InstanceAiTaskOutcome;
	planId?: string;
	phaseId?: string;
	/** Work item ID for workflow loop tracking. */
	workItemId?: string;
}

type FlushableResponse = Response & { flush?: () => void };

interface BufferedFrame {
	seq: number;
	frame: InstanceAiStreamDeltaFrame;
}

interface ThreadConnection {
	id: string;
	res: FlushableResponse;
	state: 'buffering' | 'live';
	buffer: BufferedFrame[];
	baselineSeq: number;
}

interface ThreadRuntime {
	sequence: number;
	user?: User;
	researchMode?: boolean;
	currentMessageGroupId?: string;
	runIdsByMessageGroup: Map<string, string[]>;
	messageGroupIdByRunId: Map<string, string>;
	runStateByMessageGroup: Map<string, AgentRunState>;
	taskRunsById: Map<string, InstanceAiTaskRun>;
	connections: Map<string, ThreadConnection>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/** Try to parse a record as a typed task outcome. Returns undefined if invalid. */
function parseOutcome(raw: unknown): InstanceAiTaskOutcome | undefined {
	const result = instanceAiTaskOutcomeSchema.safeParse(raw);
	return result.success ? result.data : undefined;
}

const ORCHESTRATOR_AGENT_ID = 'agent-001';

@Service()
export class InstanceAiService {
	private readonly mcpClientManager = new McpClientManager();

	private readonly instanceAiConfig: InstanceAiConfig;

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

	/** Timer for graceful gateway disconnect (allows brief SSE reconnects). */
	private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

	/** How many consecutive SSE disconnects without a successful reconnect. */
	private reconnectCount = 0;

	private readonly INITIAL_GRACE_MS = 10_000;

	private readonly MAX_GRACE_MS = 120_000;

	/** One-time pairing token generated via the UI — consumed on gateway/init. */
	private pairingToken: { token: string; createdAt: number } | null = null;

	/** Pairing tokens expire after 5 minutes. */
	private readonly PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000;

	/** Server-issued session key — replaces the pairing token after init. */
	private activeSessionKey: string | null = null;

	/** Live per-thread chat runtime state, including connections and group snapshots. */
	private readonly threadRuntimes = new Map<string, ThreadRuntime>();

	/** Thread-scoped domain approvals must survive runtime teardown between runs. */
	private readonly threadDomainAccessTrackers = new Map<string, DomainAccessTracker>();

	/** Serializes plan execution decisions per thread/plan pair. */
	private readonly planExecutionQueues = new Map<string, Promise<void>>();

	/** Pre-warmed image manager for builder sandboxes (Daytona only). */
	private snapshotManager?: SnapshotManager;

	/** Factory for creating per-builder ephemeral sandboxes. */
	private builderSandboxFactory?: BuilderSandboxFactory;

	private readonly eventSink = {
		publish: (threadId: string, event: InstanceAiEvent) => {
			this.publishEvent(threadId, event);
		},
	};

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly settingsService: InstanceAiSettingsService,
		private readonly planStateRepo: InstanceAiPlanStateRepository,
		private readonly taskRunRepo: InstanceAiTaskRunRepository,
		private readonly runSnapshotRepo: InstanceAiRunSnapshotRepository,
		private readonly compositeStore: TypeORMCompositeStore,
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

	private getOrCreateThreadRuntime(threadId: string): ThreadRuntime {
		let runtime = this.threadRuntimes.get(threadId);
		if (!runtime) {
			runtime = {
				sequence: 0,
				runIdsByMessageGroup: new Map(),
				messageGroupIdByRunId: new Map(),
				runStateByMessageGroup: new Map(),
				taskRunsById: new Map(),
				connections: new Map(),
			};
			this.threadRuntimes.set(threadId, runtime);
		}

		return runtime;
	}

	private getThreadRuntime(threadId: string): ThreadRuntime | undefined {
		return this.threadRuntimes.get(threadId);
	}

	private getThreadUser(threadId: string): User | undefined {
		return this.threadRuntimes.get(threadId)?.user;
	}

	private getThreadResearchMode(threadId: string): boolean | undefined {
		return this.threadRuntimes.get(threadId)?.researchMode;
	}

	private getCurrentMessageGroupId(threadId: string): string | undefined {
		return this.threadRuntimes.get(threadId)?.currentMessageGroupId;
	}

	private getOrCreateDomainTracker(threadId: string): DomainAccessTracker {
		let tracker = this.threadDomainAccessTrackers.get(threadId);
		if (!tracker) {
			tracker = createDomainAccessTracker();
			this.threadDomainAccessTrackers.set(threadId, tracker);
		}

		return tracker;
	}

	private ensureRunState(threadId: string, messageGroupId: string): AgentRunState {
		const runtime = this.getOrCreateThreadRuntime(threadId);
		let runState = runtime.runStateByMessageGroup.get(messageGroupId);
		if (!runState) {
			runState = createInitialState(ORCHESTRATOR_AGENT_ID);
			runtime.runStateByMessageGroup.set(messageGroupId, runState);
		}

		return runState;
	}

	private registerRunWithMessageGroup(
		threadId: string,
		runId: string,
		messageGroupId: string,
	): void {
		const runtime = this.getOrCreateThreadRuntime(threadId);
		runtime.messageGroupIdByRunId.set(runId, messageGroupId);
		const runIds = runtime.runIdsByMessageGroup.get(messageGroupId) ?? [];
		if (!runIds.includes(runId)) {
			runIds.push(runId);
			runtime.runIdsByMessageGroup.set(messageGroupId, runIds);
		}
	}

	private findMessageGroupIdForRun(threadId: string, runId: string): string | undefined {
		const runtime = this.threadRuntimes.get(threadId);
		if (!runtime) return undefined;

		const known = runtime.messageGroupIdByRunId.get(runId);
		if (known) {
			return known;
		}

		for (const [messageGroupId, runIds] of runtime.runIdsByMessageGroup.entries()) {
			if (runIds.includes(runId)) {
				runtime.messageGroupIdByRunId.set(runId, messageGroupId);
				return messageGroupId;
			}
		}

		return undefined;
	}

	private resolveMessageGroupIdForEvent(
		threadId: string,
		event: InstanceAiEvent,
	): string | undefined {
		if (event.type === 'run-start') {
			const messageGroupId =
				event.payload.messageGroupId ?? this.getCurrentMessageGroupId(threadId);
			if (!messageGroupId) {
				return undefined;
			}

			this.registerRunWithMessageGroup(threadId, event.runId, messageGroupId);
			return messageGroupId;
		}

		return this.findMessageGroupIdForRun(threadId, event.runId);
	}

	private recordEventForSnapshot(threadId: string, event: InstanceAiEvent): void {
		const messageGroupId = this.resolveMessageGroupIdForEvent(threadId, event);
		if (!messageGroupId) {
			return;
		}

		const runState = this.ensureRunState(threadId, messageGroupId);
		reduceEvent(runState, event);
	}

	private upsertRuntimeTaskRun(threadId: string, taskRun: InstanceAiTaskRun): void {
		this.getOrCreateThreadRuntime(threadId).taskRunsById.set(taskRun.taskId, taskRun);
	}

	private getRuntimeTaskRuns(threadId: string): InstanceAiTaskRun[] {
		return [...(this.threadRuntimes.get(threadId)?.taskRunsById.values() ?? [])];
	}

	private nextSequence(threadId: string): number {
		const runtime = this.getOrCreateThreadRuntime(threadId);
		runtime.sequence += 1;
		return runtime.sequence;
	}

	private currentSequence(threadId: string): number {
		return this.threadRuntimes.get(threadId)?.sequence ?? 0;
	}

	private sortTaskRuns(taskRuns: Iterable<InstanceAiTaskRun>): InstanceAiTaskRun[] {
		return [...taskRuns].sort((left, right) => right.updatedAt - left.updatedAt);
	}

	private toStreamFrame(event: InstanceAiEvent): InstanceAiStreamDeltaFrame | null {
		switch (event.type) {
			case 'task-created':
			case 'task-updated':
				return {
					type: 'task-upsert',
					runId: event.runId,
					agentId: event.agentId,
					payload: event.payload,
				};
			case 'plan-created':
			case 'plan-updated':
				return {
					type: 'plan-upsert',
					runId: event.runId,
					agentId: event.agentId,
					payload: event.payload,
				};
			case 'filesystem-request':
				return null;
			default:
				return event;
		}
	}

	private writeFrame(res: FlushableResponse, frame: InstanceAiStreamFrame): void {
		res.write(`${JSON.stringify(frame)}\n`);
		res.flush?.();
	}

	private broadcastFrame(threadId: string, frame: InstanceAiStreamDeltaFrame): void {
		const runtime = this.getThreadRuntime(threadId);
		if (!runtime) {
			return;
		}

		const seq = this.nextSequence(threadId);
		const failedConnectionIds: string[] = [];

		for (const connection of runtime.connections.values()) {
			try {
				if (connection.state === 'buffering') {
					connection.buffer.push({ seq, frame });
				} else {
					this.writeFrame(connection.res, frame);
				}
			} catch {
				failedConnectionIds.push(connection.id);
			}
		}

		for (const connectionId of failedConnectionIds) {
			runtime.connections.delete(connectionId);
		}
		if (failedConnectionIds.length > 0) {
			this.maybeCleanupThreadState(threadId);
		}
	}

	private publishEvent(threadId: string, event: InstanceAiEvent): void {
		this.recordEventForSnapshot(threadId, event);
		const frame = this.toStreamFrame(event);
		if (frame) {
			this.broadcastFrame(threadId, frame);
		}
	}

	private publishTaskUpsert(threadId: string, taskRun: InstanceAiTaskRun): void {
		this.upsertRuntimeTaskRun(threadId, taskRun);
		const runId = taskRun.originRunId ?? this.getLatestRunIdForThread(threadId);
		if (!runId) {
			return;
		}

		this.broadcastFrame(threadId, {
			type: 'task-upsert',
			runId,
			agentId: taskRun.agentId,
			payload: { task: taskRun },
		});
	}

	private getMessageGroupSyncStatus(
		threadId: string,
		messageGroupId: string,
	): 'active' | 'suspended' | 'background' | 'idle' {
		if (
			this.activeRuns.has(threadId) &&
			this.getCurrentMessageGroupId(threadId) === messageGroupId
		) {
			return 'active';
		}
		if (
			this.suspendedRuns.has(threadId) &&
			this.getCurrentMessageGroupId(threadId) === messageGroupId
		) {
			return 'suspended';
		}

		const hasBackgroundActivity = [...this.backgroundTasks.values()].some(
			(task) =>
				task.threadId === threadId &&
				task.messageGroupId === messageGroupId &&
				this.isTaskActive(task),
		);
		return hasBackgroundActivity ? 'background' : 'idle';
	}

	private buildSyncedMessages(
		threadId: string,
		persistedMessages: InstanceAiMessage[],
	): InstanceAiMessage[] {
		const messages = persistedMessages.map((message) => ({ ...message }));
		const runtime = this.getThreadRuntime(threadId);
		if (!runtime) {
			return messages;
		}

		for (const [messageGroupId, runState] of runtime.runStateByMessageGroup.entries()) {
			const runIds = runtime.runIdsByMessageGroup.get(messageGroupId) ?? [];
			const runId = runIds.at(-1) ?? messageGroupId;
			const agentTree = toAgentTree(runState);
			const status = this.getMessageGroupSyncStatus(threadId, messageGroupId);
			const isStreaming = status === 'active' || status === 'suspended';

			let message = messages.find(
				(existingMessage) =>
					existingMessage.role === 'assistant' &&
					(existingMessage.messageGroupId === messageGroupId || existingMessage.runId === runId),
			);
			if (!message) {
				message = {
					id: runId,
					runId,
					messageGroupId,
					runIds: runIds.length > 0 ? [...runIds] : undefined,
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: agentTree.textContent,
					reasoning: agentTree.reasoning,
					isStreaming,
					agentTree,
				};
				messages.push(message);
				continue;
			}

			message.runId = runId;
			message.messageGroupId = messageGroupId;
			message.runIds = runIds.length > 0 ? [...runIds] : undefined;
			message.content = agentTree.textContent;
			message.reasoning = agentTree.reasoning;
			message.isStreaming = isStreaming;
			message.agentTree = agentTree;
		}

		return messages;
	}

	private buildSyncFrame(
		threadId: string,
		persistedMessages: InstanceAiMessage[],
		persistedTaskRuns: InstanceAiTaskRun[],
	): InstanceAiStreamSyncFrame {
		const runtimeTaskRuns = this.getRuntimeTaskRuns(threadId);
		const mergedTaskRuns = new Map(persistedTaskRuns.map((taskRun) => [taskRun.taskId, taskRun]));
		for (const taskRun of runtimeTaskRuns) {
			mergedTaskRuns.set(taskRun.taskId, taskRun);
		}

		return {
			type: 'sync',
			threadId,
			messages: this.buildSyncedMessages(threadId, persistedMessages),
			taskRuns: this.sortTaskRuns(mergedTaskRuns.values()),
			activeRunId:
				this.activeRuns.get(threadId)?.runId ?? this.suspendedRuns.get(threadId)?.runId ?? null,
		};
	}

	openThreadStream(
		userId: string,
		threadId: string,
		res: FlushableResponse,
	): { cleanup: () => void; ready: Promise<void> } {
		const runtime = this.getOrCreateThreadRuntime(threadId);
		const connectionId = `conn_${nanoid(8)}`;
		const connection: ThreadConnection = {
			id: connectionId,
			res,
			state: 'buffering',
			buffer: [],
			baselineSeq: 0,
		};

		runtime.connections.set(connectionId, connection);

		const cleanup = () => {
			const currentRuntime = this.getThreadRuntime(threadId);
			if (!currentRuntime) {
				return;
			}

			currentRuntime.connections.delete(connectionId);
			this.maybeCleanupThreadState(threadId);
		};

		const ready = (async () => {
			try {
				const [richMessages, taskRuns] = await Promise.all([
					this.memoryService.getRichMessages(userId, threadId, { limit: 100, page: 0 }),
					this.reconcileStoredTaskRuns(threadId),
				]);

				connection.baselineSeq = this.currentSequence(threadId);
				const syncFrame = this.buildSyncFrame(threadId, richMessages.messages, taskRuns);

				if (!this.getThreadRuntime(threadId)?.connections.has(connectionId)) {
					return;
				}

				this.writeFrame(res, syncFrame);
				for (const buffered of connection.buffer) {
					if (buffered.seq > connection.baselineSeq) {
						this.writeFrame(res, buffered.frame);
					}
				}
				connection.buffer = [];
				connection.state = 'live';
			} catch (error) {
				cleanup();
				throw error;
			}
		})();

		return { cleanup, ready };
	}

	private maybeCleanupThreadState(threadId: string): void {
		const runtime = this.getThreadRuntime(threadId);
		if (!runtime) {
			return;
		}

		const hasConnectedWriters = runtime.connections.size > 0;
		const hasActiveRun = this.activeRuns.has(threadId);
		const hasSuspendedRun = this.suspendedRuns.has(threadId);
		const hasActiveTasks = [...this.backgroundTasks.values()].some(
			(task) => task.threadId === threadId && this.isTaskActive(task),
		);
		const hasPendingConfirmations = [...this.pendingSubAgentConfirmations.values()].some(
			(pending) => pending.threadId === threadId,
		);

		if (
			hasConnectedWriters ||
			hasActiveRun ||
			hasSuspendedRun ||
			hasActiveTasks ||
			hasPendingConfirmations
		) {
			return;
		}

		this.threadRuntimes.delete(threadId);
		for (const key of this.planExecutionQueues.keys()) {
			if (key.startsWith(`${threadId}:`)) {
				this.planExecutionQueues.delete(key);
			}
		}
		void this.destroySandbox(threadId);
	}

	private async resolveRuntimeConfirmationState(
		threadId: string,
		requestId: string,
		status: 'approved' | 'denied',
	): Promise<void> {
		const runtime = this.getThreadRuntime(threadId);
		if (!runtime) {
			return;
		}

		for (const [messageGroupId, runState] of runtime.runStateByMessageGroup.entries()) {
			const runIds = runtime.runIdsByMessageGroup.get(messageGroupId) ?? [];
			const runId = runIds.at(-1) ?? this.getLatestRunIdForThread(threadId);
			if (!runId) continue;

			for (const [toolCallId, toolCall] of Object.entries(runState.toolCallsById)) {
				if (toolCall.confirmation?.requestId !== requestId) {
					continue;
				}

				this.publishEvent(threadId, {
					type: 'confirmation-resolved',
					runId,
					agentId: this.findOwningAgentId(runState, toolCallId) ?? ORCHESTRATOR_AGENT_ID,
					payload: {
						requestId,
						toolCallId,
						status,
					},
				});
			}

			for (const [agentId, agent] of Object.entries(runState.agentsById)) {
				if (!agent.plan) continue;

				let updatedPlan = false;
				const nextPhases = agent.plan.phases.map((phase) => {
					if (phase.blocker?.requestId !== requestId) {
						return phase;
					}

					updatedPlan = true;
					return {
						...phase,
						blocker: {
							...phase.blocker,
							requestId: undefined,
						},
					};
				});

				if (!updatedPlan) {
					continue;
				}

				await this.publishPlanUpdate(
					threadId,
					runId,
					{
						...agent.plan,
						phases: nextPhases,
						lastUpdatedAt: new Date().toISOString(),
					},
					agentId,
				);
			}
		}
	}

	private findOwningAgentId(runState: AgentRunState, toolCallId: string): string | undefined {
		for (const [agentId, toolCallIds] of Object.entries(runState.toolCallIdsByAgentId)) {
			if (toolCallIds.includes(toolCallId)) {
				return agentId;
			}
		}

		return undefined;
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

	private createPlanStorage() {
		return new MastraPlanStorage(this.planStateRepo);
	}

	private createTaskRunStorage() {
		return new MastraTaskRunStorage(this.taskRunRepo);
	}

	private createSnapshotStorage() {
		return new AgentTreeSnapshotStorage(this.runSnapshotRepo);
	}

	private toTaskRun(task: BackgroundTask): InstanceAiTaskRun {
		return {
			taskId: task.taskId,
			threadId: task.threadId,
			originRunId: task.runId,
			messageGroupId: task.messageGroupId,
			agentId: task.agentId,
			role: task.role,
			kind: task.kind,
			title: task.title,
			...(task.subtitle ? { subtitle: task.subtitle } : {}),
			...(task.goal ? { goal: task.goal } : {}),
			...(task.targetResource ? { targetResource: task.targetResource } : {}),
			status: task.status,
			...(task.planId ? { planId: task.planId } : {}),
			...(task.phaseId ? { phaseId: task.phaseId } : {}),
			...(task.workItemId ? { workItemId: task.workItemId } : {}),
			...(task.result ? { resultSummary: task.result } : {}),
			...(task.error ? { error: task.error } : {}),
			...(task.outcome ? { outcome: task.outcome } : {}),
			createdAt: task.startedAt,
			startedAt: task.startedAt,
			updatedAt: task.updatedAt,
			...(task.completedAt ? { completedAt: task.completedAt } : {}),
		};
	}

	private async saveTaskRunSnapshot(
		threadId: string,
		taskRun: InstanceAiTaskRun,
		_eventType: 'task-created' | 'task-updated',
	): Promise<void> {
		const taskRunStorage = this.createTaskRunStorage();
		await taskRunStorage.upsert(taskRun);
		this.publishTaskUpsert(threadId, taskRun);
	}

	private async reconcileStoredTaskRuns(threadId: string): Promise<InstanceAiTaskRun[]> {
		const taskRunStorage = this.createTaskRunStorage();
		const existingTaskRuns = await taskRunStorage.get(threadId);
		let changed = false;
		const now = Date.now();
		const reconciledTaskRuns = existingTaskRuns.map((taskRun) => {
			if (
				(taskRun.status === 'queued' ||
					taskRun.status === 'running' ||
					taskRun.status === 'suspended') &&
				!this.backgroundTasks.has(taskRun.taskId)
			) {
				changed = true;
				return {
					...taskRun,
					status: 'failed' as const,
					error: taskRun.error ?? 'Background task was interrupted before completion',
					updatedAt: now,
					completedAt: taskRun.completedAt ?? now,
				};
			}

			return taskRun;
		});

		reconciledTaskRuns.sort((left, right) => right.updatedAt - left.updatedAt);
		if (changed) {
			await taskRunStorage.save(threadId, reconciledTaskRuns);
		}

		return reconciledTaskRuns;
	}

	private getPlanPhase(
		plan: InstanceAiPlanSpec,
		phaseId?: string,
	): InstanceAiPhaseSpec | undefined {
		if (!phaseId) {
			return undefined;
		}

		return plan.phases.find((phase) => phase.id === phaseId);
	}

	private isTaskActive(task: BackgroundTask): boolean {
		return task.status === 'running' || task.status === 'suspended';
	}

	private getActiveTasks(threadId: string): BackgroundTask[] {
		return [...this.backgroundTasks.values()].filter(
			(task) => task.threadId === threadId && this.isTaskActive(task),
		);
	}

	private getActivePlanTasks(threadId: string, planId: string): BackgroundTask[] {
		return this.getActiveTasks(threadId).filter((task) => task.planId === planId);
	}

	private async queuePlanExecution(
		threadId: string,
		planId: string,
		execute: () => Promise<void>,
	): Promise<void> {
		const key = `${threadId}:${planId}`;
		const previous = this.planExecutionQueues.get(key) ?? Promise.resolve();
		const next = previous.catch(() => {}).then(execute);
		this.planExecutionQueues.set(
			key,
			next.finally(() => {
				if (this.planExecutionQueues.get(key) === next) {
					this.planExecutionQueues.delete(key);
				}
			}),
		);
		return await next;
	}

	private createPhaseArtifactFromTask(task: BackgroundTask): InstanceAiPhaseArtifact | undefined {
		if (task.kind === 'data-table' && task.outcome?.kind === 'data-table') {
			const artifactId = task.outcome.tableId ?? task.taskId;
			return {
				id: `data-table:${artifactId}`,
				label: task.outcome.tableName ?? task.title,
				type: 'data-table',
				...(task.outcome.tableId ? { resourceId: task.outcome.tableId } : {}),
			};
		}

		if (task.kind === 'workflow-build' && task.outcome?.kind === 'workflow-build') {
			const workflowId = task.outcome.workflowId;
			if (!workflowId) {
				return undefined;
			}

			return {
				id: `workflow:${workflowId}`,
				label: task.title,
				type: 'workflow',
				resourceId: workflowId,
			};
		}

		return undefined;
	}

	private shouldPersistDetachedSnapshot(threadId: string, runId: string): boolean {
		const activeRunId =
			this.activeRuns.get(threadId)?.runId ?? this.suspendedRuns.get(threadId)?.runId;
		return activeRunId !== runId;
	}

	private async persistThreadSnapshot(
		threadId: string,
		runId: string,
		overrideMessageGroupId?: string,
	): Promise<void> {
		await this.saveAgentTreeSnapshot(
			threadId,
			runId,
			this.createSnapshotStorage(),
			overrideMessageGroupId,
		);
	}

	private async persistDetachedSnapshot(task: BackgroundTask): Promise<void> {
		if (!this.shouldPersistDetachedSnapshot(task.threadId, task.runId)) {
			return;
		}

		await this.saveAgentTreeSnapshot(
			task.threadId,
			task.runId,
			this.createSnapshotStorage(),
			task.messageGroupId,
		);
	}

	private async publishMilestoneSummary(
		threadId: string,
		runId: string,
		text: string,
		snapshotStorage?: AgentTreeSnapshotStorage,
		messageGroupId?: string,
	): Promise<void> {
		this.publishEvent(threadId, {
			type: 'text-delta',
			runId,
			agentId: ORCHESTRATOR_AGENT_ID,
			payload: { text },
		});

		if (snapshotStorage && this.shouldPersistDetachedSnapshot(threadId, runId)) {
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage, messageGroupId);
		}
	}

	private recordRetryablePhaseFailure(
		plan: InstanceAiPlanSpec,
		phase: InstanceAiPhaseSpec,
		reason: string,
		failureSignature?: string,
	): InstanceAiPlanSpec {
		const attempts = (phase.verificationAttempts ?? 0) + 1;
		const nextStatus = attempts >= 3 ? 'failed' : 'ready';

		return patchPlanPhase(
			plan,
			phase.id,
			{
				status: nextStatus,
				blocker: undefined,
				verificationAttempts: attempts,
				lastVerificationError: reason,
				lastVerificationFailureSignature: failureSignature,
			},
			'running',
		);
	}

	private async patchPlanFromTaskResult(
		task: BackgroundTask,
		planStorage: MastraPlanStorage,
		snapshotStorage?: AgentTreeSnapshotStorage,
	): Promise<InstanceAiPlanSpec | null> {
		if (!task.planId || !task.phaseId) {
			return null;
		}

		const existingPlan = await planStorage.get(task.threadId);
		if (!existingPlan || existingPlan.planId !== task.planId) {
			return null;
		}

		const phase = this.getPlanPhase(existingPlan, task.phaseId);
		if (!phase) {
			return existingPlan;
		}

		let nextPlan = existingPlan;
		let milestone: string | undefined;

		if (task.status === 'completed') {
			if (task.kind === 'workflow-build') {
				if (task.outcome?.kind !== 'workflow-build') {
					nextPlan = this.recordRetryablePhaseFailure(
						existingPlan,
						phase,
						'Workflow build finished without a structured verification result.',
						'missing_workflow_build_outcome',
					);
					const attempts = this.getPlanPhase(nextPlan, phase.id)?.verificationAttempts ?? 0;
					milestone =
						attempts >= 3
							? `Phase "${phase.title}" failed after ${attempts} verification attempts.`
							: `Phase "${phase.title}" verification failed (${attempts}/3). Retrying.`;
				} else if (task.outcome.needsUserInput) {
					nextPlan = patchPlanPhase(
						existingPlan,
						phase.id,
						{
							status: 'blocked',
							blocker: {
								reason: task.outcome.failureReason ?? 'Workflow build is waiting for user input',
								inputType: 'text',
							},
							lastVerificationError: task.outcome.failureReason,
							lastVerificationFailureSignature: task.outcome.failureSignature,
						},
						'blocked',
					);
					milestone = `Phase "${phase.title}" is blocked: ${task.outcome.failureReason ?? 'needs user input'}.`;
				} else if (task.outcome.verified) {
					nextPlan = patchPlanPhase(
						existingPlan,
						phase.id,
						{
							status: 'done',
							blocker: undefined,
							lastVerificationError: undefined,
							lastVerificationFailureSignature: undefined,
						},
						'running',
					);
					milestone = `Phase "${phase.title}" completed.`;
				} else {
					const reason = task.outcome.failureReason ?? 'Workflow verification failed';
					nextPlan = this.recordRetryablePhaseFailure(
						existingPlan,
						phase,
						reason,
						task.outcome.failureSignature,
					);
					const attempts = this.getPlanPhase(nextPlan, phase.id)?.verificationAttempts ?? 0;
					milestone =
						attempts >= 3
							? `Phase "${phase.title}" failed after ${attempts} verification attempts.`
							: `Phase "${phase.title}" verification failed (${attempts}/3). Retrying.`;
				}
			} else {
				nextPlan = patchPlanPhase(
					existingPlan,
					phase.id,
					{
						status: 'done',
						blocker: undefined,
						lastVerificationError: undefined,
						lastVerificationFailureSignature: undefined,
					},
					'running',
				);
				milestone = `Phase "${phase.title}" completed.`;
			}
		} else if (task.status === 'failed' || task.status === 'cancelled') {
			const reason =
				task.error ??
				(task.status === 'cancelled' ? 'Task was cancelled before completion' : 'Task failed');
			nextPlan = this.recordRetryablePhaseFailure(existingPlan, phase, reason);
			const attempts = this.getPlanPhase(nextPlan, phase.id)?.verificationAttempts ?? 0;
			milestone =
				attempts >= 3
					? `Phase "${phase.title}" failed after ${attempts} attempts.`
					: `Phase "${phase.title}" failed (${attempts}/3). Retrying.`;
		} else {
			return existingPlan;
		}

		const artifact = this.createPhaseArtifactFromTask(task);
		if (artifact) {
			nextPlan = addPlanArtifact(nextPlan, phase.id, artifact);
		}

		if (existingPlan.status !== 'completed' && nextPlan.status === 'completed') {
			milestone = milestone ? `${milestone} Plan completed.` : 'Plan completed.';
		}

		if (nextPlan !== existingPlan) {
			await this.publishPlanUpdate(task.threadId, task.runId, nextPlan);
		}

		if (milestone) {
			await this.publishMilestoneSummary(
				task.threadId,
				task.runId,
				`${milestone} `,
				snapshotStorage,
				task.messageGroupId,
			);
		}

		return nextPlan;
	}

	private getLatestRunIdForThread(threadId: string): string | undefined {
		const messageGroupId = this.getCurrentMessageGroupId(threadId);
		if (!messageGroupId) {
			return undefined;
		}

		const runIds = this.getThreadRuntime(threadId)?.runIdsByMessageGroup.get(messageGroupId);
		return runIds?.[runIds.length - 1];
	}

	private async publishPlanUpdate(
		threadId: string,
		runId: string | undefined,
		plan: InstanceAiPlanSpec,
		agentId = ORCHESTRATOR_AGENT_ID,
	) {
		const planStorage = this.createPlanStorage();
		await planStorage.save(threadId, plan);
		const targetRunId = runId ?? this.getLatestRunIdForThread(threadId);
		if (!targetRunId) {
			return;
		}

		this.publishEvent(threadId, {
			type: 'plan-updated',
			runId: targetRunId,
			agentId,
			payload: { plan },
		});
	}

	private async reconcileStoredPlan(
		threadId: string,
		runId?: string,
	): Promise<InstanceAiPlanSpec | null> {
		const planStorage = this.createPlanStorage();
		const existingPlan = await planStorage.get(threadId);
		if (!existingPlan) {
			return null;
		}

		const reconciledPlan = reconcilePlanPhases(existingPlan);
		const nextStatus = derivePlanStatus(reconciledPlan, existingPlan.status);
		if (reconciledPlan === existingPlan && nextStatus === existingPlan.status) {
			return existingPlan;
		}

		const nextPlan = {
			...reconciledPlan,
			status: nextStatus,
			lastUpdatedAt: new Date().toISOString(),
		};
		await this.publishPlanUpdate(threadId, runId, nextPlan);
		return nextPlan;
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
		return this.activeRuns.has(threadId) || this.suspendedRuns.has(threadId);
	}

	startRun(
		user: User,
		threadId: string,
		message: string,
		researchMode?: boolean,
		attachments?: InstanceAiAttachment[],
	): string {
		const runId = `run_${nanoid()}`;
		const abortController = new AbortController();
		const runtime = this.getOrCreateThreadRuntime(threadId);

		this.activeRuns.set(threadId, { runId, abortController });
		runtime.user = user;
		if (researchMode !== undefined) {
			runtime.researchMode = researchMode;
		}

		const newGroupId = `mg_${nanoid()}`;
		runtime.currentMessageGroupId = newGroupId;
		this.registerRunWithMessageGroup(threadId, runId, newGroupId);
		this.ensureRunState(threadId, newGroupId);

		// Fire-and-forget — errors handled inside executeRun
		void this.executeRun(
			user,
			threadId,
			runId,
			message,
			abortController,
			researchMode,
			attachments,
			newGroupId,
		);

		return runId;
	}

	/** Get the current messageGroupId for a thread (used by sync serialization). */
	getMessageGroupId(threadId: string): string | undefined {
		return this.getCurrentMessageGroupId(threadId);
	}

	/**
	 * Get the messageGroupId for the thread's live activity.
	 * Prefers the active/suspended run's group, then falls back to the
	 * most recent running background task's group (which was captured
	 * at spawn time and may differ from the thread's current group
	 * if the user started a new turn).
	 */
	getLiveMessageGroupId(threadId: string): string | undefined {
		// If there's an active/suspended orchestrator run, use the thread-global
		// (it was set when that run started).
		if (this.activeRuns.has(threadId) || this.suspendedRuns.has(threadId)) {
			return this.getCurrentMessageGroupId(threadId);
		}
		// Background-only: find the most recent running task's group
		const runningTask = [...this.backgroundTasks.values()]
			.filter((t) => t.threadId === threadId && this.isTaskActive(t))
			.sort((a, b) => b.startedAt - a.startedAt)[0];
		return runningTask?.messageGroupId ?? this.getCurrentMessageGroupId(threadId);
	}

	/** Get all runIds belonging to a messageGroupId. */
	getRunIdsForMessageGroup(messageGroupId: string): string[] {
		for (const runtime of this.threadRuntimes.values()) {
			const runIds = runtime.runIdsByMessageGroup.get(messageGroupId);
			if (runIds) {
				return runIds;
			}
		}

		return [];
	}

	/** Get the active runId for a thread. */
	getActiveRunId(threadId: string): string | undefined {
		return this.activeRuns.get(threadId)?.runId;
	}

	async cancelRun(threadId: string): Promise<void> {
		// Clean up sub-agent confirmations for this thread
		for (const [reqId, pending] of this.pendingSubAgentConfirmations) {
			if (pending.threadId === threadId) {
				await this.resolveRuntimeConfirmationState(threadId, reqId, 'denied');
				if (this.shouldPersistDetachedSnapshot(pending.threadId, pending.runId)) {
					await this.persistThreadSnapshot(pending.threadId, pending.runId, pending.messageGroupId);
				}
				pending.resolve({ approved: false });
				this.pendingSubAgentConfirmations.delete(reqId);
			}
		}

		// Cancel background tasks for this thread
		await this.cancelBackgroundTasks(threadId);

		const active = this.activeRuns.get(threadId);
		if (active) {
			active.abortController.abort();
			// run-finish with status=cancelled is published by executeRun's catch block
			return;
		}

		const suspended = this.suspendedRuns.get(threadId);
		if (suspended) {
			await this.resolveRuntimeConfirmationState(threadId, suspended.requestId, 'denied');
			suspended.abortController.abort();
			this.suspendedRuns.delete(threadId);
			this.publishEvent(threadId, {
				type: 'run-finish',
				runId: suspended.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: { status: 'cancelled', reason: 'user_cancelled' },
			});
			await this.persistThreadSnapshot(threadId, suspended.runId);
			this.maybeCleanupThreadState(threadId);
		}
	}

	/** Send a correction message to a running background task. */
	sendCorrectionToTask(taskId: string, correction: string): void {
		const task = this.backgroundTasks.get(taskId);
		if (!task || task.status !== 'running') return;
		task.corrections.push(correction);
	}

	private async cancelBackgroundTaskInternal(task: BackgroundTask): Promise<void> {
		task.abortController.abort();
		task.status = 'cancelled';
		task.updatedAt = Date.now();
		task.completedAt = task.updatedAt;
		task.error = 'Cancelled by user';

		this.publishEvent(task.threadId, {
			type: 'agent-completed',
			runId: task.runId,
			agentId: task.agentId,
			payload: { role: task.role, result: '', error: 'Cancelled by user' },
		});

		await this.saveTaskRunSnapshot(task.threadId, this.toTaskRun(task), 'task-updated');

		if (task.planId && task.phaseId) {
			const planStorage = this.createPlanStorage();
			const existingPlan = await planStorage.get(task.threadId);
			if (existingPlan?.planId === task.planId) {
				const nextPlan = patchPlanPhase(
					existingPlan,
					task.phaseId,
					{
						status: 'blocked',
						blocker: {
							reason: 'Execution cancelled by user',
							inputType: 'text',
						},
						lastVerificationError: 'Execution cancelled by user',
					},
					'blocked',
				);
				await this.publishPlanUpdate(task.threadId, task.runId, nextPlan);
			}
		}

		await this.persistDetachedSnapshot(task);
		this.backgroundTasks.delete(task.taskId);
	}

	/** Cancel a single background task by ID. */
	async cancelBackgroundTask(threadId: string, taskId: string): Promise<void> {
		const task = this.backgroundTasks.get(taskId);
		if (!task || task.threadId !== threadId || !this.isTaskActive(task)) return;

		await this.cancelBackgroundTaskInternal(task);
		this.maybeCleanupThreadState(threadId);
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
		this.reconnectCount = 0;
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

	isLocalGatewayDisabled(): boolean {
		return this.settingsService.isFilesystemDisabled();
	}

	/** Return gateway connection status for the frontend. */
	getGatewayStatus(): { connected: boolean; connectedAt: string | null; directory: string | null } {
		return this.localGateway.getStatus();
	}

	/** Start a grace-period timer. If the daemon doesn't reconnect, fully disconnect the gateway. */
	startDisconnectTimer(onDisconnect: () => void): void {
		this.clearDisconnectTimer();
		const graceMs = Math.min(
			this.INITIAL_GRACE_MS * Math.pow(2, this.reconnectCount),
			this.MAX_GRACE_MS,
		);
		this.reconnectCount++;
		this.disconnectTimer = setTimeout(() => {
			this.disconnectTimer = null;
			this.disconnectGateway();
			// Keep activeSessionKey alive so the client can re-authenticate on reconnect.
			// Session key is only cleared on explicit /gateway/disconnect.
			onDisconnect();
		}, graceMs);
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
		this.threadRuntimes.clear();
		this.threadDomainAccessTrackers.clear();

		// Destroy all active sandboxes
		const sandboxCleanups = [...this.sandboxes.keys()].map(
			async (threadId) => await this.destroySandbox(threadId),
		);
		await Promise.allSettled(sandboxCleanups);

		this.snapshotManager?.invalidate();
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
		const snapshotStorage = this.createSnapshotStorage();

		try {
			// Publish run-start (includes userId for audit trail attribution)
			this.publishEvent(threadId, {
				type: 'run-start',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				userId: user.id,
				payload: { messageId: nanoid(), messageGroupId },
			});

			// Check if already cancelled before starting agent work
			if (signal.aborted) {
				this.publishEvent(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				return;
			}

			const localGatewayDisabled = this.settingsService.isFilesystemDisabled();
			const localFilesystemService =
				!localGatewayDisabled && !this.localGateway.isConnected && this.isLocalFilesystemAvailable()
					? this.getLocalFsProvider()
					: undefined;
			const context = this.adapterService.createContext(user, localFilesystemService);
			if (!localGatewayDisabled && this.localGateway.isConnected) {
				context.localMcpServer = this.localGateway;
			}
			context.permissions = this.settingsService.getPermissions();

			// Domain-access tracker: get or create for this thread, set runId
			context.domainAccessTracker = this.getOrCreateDomainTracker(threadId);
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
			const planStorage = this.createPlanStorage();
			const iterationLog = new MastraIterationLogStorage(memory);
			// Replay existing tasks to the new run's agentTree so the frontend shows them immediately
			const existingTasks = await taskStorage.get(threadId);
			if (existingTasks) {
				this.publishEvent(threadId, {
					type: 'tasks-update',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { tasks: existingTasks },
				});
			}
			const existingPlan = await planStorage.get(threadId);
			const runtimeOwnedPlanActive =
				existingPlan?.status === 'approved' || existingPlan?.status === 'running';
			if (existingPlan) {
				this.publishEvent(threadId, {
					type: 'plan-created',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { plan: existingPlan },
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
				eventBus: this.eventSink,
				domainTools,
				abortSignal: signal,
				taskStorage,
				planStorage,
				activePlanStatus: existingPlan?.status,
				runtimeOwnedPlanActive,
				messageGroupId,
				planExecutionContext: existingPlan?.executionContext,
				researchMode,
				startPlanExecution: async (planId) =>
					await this.startPlanExecution(threadId, planId, runId, messageGroupId),
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
							runId,
							messageGroupId,
						});
					});
				},
				cancelBackgroundTask: async (taskId) => await this.cancelBackgroundTask(threadId, taskId),
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
				disableDeferredTools: true,
			});

			// Build multimodal message when attachments are present
			const streamInput =
				attachments && attachments.length > 0
					? [
							{
								role: 'user' as const,
								content: [
									{ type: 'text' as const, text: message },
									...attachments.map((a) => ({
										type: 'file' as const,
										data: a.data,
										mimeType: a.mimeType,
									})),
								],
							},
						]
					: message;

			const result = await agent.stream(streamInput, {
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
					this.publishEvent(threadId, event);
				}
			}

			// Stream ended due to tool suspension — save state and exit without run-finish
			if (lastSuspension && !signal.aborted) {
				await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
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

			if (signal.aborted) {
				this.publishEvent(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
			} else {
				this.publishEvent(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'completed' },
				});
			}

			// Save agent tree snapshot for session restore
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
			if (!signal.aborted) {
				this.activeRuns.delete(threadId);
			}
		} catch (error) {
			// Mastra throws AbortError when the signal is aborted — treat as cancellation
			if (signal.aborted) {
				this.publishEvent(threadId, {
					type: 'run-finish',
					runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI run error', {
				error: errorMessage,
				threadId,
				runId,
			});

			this.publishEvent(threadId, {
				type: 'run-finish',
				runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
				},
			});
			await this.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
		} finally {
			this.activeRuns.delete(threadId);
			// Clear transient (allow_once) domain approvals for this run
			this.threadDomainAccessTrackers.get(threadId)?.clearRun(runId);
			this.maybeCleanupThreadState(threadId);
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
			await this.resolveRuntimeConfirmationState(
				pending.threadId,
				requestId,
				data.approved ? 'approved' : 'denied',
			);
			if (this.shouldPersistDetachedSnapshot(pending.threadId, pending.runId)) {
				await this.persistThreadSnapshot(pending.threadId, pending.runId, pending.messageGroupId);
			}
			pending.resolve(data);
			this.maybeCleanupThreadState(pending.threadId);
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

		await this.resolveRuntimeConfirmationState(
			threadId,
			requestId,
			data.approved ? 'approved' : 'denied',
		);
		await this.persistThreadSnapshot(threadId, runId);
		this.suspendedRuns.delete(threadId);
		this.activeRuns.set(threadId, { runId, abortController });

		const resumeData = {
			approved: data.approved,
			...(data.credentialId ? { credentialId: data.credentialId } : {}),
			...(data.credentials ? { credentials: data.credentials } : {}),
			...(data.autoSetup ? { autoSetup: data.autoSetup } : {}),
			...(data.mockCredentials ? { mockCredentials: data.mockCredentials } : {}),
			...(data.userInput !== undefined ? { userInput: data.userInput } : {}),
			...(data.answers ? { answers: data.answers } : {}),
			...(data.domainAccessAction ? { domainAccessAction: data.domainAccessAction } : {}),
		};

		// Create snapshot storage for saving agent tree after resumed run completes
		const snapshotStorage = this.createSnapshotStorage();

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
				if (event) {
					this.publishEvent(opts.threadId, event);
				}
			}

			if (lastSuspension && !opts.signal.aborted) {
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
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

			if (opts.signal.aborted) {
				this.publishEvent(opts.threadId, {
					type: 'run-finish',
					runId: opts.runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
			} else {
				this.publishEvent(opts.threadId, {
					type: 'run-finish',
					runId: opts.runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'completed' },
				});
			}

			// Save agent tree snapshot for session restore
			await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
			if (!opts.signal.aborted) {
				this.activeRuns.delete(opts.threadId);
			}
		} catch (error) {
			if (opts.signal.aborted) {
				this.publishEvent(opts.threadId, {
					type: 'run-finish',
					runId: opts.runId,
					agentId: ORCHESTRATOR_AGENT_ID,
					payload: { status: 'cancelled', reason: 'user_cancelled' },
				});
				await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
				return;
			}

			const errorMessage = getErrorMessage(error);

			this.logger.error('Instance AI resumed run error', {
				error: errorMessage,
				threadId: opts.threadId,
				runId: opts.runId,
			});

			this.publishEvent(opts.threadId, {
				type: 'run-finish',
				runId: opts.runId,
				agentId: ORCHESTRATOR_AGENT_ID,
				payload: {
					status: 'error',
					reason: errorMessage,
				},
			});
			await this.saveAgentTreeSnapshot(opts.threadId, opts.runId, opts.snapshotStorage);
		} finally {
			this.activeRuns.delete(opts.threadId);
			this.maybeCleanupThreadState(opts.threadId);
		}
	}

	// ── Background task management ──────────────────────────────────────────

	/** Maximum concurrent background tasks per thread to prevent resource exhaustion. */
	private readonly MAX_BACKGROUND_TASKS_PER_THREAD = 5;

	private async createDetachedOrchestrationContext(
		user: User,
		threadId: string,
		executionContext: InstanceAiPlanExecutionContext,
		researchMode?: boolean,
	): Promise<{
		orchestrationContext: OrchestrationContext;
		snapshotStorage: AgentTreeSnapshotStorage;
	}> {
		const localGatewayDisabled = this.settingsService.isFilesystemDisabled();
		const localFilesystemService =
			!localGatewayDisabled && !this.localGateway.isConnected && this.isLocalFilesystemAvailable()
				? this.getLocalFsProvider()
				: undefined;
		const context = this.adapterService.createContext(user, localFilesystemService);
		if (!localGatewayDisabled && this.localGateway.isConnected) {
			context.localMcpServer = this.localGateway;
		}
		context.permissions = this.settingsService.getPermissions();

		context.domainAccessTracker = this.getOrCreateDomainTracker(threadId);
		context.runId = executionContext.originRunId;

		const modelId = await this.resolveModel(user);
		const titleModel = typeof modelId === 'string' ? modelId : modelId.id;
		const memory = createMemory({
			storage: this.compositeStore,
			embedderModel: this.instanceAiConfig.embedderModel || undefined,
			lastMessages: this.instanceAiConfig.lastMessages,
			semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
			titleModel,
		});
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
		const planStorage = this.createPlanStorage();
		const iterationLog = new MastraIterationLogStorage(memory);
		const snapshotStorage = this.createSnapshotStorage();
		const existingPlan = await planStorage.get(threadId);
		const nodeDefDirs = this.adapterService.getNodeDefinitionDirs();
		if (nodeDefDirs.length > 0) {
			setSchemaBaseDirs(nodeDefDirs);
		}

		const domainTools = createAllTools(context);
		const sandboxEntry = await this.getOrCreateWorkspace(threadId, user);

		return {
			orchestrationContext: {
				threadId,
				runId: executionContext.originRunId,
				userId: user.id,
				orchestratorAgentId: ORCHESTRATOR_AGENT_ID,
				modelId,
				storage: this.compositeStore,
				messageGroupId: executionContext.messageGroupId,
				subAgentMaxSteps: this.instanceAiConfig.subAgentMaxSteps,
				eventBus: this.eventSink,
				domainTools,
				abortSignal: new AbortController().signal,
				taskStorage,
				planStorage,
				activePlanStatus: existingPlan?.status,
				runtimeOwnedPlanActive:
					existingPlan?.status === 'approved' || existingPlan?.status === 'running',
				planExecutionContext: executionContext,
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
							runId: executionContext.originRunId,
							messageGroupId: executionContext.messageGroupId,
						});
					});
				},
				cancelBackgroundTask: async (taskId) => await this.cancelBackgroundTask(threadId, taskId),
				spawnBackgroundTask: (opts) =>
					this.spawnBackgroundTask(executionContext.originRunId, opts, snapshotStorage),
				iterationLog,
				sendCorrectionToTask: (taskId, correction) => this.sendCorrectionToTask(taskId, correction),
				workspace: sandboxEntry?.workspace,
				builderSandboxFactory: this.builderSandboxFactory,
				nodeDefinitionDirs: nodeDefDirs.length > 0 ? nodeDefDirs : undefined,
				domainContext: context,
			},
			snapshotStorage,
		};
	}

	private async startPlanExecution(
		threadId: string,
		planId: string,
		runId: string,
		messageGroupId?: string,
	): Promise<void> {
		const user = this.getThreadUser(threadId);
		if (!user) {
			return;
		}

		const researchMode = this.getThreadResearchMode(threadId);
		await this.queuePlanExecution(threadId, planId, async () => {
			const planStorage = this.createPlanStorage();
			const existingPlan = await planStorage.get(threadId);
			if (!existingPlan || existingPlan.planId !== planId) {
				return;
			}

			const nextPlan: InstanceAiPlanSpec = {
				...existingPlan,
				status: 'running',
				executionContext: {
					originRunId: runId,
					messageGroupId,
					startedAt: existingPlan.executionContext?.startedAt ?? Date.now(),
					lastTaskId: existingPlan.executionContext?.lastTaskId,
				},
				lastUpdatedAt: new Date().toISOString(),
			};

			await this.publishPlanUpdate(threadId, runId, nextPlan);
			await this.continuePlanExecutionNow(
				threadId,
				planId,
				user,
				researchMode,
				nextPlan.executionContext,
			);
		});
	}

	private async continuePlanExecution(
		threadId: string,
		planId: string,
		user?: User,
		researchMode?: boolean,
		executionContextOverride?: InstanceAiPlanExecutionContext,
	): Promise<void> {
		const activeUser = user ?? this.getThreadUser(threadId);
		if (!activeUser) {
			return;
		}

		const activeResearchMode = researchMode ?? this.getThreadResearchMode(threadId);
		await this.queuePlanExecution(threadId, planId, async () => {
			await this.continuePlanExecutionNow(
				threadId,
				planId,
				activeUser,
				activeResearchMode,
				executionContextOverride,
			);
		});
	}

	private async continuePlanExecutionNow(
		threadId: string,
		planId: string,
		user: User,
		researchMode?: boolean,
		executionContextOverride?: InstanceAiPlanExecutionContext,
	): Promise<void> {
		const planStorage = this.createPlanStorage();
		const existingPlan = await planStorage.get(threadId);
		if (!existingPlan || existingPlan.planId !== planId) {
			return;
		}

		const executionContext = executionContextOverride ?? existingPlan.executionContext;
		if (!executionContext?.originRunId) {
			this.logger.warn('Cannot continue plan execution without execution context', {
				threadId,
				planId,
			});
			return;
		}

		const reconciledPlan = await this.reconcileStoredPlan(threadId, executionContext.originRunId);
		if (!reconciledPlan || reconciledPlan.planId !== planId) {
			return;
		}

		const { orchestrationContext, snapshotStorage } = await this.createDetachedOrchestrationContext(
			user,
			threadId,
			executionContext,
			researchMode,
		);

		let currentPlan = reconciledPlan;
		while (true) {
			const reconciledCurrentPlan = reconcilePlanPhases(currentPlan);
			const nextStatus = derivePlanStatus(reconciledCurrentPlan, reconciledCurrentPlan.status);
			if (reconciledCurrentPlan !== currentPlan || nextStatus !== reconciledCurrentPlan.status) {
				currentPlan = {
					...reconciledCurrentPlan,
					status: nextStatus,
					lastUpdatedAt: new Date().toISOString(),
				};
				await this.publishPlanUpdate(threadId, executionContext.originRunId, currentPlan);
			} else {
				currentPlan = reconciledCurrentPlan;
			}

			if (
				currentPlan.status === 'draft' ||
				currentPlan.status === 'awaiting_approval' ||
				currentPlan.status === 'blocked' ||
				currentPlan.status === 'completed'
			) {
				return;
			}

			if (this.getActivePlanTasks(threadId, currentPlan.planId).length > 0) {
				return;
			}

			const [runnablePhaseId] = getRunnablePhaseIds(currentPlan);
			if (!runnablePhaseId) {
				return;
			}

			const phase = this.getPlanPhase(currentPlan, runnablePhaseId);
			if (!phase) {
				return;
			}

			currentPlan = await this.startPlanPhaseExecution(
				currentPlan,
				phase,
				orchestrationContext,
				snapshotStorage,
			);

			if (this.getActivePlanTasks(threadId, currentPlan.planId).length > 0) {
				return;
			}
		}
	}

	private async startPlanPhaseExecution(
		plan: InstanceAiPlanSpec,
		phase: InstanceAiPhaseSpec,
		orchestrationContext: OrchestrationContext,
		snapshotStorage: AgentTreeSnapshotStorage,
	): Promise<InstanceAiPlanSpec> {
		const execution = getPhaseExecution(phase);
		if (!execution) {
			const nextPlan = this.recordRetryablePhaseFailure(
				plan,
				phase,
				`Phase "${phase.title}" is missing an execution spec.`,
				'missing_execution_spec',
			);
			await this.publishPlanUpdate(
				orchestrationContext.threadId,
				orchestrationContext.runId,
				nextPlan,
			);
			return nextPlan;
		}

		let startedTask: { taskId: string; result: string } | undefined;
		switch (execution.kind) {
			case 'data-table':
				startedTask = startDataTableAgentTask(orchestrationContext, {
					task: execution.task,
					planId: plan.planId,
					phaseId: phase.id,
				});
				break;
			case 'workflow-build':
				startedTask = await startBuildWorkflowAgentTask(orchestrationContext, {
					task: execution.task,
					workflowId: execution.workflowId,
					planId: plan.planId,
					phaseId: phase.id,
				});
				break;
			case 'research':
				startedTask = startResearchWithAgentTask(orchestrationContext, {
					goal: execution.goal,
					constraints: execution.constraints,
					planId: plan.planId,
					phaseId: phase.id,
				});
				break;
		}

		if (!startedTask?.taskId) {
			const nextPlan = this.recordRetryablePhaseFailure(
				plan,
				phase,
				startedTask?.result ?? `Failed to start phase "${phase.title}".`,
			);
			await this.publishPlanUpdate(
				orchestrationContext.threadId,
				orchestrationContext.runId,
				nextPlan,
			);
			await this.publishMilestoneSummary(
				orchestrationContext.threadId,
				orchestrationContext.runId,
				`Failed to start phase "${phase.title}". `,
				snapshotStorage,
				orchestrationContext.messageGroupId,
			);
			return nextPlan;
		}

		const nextPlan: InstanceAiPlanSpec = {
			...patchPlanPhase(
				plan,
				phase.id,
				{
					status: 'building',
					blocker: undefined,
				},
				'running',
			),
			executionContext: {
				originRunId: orchestrationContext.runId,
				messageGroupId: orchestrationContext.messageGroupId,
				startedAt: plan.executionContext?.startedAt ?? Date.now(),
				lastTaskId: startedTask.taskId,
			},
			lastUpdatedAt: new Date().toISOString(),
		};

		await this.publishPlanUpdate(
			orchestrationContext.threadId,
			orchestrationContext.runId,
			nextPlan,
		);
		await this.publishMilestoneSummary(
			orchestrationContext.threadId,
			orchestrationContext.runId,
			`Starting phase "${phase.title}". `,
			snapshotStorage,
			orchestrationContext.messageGroupId,
		);
		return nextPlan;
	}

	private spawnBackgroundTask(
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: AgentTreeSnapshotStorage,
	): void {
		// Enforce per-thread concurrent task limit
		const runningCount = [...this.backgroundTasks.values()].filter(
			(t) => t.threadId === opts.threadId && this.isTaskActive(t),
		).length;
		if (runningCount >= this.MAX_BACKGROUND_TASKS_PER_THREAD) {
			this.publishEvent(opts.threadId, {
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

		// Capture the messageGroupId at spawn time — NOT the thread's current one,
		// which may change if the user starts a new turn while this task runs.
		const messageGroupId = opts.messageGroupId ?? this.getCurrentMessageGroupId(opts.threadId);
		const startedAt = Date.now();

		const task: BackgroundTask = {
			taskId: opts.taskId,
			threadId: opts.threadId,
			runId,
			role: opts.role,
			agentId: opts.agentId,
			kind: opts.kind,
			title: opts.title,
			subtitle: opts.subtitle,
			goal: opts.goal,
			targetResource: opts.targetResource,
			status: 'running',
			startedAt,
			updatedAt: startedAt,
			abortController,
			corrections: [],
			messageGroupId,
			planId: opts.planId,
			phaseId: opts.phaseId,
		};
		this.backgroundTasks.set(opts.taskId, task);
		void this.saveTaskRunSnapshot(opts.threadId, this.toTaskRun(task), 'task-created');

		// Create a drain function that atomically drains queued corrections
		const drainCorrections = (): string[] => {
			const pending = [...task.corrections];
			task.corrections.length = 0;
			return pending;
		};

		task.workItemId = opts.workItemId;

		// Fire-and-forget — runs detached from the orchestrator stream
		const planStorage = this.createPlanStorage();
		void (async () => {
			try {
				const raw = await opts.run(abortController.signal, drainCorrections, {
					suspended: async (requestId?: string) => {
						task.status = 'suspended';
						task.updatedAt = Date.now();
						await this.saveTaskRunSnapshot(opts.threadId, this.toTaskRun(task), 'task-updated');
						if (task.planId && task.phaseId) {
							const existingPlan = await planStorage.get(task.threadId);
							if (existingPlan?.planId === task.planId) {
								const nextPlan = patchPlanPhase(
									existingPlan,
									task.phaseId,
									{
										status: 'blocked',
										blocker: {
											reason: 'Waiting for user input to continue this task',
											requestId,
											inputType: 'approval',
										},
									},
									'blocked',
								);
								await this.publishPlanUpdate(task.threadId, task.runId, nextPlan);
							}
						}
						await this.persistDetachedSnapshot(task);
					},
					resumed: async () => {
						task.status = 'running';
						task.updatedAt = Date.now();
						await this.saveTaskRunSnapshot(opts.threadId, this.toTaskRun(task), 'task-updated');
						if (task.planId && task.phaseId) {
							const existingPlan = await planStorage.get(task.threadId);
							if (existingPlan?.planId === task.planId) {
								const nextPlan = patchPlanPhase(
									existingPlan,
									task.phaseId,
									{
										status: 'building',
										blocker: undefined,
									},
									'running',
								);
								await this.publishPlanUpdate(task.threadId, task.runId, nextPlan);
							}
						}
						await this.persistDetachedSnapshot(task);
					},
				});
				// Support both plain string and structured result
				const resultText = typeof raw === 'string' ? raw : raw.text;
				const outcome = typeof raw === 'string' ? undefined : parseOutcome(raw.outcome);

				task.status = 'completed';
				task.result = resultText;
				task.outcome = outcome;
				task.updatedAt = Date.now();
				task.completedAt = task.updatedAt;

				this.publishEvent(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: resultText },
				});
			} catch (error) {
				if (abortController.signal.aborted) {
					return;
				}
				const errorMessage = getErrorMessage(error);
				task.status = 'failed';
				task.error = errorMessage;
				task.updatedAt = Date.now();
				task.completedAt = task.updatedAt;
				this.publishEvent(opts.threadId, {
					type: 'agent-completed',
					runId,
					agentId: opts.agentId,
					payload: { role: opts.role, result: '', error: errorMessage },
				});
			}
			await this.saveTaskRunSnapshot(opts.threadId, this.toTaskRun(task), 'task-updated');
			await this.patchPlanFromTaskResult(task, planStorage, snapshotStorage);
			// Re-save snapshot so the completed/failed background agent is captured.
			// Use the task's own messageGroupId (captured at spawn time), not the
			// thread's current one — the user may have started a new turn since.
			if (this.shouldPersistDetachedSnapshot(opts.threadId, runId)) {
				await this.saveAgentTreeSnapshot(
					opts.threadId,
					runId,
					snapshotStorage,
					task.messageGroupId,
				);
			}
			this.backgroundTasks.delete(task.taskId);
			if (task.planId) {
				await this.continuePlanExecution(opts.threadId, task.planId);
			}
			this.maybeCleanupThreadState(opts.threadId);
		})();
	}

	/** Cancel all background tasks for a thread. */
	private async cancelBackgroundTasks(threadId: string): Promise<void> {
		for (const [, task] of this.backgroundTasks) {
			if (task.threadId === threadId && this.isTaskActive(task)) {
				await this.cancelBackgroundTaskInternal(task);
				this.maybeCleanupThreadState(threadId);
			}
		}
	}

	/**
	 * Build an agent tree from live runtime state and persist it as the durable snapshot
	 * for this assistant message group. Existing snapshots for the same group are updated in place.
	 */
	private async saveAgentTreeSnapshot(
		threadId: string,
		runId: string,
		snapshotStorage: AgentTreeSnapshotStorage,
		/** Override the messageGroupId instead of using the thread's current one.
		 *  Background tasks pass their own group since the thread-global may have
		 *  changed if the user started a new turn. */
		overrideMessageGroupId?: string,
	): Promise<void> {
		try {
			const runtime = this.getThreadRuntime(threadId);
			const messageGroupId =
				overrideMessageGroupId ??
				this.findMessageGroupIdForRun(threadId, runId) ??
				this.getCurrentMessageGroupId(threadId);
			if (!runtime || !messageGroupId) {
				return;
			}

			const runState = runtime.runStateByMessageGroup.get(messageGroupId);
			if (!runState) {
				return;
			}

			const groupRunIds = runtime.runIdsByMessageGroup.get(messageGroupId);
			const agentTree = toAgentTree(runState);

			await snapshotStorage.updateLast(threadId, agentTree, runId, messageGroupId, groupRunIds);
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
