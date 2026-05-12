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
		BuilderSandboxFactory: class {},
		SnapshotManager: class {},
		createSandbox: jest.fn(),
		createWorkspace: jest.fn(),
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
		createMemory: jest.fn(),
		mapMastraChunkToEvent: jest.fn(),
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
jest.mock('@mastra/core/agent', () => ({}));
jest.mock('@mastra/core/storage', () => ({
	MemoryStorage: class {},
	MastraCompositeStore: class {},
	WorkflowsStorage: class {},
}));
jest.mock('@mastra/memory', () => ({
	Memory: class {},
}));
jest.mock('@mastra/core/workflows', () => ({}));

import type { User } from '@n8n/db';
import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import {
	resumeAgentRun,
	type ManagedBackgroundTask,
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
		getThreadResearchMode: jest.MockedFunction<(threadId: string) => boolean | undefined>;
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
			researchMode?: boolean,
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
		getThreadResearchMode: jest.fn((_threadId: string) => false),
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
		async (
			_user: User,
			_threadId: string,
			_message: string,
			_researchMode?: boolean,
			_messageGroupId?: string,
		) => 'run-follow-up',
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
			(options: { threadId: string; user: User; researchMode?: boolean }) => {
				runId: string;
				abortController: AbortController;
				messageGroupId?: string;
			}
		>;
		setTimeZone: jest.MockedFunction<(threadId: string, timeZone: string) => void>;
	};
	threadPushRef: Map<string, string>;
	executeRun: jest.Mock;
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
	telemetry: { track: jest.Mock };
	logger: { warn: jest.Mock; error: jest.Mock };
	traceContextsByRunId: Map<string, { threadId: string; messageGroupId?: string }>;
	threadPushRef: Map<string, string>;
	finalizeRunTracing: jest.Mock;
	saveAgentTreeSnapshot: jest.Mock;
	reapAiTemporaryFromRun: jest.Mock;
	maybeFinalizeRunTraceRoot: jest.Mock;
	schedulePlannedTasks: jest.Mock;
	drainPendingCheckpointReentries: jest.Mock;
	processResumedStream: (
		agent: unknown,
		resumeData: unknown,
		opts: {
			runId: string;
			mastraRunId: string;
			threadId: string;
			user: User;
			toolCallId: string;
			signal: AbortSignal;
			abortController: AbortController;
			snapshotStorage: unknown;
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
	service.telemetry = { track: jest.fn() };
	service.logger = { warn: jest.fn(), error: jest.fn() };
	service.traceContextsByRunId = new Map([
		['run-1', { threadId: 'thread-a', messageGroupId: 'group-1' }],
	]);
	service.threadPushRef = new Map();
	service.finalizeRunTracing = jest.fn(async () => {});
	service.saveAgentTreeSnapshot = jest.fn(async () => {});
	service.reapAiTemporaryFromRun = jest.fn(async () => []);
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
			false,
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
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
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
	service.logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
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
				mastraRunId: 'mastra-1',
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
