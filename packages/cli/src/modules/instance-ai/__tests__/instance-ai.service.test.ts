import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			getRegularTools = jest.fn().mockResolvedValue({});
			getBrowserTools = jest.fn().mockResolvedValue({});
			disconnect = jest.fn();
		},
		createDomainAccessTracker: jest.fn(),
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
		createLazyRuntimeWorkspace: jest.fn(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		),
		createLazyWorkspaceRuntimeSkillSource: jest.fn(({ source }) => source),
		setupSandboxWorkspace: jest.fn(),
		loadInstanceAiRuntimeSkillSource: jest.fn(() => ({
			registry: {
				skillsHash: 'runtime-skills-hash',
				skills: [{ id: 'data-table-manager' }],
			},
			loadSkill: jest.fn(),
		})),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: jest.fn(),
		handleVerificationVerdict: jest.fn(),
		buildAgentTreeFromEvents: jest.fn(
			(events: Array<{ type: string; payload?: { text?: string } }>) => ({
				agentId: 'agent-001',
				role: 'orchestrator',
				status: 'completed',
				textContent: events
					.map((event) => (event.type === 'text-delta' ? (event.payload?.text ?? '') : ''))
					.join(''),
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			}),
		),
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
		WorkflowTaskCoordinator: class {},
		WorkflowLoopStorage: class {},
		ThreadTaskStorage: class {},
		PlannedTaskStorage: class {},
		PlannedTaskCoordinator: class {},
		InstanceAiTerminalResponseGuard: class {
			constructor(private readonly options: { runId: string; rootAgentId: string }) {}

			evaluateTerminal(
				_events: unknown[],
				status: 'completed' | 'cancelled' | 'errored',
				options: { errorMessage?: string } = {},
			) {
				if (status === 'errored') {
					return {
						status,
						visibilitySource: 'none',
						action: 'emit',
						reason: 'errored-silent',
						event: {
							type: 'error',
							runId: this.options.runId,
							agentId: this.options.rootAgentId,
							responseId: `terminal-fallback:${this.options.runId}:${status}`,
							payload: {
								content:
									options.errorMessage ??
									'I hit an error before I could finish that response. Please try again.',
							},
						},
					};
				}

				return {
					status,
					visibilitySource: 'none',
					action: 'emit',
					reason: status === 'cancelled' ? 'cancelled-silent' : 'completed-silent',
					event: {
						type: 'text-delta',
						runId: this.options.runId,
						agentId: this.options.rootAgentId,
						responseId: `terminal-fallback:${this.options.runId}:${status}`,
						payload: { text: `fallback:${status}` },
					},
				};
			}

			evaluateWaiting(_events: unknown[], confirmationEvent?: { payload?: { message?: string } }) {
				if (confirmationEvent?.payload?.message) {
					return {
						status: 'waiting',
						visibilitySource: 'confirmation-ui',
						action: 'none',
						reason: 'confirmation-visible',
					};
				}

				return {
					status: 'waiting',
					visibilitySource: 'none',
					action: 'emit',
					reason: 'confirmation-invalid',
					event: {
						type: 'error',
						runId: this.options.runId,
						agentId: this.options.rootAgentId,
						responseId: `terminal-fallback:${this.options.runId}:waiting`,
						payload: {
							content:
								'I need your input to continue, but I could not display the prompt. Please try again.',
						},
					},
				};
			}
		},
		resumeAgentRun: jest.fn(),
		TerminalOutcomeStorage: class {
			constructor(_memory: unknown) {}
		},
	};
});

import type { User } from '@n8n/db';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import {
	createAllTools,
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	createSandbox,
	createWorkspace,
	loadInstanceAiRuntimeSkillSource,
	resumeAgentRun,
	setupSandboxWorkspace,
	type InstanceAiContext,
	type SandboxConfig,
	type ManagedBackgroundTask,
	type InstanceAiTraceContext,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type SpawnManagedBackgroundTaskOptions,
	type TerminalOutcome,
} from '@n8n/instance-ai';

import { InstanceAiService } from '../instance-ai.service';

type ServiceInternals = {
	pendingCheckpointReentries: Map<string, Set<string>>;
	queuePendingCheckpointReentry: (threadId: string, checkpointTaskId: string) => void;
	drainPendingCheckpointReentries: (user: User, threadId: string) => Promise<void>;
	reenterCheckpointById: jest.Mock<Promise<boolean>, [User, string, string, string?]>;
	backgroundTasks: {
		getRunningTasksByParentCheckpoint: jest.Mock;
	};
	runState: {
		getActiveRunId: jest.Mock;
		hasSuspendedRun: jest.Mock;
	};
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

type RunningTask = { taskId: string };
type MarkedWorkflow = { workflowId: string };
type ArchiveIfAiTemporary = jest.MockedFunction<(workflowId: string) => Promise<boolean>>;

type BackgroundTaskFollowUpServiceInternals = {
	spawnBackgroundTask: (
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: unknown,
		messageGroupIdOverride?: string,
	) => SpawnBackgroundTaskResult;
	backgroundTasks: {
		spawn: jest.MockedFunction<
			(options: SpawnManagedBackgroundTaskOptions) => {
				status: 'started';
				task: ManagedBackgroundTask;
			}
		>;
		getRunningTasks: jest.MockedFunction<(threadId: string) => ManagedBackgroundTask[]>;
	};
	runState: {
		getMessageGroupId: jest.MockedFunction<(threadId: string) => string | undefined>;
		getThreadUser: jest.MockedFunction<(threadId: string) => User | undefined>;
		getActiveRunId: jest.MockedFunction<(threadId: string) => string | undefined>;
		hasSuspendedRun: jest.MockedFunction<(threadId: string) => boolean>;
	};
	liveness: {
		hasTimedOutActiveRunThread: jest.MockedFunction<(threadId: string) => boolean>;
	};
	eventBus: {
		publish: jest.MockedFunction<(threadId: string, event: InstanceAiEvent) => void>;
	};
	finalizeBackgroundTaskTracing: jest.MockedFunction<
		(task: ManagedBackgroundTask, status: 'completed' | 'failed' | 'cancelled') => Promise<void>
	>;
	handlePlannedTaskSettlement: jest.MockedFunction<
		(
			user: User,
			task: ManagedBackgroundTask,
			status: 'succeeded' | 'failed' | 'cancelled',
		) => Promise<void>
	>;
	recordBackgroundTerminalOutcome: jest.MockedFunction<
		(task: ManagedBackgroundTask) => Promise<void>
	>;
	saveAgentTreeSnapshot: jest.MockedFunction<
		(
			threadId: string,
			runId: string,
			snapshotStorage: unknown,
			isUpdate?: boolean,
			overrideMessageGroupId?: string,
		) => Promise<void>
	>;
	startInternalFollowUpRun: jest.MockedFunction<
		(
			user: User,
			threadId: string,
			message: string,
			messageGroupId?: string,
		) => Promise<string | undefined>
	>;
	queuePendingCheckpointReentry: jest.MockedFunction<
		(threadId: string, checkpointTaskId: string) => void
	>;
	maybeReenterParentCheckpoint: jest.MockedFunction<
		(user: User, threadId: string, task: ManagedBackgroundTask) => Promise<boolean>
	>;
	logger: { warn: jest.Mock; debug: jest.Mock };
};

function createBackgroundTaskFollowUpService({
	timedOutThread = false,
}: { timedOutThread?: boolean } = {}): {
	service: BackgroundTaskFollowUpServiceInternals;
	task: ManagedBackgroundTask;
	getSpawnOptions: () => SpawnManagedBackgroundTaskOptions;
} {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as BackgroundTaskFollowUpServiceInternals;
	let spawnOptions: SpawnManagedBackgroundTaskOptions | undefined;
	const task: ManagedBackgroundTask = {
		taskId: 'task-1',
		threadId: 'thread-a',
		runId: 'run-1',
		role: 'workflow-builder',
		agentId: 'agent-builder',
		status: 'completed',
		result: 'done',
		startedAt: 0,
		lastActivityAt: 0,
		abortController: new AbortController(),
		corrections: [],
		messageGroupId: 'group-1',
	};

	service.backgroundTasks = {
		spawn: jest.fn((options: SpawnManagedBackgroundTaskOptions) => {
			spawnOptions = options;
			return { status: 'started', task };
		}),
		getRunningTasks: jest.fn((_threadId: string) => []),
	};
	service.runState = {
		getMessageGroupId: jest.fn((_threadId: string) => 'group-1'),
		getThreadUser: jest.fn((_threadId: string) => fakeUser),
		getActiveRunId: jest.fn((_threadId: string) => undefined),
		hasSuspendedRun: jest.fn((_threadId: string) => false),
	};
	service.liveness = {
		hasTimedOutActiveRunThread: jest.fn((threadId: string) =>
			timedOutThread ? threadId === 'thread-a' : false,
		),
	};
	service.eventBus = { publish: jest.fn((_threadId: string, _event: InstanceAiEvent) => {}) };
	service.finalizeBackgroundTaskTracing = jest.fn(
		async (_task: ManagedBackgroundTask, _status: 'completed' | 'failed' | 'cancelled') => {},
	);
	service.handlePlannedTaskSettlement = jest.fn(
		async (
			_user: User,
			_task: ManagedBackgroundTask,
			_status: 'succeeded' | 'failed' | 'cancelled',
		) => {},
	);
	service.recordBackgroundTerminalOutcome = jest.fn(async (_task: ManagedBackgroundTask) => {});
	service.saveAgentTreeSnapshot = jest.fn(
		async (
			_threadId: string,
			_runId: string,
			_snapshotStorage: unknown,
			_isUpdate?: boolean,
			_overrideMessageGroupId?: string,
		) => {},
	);
	service.startInternalFollowUpRun = jest.fn(
		async (_user: User, _threadId: string, _message: string, _messageGroupId?: string) =>
			'run-follow-up',
	);
	service.queuePendingCheckpointReentry = jest.fn();
	service.maybeReenterParentCheckpoint = jest.fn(
		async (_user: User, _threadId: string, _task: ManagedBackgroundTask) => false,
	);
	service.logger = { warn: jest.fn(), debug: jest.fn() };

	return {
		service,
		task,
		getSpawnOptions: () => {
			if (!spawnOptions) throw new Error('Background task was not spawned');
			return spawnOptions;
		},
	};
}

type StartRunServiceInternals = {
	startRun: InstanceAiService['startRun'];
	liveness: {
		clearThreadState: jest.MockedFunction<(threadId: string) => void>;
	};
	runState: {
		startRun: jest.MockedFunction<
			(options: { threadId: string; user: User }) => {
				runId: string;
				abortController: AbortController;
				messageGroupId?: string;
			}
		>;
		setTimeZone: jest.MockedFunction<(threadId: string, timeZone: string) => void>;
	};
	threadPushRef: Map<string, string>;
	executeRun: jest.Mock;
	trackInFlightExecution: jest.Mock;
};

function createStartRunService(): StartRunServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as StartRunServiceInternals;
	service.liveness = {
		clearThreadState: jest.fn((_threadId: string) => {}),
	};
	service.runState = {
		startRun: jest.fn((_options) => ({
			runId: 'run-1',
			abortController: new AbortController(),
			messageGroupId: 'group-1',
		})),
		setTimeZone: jest.fn(),
	};
	service.threadPushRef = new Map();
	service.executeRun = jest.fn();
	service.trackInFlightExecution = jest.fn();
	return service;
}

type TemporaryCleanupService = {
	reapAiTemporaryFromRun: (
		threadId: string,
		user: User,
		createdWorkflowIds: Set<string> | undefined,
	) => Promise<string[]>;
	backgroundTasks: {
		getRunningTasks: jest.MockedFunction<(threadId: string) => RunningTask[]>;
	};
	aiBuilderTemporaryWorkflowRepository: {
		findByThread: jest.MockedFunction<(threadId: string) => Promise<MarkedWorkflow[]>>;
	};
	adapterService: {
		createContext: jest.MockedFunction<
			(
				user: User,
				options: { threadId: string },
			) => { workflowService: { archiveIfAiTemporary: ArchiveIfAiTemporary } }
		>;
	};
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

function createCheckpointService(): ServiceInternals {
	// Bypass the constructor — we only exercise the three pending-reentry helpers
	// and their direct dependencies. Everything else (scheduler, event bus, etc.)
	// is out of scope for this unit.
	const service = Object.create(InstanceAiService.prototype) as unknown as ServiceInternals;

	service.pendingCheckpointReentries = new Map();
	service.reenterCheckpointById = jest.fn(
		async (_user: User, _threadId: string, _checkpointTaskId: string, _mgid?: string) => true,
	);
	service.backgroundTasks = {
		getRunningTasksByParentCheckpoint: jest.fn(() => []),
	};
	service.runState = {
		getActiveRunId: jest.fn(() => undefined),
		hasSuspendedRun: jest.fn(() => false),
	};
	service.logger = {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	return service;
}

type CheckpointPruneServiceInternals = {
	startCheckpointPruning: () => void;
	stopCheckpointPruning: () => void;
	pruneStaleCheckpoints: (now?: number) => Promise<void>;
	pruneStalePendingConfirmations: jest.MockedFunction<(now: number) => Promise<void>>;
	scheduleCheckpointPrune: jest.MockedFunction<(delayMs?: number) => void>;
	checkpointStore: {
		markExpiredOlderThan: jest.MockedFunction<(olderThan: Date) => Promise<number>>;
	};
	checkpointPruneTimer?: NodeJS.Timeout;
	checkpointPruningStopped: boolean;
	instanceAiConfig: {
		snapshotPruneInterval: number;
		snapshotRetention: number;
	};
	logger: { info: jest.Mock; debug: jest.Mock; warn: jest.Mock };
};

function createCheckpointPruneService(): CheckpointPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as CheckpointPruneServiceInternals;
	service.scheduleCheckpointPrune = jest.fn();
	service.pruneStalePendingConfirmations = jest.fn(async (_now: number) => undefined);
	service.checkpointStore = {
		markExpiredOlderThan: jest.fn(async (_olderThan: Date) => 0),
	};
	service.checkpointPruningStopped = true;
	service.instanceAiConfig = {
		snapshotPruneInterval: 60 * 60 * 1000,
		snapshotRetention: 7 * 24 * 60 * 60 * 1000,
	};
	service.logger = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
	};
	return service;
}

function createTemporaryCleanupService({
	runningTaskCount = 0,
	markedWorkflows = [],
	archivedWorkflowIds = new Set<string>(),
}: {
	runningTaskCount?: number;
	markedWorkflows?: MarkedWorkflow[];
	archivedWorkflowIds?: Set<string>;
} = {}): {
	service: TemporaryCleanupService;
	archiveIfAiTemporary: ArchiveIfAiTemporary;
} {
	const service = Object.create(InstanceAiService.prototype) as unknown as TemporaryCleanupService;
	const runningTasks: RunningTask[] = Array.from({ length: runningTaskCount }, (_value, index) => ({
		taskId: `task-${index}`,
	}));
	const archiveIfAiTemporary: ArchiveIfAiTemporary = jest.fn(async (workflowId: string) =>
		archivedWorkflowIds.has(workflowId),
	);

	service.backgroundTasks = {
		getRunningTasks: jest.fn((_threadId: string) => runningTasks),
	};
	service.aiBuilderTemporaryWorkflowRepository = {
		findByThread: jest.fn(async (_threadId: string) => markedWorkflows),
	};
	service.adapterService = {
		createContext: jest.fn((_user: User, _options: { threadId: string }) => ({
			workflowService: { archiveIfAiTemporary },
		})),
	};
	service.logger = {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	return { service, archiveIfAiTemporary };
}

const fakeUser = { id: 'user-1' } as User;
const daytonaSandboxConfig = {
	enabled: true,
	provider: 'daytona',
} satisfies SandboxConfig;

type WorkspaceServiceInternals = {
	sandboxes: Map<string, unknown>;
	sandboxCreations: Map<string, Promise<unknown>>;
	resolveSandboxConfig: jest.MockedFunction<(user: User) => Promise<SandboxConfig>>;
	instanceAiConfig?: { builderSandboxTtlMs?: number };
	sandboxTtlMs: number;
	getOrCreateWorkspace: (
		threadId: string,
		user: User,
		context: InstanceAiContext,
		runId?: string,
	) => Promise<unknown>;
};

type SandboxExpiryEntry = {
	sandbox: unknown;
	workspace: { destroy: jest.MockedFunction<() => Promise<void>> };
	setupComplete: boolean;
	setupPromise: Promise<void> | undefined;
	expiresAt: number;
	cleanupTimer?: ReturnType<typeof setTimeout>;
};

type SandboxExpiryServiceInternals = {
	sandboxes: Map<string, SandboxExpiryEntry>;
	instanceAiConfig: { builderSandboxTtlMs?: number };
	runState: {
		getActiveRunId: jest.MockedFunction<(threadId: string) => string | undefined>;
		hasSuspendedRun: jest.MockedFunction<(threadId: string) => boolean>;
	};
	backgroundTasks: {
		getRunningTasks: jest.MockedFunction<(threadId: string) => ManagedBackgroundTask[]>;
	};
	scheduleSandboxExpiry: (threadId: string, entry: SandboxExpiryEntry) => void;
};

type ShutdownServiceInternals = {
	shutdown: () => Promise<void>;
	stopCheckpointPruning: jest.MockedFunction<() => void>;
	liveness: { shutdown: jest.MockedFunction<() => void> };
	runState: {
		shutdown: jest.MockedFunction<
			() => {
				activeRuns: [];
				suspendedRuns: [];
			}
		>;
	};
	backgroundTasks: { cancelAll: jest.MockedFunction<() => ManagedBackgroundTask[]> };
	traceContextsByRunId: Map<string, { threadId: string }>;
	finalizeRunTracing: jest.MockedFunction<
		(runId: string, tracing: InstanceAiTraceContext | undefined, options: unknown) => Promise<void>
	>;
	finalizeBackgroundTaskTracing: jest.MockedFunction<
		(task: ManagedBackgroundTask, status: 'cancelled') => Promise<void>
	>;
	finalizeRemainingMessageTraceRoots: jest.MockedFunction<
		(threadId: string, options: unknown) => Promise<void>
	>;
	gatewayRegistry: { disconnectAll: jest.MockedFunction<() => void> };
	sandboxes: Map<
		string,
		{
			sandbox: unknown;
			workspace: { destroy: jest.MockedFunction<() => Promise<void>> };
		}
	>;
	domainAccessTrackersByThread: Map<string, unknown>;
	eventBus: { clear: jest.MockedFunction<() => void> };
	_mcpClientManager?: { disconnect: jest.MockedFunction<() => Promise<void>> };
	inFlightExecutions: Set<Promise<unknown>>;
	logger: { debug: jest.Mock; warn: jest.Mock };
};

type TerminalOutcomeServiceInternals = {
	replayUndeliveredTerminalOutcomes: (
		threadId: string,
		options?: { delivery?: 'snapshot' | 'event' },
	) => Promise<void>;
	createTerminalOutcomeStorage: jest.Mock;
	dbSnapshotStorage: {
		getLatest: jest.Mock;
		save: jest.Mock;
		updateLast: jest.Mock;
	};
	eventBus: {
		getEventsForRun: jest.Mock;
		publish: jest.Mock;
	};
	telemetry: { track: jest.Mock };
	logger: { warn: jest.Mock };
	pendingTerminalOutcomes: Map<string, TerminalOutcome>;
};

function createTerminalOutcomeService(
	outcomes: TerminalOutcome[],
	snapshotTree?: InstanceAiAgentNode,
): TerminalOutcomeServiceInternals {
	const storage = {
		getUndelivered: jest.fn(async () => outcomes),
		markDelivered: jest.fn(async () => {}),
	};
	const service = Object.create(InstanceAiService.prototype) as TerminalOutcomeServiceInternals;
	service.createTerminalOutcomeStorage = jest.fn(() => storage);
	service.dbSnapshotStorage = {
		getLatest: jest.fn(async () =>
			snapshotTree
				? {
						tree: snapshotTree,
						runId: 'run-1',
						messageGroupId: 'group-1',
						runIds: ['run-1'],
					}
				: undefined,
		),
		save: jest.fn(async () => {}),
		updateLast: jest.fn(async () => {}),
	};
	service.eventBus = {
		getEventsForRun: jest.fn(() => []),
		publish: jest.fn(),
	};
	service.telemetry = { track: jest.fn() };
	service.logger = { warn: jest.fn() };
	service.pendingTerminalOutcomes = new Map();
	return service;
}

type TerminalGuardOrderServiceInternals = {
	evaluateTerminalResponse: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		options?: { messageGroupId?: string; errorMessage?: string },
	) => { action: string; reason: string } | undefined;
	evaluateWaitingResponse: (
		threadId: string,
		runId: string,
		confirmationEvent: Extract<InstanceAiEvent, { type: 'confirmation-request' }> | undefined,
		options?: { messageGroupId?: string },
	) => { reason: string } | undefined;
	finishInvalidConfirmationRun: (args: {
		threadId: string;
		runId: string;
		abortController: AbortController;
		snapshotStorage: unknown;
	}) => Promise<{ status: string; reason?: string }>;
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
	) => void;
	runState: {
		getRunIdsForMessageGroup: jest.Mock;
		cancelThread: jest.Mock;
		clearActiveRun: jest.Mock;
		hasSuspendedRun: jest.Mock;
	};
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: jest.Mock;
		getEventsForRuns: jest.Mock;
		publish: jest.Mock;
	};
	liveness: { consumeRunTimeout: jest.Mock };
	telemetry: { track: jest.Mock };
	logger: { warn: jest.Mock; error: jest.Mock };
	traceContextsByRunId: Map<string, { threadId: string; messageGroupId?: string }>;
	threadPushRef: Map<string, string>;
	finalizeRunTracing: jest.Mock;
	saveAgentTreeSnapshot: jest.Mock;
	reapAiTemporaryFromRun: jest.Mock;
	countCreditsIfFirst: jest.Mock;
	maybeFinalizeRunTraceRoot: jest.Mock;
	schedulePlannedTasks: jest.Mock;
	drainPendingCheckpointReentries: jest.Mock;
	processResumedStream: (
		agent: unknown,
		resumeData: unknown,
		opts: {
			runId: string;
			agentRunId: string;
			threadId: string;
			user: User;
			toolCallId: string;
			signal: AbortSignal;
			abortController: AbortController;
			snapshotStorage: unknown;
			tracing?: InstanceAiTraceContext;
		},
	) => Promise<void>;
};

type SnapshotServiceInternals = {
	saveAgentTreeSnapshot: (
		threadId: string,
		runId: string,
		snapshotStorage: {
			getLatest: jest.Mock;
			save: jest.Mock;
			updateLast: jest.Mock;
		},
		isUpdate?: boolean,
		overrideMessageGroupId?: string,
	) => Promise<void>;
	runState: {
		getMessageGroupId: jest.Mock;
		getRunIdsForMessageGroup: jest.Mock;
	};
	eventBus: {
		getEventsForRun: jest.Mock;
		getEventsForRuns: jest.Mock;
	};
	traceContextsByRunId: Map<string, { tracing?: { rootRun: { id: string; traceId: string } } }>;
	logger: { warn: jest.Mock };
};

function createTerminalGuardOrderService(): TerminalGuardOrderServiceInternals {
	const events: InstanceAiEvent[] = [];
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as TerminalGuardOrderServiceInternals;
	service.runState = {
		getRunIdsForMessageGroup: jest.fn(() => ['run-1']),
		cancelThread: jest.fn(),
		clearActiveRun: jest.fn(),
		hasSuspendedRun: jest.fn(() => true),
	};
	service.eventBus = {
		events,
		getEventsForRun: jest.fn(() => events),
		getEventsForRuns: jest.fn(() => events),
		publish: jest.fn((_threadId: string, event: InstanceAiEvent) => {
			events.push(event);
		}),
	};
	service.liveness = { consumeRunTimeout: jest.fn(() => ({ timedOut: false })) };
	service.telemetry = { track: jest.fn() };
	service.logger = { warn: jest.fn(), error: jest.fn() };
	service.traceContextsByRunId = new Map([
		['run-1', { threadId: 'thread-a', messageGroupId: 'group-1' }],
	]);
	service.threadPushRef = new Map();
	service.finalizeRunTracing = jest.fn(async () => {});
	service.saveAgentTreeSnapshot = jest.fn(async () => {});
	service.reapAiTemporaryFromRun = jest.fn(async () => []);
	service.countCreditsIfFirst = jest.fn(async () => {});
	service.maybeFinalizeRunTraceRoot = jest.fn(async () => {});
	service.schedulePlannedTasks = jest.fn(async () => {});
	service.drainPendingCheckpointReentries = jest.fn(async () => {});
	return service;
}

function createSnapshotService(): SnapshotServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as SnapshotServiceInternals;
	service.runState = {
		getMessageGroupId: jest.fn(() => undefined),
		getRunIdsForMessageGroup: jest.fn(() => []),
	};
	service.eventBus = {
		getEventsForRun: jest.fn(() => []),
		getEventsForRuns: jest.fn(() => []),
	};
	service.traceContextsByRunId = new Map();
	service.logger = { warn: jest.fn() };
	return service;
}

function makeTerminalOutcome(overrides: Partial<TerminalOutcome> = {}): TerminalOutcome {
	return {
		id: 'group-1:task-1:completed',
		threadId: 'thread-a',
		runId: 'run-1',
		messageGroupId: 'group-1',
		correlationId: 'message-1',
		taskId: 'task-1',
		agentId: 'agent-builder',
		status: 'completed',
		userFacingMessage: 'The background workflow-builder task finished.',
		createdAt: '2026-05-01T00:00:00.000Z',
		...overrides,
	};
}

function makeAgentTree(): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Initial response',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Initial response' }],
	};
}

describe('InstanceAiService — runtime workspace setup', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(createSandbox as jest.Mock).mockReset();
		(createWorkspace as jest.Mock).mockReset();
		(setupSandboxWorkspace as jest.Mock).mockReset();
		(createAllTools as jest.Mock).mockReset();
		(createLazyRuntimeWorkspace as jest.Mock).mockImplementation(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		);
		(createLazyWorkspaceRuntimeSkillSource as jest.Mock).mockImplementation(({ source }) => source);
	});

	it('serializes workspace creation for concurrent calls on the same thread', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as WorkspaceServiceInternals;
		service.sandboxes = new Map();
		service.sandboxCreations = new Map();
		service.resolveSandboxConfig = jest.fn(async (_user: User) => daytonaSandboxConfig);

		let resolveSandbox!: (sandbox: unknown) => void;
		const sandboxPromise = new Promise((resolve) => {
			resolveSandbox = resolve;
		});
		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: jest.fn(async () => {}),
			destroy: jest.fn(async () => {}),
		};
		(createSandbox as jest.Mock).mockReturnValue(sandboxPromise);
		(createWorkspace as jest.Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as jest.Mock).mockResolvedValue(undefined);

		const first = service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
		const second = service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);
		resolveSandbox(sandbox);
		const [firstEntry, secondEntry] = await Promise.all([first, second]);

		expect(firstEntry).toBe(secondEntry);
		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(createSandbox).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'instance-ai-thread-thread-1',
				name: 'instance-ai-thread-thread-1',
				labels: expect.objectContaining({
					'n8n-builder': 'instance-ai-thread-thread-1',
					thread_id: 'thread-1',
				}),
			}),
			expect.objectContaining({ useSnapshotFallback: true }),
		);
		expect(createWorkspace).toHaveBeenCalledTimes(1);
		expect(createWorkspace).toHaveBeenCalledWith(sandbox);
		expect(workspace.init).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).toHaveBeenCalledTimes(1);
		expect(service.sandboxCreations.size).toBe(0);
	});

	it('keeps the default runtime sandbox TTL aligned with provider auto-stop', () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as WorkspaceServiceInternals;
		service.instanceAiConfig = {};

		expect(service.sandboxTtlMs).toBe(15 * 60 * 1000);
	});

	it('evicts expired runtime sandbox entries without destroying the provider workspace', () => {
		jest.useFakeTimers();
		try {
			const service = Object.create(
				InstanceAiService.prototype,
			) as unknown as SandboxExpiryServiceInternals;
			const workspace = { destroy: jest.fn(async () => {}) };
			const entry: SandboxExpiryEntry = {
				sandbox: { id: 'sandbox-1' },
				workspace,
				setupComplete: true,
				setupPromise: undefined,
				expiresAt: Date.now() + 1000,
			};
			service.instanceAiConfig = { builderSandboxTtlMs: 1000 };
			service.sandboxes = new Map([['thread-1', entry]]);
			service.runState = {
				getActiveRunId: jest.fn((_threadId: string) => undefined),
				hasSuspendedRun: jest.fn((_threadId: string) => false),
			};
			service.backgroundTasks = {
				getRunningTasks: jest.fn((_threadId: string) => []),
			};

			service.scheduleSandboxExpiry('thread-1', entry);
			jest.advanceTimersByTime(1000);

			expect(service.sandboxes.has('thread-1')).toBe(false);
			expect(workspace.destroy).not.toHaveBeenCalled();
		} finally {
			jest.useRealTimers();
		}
	});

	it('threads Daytona name prefixes and labels through sandbox creation', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as WorkspaceServiceInternals;
		service.sandboxes = new Map();
		service.sandboxCreations = new Map();
		service.resolveSandboxConfig = jest.fn(async (_user: User) => ({
			...daytonaSandboxConfig,
			namePrefix: 'Acme Eval',
		}));
		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: jest.fn(async () => {}),
			destroy: jest.fn(async () => {}),
		};
		(createSandbox as jest.Mock).mockResolvedValue(sandbox);
		(createWorkspace as jest.Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as jest.Mock).mockResolvedValue(undefined);

		await service.getOrCreateWorkspace(
			'thread-1',
			fakeUser,
			{} as InstanceAiContext,
			'run_123456789',
		);

		expect(createSandbox).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'acme-eval-run-1234-instance-ai-thread-thread-1',
				name: 'acme-eval-run-1234-instance-ai-thread-thread-1',
				labels: expect.objectContaining({
					'n8n-builder': 'instance-ai-thread-thread-1',
					name_prefix: 'Acme-Eval',
					run_id: 'run_123456789',
					thread_id: 'thread-1',
				}),
			}),
			expect.objectContaining({ useSnapshotFallback: true }),
		);
	});

	it('keeps the sandbox after setup failure and retries setup on the next use', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as WorkspaceServiceInternals;
		service.sandboxes = new Map();
		service.sandboxCreations = new Map();
		service.resolveSandboxConfig = jest.fn(async (_user: User) => daytonaSandboxConfig);

		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: jest.fn(async () => {}),
			destroy: jest.fn(async () => {}),
		};
		(createSandbox as jest.Mock).mockResolvedValue(sandbox);
		(createWorkspace as jest.Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as jest.Mock)
			.mockRejectedValueOnce(new Error('setup failed'))
			.mockResolvedValueOnce(undefined);

		await expect(
			service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext),
		).rejects.toThrow('setup failed');

		expect(service.sandboxes.has('thread-1')).toBe(true);
		expect(workspace.destroy).not.toHaveBeenCalled();

		const entry = await service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext);

		expect(entry).toBe(service.sandboxes.get('thread-1'));
		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).toHaveBeenCalledTimes(2);
	});

	it('destroys the workspace when sandbox startup fails', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as WorkspaceServiceInternals;
		service.sandboxes = new Map();
		service.sandboxCreations = new Map();
		service.resolveSandboxConfig = jest.fn(async (_user: User) => daytonaSandboxConfig);

		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: jest.fn(async () => {
				throw new Error('init failed');
			}),
			destroy: jest.fn(async () => {}),
		};
		(createSandbox as jest.Mock).mockResolvedValue(sandbox);
		(createWorkspace as jest.Mock).mockReturnValue(workspace);

		await expect(
			service.getOrCreateWorkspace('thread-1', fakeUser, {} as InstanceAiContext),
		).rejects.toThrow('init failed');

		expect(workspace.destroy).toHaveBeenCalledTimes(1);
		expect(service.sandboxes.has('thread-1')).toBe(false);
		expect(setupSandboxWorkspace).not.toHaveBeenCalled();
	});

	it('defers sandbox creation and setup until the lazy workspace is used', async () => {
		const service = Object.create(InstanceAiService.prototype) as unknown as {
			createExecutionEnvironment: (
				user: User,
				threadId: string,
				runId: string,
				abortSignal: AbortSignal,
			) => Promise<{
				orchestrationContext: {
					workspace?: unknown;
					runtimeSkills?: { registry: { skills: Array<{ id: string }> } };
				};
			}>;
			settingsService: {
				getAdminSettings: jest.Mock;
				isLocalGatewayDisabledForUser: jest.Mock;
				getPermissions: jest.Mock;
			};
			gatewayRegistry: { findGateway: jest.Mock };
			aiService: { isProxyEnabled: jest.Mock };
			adapterService: {
				createContext: jest.Mock;
				getNodeDefinitionDirs: jest.Mock;
			};
			sourceControlPreferencesService: { getPreferences: jest.Mock };
			resolveAgentModelConfig: jest.Mock;
			ensureThreadExists: jest.Mock;
			agentMemory: unknown;
			dbIterationLogStorage: unknown;
			dbSnapshotStorage: unknown;
			checkpointStore: unknown;
			instanceAiConfig: { subAgentMaxSteps: number; browserMcp: boolean };
			defaultTimeZone: string;
			eventBus: unknown;
			logger: unknown;
			telemetry: { track: jest.Mock };
			oauth2CallbackUrl: string;
			webhookBaseUrl: string;
			formBaseUrl: string;
			runState: { touchActiveRun: jest.Mock; registerPendingConfirmation: jest.Mock };
			spawnBackgroundTask: jest.Mock;
			cancelBackgroundTask: jest.Mock;
			backgroundTasks: { touchTask: jest.Mock };
			schedulePlannedTasks: jest.Mock;
			sendCorrectionToTask: jest.Mock;
			sandboxes: Map<string, unknown>;
			sandboxCreations: Map<string, Promise<unknown>>;
			domainAccessTrackersByThread: Map<string, unknown>;
			resolveSandboxConfig: jest.Mock;
		};
		service.settingsService = {
			getAdminSettings: jest.fn(() => ({ localGatewayDisabled: false, sandboxEnabled: true })),
			isLocalGatewayDisabledForUser: jest.fn(async () => false),
			getPermissions: jest.fn(() => ({})),
		};
		service.gatewayRegistry = { findGateway: jest.fn(() => undefined) };
		service.aiService = { isProxyEnabled: jest.fn(() => false) };
		service.adapterService = {
			createContext: jest.fn(() => ({})),
			getNodeDefinitionDirs: jest.fn(() => []),
		};
		service.sourceControlPreferencesService = {
			getPreferences: jest.fn(() => ({ branchReadOnly: false })),
		};
		service.resolveAgentModelConfig = jest.fn(async () => 'model-1');
		service.ensureThreadExists = jest.fn(async () => {});
		service.agentMemory = {};
		service.dbIterationLogStorage = {};
		service.dbSnapshotStorage = {};
		service.checkpointStore = {};
		service.instanceAiConfig = { subAgentMaxSteps: 10, browserMcp: false };
		service.defaultTimeZone = 'UTC';
		service.eventBus = {};
		service.logger = {};
		service.telemetry = { track: jest.fn() };
		service.oauth2CallbackUrl = 'http://localhost/rest/oauth2-credential/callback';
		service.webhookBaseUrl = 'http://localhost/webhook';
		service.formBaseUrl = 'http://localhost/form';
		service.runState = {
			touchActiveRun: jest.fn(),
			registerPendingConfirmation: jest.fn(),
		};
		service.spawnBackgroundTask = jest.fn();
		service.cancelBackgroundTask = jest.fn();
		service.backgroundTasks = { touchTask: jest.fn() };
		service.schedulePlannedTasks = jest.fn();
		service.sendCorrectionToTask = jest.fn();
		service.sandboxes = new Map();
		service.sandboxCreations = new Map();
		service.domainAccessTrackersByThread = new Map();
		service.resolveSandboxConfig = jest.fn(async (_user: User) => daytonaSandboxConfig);
		(createAllTools as jest.Mock).mockReturnValue(new Map());
		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: jest.fn(async () => {}),
			destroy: jest.fn(async () => {}),
		};
		(createSandbox as jest.Mock).mockResolvedValue(sandbox);
		(createWorkspace as jest.Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as jest.Mock).mockResolvedValue(undefined);

		const environment = await service.createExecutionEnvironment(
			fakeUser,
			'thread-1',
			'run-1',
			new AbortController().signal,
		);

		expect(createLazyRuntimeWorkspace).toHaveBeenCalledTimes(2);
		expect(createLazyRuntimeWorkspace).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ id: 'instance-ai-runtime-skill-workspace' }),
		);
		expect(createLazyWorkspaceRuntimeSkillSource).toHaveBeenCalledTimes(1);
		expect(loadInstanceAiRuntimeSkillSource).toHaveBeenCalledTimes(1);
		expect(environment.orchestrationContext.runtimeSkills?.registry.skills).toEqual([
			{ id: 'data-table-manager' },
		]);
		expect(createSandbox).not.toHaveBeenCalled();
		const skillWorkspace = (createLazyWorkspaceRuntimeSkillSource as jest.Mock).mock.calls[0]?.[0]
			.workspace as { ensureWorkspace: () => Promise<unknown> };
		const lazyWorkspace = environment.orchestrationContext.workspace as {
			ensureWorkspace: () => Promise<unknown>;
		};

		await skillWorkspace.ensureWorkspace();

		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(createWorkspace).toHaveBeenCalledTimes(1);
		expect(workspace.init).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).not.toHaveBeenCalled();

		await lazyWorkspace.ensureWorkspace();

		expect(createSandbox).toHaveBeenCalledTimes(1);
		expect(createSandbox).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'run-1-instance-ai-thread-thread-1',
				name: 'run-1-instance-ai-thread-thread-1',
				labels: expect.objectContaining({
					'n8n-builder': 'instance-ai-thread-thread-1',
					run_id: 'run-1',
					thread_id: 'thread-1',
				}),
			}),
			expect.objectContaining({ useSnapshotFallback: true }),
		);
		expect(createWorkspace).toHaveBeenCalledTimes(1);
		expect(createWorkspace).toHaveBeenCalledWith(sandbox);
		expect(workspace.init).toHaveBeenCalledTimes(1);
		expect(setupSandboxWorkspace).toHaveBeenCalledTimes(1);
	});
});

describe('InstanceAiService — shutdown', () => {
	it('does not destroy thread-scoped sandboxes on service shutdown', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as ShutdownServiceInternals;
		const workspace = { destroy: jest.fn(async () => {}) };
		service.stopCheckpointPruning = jest.fn();
		service.liveness = { shutdown: jest.fn() };
		service.runState = {
			shutdown: jest.fn(() => ({ activeRuns: [], suspendedRuns: [] })),
		};
		service.backgroundTasks = { cancelAll: jest.fn(() => []) };
		service.traceContextsByRunId = new Map();
		service.finalizeRunTracing = jest.fn(
			async (_runId: string, _tracing: InstanceAiTraceContext | undefined, _options: unknown) => {},
		);
		service.finalizeBackgroundTaskTracing = jest.fn(
			async (_task: ManagedBackgroundTask, _status: 'cancelled') => {},
		);
		service.finalizeRemainingMessageTraceRoots = jest.fn(
			async (_threadId: string, _options: unknown) => {},
		);
		service.gatewayRegistry = { disconnectAll: jest.fn() };
		service.sandboxes = new Map([['thread-a', { sandbox: { id: 'sandbox-a' }, workspace }]]);
		service.domainAccessTrackersByThread = new Map();
		service.eventBus = { clear: jest.fn() };
		service._mcpClientManager = { disconnect: jest.fn(async () => {}) };
		service.inFlightExecutions = new Set();
		service.logger = { debug: jest.fn(), warn: jest.fn() };

		await service.shutdown();

		expect(workspace.destroy).not.toHaveBeenCalled();
		expect(service.sandboxes.has('thread-a')).toBe(true);
	});
});

describe('InstanceAiService — background task auto-follow-up', () => {
	it('starts an internal follow-up when the last direct background task settles normally', async () => {
		const { service, task, getSpawnOptions } = createBackgroundTaskFollowUpService();

		const result = service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'task-1',
				threadId: 'thread-a',
				agentId: 'agent-builder',
				role: 'workflow-builder',
				run: async () => 'done',
			},
			{},
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(result).toEqual({ status: 'started', taskId: 'task-1', agentId: 'agent-builder' });
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<background-task-completed>'),
			'group-1',
		);
	});

	it('skips internal follow-up when the active run already timed out', async () => {
		const { service, task, getSpawnOptions } = createBackgroundTaskFollowUpService({
			timedOutThread: true,
		});

		service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'task-1',
				threadId: 'thread-a',
				agentId: 'agent-builder',
				role: 'workflow-builder',
				run: async () => 'done',
			},
			{},
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		expect(service.recordBackgroundTerminalOutcome).toHaveBeenCalledWith(task);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith(
			'thread-a',
			'run-1',
			{},
			true,
			'group-1',
		);
	});

	it('clears the active-timeout guard when the user starts a new run', () => {
		const service = createStartRunService();

		service.startRun(fakeUser, 'thread-a', 'try again');

		expect(service.liveness.clearThreadState).toHaveBeenCalledWith('thread-a');
		expect(service.executeRun).toHaveBeenCalled();
	});
});

describe('InstanceAiService — pending checkpoint re-entry', () => {
	describe('queuePendingCheckpointReentry', () => {
		it('records a marker keyed by threadId + checkpointTaskId', () => {
			const service = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');

			expect(service.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('deduplicates markers for the same (thread, checkpoint) pair', () => {
			const service = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');

			expect(service.pendingCheckpointReentries.get('thread-a')?.size).toBe(1);
		});

		it('keeps markers for different threads separate', () => {
			const service = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-b', 'cp-1');

			expect(service.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-1']));
			expect(service.pendingCheckpointReentries.get('thread-b')).toEqual(new Set(['cp-1']));
		});
	});

	describe('drainPendingCheckpointReentries', () => {
		it('fires re-entry for each queued marker when the thread is idle', async () => {
			const service = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(service.reenterCheckpointById).toHaveBeenCalledTimes(2);
			expect(service.reenterCheckpointById).toHaveBeenCalledWith(fakeUser, 'thread-a', 'cp-1');
			expect(service.reenterCheckpointById).toHaveBeenCalledWith(fakeUser, 'thread-a', 'cp-2');
			expect(service.pendingCheckpointReentries.get('thread-a')).toBeUndefined();
		});

		it('stops draining if a new run starts mid-drain', async () => {
			const service = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			// After the first re-entry fires, simulate a new active run.
			let calls = 0;
			service.reenterCheckpointById.mockImplementation(async () => {
				calls += 1;
				if (calls === 1) {
					service.runState.getActiveRunId.mockReturnValue('run-new');
				}
				return true;
			});

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			// First marker drained; second should remain queued for the next run's cleanup.
			expect(service.reenterCheckpointById).toHaveBeenCalledTimes(1);
			expect(service.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-2']));
		});

		it('skips a marker whose parent-tagged siblings are still running', async () => {
			const service = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			// cp-1 has a sibling still in flight, cp-2 is clear.
			service.backgroundTasks.getRunningTasksByParentCheckpoint.mockImplementation(
				(_threadId: string, cp: string) => (cp === 'cp-1' ? [{ taskId: 'sibling-running' }] : []),
			);

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(service.reenterCheckpointById).toHaveBeenCalledTimes(1);
			expect(service.reenterCheckpointById).toHaveBeenCalledWith(fakeUser, 'thread-a', 'cp-2');
			// cp-1 stays queued — the sibling's own settlement will drive the next drain.
			expect(service.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('returns early when a suspended run is present', async () => {
			const service = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.runState.hasSuspendedRun.mockReturnValue(true);

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(service.reenterCheckpointById).not.toHaveBeenCalled();
			expect(service.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('is a no-op when no markers are queued', async () => {
			const service = createCheckpointService();

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-nonexistent');

			expect(service.reenterCheckpointById).not.toHaveBeenCalled();
		});
	});
});

describe('InstanceAiService — checkpoint pruning', () => {
	it('marks checkpoints expired older than the retention window', async () => {
		const service = createCheckpointPruneService();
		const now = new Date('2026-05-13T12:00:00.000Z').getTime();

		await service.pruneStaleCheckpoints(now);

		expect(service.checkpointStore.markExpiredOlderThan).toHaveBeenCalledWith(
			new Date('2026-05-06T12:00:00.000Z'),
		);
		expect(service.pruneStalePendingConfirmations).toHaveBeenCalledWith(now);
		expect(service.scheduleCheckpointPrune).toHaveBeenCalledWith();
	});

	it('starts checkpoint pruning when configured', () => {
		const service = createCheckpointPruneService();

		service.startCheckpointPruning();

		expect(service.checkpointPruningStopped).toBe(false);
		expect(service.scheduleCheckpointPrune).toHaveBeenCalledWith(0);
	});

	it('does not start checkpoint pruning when disabled', () => {
		const service = createCheckpointPruneService();
		service.instanceAiConfig.snapshotPruneInterval = 0;

		service.startCheckpointPruning();

		expect(service.scheduleCheckpointPrune).not.toHaveBeenCalled();
	});
});

type RevalidationServiceInternals = {
	revalidateActiveUser: (userId: string) => Promise<User | null>;
	userRepository: { findOne: jest.Mock };
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

function createRevalidationService(): RevalidationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as RevalidationServiceInternals;
	service.userRepository = { findOne: jest.fn() };
	service.logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
	return service;
}

function userWithScopes(scopes: string[], overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		disabled: false,
		role: { scopes: scopes.map((slug) => ({ slug })) },
		...overrides,
	} as unknown as User;
}

describe('InstanceAiService — revalidateActiveUser', () => {
	it('returns the user when active and scoped for AI Assistant', async () => {
		const service = createRevalidationService();
		const fresh = userWithScopes(['instanceAi:message']);
		service.userRepository.findOne.mockResolvedValue(fresh);

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBe(fresh);
		expect(service.userRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			relations: ['role'],
		});
	});

	it('returns null when the user no longer exists', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(null);

		const result = await service.revalidateActiveUser('user-gone');

		expect(result).toBeNull();
	});

	it('returns null when the user has been disabled', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(
			userWithScopes(['instanceAi:message'], { disabled: true }),
		);

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
	});

	it('returns null when the user lost the instanceAi:message scope', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockResolvedValue(userWithScopes(['workflow:read']));

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
	});

	it('returns null and logs when the lookup throws', async () => {
		const service = createRevalidationService();
		service.userRepository.findOne.mockRejectedValue(new Error('db down'));

		const result = await service.revalidateActiveUser('user-1');

		expect(result).toBeNull();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to revalidate user',
			expect.objectContaining({ userId: 'user-1' }),
		);
	});
});

type ResolveConfirmationServiceInternals = {
	resolveConfirmation: (
		requestingUserId: string,
		requestId: string,
		request: { kind: 'approval'; approved: boolean; userInput?: string },
	) => Promise<boolean>;
	revalidateActiveUser: jest.Mock<Promise<User | null>, [string]>;
	cancelRun: jest.Mock<void, [string]>;
	runState: {
		resolvePendingConfirmation: jest.Mock;
		findSuspendedByRequestId: jest.Mock;
		rejectPendingConfirmation: jest.Mock;
	};
	resumeSuspendedRun: jest.Mock;
	dropPendingConfirmation: jest.Mock;
	pendingConfirmationRepo: { claim: jest.Mock };
	tryResumeFromOrphan: jest.Mock;
	finalizeUnresumableOrphan: jest.Mock;
	publishRunFinish: jest.Mock;
	saveAgentTreeSnapshot: jest.Mock;
	dbSnapshotStorage: unknown;
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock; info: jest.Mock };
};

function createResolveConfirmationService(): ResolveConfirmationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ResolveConfirmationServiceInternals;
	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.runState = {
		resolvePendingConfirmation: jest.fn(),
		findSuspendedByRequestId: jest.fn(),
		rejectPendingConfirmation: jest.fn(),
	};
	service.resumeSuspendedRun = jest.fn(async () => false);
	service.dropPendingConfirmation = jest.fn(async () => {});
	service.pendingConfirmationRepo = { claim: jest.fn(async () => undefined) };
	service.tryResumeFromOrphan = jest.fn(async () => false);
	service.finalizeUnresumableOrphan = jest.fn();
	service.publishRunFinish = jest.fn();
	service.saveAgentTreeSnapshot = jest.fn(async () => {});
	service.dbSnapshotStorage = {};
	service.logger = {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
	};
	return service;
}

type PlannedTaskSchedulerServiceInternals = {
	doSchedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
	revalidateActiveUser: jest.Mock<Promise<User | null>, [string]>;
	cancelRun: jest.Mock;
	createPlannedTaskState: jest.Mock;
	syncPlannedTasksToUi: jest.Mock;
	backgroundTasks: { getRunningTasks: jest.Mock };
	startInternalFollowUpRun: jest.Mock;
	buildPlannedTaskFollowUpMessage: jest.Mock;
	runState: {
		getThreadResearchMode: jest.Mock;
		hasLiveRun: jest.Mock;
	};
	logger: { warn: jest.Mock };
};

function createPlannedTaskSchedulerService(): {
	service: PlannedTaskSchedulerServiceInternals;
	plannedTaskService: {
		getGraph: jest.Mock;
		tick: jest.Mock;
		revertToActive: jest.Mock;
		revertCheckpointToPlanned: jest.Mock;
		markRunning: jest.Mock;
	};
	graph: { planRunId: string; messageGroupId: string; tasks: Array<{ id: string }> };
} {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as PlannedTaskSchedulerServiceInternals;
	const graph = { planRunId: 'plan-run-1', messageGroupId: 'group-1', tasks: [] };
	const plannedTaskService = {
		getGraph: jest.fn(async () => graph),
		tick: jest.fn(async () => ({ type: 'none' })),
		revertToActive: jest.fn(async () => {}),
		revertCheckpointToPlanned: jest.fn(async () => {}),
		markRunning: jest.fn(async () => {}),
	};

	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.createPlannedTaskState = jest.fn(async () => ({ plannedTaskService }));
	service.syncPlannedTasksToUi = jest.fn(async () => {});
	service.backgroundTasks = { getRunningTasks: jest.fn(() => []) };
	service.startInternalFollowUpRun = jest.fn(async () => 'follow-up-run');
	service.buildPlannedTaskFollowUpMessage = jest.fn(() => 'follow-up message');
	service.runState = {
		getThreadResearchMode: jest.fn(() => false),
		hasLiveRun: jest.fn(() => false),
	};
	service.logger = { warn: jest.fn() };

	return { service, plannedTaskService, graph };
}

type SuspendedRunResumeServiceInternals = {
	resumeSuspendedRun: (
		requestingUserId: string,
		requestId: string,
		data: { approved: boolean },
	) => Promise<boolean>;
	revalidateActiveUser: jest.Mock<Promise<User | null>, [string]>;
	cancelRun: jest.Mock;
	runState: {
		findSuspendedByRequestId: jest.Mock;
		activateSuspendedRun: jest.Mock;
	};
	logger: { warn: jest.Mock };
	dbSnapshotStorage: unknown;
	createOrchestratorResumeTraceContext: jest.Mock;
	processResumedStream: jest.Mock;
	dropPendingConfirmation: jest.Mock;
	trackInFlightExecution: jest.Mock;
};

function createSuspendedRunResumeService(): SuspendedRunResumeServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as SuspendedRunResumeServiceInternals;
	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.dropPendingConfirmation = jest.fn(async () => {});
	service.trackInFlightExecution = jest.fn();
	service.runState = {
		findSuspendedByRequestId: jest.fn(() => ({
			agent: {},
			runId: 'run-1',
			agentRunId: 'agent-run-1',
			threadId: 'thread-a',
			user: fakeUser,
			toolCallId: 'tool-call-1',
			abortController: new AbortController(),
			tracing: undefined,
			modelId: undefined,
			messageGroupId: 'group-1',
			checkpoint: undefined,
		})),
		activateSuspendedRun: jest.fn(),
	};
	service.logger = { warn: jest.fn() };
	service.dbSnapshotStorage = {};
	service.createOrchestratorResumeTraceContext = jest.fn(async () => undefined);
	service.processResumedStream = jest.fn();
	return service;
}

describe('InstanceAiService — resolveConfirmation', () => {
	const approval = { kind: 'approval' as const, approved: true };

	it('rejects sub-agent confirmations when the user is no longer authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue(undefined);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.runState.rejectPendingConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.runState.resolvePendingConfirmation).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Rejecting confirmation: user no longer authorized for AI Assistant',
			expect.objectContaining({ userId: 'user-1', requestId: 'req-1' }),
		);
	});

	it('cancels the suspended run owned by the requesting user when revalidation fails', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue({
			threadId: 'thread-1',
			user: { id: 'user-1' },
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.runState.rejectPendingConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.cancelRun).toHaveBeenCalledWith('thread-1');
	});

	it('does not cancel a suspended run owned by a different user when revalidation fails', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue({
			threadId: 'thread-1',
			user: { id: 'someone-else' },
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(false);
		expect(service.cancelRun).not.toHaveBeenCalled();
	});

	it('resolves the pending sub-agent confirmation when the user is still authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(true);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(service.runState.resolvePendingConfirmation).toHaveBeenCalledWith(
			'user-1',
			'req-1',
			expect.objectContaining({ approved: true }),
		);
		expect(service.runState.rejectPendingConfirmation).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
		expect(service.dropPendingConfirmation).toHaveBeenCalledWith('req-1');
	});

	it('throws a UserError when an inline orphan is reclaimed after a restart (no checkpoint to resume)', async () => {
		// Inline confirmations were held by an in-process Promise that died
		// with the previous main; there's nothing to load from the checkpoint
		// store, so the only honest answer is the terminal UserError.
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'inline',
			runId: 'run-1',
			messageGroupId: 'group-1',
		});

		await expect(service.resolveConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			/lost when the assistant restarted/,
		);

		expect(service.tryResumeFromOrphan).not.toHaveBeenCalled();
		expect(service.finalizeUnresumableOrphan).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: 'req-1', kind: 'inline' }),
		);
	});

	it('falls back to UserError when a suspended orphan lacks the fields needed to resume', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			messageGroupId: 'group-1',
			// no agentRunId / toolCallId / checkpointKey -> can't resume
		});

		await expect(service.resolveConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			/lost when the assistant restarted/,
		);

		expect(service.tryResumeFromOrphan).not.toHaveBeenCalled();
		expect(service.finalizeUnresumableOrphan).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: 'req-1', kind: 'suspended' }),
		);
	});

	it('reclaims and resumes a suspended orphan when the checkpoint is still loadable', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		const orphan = {
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			messageGroupId: 'group-1',
			toolCallId: 'tool-call-1',
			checkpointKey: 'agent-run-1',
		};
		service.pendingConfirmationRepo.claim.mockResolvedValue(orphan);
		service.tryResumeFromOrphan.mockResolvedValue(true);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(service.tryResumeFromOrphan).toHaveBeenCalledWith(orphan, expect.anything());
		expect(service.finalizeUnresumableOrphan).not.toHaveBeenCalled();
	});

	it('falls back to UserError when the resume attempt itself fails', async () => {
		// e.g. checkpoint expired between claim and load, or env build fails
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.pendingConfirmationRepo.claim.mockResolvedValue({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			runId: 'run-1',
			messageGroupId: 'group-1',
			toolCallId: 'tool-call-1',
			checkpointKey: 'agent-run-1',
		});
		service.tryResumeFromOrphan.mockResolvedValue(false);

		await expect(service.resolveConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			/lost when the assistant restarted/,
		);

		expect(service.tryResumeFromOrphan).toHaveBeenCalled();
		expect(service.finalizeUnresumableOrphan).toHaveBeenCalled();
	});

	it('returns false silently when no DB row is claimable for an unknown confirmation', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.pendingConfirmationRepo.claim.mockResolvedValue(undefined);

		const result = await service.resolveConfirmation('user-1', 'req-missing', approval);

		expect(result).toBe(false);
		expect(service.tryResumeFromOrphan).not.toHaveBeenCalled();
		expect(service.finalizeUnresumableOrphan).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — planned task user revalidation', () => {
	it('cancels planned-task scheduling when the user is no longer authorized', async () => {
		const { service } = createPlannedTaskSchedulerService();
		service.revalidateActiveUser.mockResolvedValue(null);

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
		expect(service.createPlannedTaskState).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Cancelling run: user no longer authorized for AI Assistant',
			expect.objectContaining({ userId: 'user-1', threadId: 'thread-a' }),
		);
	});

	it('uses the revalidated user for planned-task follow-up runs', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'replan',
			graph,
			failedTask: undefined,
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			true,
		);
	});
});

describe('InstanceAiService — suspended run user revalidation', () => {
	it('cancels suspended resume when the user is no longer authorized', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue(null);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toBe(false);
		expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
		expect(service.runState.activateSuspendedRun).not.toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Cancelling suspended run: user no longer authorized for AI Assistant',
			expect.objectContaining({ userId: 'user-1', threadId: 'thread-a', requestId: 'req-1' }),
		);
	});

	it('passes the revalidated user into the resumed stream', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toBe(true);
		expect(service.runState.activateSuspendedRun).toHaveBeenCalledWith('thread-a');
		expect(service.processResumedStream).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ approved: true }),
			expect.objectContaining({ user: freshUser }),
		);
	});
});

describe('InstanceAiService — terminal outcome replay', () => {
	it('replays undelivered background outcomes into the persisted agent tree', async () => {
		const outcome = makeTerminalOutcome();
		const service = createTerminalOutcomeService([outcome], makeAgentTree());

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(service.dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		const updatedTree = service.dbSnapshotStorage.updateLast.mock
			.calls[0][1] as InstanceAiAgentNode;
		expect(updatedTree.textContent).toContain(outcome.userFacingMessage);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
		expect(service.createTerminalOutcomeStorage().markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
		expect(service.eventBus.publish).not.toHaveBeenCalled();
	});

	it('publishes recovered background outcomes when replaying for SSE delivery', async () => {
		const outcome = makeTerminalOutcome();
		const service = createTerminalOutcomeService([outcome], makeAgentTree());

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(service.dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		expect(service.eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: 'agent-001',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(service.createTerminalOutcomeStorage().markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
	});

	it('deduplicates replay by response id only', async () => {
		const outcome = makeTerminalOutcome({ id: 'group-1:task-2:completed' });
		const tree = makeAgentTree();
		tree.textContent = `${tree.textContent}\n\n${outcome.userFacingMessage}`;
		tree.timeline.push({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: 'background-outcome:different-id',
		});
		const service = createTerminalOutcomeService([outcome], tree);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		const updatedTree = service.dbSnapshotStorage.updateLast.mock
			.calls[0][1] as InstanceAiAgentNode;
		expect(
			updatedTree.timeline.filter(
				(entry) => entry.type === 'text' && entry.content === outcome.userFacingMessage,
			),
		).toHaveLength(2);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
	});

	it('creates a snapshot when replay has no prior agent tree', async () => {
		const outcome = makeTerminalOutcome({ status: 'failed' });
		const service = createTerminalOutcomeService([outcome]);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(service.dbSnapshotStorage.save).toHaveBeenCalledTimes(1);
		const savedTree = service.dbSnapshotStorage.save.mock.calls[0][1] as InstanceAiAgentNode;
		expect(savedTree.status).toBe('error');
		expect(savedTree.textContent).toBe(outcome.userFacingMessage);
		expect(service.createTerminalOutcomeStorage().markDelivered).toHaveBeenCalledWith(
			'thread-a',
			outcome.id,
			expect.any(String),
		);
	});

	it('publishes the deterministic line when snapshot replay fails', async () => {
		const outcome = makeTerminalOutcome();
		const service = createTerminalOutcomeService([outcome], makeAgentTree());
		service.dbSnapshotStorage.updateLast.mockRejectedValue(new Error('storage unavailable'));

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(service.eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: 'agent-001',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(service.createTerminalOutcomeStorage().markDelivered).not.toHaveBeenCalled();
	});

	it('checks persisted outcomes on repeated replay calls', async () => {
		const service = createTerminalOutcomeService([]);
		const storage = service.createTerminalOutcomeStorage();
		service.createTerminalOutcomeStorage.mockClear();

		await service.replayUndeliveredTerminalOutcomes('thread-a');
		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(service.createTerminalOutcomeStorage).toHaveBeenCalledTimes(2);
		expect(storage.getUndelivered).toHaveBeenCalledTimes(2);
	});
});

describe('InstanceAiService — agent tree snapshots', () => {
	it('falls back to persisted run ids when an old background group mapping was pruned', async () => {
		const service = createSnapshotService();
		const terminalEvent: InstanceAiEvent = {
			type: 'text-delta',
			runId: 'run-background',
			agentId: 'agent-001',
			payload: { text: 'background finished' },
		};
		const snapshotStorage = {
			getLatest: jest.fn(async () => ({
				tree: makeAgentTree(),
				runId: 'run-original',
				messageGroupId: 'group-old',
				runIds: ['run-original', 'run-background'],
			})),
			save: jest.fn(async () => {}),
			updateLast: jest.fn(async () => {}),
		};
		service.eventBus.getEventsForRuns.mockReturnValue([terminalEvent]);

		await service.saveAgentTreeSnapshot(
			'thread-a',
			'run-background',
			snapshotStorage,
			true,
			'group-old',
		);

		expect(service.runState.getRunIdsForMessageGroup).toHaveBeenCalledWith('group-old');
		expect(snapshotStorage.getLatest).toHaveBeenCalledWith('thread-a', {
			messageGroupId: 'group-old',
			runId: 'run-background',
		});
		expect(service.eventBus.getEventsForRuns).toHaveBeenCalledWith('thread-a', [
			'run-original',
			'run-background',
		]);
		expect(snapshotStorage.updateLast).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({ textContent: 'background finished' }),
			'run-background',
			expect.objectContaining({
				messageGroupId: 'group-old',
				runIds: ['run-original', 'run-background'],
			}),
		);
		expect(snapshotStorage.save).not.toHaveBeenCalled();
	});

	it('skips update snapshots when no events are available for a pruned group', async () => {
		const service = createSnapshotService();
		const snapshotStorage = {
			getLatest: jest.fn(async () => ({
				tree: makeAgentTree(),
				runId: 'run-original',
				messageGroupId: 'group-old',
				runIds: ['run-background'],
			})),
			save: jest.fn(async () => {}),
			updateLast: jest.fn(async () => {}),
		};

		await service.saveAgentTreeSnapshot(
			'thread-a',
			'run-background',
			snapshotStorage,
			true,
			'group-old',
		);

		expect(snapshotStorage.updateLast).not.toHaveBeenCalled();
		expect(snapshotStorage.save).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Skipped updating empty Instance AI agent tree snapshot',
			expect.objectContaining({
				threadId: 'thread-a',
				runId: 'run-background',
				messageGroupId: 'group-old',
			}),
		);
	});
});

describe('InstanceAiService — terminal response guard wiring', () => {
	beforeEach(() => {
		jest.mocked(resumeAgentRun).mockReset();
	});

	it('publishes fallback output before run-finish on a silent completed run', () => {
		const service = createTerminalGuardOrderService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'completed', {
			messageGroupId: 'group-1',
		});
		service.publishRunFinish('thread-a', 'run-1', 'completed');

		expect(service.eventBus.events.map((event) => event.type)).toEqual([
			'text-delta',
			'run-finish',
		]);
	});

	it('publishes fallback error before run-finish on a silent failed run', () => {
		const service = createTerminalGuardOrderService();

		service.evaluateTerminalResponse('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'Safe user-facing error',
		});
		service.publishRunFinish('thread-a', 'run-1', 'errored');

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
	});

	it('clears malformed confirmation suspension and finishes the run after the guard error', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();

		const decision = service.evaluateWaitingResponse('thread-a', 'run-1', undefined, {
			messageGroupId: 'group-1',
		});
		if (decision?.reason === 'confirmation-invalid') {
			await service.finishInvalidConfirmationRun({
				threadId: 'thread-a',
				runId: 'run-1',
				abortController,
				snapshotStorage: {},
			});
		}

		expect(decision?.reason).toBe('confirmation-invalid');
		expect(service.runState.cancelThread).toHaveBeenCalledWith('thread-a');
		expect(abortController.signal.aborted).toBe(true);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith('thread-a', 'run-1', {});
		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.eventBus.events.at(-1)).toMatchObject({
			type: 'run-finish',
			payload: { status: 'error' },
		});
	});

	it('persists the resumed-run fallback error before cleanup', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		jest.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('provider failed'));

		await service.processResumedStream(
			{},
			{},
			{
				runId: 'run-1',
				agentRunId: 'agent-run-1',
				threadId: 'thread-a',
				user: fakeUser,
				toolCallId: 'tool-call-1',
				signal: abortController.signal,
				abortController,
				snapshotStorage: {},
			},
		);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith('thread-a', 'run-1', {});
	});

	it('counts credits when a resumed run completes', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		jest.mocked(resumeAgentRun).mockResolvedValueOnce({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream(
			{},
			{},
			{
				runId: 'run-1',
				agentRunId: 'agent-run-1',
				threadId: 'thread-a',
				user: fakeUser,
				toolCallId: 'tool-call-1',
				signal: abortController.signal,
				abortController,
				snapshotStorage: {},
			},
		);

		expect(service.countCreditsIfFirst).toHaveBeenCalledWith(fakeUser, 'thread-a', 'run-1');
		expect(service.telemetry.track).toHaveBeenCalledWith('Builder satisfied user intent', {
			thread_id: 'thread-a',
		});
	});

	it('rebinds resumed agents to resume trace telemetry', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const telemetry = { enabled: true };
		const agent = { telemetry: jest.fn() };
		const tracing = {
			traceKind: 'orchestrator_resume',
			actorRun: { id: 'actor-run' },
			getTelemetry: jest.fn(() => telemetry),
			withActiveSpan: jest.fn(async (_run: unknown, fn: () => Promise<unknown>) => await fn()),
		} as unknown as InstanceAiTraceContext;
		jest.mocked(resumeAgentRun).mockResolvedValueOnce({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream(
			agent,
			{},
			{
				runId: 'run-1',
				agentRunId: 'agent-run-1',
				threadId: 'thread-a',
				user: fakeUser,
				toolCallId: 'tool-call-1',
				signal: abortController.signal,
				abortController,
				snapshotStorage: {},
				tracing,
			},
		);

		expect(tracing.getTelemetry).toHaveBeenCalledWith({
			agentRole: 'orchestrator',
			functionId: 'instance-ai.orchestrator',
			executionMode: 'resume',
		});
		expect(agent.telemetry).toHaveBeenCalledWith(telemetry);
		expect(tracing.withActiveSpan).toHaveBeenCalledWith(tracing.actorRun, expect.any(Function));
	});
});

describe('InstanceAiService — AI temporary workflow cleanup', () => {
	it('defers cleanup while background tasks are running', async () => {
		const { service, archiveIfAiTemporary } = createTemporaryCleanupService({
			runningTaskCount: 1,
			markedWorkflows: [{ workflowId: 'wf-marked' }],
			archivedWorkflowIds: new Set(['wf-marked', 'wf-created']),
		});

		await expect(
			service.reapAiTemporaryFromRun('thread-a', fakeUser, new Set(['wf-created'])),
		).resolves.toEqual([]);

		expect(service.backgroundTasks.getRunningTasks).toHaveBeenCalledWith('thread-a');
		expect(service.aiBuilderTemporaryWorkflowRepository.findByThread).not.toHaveBeenCalled();
		expect(service.adapterService.createContext).not.toHaveBeenCalled();
		expect(archiveIfAiTemporary).not.toHaveBeenCalled();
		expect(service.logger.debug).toHaveBeenCalledWith(
			'Deferring AI-builder temporary workflow cleanup until tasks settle',
			{
				threadId: 'thread-a',
				runningTaskCount: 1,
			},
		);
	});

	it('archives marked temporary workflows after background tasks settle', async () => {
		const { service, archiveIfAiTemporary } = createTemporaryCleanupService({
			markedWorkflows: [{ workflowId: 'wf-marked' }],
			archivedWorkflowIds: new Set(['wf-marked', 'wf-created']),
		});

		await expect(
			service.reapAiTemporaryFromRun('thread-a', fakeUser, new Set(['wf-created'])),
		).resolves.toEqual(['wf-marked', 'wf-created']);

		expect(service.backgroundTasks.getRunningTasks).toHaveBeenCalledWith('thread-a');
		expect(service.aiBuilderTemporaryWorkflowRepository.findByThread).toHaveBeenCalledWith(
			'thread-a',
		);
		expect(service.adapterService.createContext).toHaveBeenCalledWith(fakeUser, {
			threadId: 'thread-a',
		});
		expect(archiveIfAiTemporary).toHaveBeenCalledTimes(2);
		expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(1, 'wf-marked');
		expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(2, 'wf-created');
	});
});

describe('InstanceAiService — OAuth callback URL', () => {
	// Regression: the OAuth callback URL handed to the browser-credential-setup
	// sub-agent must come from urlService.getInstanceBaseUrl() (which honors
	// WEBHOOK_URL on cloud), not from globalConfig.editorBaseUrl with a
	// localhost fallback. With the old fallback the agent pasted
	// http://localhost:5678/... into the user's Slack app on a cloud instance.
	it('builds oauth2CallbackUrl from urlService.getInstanceBaseUrl()', () => {
		const source = InstanceAiService.toString();

		expect(source).toMatch(
			/this\.oauth2CallbackUrl\s*=[^;]*this\.urlService\.getInstanceBaseUrl\(\)[^;]*oauth2-credential\/callback/,
		);
	});

	it('does not fall back to localhost when editorBaseUrl is empty', () => {
		const source = InstanceAiService.toString();

		expect(source).not.toMatch(/globalConfig\.editorBaseUrl\s*\|\|/);
	});
});
