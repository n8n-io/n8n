// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual('zod');
	return {
		orchestratorAgentId: (runId: string) => `orchestrator-${runId}`,
		McpClientManager: class {
			getRegularTools = jest.fn().mockResolvedValue({});
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
		createScopedWorkspace: jest.fn((workspace: unknown) => workspace),
		getPromptWorkspaceRoot: jest.fn(() => '/home/daytona/workspace'),
		getWorkspaceRoot: jest.fn(async () => '/home/daytona/workspace'),
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
				options: { errorMessage?: string; suppressCompletedFallback?: boolean } = {},
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

				if (status === 'completed' && options.suppressCompletedFallback) {
					return {
						status,
						visibilitySource: 'none',
						action: 'none',
						reason: 'completed-silent-suppressed',
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

import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import type { User } from '@n8n/db';
import {
	buildAgentTreeFromEvents,
	createAllTools,
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	createSandbox,
	createWorkspace,
	loadInstanceAiRuntimeSkillSource,
	resumeAgentRun,
	setupSandboxWorkspace,
	type ManagedBackgroundTask,
	type InstanceAiTraceContext,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type SpawnManagedBackgroundTaskOptions,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';

import { UserError } from 'n8n-workflow';

import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import { InstanceAiService } from '../instance-ai.service';
import {
	InstanceAiTerminalOutcomeService,
	type InstanceAiTerminalOutcomeServiceOptions,
} from '../instance-ai-terminal-outcome.service';

import type { InstanceAiConfig } from '@n8n/config';
import type { ErrorReporter } from 'n8n-core';

import { InstanceAiSandboxService } from '../sandbox';

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
	tracing: {
		finalizeBackgroundTaskTracing: jest.MockedFunction<
			(task: ManagedBackgroundTask, status: 'completed' | 'failed' | 'cancelled') => Promise<void>
		>;
	};
	handlePlannedTaskSettlement: jest.MockedFunction<
		(
			user: User,
			task: ManagedBackgroundTask,
			status: 'succeeded' | 'failed' | 'cancelled',
		) => Promise<void>
	>;
	terminalOutcome: {
		recordBackgroundTerminalOutcome: jest.MockedFunction<
			(task: ManagedBackgroundTask) => Promise<void>
		>;
	};
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
			isReplanFollowUp?: boolean,
			checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
			resumeReasonOverride?: string,
		) => Promise<string | undefined>
	>;
	maybeStartWorkflowVerificationFollowUp: jest.MockedFunction<
		(user: User, task: ManagedBackgroundTask) => Promise<boolean>
	>;
	maybeStartWorkflowSetupFollowUp: jest.MockedFunction<
		(user: User, threadId: string) => Promise<boolean>
	>;
	queuePendingCheckpointReentry: jest.MockedFunction<
		(threadId: string, checkpointTaskId: string) => void
	>;
	maybeReenterParentCheckpoint: jest.MockedFunction<
		(user: User, threadId: string, task: ManagedBackgroundTask) => Promise<boolean>
	>;
	taskProjector: { syncFromBackgroundTask: jest.Mock };
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
	service.taskProjector = { syncFromBackgroundTask: jest.fn(async () => {}) };
	service.tracing = {
		finalizeBackgroundTaskTracing: jest.fn(
			async (_task: ManagedBackgroundTask, _status: 'completed' | 'failed' | 'cancelled') => {},
		),
	};
	service.handlePlannedTaskSettlement = jest.fn(
		async (
			_user: User,
			_task: ManagedBackgroundTask,
			_status: 'succeeded' | 'failed' | 'cancelled',
		) => {},
	);
	service.terminalOutcome = {
		recordBackgroundTerminalOutcome: jest.fn(async (_task: ManagedBackgroundTask) => {}),
	};
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
			_messageGroupId?: string,
			_isReplanFollowUp?: boolean,
			_checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string },
			_resumeReasonOverride?: string,
		) => 'run-follow-up',
	);
	service.maybeStartWorkflowVerificationFollowUp = jest.fn(
		async (_user: User, _task: ManagedBackgroundTask) => false,
	);
	service.maybeStartWorkflowSetupFollowUp = jest.fn(
		async (_user: User, _threadId: string) => false,
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
	runScheduledPrune: (now?: number) => Promise<void>;
	suspendedThreads: {
		pruneStalePendingConfirmations: jest.MockedFunction<(now: number) => Promise<void>>;
	};
	pruneExpiredThreads: jest.MockedFunction<() => Promise<void>>;
	scheduleCheckpointPrune: jest.MockedFunction<(delayMs?: number) => void>;
	checkpointStore: {
		markExpiredOlderThan: jest.MockedFunction<(olderThan: Date) => Promise<number>>;
	};
	checkpointPruneTimer?: NodeJS.Timeout;
	checkpointPruningStopped: boolean;
	instanceAiConfig: {
		pruneInterval: number;
		snapshotRetention: number;
	};
	logger: { info: jest.Mock; debug: jest.Mock; warn: jest.Mock };
};

function createCheckpointPruneService(): CheckpointPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as CheckpointPruneServiceInternals;
	service.scheduleCheckpointPrune = jest.fn();
	service.suspendedThreads = {
		pruneStalePendingConfirmations: jest.fn(async (_now: number) => undefined),
	};
	service.pruneExpiredThreads = jest.fn(async () => undefined);
	service.checkpointStore = {
		markExpiredOlderThan: jest.fn(async (_olderThan: Date) => 0),
	};
	service.checkpointPruningStopped = true;
	service.instanceAiConfig = {
		pruneInterval: 60 * 60 * 1000,
		snapshotRetention: 7 * 24 * 60 * 60 * 1000,
	};
	service.logger = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
	};
	return service;
}

const fakeUser = { id: 'user-1' } as User;
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
	tracing: {
		finalizeRunTracing: jest.MockedFunction<
			(
				runId: string,
				tracing: InstanceAiTraceContext | undefined,
				options: unknown,
			) => Promise<void>
		>;
		finalizeBackgroundTaskTracing: jest.MockedFunction<
			(task: ManagedBackgroundTask, status: 'cancelled') => Promise<void>
		>;
		finalizeRemainingMessageTraceRoots: jest.MockedFunction<
			(threadId: string, options: unknown) => Promise<void>
		>;
		getTrackedThreadIds: jest.MockedFunction<() => string[]>;
		clear: jest.MockedFunction<() => void>;
	};
	gatewayService: { disconnectAll: jest.MockedFunction<() => void> };
	sandboxService: { stopSandboxExpiryTimers: jest.MockedFunction<() => void> };
	browserSessionService: { shutdown: jest.MockedFunction<() => Promise<void>> };
	domainAccessTrackersByThread: Map<string, unknown>;
	eventBus: { clear: jest.MockedFunction<() => void> };
	_mcpClientManager?: { disconnect: jest.MockedFunction<() => Promise<void>> };
	inFlightExecutions: Set<Promise<unknown>>;
	logger: { debug: jest.Mock; warn: jest.Mock };
};

type TerminalGuardOrderServiceInternals = {
	terminalOutcome: InstanceAiTerminalOutcomeService;
	runState: {
		getRunIdsForMessageGroup: jest.Mock;
		cancelThread: jest.Mock;
		clearActiveRun: jest.Mock;
		hasSuspendedRun: jest.Mock;
		getActiveRun: jest.Mock;
	};
	eventService: { emit: jest.Mock };
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: jest.Mock;
		getEventsForRuns: jest.Mock;
		publish: jest.Mock;
	};
	liveness: { consumeRunTimeout: jest.Mock };
	telemetry: { track: jest.Mock };
	suspendedThreads: { dropPendingConfirmationsForThread: jest.Mock };
	logger: { warn: jest.Mock; error: jest.Mock };
	errorReporter: { error: jest.Mock };
	reportedErrors: WeakSet<object>;
	instanceAiConfig: {
		outputRedactionEnabled: boolean;
		outputRedactionSecrets: boolean;
		outputRedactionPii: string;
		outputRedactionPlaceholder: string;
	};
	tracing: {
		finalizeRunTracing: jest.Mock;
		maybeFinalizeRunTraceRoot: jest.Mock;
		buildMessageTraceMetadata: jest.Mock;
		getMessageGroupId: jest.Mock;
	};
	threadPushRef: Map<string, string>;
	saveAgentTreeSnapshot: jest.Mock;
	backgroundTasks: { getRunningTasks: jest.Mock };
	temporaryWorkflowService: { reapForRun: jest.Mock };
	creditService: { claimRunUsage: jest.Mock };
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
	tracing: { getTraceContext: jest.Mock };
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
		getActiveRun: jest.fn(() => undefined),
	};
	service.eventService = { emit: jest.fn() };
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
	service.suspendedThreads = { dropPendingConfirmationsForThread: jest.fn(async () => {}) };
	service.logger = { warn: jest.fn(), error: jest.fn() };
	service.errorReporter = { error: jest.fn() };
	service.reportedErrors = new WeakSet();
	service.instanceAiConfig = {
		outputRedactionEnabled: true,
		outputRedactionSecrets: true,
		outputRedactionPii: 'credit-card',
		outputRedactionPlaceholder: '[REDACTED]',
	};
	service.tracing = {
		finalizeRunTracing: jest.fn(async () => {}),
		maybeFinalizeRunTraceRoot: jest.fn(async () => {}),
		buildMessageTraceMetadata: jest.fn(() => ({})),
		getMessageGroupId: jest.fn((runId: string) => (runId === 'run-1' ? 'group-1' : undefined)),
	};
	service.threadPushRef = new Map();
	service.saveAgentTreeSnapshot = jest.fn(async () => {});
	service.backgroundTasks = { getRunningTasks: jest.fn(() => []) };
	service.temporaryWorkflowService = { reapForRun: jest.fn(async () => []) };
	service.creditService = { claimRunUsage: jest.fn(async () => {}) };
	service.schedulePlannedTasks = jest.fn(async () => {});
	service.drainPendingCheckpointReentries = jest.fn(async () => {});

	service.terminalOutcome = new InstanceAiTerminalOutcomeService({
		eventBus: service.eventBus,
		dbSnapshotStorage: {},
		agentMemory: {},
		telemetry: service.telemetry,
		logger: service.logger,
		runState: service.runState,
		suspendedThreads: service.suspendedThreads,
		tracing: service.tracing,
		publishRunFinish: (
			_threadId: string,
			runId: string,
			status: 'completed' | 'cancelled' | 'errored',
		) => {
			events.push({
				type: 'run-finish',
				runId,
				agentId: 'agent-001',
				payload: { status: status === 'errored' ? 'error' : status },
			} as InstanceAiEvent);
		},
		saveAgentTreeSnapshot: async (threadId: string, runId: string, snapshotStorage: unknown) => {
			await service.saveAgentTreeSnapshot(threadId, runId, snapshotStorage);
		},
	} as unknown as InstanceAiTerminalOutcomeServiceOptions);
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
	service.tracing = { getTraceContext: jest.fn(() => undefined) };
	service.logger = { warn: jest.fn() };
	return service;
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
		(loadInstanceAiRuntimeSkillSource as jest.Mock).mockImplementation(() => ({
			registry: {
				skillsHash: 'runtime-skills-hash',
				skills: [{ id: 'data-table-manager' }],
			},
			loadSkill: jest.fn(),
		}));
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
				getSandboxStatus: jest.Mock;
				isLocalGatewayDisabledForUser: jest.Mock;
				getPermissions: jest.Mock;
			};
			gatewayService: { findGateway: jest.Mock };
			aiService: { isProxyEnabled: jest.Mock };
			adapterService: {
				createContext: jest.Mock;
				getNodeDefinitionDirs: jest.Mock;
			};
			sourceControlPreferencesService: { getPreferences: jest.Mock };
			modelService: { resolveAgentModelConfig: jest.Mock; resolveProxyModel: jest.Mock };
			ensureThreadExists: jest.Mock;
			agentMemory: unknown;
			dbIterationLogStorage: unknown;
			dbSnapshotStorage: unknown;
			checkpointStore: unknown;
			instanceAiConfig: { subAgentMaxSteps: number };
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
			sandboxService: InstanceAiSandboxService;
			browserSessionService: { findMcpServer: jest.Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			threadGrantRepo: { findKeys: jest.Mock };
			evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
		};
		service.settingsService = {
			getAdminSettings: jest.fn(() => ({ localGatewayDisabled: false, sandboxEnabled: true })),
			getSandboxStatus: jest.fn(() => ({
				enabled: true,
				provider: 'n8n-sandbox',
				workflowBuilderAvailable: true,
				unavailableReason: null,
			})),
			isLocalGatewayDisabledForUser: jest.fn(async () => false),
			getPermissions: jest.fn(() => ({})),
		};
		service.gatewayService = { findGateway: jest.fn(() => undefined) };
		service.aiService = { isProxyEnabled: jest.fn(() => false) };
		service.adapterService = {
			createContext: jest.fn(() => ({})),
			getNodeDefinitionDirs: jest.fn(() => []),
		};
		service.sourceControlPreferencesService = {
			getPreferences: jest.fn(() => ({ branchReadOnly: false })),
		};
		service.modelService = {
			resolveAgentModelConfig: jest.fn(async () => 'model-1'),
			resolveProxyModel: jest.fn(async () => 'model-1'),
		};
		service.ensureThreadExists = jest.fn(async () => {});
		service.agentMemory = { getThreadProjectId: jest.fn(async () => 'project-1') };
		service.dbIterationLogStorage = {};
		service.dbSnapshotStorage = {};
		service.checkpointStore = {};
		service.instanceAiConfig = { subAgentMaxSteps: 10 };
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
		service.domainAccessTrackersByThread = new Map();
		service.browserSessionService = { findMcpServer: jest.fn(() => undefined) };
		service.threadGrantRepo = { findKeys: jest.fn(async () => new Set<string>()) };
		service.sandboxService = new InstanceAiSandboxService({
			config: { sandboxEnabled: true, sandboxProvider: 'daytona' } as InstanceAiConfig,
			logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
			errorReporter: { error: jest.fn() } as unknown as ErrorReporter,
			runState: {
				getActiveRunId: jest.fn(() => undefined),
				hasSuspendedRun: jest.fn(() => false),
			},
			backgroundTasks: { getRunningTasks: jest.fn(() => []) },
			settingsService: {
				resolveDaytonaConfig: jest.fn(async () => ({})),
				resolveN8nSandboxConfig: jest.fn(async () => ({})),
			},
			aiService: { isProxyEnabled: jest.fn(() => false), getClient: jest.fn() },
		});
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
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

		(createLazyRuntimeWorkspace as jest.Mock).mockClear();
		(createLazyWorkspaceRuntimeSkillSource as jest.Mock).mockClear();
		(createSandbox as jest.Mock).mockClear();
		(setupSandboxWorkspace as jest.Mock).mockClear();
		(loadInstanceAiRuntimeSkillSource as jest.Mock).mockClear();
		service.settingsService.getSandboxStatus.mockReturnValue({
			enabled: true,
			provider: 'n8n-sandbox',
			workflowBuilderAvailable: false,
			unavailableReason: 'N8N_SANDBOX_SERVICE_URL is required.',
		});

		const unavailableEnvironment = await service.createExecutionEnvironment(
			fakeUser,
			'thread-2',
			'run-2',
			new AbortController().signal,
		);

		expect(unavailableEnvironment.orchestrationContext.workspace).toBeUndefined();
		expect(unavailableEnvironment.orchestrationContext.runtimeSkills?.registry.skills).toEqual([
			{ id: 'data-table-manager' },
		]);
		expect(createLazyRuntimeWorkspace).not.toHaveBeenCalled();
		expect(createLazyWorkspaceRuntimeSkillSource).not.toHaveBeenCalled();
		expect(createSandbox).not.toHaveBeenCalled();
		expect(setupSandboxWorkspace).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — shutdown', () => {
	it('does not destroy thread-scoped sandboxes on service shutdown', async () => {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as ShutdownServiceInternals;
		service.stopCheckpointPruning = jest.fn();
		service.liveness = { shutdown: jest.fn() };
		service.runState = {
			shutdown: jest.fn(() => ({ activeRuns: [], suspendedRuns: [] })),
		};
		service.backgroundTasks = { cancelAll: jest.fn(() => []) };
		service.tracing = {
			finalizeRunTracing: jest.fn(
				async (
					_runId: string,
					_tracing: InstanceAiTraceContext | undefined,
					_options: unknown,
				) => {},
			),
			finalizeBackgroundTaskTracing: jest.fn(
				async (_task: ManagedBackgroundTask, _status: 'cancelled') => {},
			),
			finalizeRemainingMessageTraceRoots: jest.fn(
				async (_threadId: string, _options: unknown) => {},
			),
			getTrackedThreadIds: jest.fn(() => []),
			clear: jest.fn(),
		};
		service.gatewayService = { disconnectAll: jest.fn() };
		service.sandboxService = { stopSandboxExpiryTimers: jest.fn() };
		service.browserSessionService = { shutdown: jest.fn(async () => {}) };
		service.domainAccessTrackersByThread = new Map();
		service.eventBus = { clear: jest.fn() };
		service._mcpClientManager = { disconnect: jest.fn(async () => {}) };
		service.inFlightExecutions = new Set();
		service.logger = { debug: jest.fn(), warn: jest.fn() };

		await service.shutdown();

		// Shutdown only stops the idle-eviction timers; thread-scoped sandboxes
		// are left intact (via the delegated sandboxService) so a restarted
		// process can reconnect to them.
		expect(service.sandboxService.stopSandboxExpiryTimers).toHaveBeenCalledTimes(1);
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

	it('lets workflow verification follow-up replace the generic background completion follow-up', async () => {
		const { service, task, getSpawnOptions } = createBackgroundTaskFollowUpService();
		service.maybeStartWorkflowVerificationFollowUp.mockResolvedValue(true);

		service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'task-1',
				threadId: 'thread-a',
				agentId: 'agent-builder',
				role: 'workflow-builder',
				workItemId: 'wi-1',
				run: async () => 'done',
			},
			{},
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(service.maybeStartWorkflowVerificationFollowUp).toHaveBeenCalledWith(fakeUser, task);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
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
		expect(service.terminalOutcome.recordBackgroundTerminalOutcome).toHaveBeenCalledWith(task);
		expect(service.saveAgentTreeSnapshot).toHaveBeenCalledWith(
			'thread-a',
			'run-1',
			{},
			true,
			'group-1',
		);
	});

	it('skips internal follow-up when the task itself timed out', async () => {
		const { service, task, getSpawnOptions } = createBackgroundTaskFollowUpService();
		task.status = 'failed';
		task.timeoutReason = 'idle_timeout';
		task.error = 'Background workflow-builder task timed out after 600000ms';

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
		expect(service.terminalOutcome.recordBackgroundTerminalOutcome).toHaveBeenCalledWith(task);
	});

	it('clears the active-timeout guard when the user starts a new run', () => {
		const service = createStartRunService();

		service.startRun(fakeUser, 'thread-a', 'try again');

		expect(service.liveness.clearThreadState).toHaveBeenCalledWith('thread-a');
		expect(service.executeRun).toHaveBeenCalled();
	});

	it('passes handoff context into executeRun', () => {
		const service = createStartRunService();
		const context = {
			source: 'credential-modal' as const,
			credential: {
				credentialType: 'gmailOAuth2Api',
				displayName: 'Gmail OAuth2 API',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
			},
		};

		service.startRun(fakeUser, 'thread-a', 'How do I set this up?', undefined, context);

		expect(service.executeRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			'run-1',
			'How do I set this up?',
			expect.any(AbortController),
			undefined,
			context,
			'group-1',
			undefined,
		);
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

describe('InstanceAiService — scheduled pruning', () => {
	it('marks checkpoints expired older than the retention window', async () => {
		const service = createCheckpointPruneService();
		const now = new Date('2026-05-13T12:00:00.000Z').getTime();

		await service.runScheduledPrune(now);

		expect(service.checkpointStore.markExpiredOlderThan).toHaveBeenCalledWith(
			new Date('2026-05-06T12:00:00.000Z'),
		);
		expect(service.suspendedThreads.pruneStalePendingConfirmations).toHaveBeenCalledWith(now);
		expect(service.pruneExpiredThreads).toHaveBeenCalled();
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
		service.instanceAiConfig.pruneInterval = 0;

		service.startCheckpointPruning();

		expect(service.scheduleCheckpointPrune).not.toHaveBeenCalled();
	});
});

type ExpiredThreadPruneServiceInternals = {
	pruneExpiredThreads: () => Promise<void>;
	clearThreadState: jest.MockedFunction<(threadId: string) => Promise<void>>;
	memoryService: {
		cleanupExpiredThreads: jest.MockedFunction<
			(onThreadDeleted?: (threadId: string) => Promise<void>) => Promise<number>
		>;
	};
	logger: { warn: jest.Mock };
};

function createExpiredThreadPruneService(): ExpiredThreadPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ExpiredThreadPruneServiceInternals;
	service.clearThreadState = jest.fn(async (_threadId: string) => undefined);
	service.memoryService = {
		cleanupExpiredThreads: jest.fn(async (_onThreadDeleted) => 0),
	};
	service.logger = { warn: jest.fn() };
	return service;
}

describe('InstanceAiService — expired thread pruning', () => {
	it('delegates to the memory service and clears state for deleted threads', async () => {
		const service = createExpiredThreadPruneService();
		service.memoryService.cleanupExpiredThreads.mockImplementation(async (onThreadDeleted) => {
			await onThreadDeleted?.('thread-1');
			return 1;
		});

		await service.pruneExpiredThreads();

		expect(service.memoryService.cleanupExpiredThreads).toHaveBeenCalledTimes(1);
		expect(service.clearThreadState).toHaveBeenCalledWith('thread-1');
	});

	it('swallows errors so the recurring prune is not disrupted', async () => {
		const service = createExpiredThreadPruneService();
		service.memoryService.cleanupExpiredThreads.mockRejectedValueOnce(new Error('db down'));

		await expect(service.pruneExpiredThreads()).resolves.toBeUndefined();
		expect(service.logger.warn).toHaveBeenCalled();
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
	suspendedRunRestorer: {
		resolveOrphanedConfirmation: jest.Mock;
	};
	suspendedThreads: {
		dropPendingConfirmation: jest.Mock;
	};
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
	service.suspendedRunRestorer = {
		resolveOrphanedConfirmation: jest.fn(async () => false),
	};
	service.suspendedThreads = {
		dropPendingConfirmation: jest.fn(async () => {}),
	};
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
	workflowObligations: {
		findPendingPlannedWorkflowVerification: jest.Mock;
		revalidatePlannedWorkflowVerification: jest.Mock;
	};
	backgroundTasks: { getRunningTasks: jest.Mock };
	startInternalFollowUpRun: jest.Mock;
	buildPlannedTaskFollowUpMessage: jest.Mock;
	buildWorkflowVerificationFollowUpMessage: jest.Mock;
	runState: {
		getThreadResearchMode: jest.Mock;
		hasLiveRun: jest.Mock;
	};
	createPlannedTaskDispatchContext: jest.Mock;
	dispatchPlannedTask: jest.Mock;
	logger: { warn: jest.Mock };
};

function createPlannedTaskSchedulerService(): {
	service: PlannedTaskSchedulerServiceInternals;
	plannedTaskService: {
		getGraph: jest.Mock;
		tick: jest.Mock;
		revertToActive: jest.Mock;
		revertCheckpointToPlanned: jest.Mock;
		revertBuildWorkflowToPlanned: jest.Mock;
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
		revertBuildWorkflowToPlanned: jest.fn(async () => {}),
		markRunning: jest.fn(async () => {}),
	};

	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.createPlannedTaskState = jest.fn(async () => ({ plannedTaskService }));
	service.syncPlannedTasksToUi = jest.fn(async () => {});
	service.workflowObligations = {
		findPendingPlannedWorkflowVerification: jest.fn(async () => undefined),
		revalidatePlannedWorkflowVerification: jest.fn(async (_threadId, verification) => verification),
	};
	service.backgroundTasks = { getRunningTasks: jest.fn(() => []) };
	service.startInternalFollowUpRun = jest.fn(async () => 'follow-up-run');
	service.buildPlannedTaskFollowUpMessage = jest.fn(() => 'follow-up message');
	service.buildWorkflowVerificationFollowUpMessage = jest.fn(() => 'workflow verification message');
	service.runState = {
		getThreadResearchMode: jest.fn(() => false),
		hasLiveRun: jest.fn(() => false),
	};
	service.createPlannedTaskDispatchContext = jest.fn(async () => ({}));
	service.dispatchPlannedTask = jest.fn(async () => {});
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
	tracing: { createOrchestratorResumeTraceContext: jest.Mock };
	processResumedStream: jest.Mock;
	suspendedThreads: { dropPendingConfirmation: jest.Mock };
	trackInFlightExecution: jest.Mock;
};

function createSuspendedRunResumeService(): SuspendedRunResumeServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as SuspendedRunResumeServiceInternals;
	service.revalidateActiveUser = jest.fn();
	service.cancelRun = jest.fn();
	service.suspendedThreads = { dropPendingConfirmation: jest.fn(async () => {}) };
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
	service.tracing = { createOrchestratorResumeTraceContext: jest.fn(async () => undefined) };
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
		expect(service.suspendedThreads.dropPendingConfirmation).toHaveBeenCalledWith('req-1');
	});

	it('delegates to the orphan-restoration path when no live run resumes', async () => {
		// The detailed orphan claim/rebuild/finalize scenarios live in
		// suspended-run-restorer.service.test.ts; here we only assert the
		// fallthrough wiring once in-memory resolution + resume both miss.
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.suspendedRunRestorer.resolveOrphanedConfirmation.mockResolvedValue(true);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(service.suspendedRunRestorer.resolveOrphanedConfirmation).toHaveBeenCalledWith(
			'user-1',
			'req-1',
			expect.objectContaining({ approved: true }),
		);
	});

	it('propagates the terminal UserError thrown by the orphan-restoration path', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(false);
		service.suspendedRunRestorer.resolveOrphanedConfirmation.mockRejectedValue(
			new UserError('This confirmation was lost when the assistant restarted.'),
		);

		await expect(service.resolveConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			/lost when the assistant restarted/,
		);
	});

	it('does not reach the orphan-restoration path when a live run resumes', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(true);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBe(true);
		expect(service.suspendedRunRestorer.resolveOrphanedConfirmation).not.toHaveBeenCalled();
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
			undefined,
			undefined,
			undefined,
		);
	});

	it('continues scheduling in the same pass after dispatching planned tasks', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const delegateTask = {
			id: 'delegate-1',
			title: 'Research',
			kind: 'delegate',
			spec: 'Do the research',
			deps: [],
			tools: ['research'],
			status: 'planned',
		};
		graph.tasks = [delegateTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick
			.mockResolvedValueOnce({
				type: 'dispatch',
				graph,
				tasks: [delegateTask],
			})
			.mockResolvedValueOnce({ type: 'none', graph });

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.createPlannedTaskDispatchContext).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			graph,
		);
		expect(service.dispatchPlannedTask).toHaveBeenCalledWith(
			delegateTask,
			expect.anything(),
			graph,
		);
		expect(plannedTaskService.tick).toHaveBeenCalledTimes(2);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('routes planned synthesis through workflow verification while an obligation is unsettled', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const workflowTask = {
			id: 'build-wf',
			title: 'Build workflow',
			kind: 'build-workflow',
			status: 'succeeded',
			outcome: { workItemId: 'wi-1', workflowId: 'wf-1' },
		};
		const graphWithTask = { ...graph, tasks: [workflowTask] };
		const pendingVerification = {
			obligation: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				workflowId: 'wf-1',
				source: 'planned',
				policy: 'required',
				status: 'ready_to_verify',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			outcome: undefined,
			task: workflowTask,
		};
		plannedTaskService.getGraph.mockResolvedValue(graphWithTask);
		service.workflowObligations.findPendingPlannedWorkflowVerification.mockResolvedValue(
			pendingVerification,
		);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-workflow-verification',
			graph: graphWithTask,
			verification: pendingVerification,
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(plannedTaskService.tick).toHaveBeenCalledWith('thread-a', {
			availableSlots: expect.any(Number),
			pendingWorkflowVerification: pendingVerification,
		});
		expect(plannedTaskService.revertToActive).not.toHaveBeenCalled();
		expect(service.buildWorkflowVerificationFollowUpMessage).toHaveBeenCalled();
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'workflow verification message',
			'group-1',
			false,
			undefined,
			'workflow_verification',
			undefined,
		);
		expect(service.buildPlannedTaskFollowUpMessage).not.toHaveBeenCalledWith(
			'synthesize',
			expect.anything(),
		);
	});

	it('skips a stale planned workflow verification and continues scheduling', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const workflowTask = {
			id: 'build-wf',
			title: 'Build workflow',
			kind: 'build-workflow',
			status: 'succeeded',
			outcome: { workItemId: 'wi-1', workflowId: 'wf-1' },
		};
		const graphWithTask = { ...graph, tasks: [workflowTask] };
		const pendingVerification = {
			obligation: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				workflowId: 'wf-1',
				source: 'planned',
				policy: 'required',
				status: 'ready_to_verify',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			outcome: undefined,
			task: workflowTask,
		};
		plannedTaskService.getGraph.mockResolvedValue(graphWithTask);
		service.workflowObligations.findPendingPlannedWorkflowVerification
			.mockResolvedValueOnce(pendingVerification)
			.mockResolvedValueOnce(undefined);
		service.workflowObligations.revalidatePlannedWorkflowVerification.mockResolvedValueOnce(
			undefined,
		);
		plannedTaskService.tick
			.mockResolvedValueOnce({
				type: 'orchestrate-workflow-verification',
				graph: graphWithTask,
				verification: pendingVerification,
			})
			.mockResolvedValueOnce({
				type: 'synthesize',
				graph: { ...graphWithTask, status: 'completed' },
			});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.workflowObligations.revalidatePlannedWorkflowVerification).toHaveBeenCalledWith(
			'thread-a',
			pendingVerification,
		);
		expect(plannedTaskService.tick).toHaveBeenCalledTimes(2);
		expect(service.buildWorkflowVerificationFollowUpMessage).not.toHaveBeenCalled();
		expect(service.buildPlannedTaskFollowUpMessage).toHaveBeenCalledWith(
			'synthesize',
			expect.objectContaining({ status: 'completed' }),
		);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			'synthesize',
			undefined,
		);
	});

	it('runs planned workflow builds as orchestrator follow-up turns', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const buildTask = {
			id: 'wf-1',
			title: 'Build workflow',
			kind: 'build-workflow',
			spec: 'Build the workflow',
			deps: [],
			workflowId: 'existing-wf',
		};
		graph.tasks = [buildTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-build-workflow',
			graph,
			tasks: [buildTask],
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(plannedTaskService.markRunning).toHaveBeenCalledWith('thread-a', 'wf-1', {
			agentId: 'orchestrator-plan-run-1',
		});
		expect(service.buildPlannedTaskFollowUpMessage).toHaveBeenCalledWith('build-workflow', graph, {
			buildTask,
		});
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			undefined,
			expect.objectContaining({
				isPlannedBuildFollowUp: true,
				buildTaskId: 'wf-1',
				workItemId: 'plan-run-1:default',
			}),
		);
	});

	it('passes planned supporting-workflow build metadata to follow-up turns', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const buildTask = {
			id: 'processor',
			title: 'Build processor sub-workflow',
			kind: 'build-workflow',
			spec: 'Build the reusable processor.',
			deps: [],
			isSupportingWorkflow: true,
		};
		graph.tasks = [buildTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick.mockResolvedValue({
			type: 'orchestrate-build-workflow',
			graph,
			tasks: [buildTask],
		});

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'follow-up message',
			'group-1',
			false,
			undefined,
			undefined,
			expect.objectContaining({
				isPlannedBuildFollowUp: true,
				buildTaskId: 'processor',
				workItemId: expect.stringMatching(/^wi_/),
				isSupportingWorkflowTask: true,
			}),
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

describe('InstanceAiService — agent tree snapshots', () => {
	beforeEach(() => {
		(buildAgentTreeFromEvents as jest.Mock).mockImplementation(
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
		);
	});

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

	it('claims credits when a resumed run completes', async () => {
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

		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			'agent-run-1',
			[],
			'completed',
		);
		expect(service.telemetry.track).toHaveBeenCalledWith('Builder satisfied user intent', {
			thread_id: 'thread-a',
		});
		// user_id must be present so the heartbeat event reaches PostHog
		expect(service.telemetry.track).toHaveBeenCalledWith('instance_ai_run_finished', {
			thread_id: 'thread-a',
			run_id: 'run-1',
			status: 'completed',
			user_id: 'user-1',
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

describe('InstanceAiService — OAuth callback URL', () => {
	// Regression: the OAuth callback URL exposed to browser-assisted credential
	// setup must come from urlService.getInstanceBaseUrl() (which honors WEBHOOK_URL
	// on cloud), not from globalConfig.editorBaseUrl with a localhost fallback.
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

describe('InstanceAiService — workflow verification follow-up gate', () => {
	type VerificationGateService = {
		workflowObligations: { getObligation: jest.Mock };
		trackWorkflowVerificationObligation: jest.Mock;
		buildWorkflowVerificationFollowUpMessage: jest.Mock;
		startInternalFollowUpRun: jest.Mock;
		maybeStartWorkflowVerificationFollowUp: (
			user: User,
			task: ManagedBackgroundTask,
		) => Promise<boolean>;
	};

	function createVerificationGateService(
		obligation: WorkflowVerificationObligation,
	): VerificationGateService {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as VerificationGateService;
		service.workflowObligations = { getObligation: jest.fn(async () => obligation) };
		service.trackWorkflowVerificationObligation = jest.fn();
		service.buildWorkflowVerificationFollowUpMessage = jest.fn(() => 'verification message');
		service.startInternalFollowUpRun = jest.fn(async () => 'follow-up-run');
		return service;
	}

	const builderTask = {
		taskId: 'task-1',
		threadId: 'thread-a',
		runId: 'run-1',
		role: 'workflow-builder',
		workItemId: 'wi-1',
		status: 'completed',
		messageGroupId: 'group-1',
	} as ManagedBackgroundTask;

	function makeObligation(
		overrides: Partial<WorkflowVerificationObligation>,
	): WorkflowVerificationObligation {
		return {
			workItemId: 'wi-1',
			threadId: 'thread-a',
			source: 'direct',
			policy: 'required',
			status: 'ready_to_verify',
			updatedAt: '2026-01-01T00:00:00.000Z',
			...overrides,
		} as WorkflowVerificationObligation;
	}

	it('starts a verification follow-up when the build is ready to verify', async () => {
		const service = createVerificationGateService(makeObligation({ status: 'ready_to_verify' }));

		const started = await service.maybeStartWorkflowVerificationFollowUp(fakeUser, builderTask);

		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalled();
	});

	it.each(['verified', 'needs_setup', 'not_verifiable', 'blocked'] as const)(
		'does not run a verification follow-up for a %s build (setup is routed separately)',
		async (status) => {
			const service = createVerificationGateService(makeObligation({ status }));

			const started = await service.maybeStartWorkflowVerificationFollowUp(fakeUser, builderTask);

			expect(started).toBe(false);
			expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		},
	);
});

describe('InstanceAiService — deterministic workflow setup follow-up', () => {
	type SetupFollowUpService = {
		listWorkflowLoopRecords: jest.Mock;
		claimWorkItemSetupRouting: jest.Mock;
		markWorkItemSetupRouted: jest.Mock;
		releaseWorkItemSetupRoutingClaim: jest.Mock;
		buildWorkflowSetupFollowUpMessage: jest.Mock;
		workflowObligations: { isPlannedRecord: jest.Mock; obligationFromRecord: jest.Mock };
		runState: { getMessageGroupId: jest.Mock };
		startInternalFollowUpRun: jest.Mock;
		trackWorkflowVerificationObligation: jest.Mock;
		maybeStartWorkflowSetupFollowUp: (user: User, threadId: string) => Promise<boolean>;
	};

	const verifiedNeedsSetupOutcome = {
		workItemId: 'wi-1',
		taskId: 't-1',
		runId: 'run-1',
		workflowId: 'wf-1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Submitted.',
		verificationReadiness: { status: 'already_verified' },
		setupRequirement: { status: 'required', reason: 'mocked-credentials', guidance: 'Add creds.' },
		verification: { attempted: true, success: true, executionId: 'exec-1', status: 'success' },
	};

	type SetupFollowUpRecord = {
		state: {
			workItemId: string;
			threadId: string;
			workflowId?: string;
			plannedTaskId?: string;
			setupRoutedAt?: string;
			setupRoutingClaimId?: string;
			setupRoutingClaimedAt?: string;
			setupRoutingClaimExpiresAt?: string;
		};
		attempts: [];
		lastBuildOutcome: typeof verifiedNeedsSetupOutcome;
	};

	function makeRecord(
		overrides: {
			state?: Partial<SetupFollowUpRecord['state']>;
			outcome?: Partial<typeof verifiedNeedsSetupOutcome>;
		} = {},
	): SetupFollowUpRecord {
		return {
			state: {
				workItemId: 'wi-1',
				threadId: 'thread-a',
				workflowId: 'wf-1',
				setupRoutedAt: undefined as string | undefined,
				...overrides.state,
			},
			attempts: [],
			lastBuildOutcome: { ...verifiedNeedsSetupOutcome, ...overrides.outcome },
		};
	}

	// The obligation a record maps to — mirrors what the projector would derive
	// for these fixtures (verified build whose setup verdict comes from the outcome).
	function obligationFor(record: ReturnType<typeof makeRecord>): WorkflowVerificationObligation {
		return {
			workItemId: record.state.workItemId,
			threadId: 'thread-a',
			workflowId: record.lastBuildOutcome.workflowId,
			source: 'direct',
			policy: 'required',
			status: 'verified',
			setupRequirement: record.lastBuildOutcome.setupRequirement,
			updatedAt: '2026-01-01T00:00:00.000Z',
		} as WorkflowVerificationObligation;
	}

	// Backs the stubbed storage with an in-memory store so the persisted
	// `setupRoutedAt` marker (loop-safety) behaves like the real storage.
	function createSetupFollowUpService(
		records: Record<string, ReturnType<typeof makeRecord>>,
	): SetupFollowUpService {
		const service = Object.create(InstanceAiService.prototype) as unknown as SetupFollowUpService;
		service.listWorkflowLoopRecords = jest.fn(async () => Object.values(records));
		service.claimWorkItemSetupRouting = jest.fn(
			async (_threadId: string, record: ReturnType<typeof makeRecord>) => {
				const storedRecord = records[record.state.workItemId];
				if (
					!storedRecord ||
					storedRecord.state.setupRoutedAt ||
					storedRecord.state.plannedTaskId ||
					storedRecord.state.setupRoutingClaimId
				) {
					return null;
				}

				storedRecord.state.setupRoutingClaimId = 'setup-claim-1';
				storedRecord.state.setupRoutingClaimedAt = '2026-01-01T00:00:00.000Z';
				storedRecord.state.setupRoutingClaimExpiresAt = '2026-01-01T00:15:00.000Z';
				return {
					claimId: 'setup-claim-1',
					claimedAt: '2026-01-01T00:00:00.000Z',
					expiresAt: '2026-01-01T00:15:00.000Z',
				};
			},
		);
		service.markWorkItemSetupRouted = jest.fn(
			async (_threadId: string, workItemId: string, claimId: string) => {
				const storedRecord = records[workItemId];
				if (!storedRecord || storedRecord.state.setupRoutingClaimId !== claimId) return false;

				storedRecord.state.setupRoutedAt = '2026-01-01T00:00:00.000Z';
				delete storedRecord.state.setupRoutingClaimId;
				delete storedRecord.state.setupRoutingClaimedAt;
				delete storedRecord.state.setupRoutingClaimExpiresAt;
				return true;
			},
		);
		service.releaseWorkItemSetupRoutingClaim = jest.fn(
			async (_threadId: string, workItemId: string, claimId: string) => {
				const storedRecord = records[workItemId];
				if (!storedRecord || storedRecord.state.setupRoutingClaimId !== claimId) return;

				delete storedRecord.state.setupRoutingClaimId;
				delete storedRecord.state.setupRoutingClaimedAt;
				delete storedRecord.state.setupRoutingClaimExpiresAt;
			},
		);
		service.buildWorkflowSetupFollowUpMessage = jest.fn(
			() => '<workflow-setup-required>\n{}\n</workflow-setup-required>',
		);
		service.workflowObligations = {
			isPlannedRecord: jest.fn(
				(record: ReturnType<typeof makeRecord>) => record.state.plannedTaskId !== undefined,
			),
			obligationFromRecord: jest.fn((_threadId: string, record: ReturnType<typeof makeRecord>) =>
				obligationFor(record),
			),
		};
		service.runState = { getMessageGroupId: jest.fn(() => 'group-1') };
		service.startInternalFollowUpRun = jest.fn(async () => 'setup-run');
		service.trackWorkflowVerificationObligation = jest.fn();
		return service;
	}

	it('routes a verified build that still needs setup and marks it once', async () => {
		const service = createSetupFollowUpService({ 'wi-1': makeRecord() });

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<workflow-setup-required>'),
			'group-1',
			false,
			undefined,
			'workflow_setup',
		);
		expect(service.markWorkItemSetupRouted).toHaveBeenCalledTimes(1);
	});

	it('routes a non-verifiable build that still needs setup', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);
		service.workflowObligations.obligationFromRecord.mockReturnValueOnce({
			...obligationFor(records['wi-1']),
			status: 'not_verifiable',
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<workflow-setup-required>'),
			'group-1',
			false,
			undefined,
			'workflow_setup',
		);
	});

	it('does not route the same build twice (loop-safe)', async () => {
		const service = createSetupFollowUpService({ 'wi-1': makeRecord() });

		await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');
		const secondPass = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(secondPass).toBe(false);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
	});

	it('does not route when setup is not required', async () => {
		const service = createSetupFollowUpService({
			'wi-1': makeRecord({
				outcome: {
					setupRequirement: { status: 'not_required', reason: 'none', guidance: 'No setup.' },
				},
			}),
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('does not route planned work items (handled by the plan flow)', async () => {
		const service = createSetupFollowUpService({
			'wi-1': makeRecord({ state: { plannedTaskId: 'planned-1' } }),
		});

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
	});

	it('releases the setup routing claim when the follow-up run cannot start', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);
		service.startInternalFollowUpRun.mockResolvedValueOnce('');

		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(started).toBe(false);
		expect(service.releaseWorkItemSetupRoutingClaim).toHaveBeenCalledWith(
			'thread-a',
			'wi-1',
			'setup-claim-1',
		);
		expect(records['wi-1'].state.setupRoutingClaimId).toBeUndefined();
	});
});

describe('reportInstanceAiError dedup + withSetupBoundary', () => {
	type Internals = {
		errorReporter: { error: jest.Mock };
		logger: { error: jest.Mock };
		reportedErrors: WeakSet<object>;
		reportInstanceAiError: (
			error: unknown,
			context: { component: string; threadId: string; runId: string },
		) => void;
		withSetupBoundary: <T>(
			component: string,
			context: { threadId: string; runId: string },
			fn: () => Promise<T>,
		) => Promise<T>;
	};

	function makeService(): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;
		service.errorReporter = { error: jest.fn() };
		service.logger = { error: jest.fn() };
		service.reportedErrors = new WeakSet();
		return service;
	}

	it('reports an error once even if reported again under a different component', () => {
		const service = makeService();
		const error = new Error('boom');

		service.reportInstanceAiError(error, {
			component: 'instance-ai-mcp-setup',
			threadId: 't',
			runId: 'r',
		});
		service.reportInstanceAiError(error, {
			component: 'instance-ai-run',
			threadId: 't',
			runId: 'r',
		});

		expect(service.errorReporter.error).toHaveBeenCalledTimes(1);
		expect(service.errorReporter.error.mock.calls[0][1].tags.component).toBe(
			'instance-ai-mcp-setup',
		);
	});

	it('withSetupBoundary reports with its component then rethrows', async () => {
		const service = makeService();
		const error = new Error('setup failed');

		await expect(
			service.withSetupBoundary(
				'instance-ai-sandbox-setup',
				{ threadId: 't', runId: 'r' },
				async () => {
					throw error;
				},
			),
		).rejects.toBe(error);

		expect(service.errorReporter.error).toHaveBeenCalledTimes(1);
		expect(service.errorReporter.error.mock.calls[0][1].tags.component).toBe(
			'instance-ai-sandbox-setup',
		);
	});
});
