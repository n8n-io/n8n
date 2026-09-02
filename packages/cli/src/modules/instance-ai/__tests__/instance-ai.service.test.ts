// Manual mocks — must be declared before any imports that touch the mocked modules.
vi.mock('@n8n/agents', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/agents')>()),
	createScopedWorkspace: vi.fn((workspace: unknown) => workspace),
}));

vi.mock('@n8n/instance-ai', async () => {
	const { z } = await vi.importActual<typeof import('zod')>('zod');
	return {
		// Wiring-only stub: the real mapping has its own unit tests
		// (instance-ai/src/tracing/__tests__/thread-provenance.test.ts). What the
		// service tests pin is that its OUTPUT reaches the trace — spreading an
		// undefined mock here is a no-op, so a missing entry would look like a
		// passing test with silently empty metadata.
		threadProvenanceMetadata: vi.fn(() => ({ thread_source: 'evals' })),
		orchestratorAgentId: (runId: string) => `orchestrator-${runId}`,
		isQuotaExhaustedError: (error: unknown) =>
			typeof error === 'object' &&
			error !== null &&
			'errorCode' in error &&
			error.errorCode === 'quota_exhausted',
		McpClientManager: class {
			getRegularTools = vi.fn().mockResolvedValue({ tools: new Map(), connectionFailures: [] });
			disconnect = vi.fn();
		},
		createDomainAccessTracker: vi.fn(),
		emitAgentSnapshotTraceEvent: vi.fn(async () => await Promise.resolve('emitted')),
		createSandbox: vi.fn(),
		createWorkspace: vi.fn(),
		createLazyRuntimeWorkspace: vi.fn(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		),
		createLazyWorkspaceRuntimeSkillSource: vi.fn(({ source }) => source),
		getPromptWorkspaceRoot: vi.fn(() => '/home/daytona/workspace'),
		getWorkspaceRoot: vi.fn(async () => '/home/daytona/workspace'),
		setupSandboxWorkspace: vi.fn(),
		loadInstanceAiRuntimeSkillSource: vi.fn(() => ({
			registry: {
				skillsHash: 'runtime-skills-hash',
				skills: [{ id: 'data-table-manager' }],
			},
			loadSkill: vi.fn(),
		})),
		disabledInstanceAiSkillIds: vi.fn(() => []),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: vi.fn(),
		handleVerificationVerdict: vi.fn(),
		buildAgentTreeFromEvents: vi.fn(
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
		createInstanceAgent: vi.fn(),
		tokenUsageToBuilderUsageItems: (
			model: string,
			usage: {
				completionTokens?: number;
				inputTokenDetails?: { noCache?: number; cacheRead?: number; cacheWrite?: number };
			},
		) => {
			const uncachedInput = usage.inputTokenDetails?.noCache ?? 0;
			const cacheRead = usage.inputTokenDetails?.cacheRead ?? 0;
			const cacheWrite = usage.inputTokenDetails?.cacheWrite ?? 0;
			const output = usage.completionTokens ?? 0;
			if (uncachedInput + cacheRead + cacheWrite + output === 0) return [];
			return [{ type: 'llmTokens', model, uncachedInput, cacheRead, cacheWrite, output }];
		},
		createAllTools: vi.fn(),
		createOrchestratorRunControl: vi.fn(function () {
			return {
				state: undefined,
				getStopSignal: vi.fn(() => undefined),
			};
		}),
		createOrchestratorRunControlForState: vi.fn(function () {
			return {
				state: undefined,
				getStopSignal: vi.fn(() => undefined),
				shouldEmitTerminalOutcome: vi.fn(() => true),
			};
		}),
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

				// A stopped run needs no assistant placeholder — the UI shows the
				// stopped state itself.
				if (status === 'cancelled') {
					return {
						status,
						visibilitySource: 'none',
						action: 'none',
						reason: 'cancelled-silent',
					};
				}

				return {
					status,
					visibilitySource: 'none',
					action: 'emit',
					reason: 'completed-silent',
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
		resumeAgentRun: vi.fn(),
		createInstanceAiTraceContext: vi.fn(async () => ({ rootRun: { otelTraceId: undefined } })),
		shutdownProductTelemetryProviders: vi.fn(async () => {}),
		TerminalOutcomeStorage: class {
			constructor(_memory: unknown) {}
		},
	};
});

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

import type { MemoryTaskUsageReport, ScopedMemoryTaskEvent } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	createAllTools,
	createLazyRuntimeWorkspace,
	createLazyWorkspaceRuntimeSkillSource,
	createOrchestratorRunControl,
	createSandbox,
	createWorkspace,
	createInstanceAiTraceContext,
	loadInstanceAiRuntimeSkillSource,
	resumeAgentRun,
	setupSandboxWorkspace,
	shutdownProductTelemetryProviders,
	emitAgentSnapshotTraceEvent,
	threadProvenanceMetadata,
	type BuilderUsageItem,
	type ManagedBackgroundTask,
	type InstanceAiTraceContext,
	type SpawnBackgroundTaskOptions,
	type SpawnBackgroundTaskResult,
	type SpawnManagedBackgroundTaskOptions,
	type TraceStatus,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';
import type { ErrorReporter } from 'n8n-core';
import { UserError } from 'n8n-workflow';
import type { Mock, MockedFunction } from 'vitest';

import { InstanceAiBuilderDelegateAdapterService } from '@/modules/agents/instance-ai-builder-delegate.adapter';
import { userHasScopes } from '@/permissions.ee/check-access';

import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import {
	InstanceAiTerminalOutcomeService,
	type InstanceAiTerminalOutcomeServiceOptions,
} from '../instance-ai-terminal-outcome.service';
import { INSTANCE_AI_RUN_TIMEOUT_REASON } from '../liveness/instance-ai-liveness.service';
import { InstanceAiService } from '../instance-ai.service';
import { InstanceAiSandboxService } from '../sandbox';

type ServiceInternals = {
	pendingCheckpointReentries: Map<string, Set<string>>;
	queuePendingCheckpointReentry: (threadId: string, checkpointTaskId: string) => void;
	drainPendingCheckpointReentries: (user: User, threadId: string) => Promise<void>;
	reenterCheckpointById: Mock<(...args: [User, string, string, string?]) => Promise<boolean>>;
	backgroundTasks: {
		getRunningTasksByParentCheckpoint: Mock;
	};
	runState: {
		getActiveRunId: Mock;
		hasSuspendedRun: Mock;
	};
	logger: { debug: Mock; warn: Mock; error: Mock };
};

type BackgroundTaskFollowUpServiceInternals = {
	spawnBackgroundTask: (
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		messageGroupIdOverride?: string,
	) => SpawnBackgroundTaskResult;
	backgroundTasks: {
		spawn: MockedFunction<
			(options: SpawnManagedBackgroundTaskOptions) => {
				status: 'started';
				task: ManagedBackgroundTask;
			}
		>;
		getRunningTasks: MockedFunction<(threadId: string) => ManagedBackgroundTask[]>;
	};
	runState: {
		getMessageGroupId: MockedFunction<(threadId: string) => string | undefined>;
		getThreadUser: MockedFunction<(threadId: string) => User | undefined>;
		getActiveRunId: MockedFunction<(threadId: string) => string | undefined>;
		hasSuspendedRun: MockedFunction<(threadId: string) => boolean>;
	};
	liveness: {
		hasTimedOutActiveRunThread: MockedFunction<(threadId: string) => boolean>;
	};
	eventBus: {
		publish: MockedFunction<(threadId: string, event: InstanceAiEvent) => void>;
	};
	tracing: {
		finalizeBackgroundTaskTracing: MockedFunction<
			(task: ManagedBackgroundTask, status: 'completed' | 'failed' | 'cancelled') => Promise<void>
		>;
	};
	handlePlannedTaskSettlement: MockedFunction<
		(
			user: User,
			task: ManagedBackgroundTask,
			status: 'succeeded' | 'failed' | 'cancelled',
		) => Promise<void>
	>;
	terminalOutcome: {
		recordBackgroundTerminalOutcome: MockedFunction<(task: ManagedBackgroundTask) => Promise<void>>;
	};
	startInternalFollowUpRun: MockedFunction<
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
	maybeStartWorkflowVerificationFollowUp: MockedFunction<
		(user: User, task: ManagedBackgroundTask) => Promise<boolean>
	>;
	maybeStartWorkflowSetupFollowUp: MockedFunction<
		(user: User, threadId: string) => Promise<boolean>
	>;
	queuePendingCheckpointReentry: MockedFunction<
		(threadId: string, checkpointTaskId: string) => void
	>;
	maybeReenterParentCheckpoint: MockedFunction<
		(user: User, threadId: string, task: ManagedBackgroundTask) => Promise<boolean>
	>;
	taskProjector: { syncFromBackgroundTask: Mock };
	logger: { warn: Mock; debug: Mock };
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
		spawn: vi.fn((options: SpawnManagedBackgroundTaskOptions) => {
			spawnOptions = options;
			return { status: 'started', task };
		}),
		getRunningTasks: vi.fn((_threadId: string) => []),
	};
	service.runState = {
		getMessageGroupId: vi.fn((_threadId: string) => 'group-1'),
		getThreadUser: vi.fn((_threadId: string) => fakeUser),
		getActiveRunId: vi.fn((_threadId: string) => undefined),
		hasSuspendedRun: vi.fn((_threadId: string) => false),
	};
	service.liveness = {
		hasTimedOutActiveRunThread: vi.fn((threadId: string) =>
			timedOutThread ? threadId === 'thread-a' : false,
		),
	};
	service.eventBus = { publish: vi.fn((_threadId: string, _event: InstanceAiEvent) => {}) };
	service.taskProjector = { syncFromBackgroundTask: vi.fn(async () => {}) };
	service.tracing = {
		finalizeBackgroundTaskTracing: vi.fn(
			async (_task: ManagedBackgroundTask, _status: 'completed' | 'failed' | 'cancelled') => {},
		),
	};
	service.handlePlannedTaskSettlement = vi.fn(
		async (
			_user: User,
			_task: ManagedBackgroundTask,
			_status: 'succeeded' | 'failed' | 'cancelled',
		) => {},
	);
	service.terminalOutcome = {
		recordBackgroundTerminalOutcome: vi.fn(async (_task: ManagedBackgroundTask) => {}),
	};
	service.startInternalFollowUpRun = vi.fn(
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
	service.maybeStartWorkflowVerificationFollowUp = vi.fn(
		async (_user: User, _task: ManagedBackgroundTask) => false,
	);
	service.maybeStartWorkflowSetupFollowUp = vi.fn(async (_user: User, _threadId: string) => false);
	service.queuePendingCheckpointReentry = vi.fn();
	service.maybeReenterParentCheckpoint = vi.fn(
		async (_user: User, _threadId: string, _task: ManagedBackgroundTask) => false,
	);
	service.logger = { warn: vi.fn(), debug: vi.fn() };

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
		clearThreadState: MockedFunction<(threadId: string) => void>;
	};
	runState: {
		startRun: MockedFunction<
			(options: { threadId: string; user: User }) => {
				runId: string;
				abortController: AbortController;
				messageGroupId?: string;
			}
		>;
		setTimeZone: MockedFunction<(threadId: string, timeZone: string) => void>;
	};
	threadPushRef: Map<string, string>;
	executeRun: Mock;
	trackInFlightExecution: Mock;
};

function createStartRunService(): StartRunServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as StartRunServiceInternals;
	service.liveness = {
		clearThreadState: vi.fn((_threadId: string) => {}),
	};
	service.runState = {
		startRun: vi.fn((_options) => ({
			runId: 'run-1',
			abortController: new AbortController(),
			messageGroupId: 'group-1',
		})),
		setTimeZone: vi.fn(),
	};
	service.threadPushRef = new Map();
	service.executeRun = vi.fn();
	service.trackInFlightExecution = vi.fn();
	return service;
}

function createCheckpointService(): ServiceInternals {
	// Bypass the constructor — we only exercise the three pending-reentry helpers
	// and their direct dependencies. Everything else (scheduler, event bus, etc.)
	// is out of scope for this unit.
	const service = Object.create(InstanceAiService.prototype) as unknown as ServiceInternals;

	service.pendingCheckpointReentries = new Map();
	service.reenterCheckpointById = vi.fn(
		async (_user: User, _threadId: string, _checkpointTaskId: string, _mgid?: string) => true,
	);
	service.backgroundTasks = {
		getRunningTasksByParentCheckpoint: vi.fn(() => []),
	};
	service.runState = {
		getActiveRunId: vi.fn(() => undefined),
		hasSuspendedRun: vi.fn(() => false),
	};
	service.logger = {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	};

	return service;
}

type CheckpointPruneServiceInternals = {
	startCheckpointPruning: () => void;
	stopCheckpointPruning: () => void;
	runScheduledPrune: (now?: number) => Promise<void>;
	suspendedThreads: {
		pruneStalePendingConfirmations: MockedFunction<(now: number) => Promise<void>>;
	};
	pruneExpiredThreads: MockedFunction<() => Promise<void>>;
	scheduleCheckpointPrune: MockedFunction<(delayMs?: number) => void>;
	checkpointStore: {
		markExpiredOlderThan: MockedFunction<(olderThan: Date) => Promise<number>>;
		hardDeleteExpiredOlderThan: MockedFunction<(olderThan: Date) => Promise<number>>;
	};
	checkpointPruneTimer?: NodeJS.Timeout;
	checkpointPruningStopped: boolean;
	instanceAiConfig: {
		pruneInterval: number;
		snapshotRetention: number;
		checkpointGcRetention: number;
	};
	logger: { info: Mock; debug: Mock; warn: Mock };
};

function createCheckpointPruneService(): CheckpointPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as CheckpointPruneServiceInternals;
	service.scheduleCheckpointPrune = vi.fn();
	service.suspendedThreads = {
		pruneStalePendingConfirmations: vi.fn(async (_now: number) => undefined),
	};
	service.pruneExpiredThreads = vi.fn(async () => undefined);
	service.checkpointStore = {
		markExpiredOlderThan: vi.fn(async (_olderThan: Date) => 0),
		hardDeleteExpiredOlderThan: vi.fn(async (_olderThan: Date) => 0),
	};
	service.checkpointPruningStopped = true;
	service.instanceAiConfig = {
		pruneInterval: 60 * 60 * 1000,
		snapshotRetention: 24 * 60 * 60 * 1000,
		checkpointGcRetention: 7 * 24 * 60 * 60 * 1000,
	};
	service.logger = {
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
	};
	return service;
}

type MemoryTaskObserverServiceInternals = {
	memoryTaskObserverFor: (
		threadId: string,
		tracing: InstanceAiTraceContext | undefined,
	) => (event: ScopedMemoryTaskEvent) => void;
	memoryTaskRegistry: { handleEvent: Mock; getTasks: Mock };
	logger: { info: Mock };
};

function createMemoryTaskObserverService(): MemoryTaskObserverServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as MemoryTaskObserverServiceInternals;
	service.memoryTaskRegistry = { handleEvent: vi.fn(), getTasks: vi.fn(() => []) };
	service.logger = { info: vi.fn() };
	return service;
}

function queuedMemoryTaskEvent(): ScopedMemoryTaskEvent {
	return {
		type: 'queued',
		task: {
			id: 'task-1',
			taskKind: 'observer',
			observationScopeId: 'thread-1',
			status: 'queued',
			queuedAt: new Date(),
		},
	};
}

const fakeUser = { id: 'user-1' } as User;

function mockClaimedResumeResult(result: Awaited<ReturnType<typeof resumeAgentRun>>): void {
	vi.mocked(resumeAgentRun).mockImplementationOnce(async (_agent, _data, resumeOptions) => {
		const onResumeClaimed = resumeOptions.onResumeClaimed;
		if (typeof onResumeClaimed === 'function') await onResumeClaimed();
		return result;
	});
}

function createInstanceAiErrorReporterMock() {
	return {
		report: vi.fn(),
		beginRun: vi.fn(() => Symbol('error-reporter-execution')),
		endRun: vi.fn(),
		endAllRuns: vi.fn(),
		withBoundary: vi.fn(
			async (_component: string, _context: unknown, fn: () => Promise<unknown>) => await fn(),
		),
	};
}

type ShutdownServiceInternals = {
	shutdown: () => Promise<void>;
	stopCheckpointPruning: MockedFunction<() => void>;
	liveness: { shutdown: MockedFunction<() => void> };
	runState: {
		shutdown: MockedFunction<
			() => {
				activeRuns: [];
				suspendedRuns: [];
			}
		>;
	};
	backgroundTasks: { cancelAll: MockedFunction<() => ManagedBackgroundTask[]> };
	tracing: {
		finalizeRunTracing: MockedFunction<
			(
				runId: string,
				tracing: InstanceAiTraceContext | undefined,
				options: unknown,
			) => Promise<void>
		>;
		finalizeBackgroundTaskTracing: MockedFunction<
			(task: ManagedBackgroundTask, status: 'cancelled') => Promise<void>
		>;
		finalizeRemainingMessageTraceRoots: MockedFunction<
			(threadId: string, options: unknown) => Promise<void>
		>;
		getTrackedThreadIds: MockedFunction<() => string[]>;
		clear: MockedFunction<() => void>;
	};
	gatewayService: { disconnectAll: MockedFunction<() => void> };
	sandboxService: { stopSandboxExpiryTimers: MockedFunction<() => void> };
	browserSessionService: { shutdown: MockedFunction<() => Promise<void>> };
	domainAccessTrackersByThread: Map<string, unknown>;
	eventBus: { clear: MockedFunction<() => void> };
	eventLog: { flushAll: MockedFunction<() => Promise<void>> };
	_mcpClientManager?: { disconnect: MockedFunction<() => Promise<void>> };
	inFlightExecutions: Set<Promise<unknown>>;
	logger: { debug: Mock; warn: Mock };
	instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
};

type TerminalGuardOrderServiceInternals = {
	terminalOutcome: InstanceAiTerminalOutcomeService;
	runState: {
		getRunIdsForMessageGroup: Mock;
		cancelThread: Mock;
		clearActiveRun: Mock;
		hasSuspendedRun: Mock;
		getActiveRun: Mock;
		suspendRun: Mock;
	};
	eventService: { emit: Mock };
	eventBus: {
		events: InstanceAiEvent[];
		getEventsForRun: Mock;
		getEventsForRuns: Mock;
		publish: Mock;
	};
	liveness: { consumeRunTimeout: Mock };
	telemetry: { track: Mock };
	suspendedThreads: { dropPendingConfirmationsForThread: Mock; persistPendingConfirmation: Mock };
	logger: { warn: Mock; error: Mock };
	instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
	instanceAiConfig: {};
	tracing: {
		finalizeRunTracing: Mock;
		finalizeDetachedTraceRun: Mock;
		finalizeMessageTraceRoot: Mock;
		maybeFinalizeRunTraceRoot: Mock;
		buildMessageTraceMetadata: Mock;
		getMessageGroupId: Mock;
		registerTraceContext: Mock;
	};
	threadPushRef: Map<string, string>;
	pendingBrowserCredentialSetups: Map<
		string,
		{
			userId: string;
			attempts: Array<{
				credentialType: string;
				setupMethod: 'setup_card' | 'conversation';
				attemptId?: string;
				startedAt: number;
				created: boolean;
				errorCode?: string;
			}>;
		}
	>;
	createBrowserCredentialSetupTracker: (
		runId: string,
		userId: string,
	) => {
		markPending: (credentialType: string, attemptId?: string) => void;
		markCreated: (credentialType: string) => void;
		markCreateFailed: (credentialType: string, errorCode: string) => void;
	};
	emitBrowserCredentialSetupOutcomes: (
		threadId: string,
		runId: string,
		runStatus: 'completed' | 'cancelled' | 'errored',
		runFinishReason?: string,
	) => void;
	publishRunFinish: (
		threadId: string,
		runId: string,
		status: 'completed' | 'cancelled' | 'errored',
		reason?: string,
	) => void;
	backgroundTasks: { getRunningTasks: Mock; getRunningTasksByParentCheckpoint?: Mock };
	temporaryWorkflowService: { reapForRun: Mock };
	creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
	failedInternalFollowUpStreaks: Map<string, number>;
	schedulePlannedTasks: Mock;
	drainPendingCheckpointReentries: Mock;
	createPlannedTaskState: Mock;
	syncPlannedTasksToUi: Mock;
	taskProjector: { syncFromWorkflowLoop: Mock };
	maybeStartWorkflowSetupFollowUp: Mock;
	finalizeRun: Mock;
	preserveHitlOnShutdown: Set<string>;
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
			tracing?: InstanceAiTraceContext;
			orchestrationContext?: { tracing?: unknown };
			checkpoint?: { isCheckpointFollowUp: boolean; checkpointTaskId: string };
			resumeExecutionToken?: symbol;
			messageGroupId?: string;
			resumeTracing?: InstanceAiTraceContext;
			unregisteredResumeTracing?: InstanceAiTraceContext;
		},
	) => Promise<void>;
};

function createTerminalGuardOrderService(): TerminalGuardOrderServiceInternals {
	const events: InstanceAiEvent[] = [];
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as TerminalGuardOrderServiceInternals;
	service.runState = {
		getRunIdsForMessageGroup: vi.fn(() => ['run-1']),
		cancelThread: vi.fn(),
		clearActiveRun: vi.fn(),
		hasSuspendedRun: vi.fn(() => true),
		getActiveRun: vi.fn(() => undefined),
		suspendRun: vi.fn(),
	};
	service.eventService = { emit: vi.fn() };
	service.eventBus = {
		events,
		getEventsForRun: vi.fn(() => events),
		getEventsForRuns: vi.fn(() => events),
		publish: vi.fn((_threadId: string, event: InstanceAiEvent) => {
			events.push(event);
		}),
	};
	service.liveness = { consumeRunTimeout: vi.fn(() => ({ timedOut: false })) };
	service.telemetry = { track: vi.fn() };
	service.suspendedThreads = {
		dropPendingConfirmationsForThread: vi.fn(async () => {}),
		persistPendingConfirmation: vi.fn(async () => {}),
	};
	service.logger = { warn: vi.fn(), error: vi.fn() };
	service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();
	service.instanceAiConfig = {};
	service.tracing = {
		finalizeRunTracing: vi.fn(async () => {}),
		finalizeDetachedTraceRun: vi.fn(async () => {}),
		finalizeMessageTraceRoot: vi.fn(async () => {}),
		maybeFinalizeRunTraceRoot: vi.fn(async () => {}),
		buildMessageTraceMetadata: vi.fn(() => ({})),
		getMessageGroupId: vi.fn((runId: string) => (runId === 'run-1' ? 'group-1' : undefined)),
		registerTraceContext: vi.fn(),
	};
	service.threadPushRef = new Map();
	service.pendingBrowserCredentialSetups = new Map();
	service.backgroundTasks = { getRunningTasks: vi.fn(() => []) };
	service.temporaryWorkflowService = { reapForRun: vi.fn(async () => []) };
	service.creditService = {
		claimRunUsage: vi.fn(async () => {}),
		ensureQuotaLockApplied: vi.fn(async () => {}),
	};
	service.failedInternalFollowUpStreaks = new Map();
	service.schedulePlannedTasks = vi.fn(async () => {});
	service.drainPendingCheckpointReentries = vi.fn(async () => {});
	service.preserveHitlOnShutdown = new Set();

	service.terminalOutcome = new InstanceAiTerminalOutcomeService({
		eventBus: service.eventBus,
		agentMemory: {},
		telemetry: service.telemetry,
		errorReporter: service.instanceAiErrorReporter,
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
	} as unknown as InstanceAiTerminalOutcomeServiceOptions);
	return service;
}

describe('InstanceAiService — runtime workspace setup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(createSandbox as Mock).mockReset();
		(createWorkspace as Mock).mockReset();
		(setupSandboxWorkspace as Mock).mockReset();
		(createAllTools as Mock).mockReset();
		(createLazyRuntimeWorkspace as Mock).mockImplementation(
			(args: { id?: string; ensureWorkspace: () => Promise<unknown> }) => ({
				id: args.id ?? 'lazy-runtime-workspace',
				ensureWorkspace: args.ensureWorkspace,
			}),
		);
		(createLazyWorkspaceRuntimeSkillSource as Mock).mockImplementation(({ source }) => source);
		(loadInstanceAiRuntimeSkillSource as Mock).mockImplementation(() => ({
			registry: {
				skillsHash: 'runtime-skills-hash',
				skills: [{ id: 'data-table-manager' }],
			},
			loadSkill: vi.fn(),
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
					runtimeSkills?: {
						registry: { skillsHash: string; skills: Array<{ id: string }> };
						loadSkill: (skillId: string) => Promise<unknown>;
					};
					claimSubAgentUsage?: (
						dedupeId: string,
						usage: BuilderUsageItem[],
						status: TraceStatus,
					) => Promise<void>;
				};
			}>;
			settingsService: {
				getAdminSettings: Mock;
				getSandboxStatus: Mock;
				isLocalGatewayDisabledForUser: Mock;
				getPermissions: Mock;
			};
			gatewayService: { findGateway: Mock; applyToolPolicy: Mock };
			aiService: { isProxyEnabled: Mock };
			adapterService: {
				createContext: Mock;
				getNodeDefinitionDirs: Mock;
				isConfigEvalsEnabled: Mock;
				isMcpConnectionsEnabled: Mock;
				isNodeUsageEnabled: Mock;
			};
			instanceWriteAccess: { isReadOnly: Mock };
			modelService: { resolveAgentModelConfig: Mock; resolveProxyModel: Mock };
			ensureThreadExists: Mock;
			agentMemory: unknown;
			dbIterationLogStorage: unknown;
			checkpointStore: unknown;
			instanceAiConfig: Record<string, never>;
			defaultTimeZone: string;
			eventBus: unknown;
			logger: { warn: Mock };
			telemetry: { track: Mock };
			oauth2CallbackUrl: string;
			webhookBaseUrl: string;
			formBaseUrl: string;
			runState: { touchActiveRun: Mock; registerPendingConfirmation: Mock };
			spawnBackgroundTask: Mock;
			cancelBackgroundTask: Mock;
			backgroundTasks: { touchTask: Mock };
			schedulePlannedTasks: Mock;
			sendCorrectionToTask: Mock;
			sandboxService: InstanceAiSandboxService;
			browserSessionService: { findMcpServer: Mock };
			domainAccessTrackersByThread: Map<string, unknown>;
			threadGrantRepo: { findKeys: Mock };
			evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
			instanceAiErrorReporter: ReturnType<typeof createInstanceAiErrorReporterMock>;
			creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
		};
		service.settingsService = {
			getAdminSettings: vi.fn(() => ({ localGatewayDisabled: false, sandboxEnabled: true })),
			getSandboxStatus: vi.fn(() => ({
				enabled: true,
				provider: 'n8n-sandbox',
				workflowBuilderAvailable: true,
				unavailableReason: null,
			})),
			isLocalGatewayDisabledForUser: vi.fn(async () => false),
			getPermissions: vi.fn(() => ({})),
		};
		service.gatewayService = { findGateway: vi.fn(() => undefined), applyToolPolicy: vi.fn() };
		service.aiService = { isProxyEnabled: vi.fn(() => false) };
		service.adapterService = {
			createContext: vi.fn(() => ({})),
			getNodeDefinitionDirs: vi.fn(() => []),
			isConfigEvalsEnabled: vi.fn().mockResolvedValue(true),
			isMcpConnectionsEnabled: vi.fn().mockResolvedValue(false),
			isNodeUsageEnabled: vi.fn().mockResolvedValue(false),
		};
		service.instanceWriteAccess = { isReadOnly: vi.fn(() => false) };
		service.modelService = {
			resolveAgentModelConfig: vi.fn(async () => 'model-1'),
			resolveProxyModel: vi.fn(async () => 'model-1'),
		};
		service.ensureThreadExists = vi.fn(async () => {});
		service.agentMemory = { getThreadProjectId: vi.fn(async () => 'project-1') };
		service.dbIterationLogStorage = {};
		service.checkpointStore = {};
		service.instanceAiConfig = {};
		service.defaultTimeZone = 'UTC';
		service.eventBus = {};
		service.logger = { warn: vi.fn() };
		service.telemetry = { track: vi.fn() };
		service.oauth2CallbackUrl = 'http://localhost/rest/oauth2-credential/callback';
		service.webhookBaseUrl = 'http://localhost/webhook';
		service.formBaseUrl = 'http://localhost/form';
		service.runState = {
			touchActiveRun: vi.fn(),
			registerPendingConfirmation: vi.fn(),
		};
		service.spawnBackgroundTask = vi.fn();
		service.cancelBackgroundTask = vi.fn();
		service.backgroundTasks = { touchTask: vi.fn() };
		service.schedulePlannedTasks = vi.fn();
		service.sendCorrectionToTask = vi.fn();
		service.domainAccessTrackersByThread = new Map();
		service.browserSessionService = { findMcpServer: vi.fn(() => undefined) };
		service.threadGrantRepo = { findKeys: vi.fn(async () => new Set<string>()) };
		service.sandboxService = new InstanceAiSandboxService({
			config: { sandboxEnabled: true, sandboxProvider: 'daytona' } as InstanceAiConfig,
			logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
			errorReporter: { error: vi.fn() } as unknown as ErrorReporter,
			runState: {
				getActiveRunId: vi.fn(() => undefined),
				hasSuspendedRun: vi.fn(() => false),
			},
			backgroundTasks: { getRunningTasks: vi.fn(() => []) },
			settingsService: {
				resolveDaytonaConfig: vi.fn(async () => ({ apiKey: 'test-daytona-key' })),
				resolveN8nSandboxConfig: vi.fn(async () => ({})),
			},
			aiService: { isProxyEnabled: vi.fn(() => false), getClient: vi.fn() },
		});
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();
		service.creditService = {
			claimRunUsage: vi.fn(),
			ensureQuotaLockApplied: vi.fn(async () => {}),
		};
		(createAllTools as Mock).mockReturnValue(new Map());
		const sandbox = { id: 'sandbox-1' };
		const workspace = {
			init: vi.fn(async () => {}),
			destroy: vi.fn(async () => {}),
		};
		(createSandbox as Mock).mockResolvedValue(sandbox);
		(createWorkspace as Mock).mockReturnValue(workspace);
		(setupSandboxWorkspace as Mock).mockResolvedValue(undefined);

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

		// The credit-metering hook is wired to the instance-AI thread/user in
		// scope here, not whatever thread the sub-agent stream itself is keyed to.
		const usageItem: BuilderUsageItem = {
			type: 'llmTokens',
			model: 'anthropic/claude-sonnet',
			uncachedInput: 80,
			cacheRead: 20,
			cacheWrite: 0,
			output: 20,
		};
		await environment.orchestrationContext.claimSubAgentUsage?.(
			'dedupe-1',
			[usageItem],
			'completed',
		);
		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			fakeUser,
			'thread-1',
			'dedupe-1',
			[usageItem],
			'completed',
		);

		// An unexpected claim rejection must not reject the awaited hook, and is
		// reported centrally, then logged, instead of breaking the builder flow.
		const claimError = new Error('claim failed');
		service.creditService.claimRunUsage.mockRejectedValueOnce(claimError);
		await expect(
			environment.orchestrationContext.claimSubAgentUsage?.('dedupe-2', [usageItem], 'completed'),
		).resolves.toBeUndefined();
		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(claimError, {
			component: 'instance-ai-agent-builder-usage',
			threadId: 'thread-1',
			runId: 'run-1',
			userId: fakeUser.id,
			projectId: 'project-1',
		});
		expect(service.logger.warn).toHaveBeenCalledWith('Failed to claim agent-builder usage', {
			threadId: 'thread-1',
			runId: 'run-1',
			dedupeId: 'dedupe-2',
			error: 'claim failed',
		});
		expect(service.instanceAiErrorReporter.report.mock.invocationCallOrder[0]).toBeLessThan(
			service.logger.warn.mock.invocationCallOrder[0],
		);

		expect(createSandbox).not.toHaveBeenCalled();
		const skillWorkspace = (createLazyWorkspaceRuntimeSkillSource as Mock).mock.calls[0]?.[0]
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

		(createLazyRuntimeWorkspace as Mock).mockClear();
		(createLazyWorkspaceRuntimeSkillSource as Mock).mockClear();
		(createSandbox as Mock).mockClear();
		(setupSandboxWorkspace as Mock).mockClear();
		(loadInstanceAiRuntimeSkillSource as Mock).mockClear();
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
		// Without a sandbox the runtime skill catalog is used as-is (no
		// workspace-materialized wrapper).
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
		service.stopCheckpointPruning = vi.fn();
		service.liveness = { shutdown: vi.fn() };
		service.runState = {
			shutdown: vi.fn(() => ({ activeRuns: [], suspendedRuns: [] })),
		};
		service.backgroundTasks = { cancelAll: vi.fn(() => []) };
		service.tracing = {
			finalizeRunTracing: vi.fn(
				async (
					_runId: string,
					_tracing: InstanceAiTraceContext | undefined,
					_options: unknown,
				) => {},
			),
			finalizeBackgroundTaskTracing: vi.fn(
				async (_task: ManagedBackgroundTask, _status: 'cancelled') => {},
			),
			finalizeRemainingMessageTraceRoots: vi.fn(async (_threadId: string, _options: unknown) => {}),
			getTrackedThreadIds: vi.fn(() => []),
			clear: vi.fn(),
		};
		service.gatewayService = { disconnectAll: vi.fn() };
		service.sandboxService = { stopSandboxExpiryTimers: vi.fn() };
		service.browserSessionService = { shutdown: vi.fn(async () => {}) };
		service.domainAccessTrackersByThread = new Map();
		service.eventBus = { clear: vi.fn() };
		service.eventLog = { flushAll: vi.fn(async () => {}) };
		service._mcpClientManager = { disconnect: vi.fn(async () => {}) };
		service.inFlightExecutions = new Set();
		service.logger = { debug: vi.fn(), warn: vi.fn() };
		service.instanceAiErrorReporter = createInstanceAiErrorReporterMock();

		await service.shutdown();

		// Shutdown only stops the idle-eviction timers; thread-scoped sandboxes
		// are left intact (via the delegated sandboxService) so a restarted
		// process can reconnect to them.
		expect(service.sandboxService.stopSandboxExpiryTimers).toHaveBeenCalledTimes(1);

		// The durable-log flush must precede eventBus.clear(): clear() invalidates
		// drain lifecycles, so the reverse order would drop unflushed segment tails.
		expect(service.eventLog.flushAll).toHaveBeenCalledTimes(1);
		expect(service.eventLog.flushAll.mock.invocationCallOrder[0]).toBeLessThan(
			service.eventBus.clear.mock.invocationCallOrder[0],
		);

		// Every trace's LangSmith provider is drained on final process shutdown,
		// after run/background cleanup has already released each trace's own
		// bookkeeping.
		expect(shutdownProductTelemetryProviders).toHaveBeenCalledTimes(1);
		expect(service.eventBus.clear.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(shutdownProductTelemetryProviders).mock.invocationCallOrder[0],
		);
	});
});

describe('InstanceAiService — memory task observer', () => {
	it('forwards memory task events to the trace context lease hook before existing registry/log handling', () => {
		const service = createMemoryTaskObserverService();
		const onMemoryTaskEvent = vi.fn();
		const tracing = { onMemoryTaskEvent } as unknown as InstanceAiTraceContext;
		const observer = service.memoryTaskObserverFor('thread-1', tracing);
		const event = queuedMemoryTaskEvent();

		observer(event);

		expect(onMemoryTaskEvent).toHaveBeenCalledWith(event);
		expect(service.memoryTaskRegistry.handleEvent).toHaveBeenCalledWith('thread-1', event);
		expect(service.logger.info).toHaveBeenCalledWith(
			'Observational memory task queued',
			expect.objectContaining({ threadId: 'thread-1', taskId: 'task-1' }),
		);
		expect(onMemoryTaskEvent.mock.invocationCallOrder[0]).toBeLessThan(
			service.memoryTaskRegistry.handleEvent.mock.invocationCallOrder[0],
		);
	});

	it('still runs registry/log handling when the trace context has no lease hook', () => {
		const service = createMemoryTaskObserverService();
		const observer = service.memoryTaskObserverFor('thread-1', undefined);
		const event = queuedMemoryTaskEvent();

		expect(() => observer(event)).not.toThrow();
		expect(service.memoryTaskRegistry.handleEvent).toHaveBeenCalledWith('thread-1', event);
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
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		expect(service.terminalOutcome.recordBackgroundTerminalOutcome).toHaveBeenCalledWith(task);
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
				credentialType: 'gmailOAuth2',
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

	it('passes agent-preview handoff context into executeRun', () => {
		const service = createStartRunService();
		const context = {
			source: 'agent-preview' as const,
			agentId: 'agent-1',
			threadId: 'preview-thread-1',
			executionId: 'exec-1',
		};

		service.startRun(fakeUser, 'thread-a', 'Please improve this agent', undefined, context);

		expect(service.executeRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			'run-1',
			'Please improve this agent',
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

		// snapshotRetention = 24h → tombstone anything untouched since 05-12
		expect(service.checkpointStore.markExpiredOlderThan).toHaveBeenCalledWith(
			new Date('2026-05-12T12:00:00.000Z'),
		);
		// checkpointGcRetention = 7d → hard-delete tombstones expired before 05-06
		expect(service.checkpointStore.hardDeleteExpiredOlderThan).toHaveBeenCalledWith(
			new Date('2026-05-06T12:00:00.000Z'),
		);
		expect(service.suspendedThreads.pruneStalePendingConfirmations).toHaveBeenCalledWith(now);
		expect(service.pruneExpiredThreads).toHaveBeenCalled();
		expect(service.scheduleCheckpointPrune).toHaveBeenCalledWith();
	});

	it('skips hard-deleting tombstones when the GC retention is disabled', async () => {
		const service = createCheckpointPruneService();
		service.instanceAiConfig.checkpointGcRetention = 0;

		await service.runScheduledPrune(new Date('2026-05-13T12:00:00.000Z').getTime());

		expect(service.checkpointStore.hardDeleteExpiredOlderThan).not.toHaveBeenCalled();
		// The rest of the cycle still runs.
		expect(service.checkpointStore.markExpiredOlderThan).toHaveBeenCalled();
		expect(service.scheduleCheckpointPrune).toHaveBeenCalledWith();
	});

	it('continues the prune cycle when hard-deleting tombstones fails', async () => {
		const service = createCheckpointPruneService();
		service.checkpointStore.hardDeleteExpiredOlderThan.mockRejectedValueOnce(new Error('db down'));

		await service.runScheduledPrune(new Date('2026-05-13T12:00:00.000Z').getTime());

		// A GC failure is swallowed and never forces the short retry cadence.
		expect(service.suspendedThreads.pruneStalePendingConfirmations).toHaveBeenCalled();
		expect(service.pruneExpiredThreads).toHaveBeenCalled();
		expect(service.scheduleCheckpointPrune).toHaveBeenCalledWith();
		expect(service.logger.warn).toHaveBeenCalled();
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
	clearThreadState: MockedFunction<(threadId: string) => Promise<void>>;
	memoryService: {
		cleanupExpiredThreads: MockedFunction<
			(onThreadDeleted?: (threadId: string) => Promise<void>) => Promise<number>
		>;
	};
	logger: { warn: Mock };
};

function createExpiredThreadPruneService(): ExpiredThreadPruneServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ExpiredThreadPruneServiceInternals;
	service.clearThreadState = vi.fn(async (_threadId: string) => undefined);
	service.memoryService = {
		cleanupExpiredThreads: vi.fn(async (_onThreadDeleted) => 0),
	};
	service.logger = { warn: vi.fn() };
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
	userRepository: { findOne: Mock };
	logger: { debug: Mock; warn: Mock; error: Mock };
};

function createRevalidationService(): RevalidationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as RevalidationServiceInternals;
	service.userRepository = { findOne: vi.fn() };
	service.logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
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
	) => Promise<{ ok: true; runId?: string } | null>;
	revalidateActiveUser: Mock<(...args: [string]) => Promise<User | null>>;
	cancelRun: Mock<(...args: [string]) => void>;
	runState: {
		resolvePendingConfirmation: Mock;
		getPendingConfirmation: Mock;
		getActiveRunId: Mock;
		findSuspendedByRequestId: Mock;
		rejectPendingConfirmation: Mock;
	};
	resumeSuspendedRun: Mock;
	suspendedRunRestorer: {
		resolveOrphanedConfirmation: Mock;
	};
	suspendedThreads: {
		dropPendingConfirmation: Mock;
	};
	pendingConfirmationRepo: {
		isPastExpiry: Mock<(...args: [string, string, Date]) => Promise<boolean>>;
	};
	logger: { debug: Mock; warn: Mock; error: Mock; info: Mock };
};

function createResolveConfirmationService(): ResolveConfirmationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ResolveConfirmationServiceInternals;
	service.revalidateActiveUser = vi.fn();
	service.cancelRun = vi.fn();
	service.runState = {
		resolvePendingConfirmation: vi.fn(),
		getPendingConfirmation: vi.fn(),
		getActiveRunId: vi.fn(),
		findSuspendedByRequestId: vi.fn(),
		rejectPendingConfirmation: vi.fn(),
	};
	service.pendingConfirmationRepo = {
		isPastExpiry: vi.fn(async () => false),
	};
	service.resumeSuspendedRun = vi.fn(async () => null);
	service.suspendedRunRestorer = {
		resolveOrphanedConfirmation: vi.fn(async () => null),
	};
	service.suspendedThreads = {
		dropPendingConfirmation: vi.fn(async () => {}),
	};
	service.logger = {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
	};
	return service;
}

type PlannedTaskSchedulerServiceInternals = {
	doSchedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
	revalidateActiveUser: Mock<(...args: [string]) => Promise<User | null>>;
	cancelRun: Mock;
	createPlannedTaskState: Mock;
	syncPlannedTasksToUi: Mock;
	workflowObligations: {
		findPendingPlannedWorkflowVerification: Mock;
		revalidatePlannedWorkflowVerification: Mock;
	};
	backgroundTasks: { getRunningTasks: Mock };
	startInternalFollowUpRun: Mock;
	buildPlannedTaskFollowUpMessage: Mock;
	buildWorkflowVerificationFollowUpMessage: Mock;
	runState: {
		getThreadResearchMode: Mock;
		hasLiveRun: Mock;
	};
	createPlannedTaskDispatchContext: Mock;
	dispatchPlannedTask: Mock;
	logger: { warn: Mock };
};

function createPlannedTaskSchedulerService(): {
	service: PlannedTaskSchedulerServiceInternals;
	plannedTaskService: {
		getGraph: Mock;
		tick: Mock;
		revertToActive: Mock;
		revertCheckpointToPlanned: Mock;
		revertBuildWorkflowToPlanned: Mock;
		markRunning: Mock;
		markFailed: Mock;
	};
	graph: { planRunId: string; messageGroupId: string; tasks: Array<{ id: string }> };
} {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as PlannedTaskSchedulerServiceInternals;
	const graph = { planRunId: 'plan-run-1', messageGroupId: 'group-1', tasks: [] };
	const plannedTaskService = {
		getGraph: vi.fn(async () => graph),
		tick: vi.fn(async () => ({ type: 'none' })),
		revertToActive: vi.fn(async () => {}),
		revertCheckpointToPlanned: vi.fn(async () => {}),
		revertBuildWorkflowToPlanned: vi.fn(async () => {}),
		markRunning: vi.fn(async () => {}),
		markFailed: vi.fn(async () => graph),
	};

	service.revalidateActiveUser = vi.fn();
	service.cancelRun = vi.fn();
	service.createPlannedTaskState = vi.fn(async () => ({ plannedTaskService }));
	service.syncPlannedTasksToUi = vi.fn(async () => {});
	service.workflowObligations = {
		findPendingPlannedWorkflowVerification: vi.fn(async () => undefined),
		revalidatePlannedWorkflowVerification: vi.fn(async (_threadId, verification) => verification),
	};
	service.backgroundTasks = { getRunningTasks: vi.fn(() => []) };
	service.startInternalFollowUpRun = vi.fn(async () => 'follow-up-run');
	service.buildPlannedTaskFollowUpMessage = vi.fn(() => 'follow-up message');
	service.buildWorkflowVerificationFollowUpMessage = vi.fn(() => 'workflow verification message');
	service.runState = {
		getThreadResearchMode: vi.fn(() => false),
		hasLiveRun: vi.fn(() => false),
	};
	service.createPlannedTaskDispatchContext = vi.fn(async () => ({
		plannedTaskService,
		threadId: 'thread-a',
	}));
	service.dispatchPlannedTask = vi.fn(async (task, context, _graph?) => {
		if (task.kind === 'build-workflow' || task.kind === 'checkpoint') {
			service.logger.warn('dispatchPlannedTask called for a runtime planned-task kind', {
				threadId: context.threadId,
				taskId: task.id,
				kind: task.kind,
			});
			return;
		}

		await context.plannedTaskService?.markFailed(context.threadId, task.id, {
			error: `Planned task kind "${task.kind}" is no longer supported`,
		});

		const nextGraph = await context.plannedTaskService?.getGraph(context.threadId);
		if (nextGraph) {
			await service.syncPlannedTasksToUi(context.threadId, nextGraph);
		}
	});
	service.logger = { warn: vi.fn() };

	return { service, plannedTaskService, graph };
}

type SuspendedRunResumeServiceInternals = {
	resumeSuspendedRun: (
		requestingUserId: string,
		requestId: string,
		data: {
			approved: boolean;
			autoSetup?: { credentialType: string };
			userInput?: string;
			scope?: 'once' | 'session';
			denied?: boolean;
			credentials?: Record<string, string>;
			answers?: Array<{
				questionId: string;
				selectedOptions: string[];
				customText?: string;
				skipped?: boolean;
			}>;
			action?: 'apply' | 'test-trigger';
			resourceDecision?: string;
			connectedSlugs?: string[];
		},
	) => Promise<{ ok: true; runId: string } | null>;
	revalidateActiveUser: Mock<(...args: [string]) => Promise<User | null>>;
	cancelRun: Mock;
	finalizeCancelledSuspendedRun: Mock;
	runState: {
		findSuspendedByRequestId: Mock;
		activateSuspendedRun: Mock;
		clearActiveRun: Mock;
		getActiveRun: Mock;
	};
	emitTerminalRun: Mock;
	logger: { warn: Mock; debug: Mock };
	tracing: { createOrchestratorResumeTraceContext: Mock; finalizeDetachedTraceRun: Mock };
	memoryService: { getThreadMetadata: Mock };
	processResumedStream: Mock;
	suspendedThreads: { dropPendingConfirmation: Mock };
	trackInFlightExecution: Mock;
	rebuildAgentForResume: Mock;
	threadPushRef: { get: Mock };
	browserSessionService: { getExtensionTraceContext: Mock };
};

function createSuspendedRunResumeService(): SuspendedRunResumeServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as SuspendedRunResumeServiceInternals;
	service.revalidateActiveUser = vi.fn();
	service.cancelRun = vi.fn();
	service.finalizeCancelledSuspendedRun = vi.fn(async () => {});
	service.suspendedThreads = { dropPendingConfirmation: vi.fn(async () => {}) };
	service.trackInFlightExecution = vi.fn();
	service.runState = {
		findSuspendedByRequestId: vi.fn(() => ({
			agent: {},
			runId: 'run-1',
			agentRunId: 'agent-run-1',
			threadId: 'thread-a',
			user: fakeUser,
			toolCallId: 'tool-call-1',
			toolName: 'workflows',
			suspendPayload: { workflowId: 'wf-1', setupRequests: [] },
			abortController: new AbortController(),
			tracing: undefined,
			modelId: undefined,
			messageGroupId: 'group-1',
			checkpoint: undefined,
			runHandoff: undefined,
		})),
		activateSuspendedRun: vi.fn(() => ({})),
		clearActiveRun: vi.fn(),
		getActiveRun: vi.fn(() => undefined),
	};
	service.emitTerminalRun = vi.fn(async () => {});
	service.logger = { warn: vi.fn(), debug: vi.fn() };
	service.memoryService = { getThreadMetadata: vi.fn(async () => undefined) };
	service.tracing = {
		createOrchestratorResumeTraceContext: vi.fn(async () => undefined),
		finalizeDetachedTraceRun: vi.fn(async () => {}),
	};
	service.processResumedStream = vi.fn();
	service.rebuildAgentForResume = vi.fn();
	service.threadPushRef = { get: vi.fn(() => undefined) };
	service.browserSessionService = {
		getExtensionTraceContext: vi.fn(() => ({ connectionState: 'disconnected' })),
	};
	return service;
}

describe('InstanceAiService — resolveConfirmation', () => {
	const approval = { kind: 'approval' as const, approved: true };

	it('rejects sub-agent confirmations when the user is no longer authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue(null);
		service.runState.findSuspendedByRequestId.mockReturnValue(undefined);

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toBeNull();
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

		expect(result).toBeNull();
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

		expect(result).toBeNull();
		expect(service.cancelRun).not.toHaveBeenCalled();
	});

	it('resolves the pending sub-agent confirmation when the user is still authorized', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.getPendingConfirmation.mockReturnValue({
			userId: 'user-1',
			threadId: 'thread-1',
		});
		service.runState.resolvePendingConfirmation.mockReturnValue(true);
		service.runState.getActiveRunId.mockReturnValue('run-1');

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.runState.resolvePendingConfirmation).toHaveBeenCalledWith(
			'user-1',
			'req-1',
			expect.objectContaining({ approved: true }),
		);
		expect(service.runState.rejectPendingConfirmation).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
		expect(service.suspendedThreads.dropPendingConfirmation).toHaveBeenCalledWith('req-1');
	});

	it('refuses a click on a confirmation whose row is already past its expiry', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.pendingConfirmationRepo.isPastExpiry.mockResolvedValue(true);
		// A still-present in-memory entry must not be resolved once the row expired.
		service.runState.getPendingConfirmation.mockReturnValue({
			userId: 'user-1',
			threadId: 'thread-1',
		});

		await expect(service.resolveConfirmation('user-1', 'req-1', approval)).rejects.toThrow(
			/expired/i,
		);

		expect(service.pendingConfirmationRepo.isPastExpiry).toHaveBeenCalledWith(
			'req-1',
			'user-1',
			expect.any(Date),
		);
		expect(service.runState.resolvePendingConfirmation).not.toHaveBeenCalled();
		expect(service.suspendedRunRestorer.resolveOrphanedConfirmation).not.toHaveBeenCalled();
	});

	it('resolves normally when the row is not past its expiry', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.pendingConfirmationRepo.isPastExpiry.mockResolvedValue(false);
		service.runState.getPendingConfirmation.mockReturnValue({
			userId: 'user-1',
			threadId: 'thread-1',
		});
		service.runState.resolvePendingConfirmation.mockReturnValue(true);
		service.runState.getActiveRunId.mockReturnValue('run-1');

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toEqual({ ok: true, runId: 'run-1' });
	});

	it('delegates to the orphan-restoration path when no live run resumes', async () => {
		// The detailed orphan claim/rebuild/finalize scenarios live in
		// suspended-run-restorer.service.test.ts; here we only assert the
		// fallthrough wiring once in-memory resolution + resume both miss.
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.getPendingConfirmation.mockReturnValue(undefined);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(null);
		service.suspendedRunRestorer.resolveOrphanedConfirmation.mockResolvedValue({
			ok: true,
			runId: 'run-1',
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toEqual({
			ok: true,
			runId: 'run-1',
		});
		expect(service.suspendedRunRestorer.resolveOrphanedConfirmation).toHaveBeenCalledWith(
			'user-1',
			'req-1',
			expect.objectContaining({ approved: true }),
		);
	});

	it('propagates the terminal UserError thrown by the orphan-restoration path', async () => {
		const service = createResolveConfirmationService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1' } as unknown as User);
		service.runState.getPendingConfirmation.mockReturnValue(undefined);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue(null);
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
		service.runState.getPendingConfirmation.mockReturnValue(undefined);
		service.runState.resolvePendingConfirmation.mockReturnValue(false);
		service.resumeSuspendedRun.mockResolvedValue({
			ok: true,
			runId: 'run-1',
		});

		const result = await service.resolveConfirmation('user-1', 'req-1', approval);

		expect(result).toEqual({
			ok: true,
			runId: 'run-1',
		});
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

	it('marks unsupported planned dispatch tasks as failed and continues scheduling', async () => {
		const { service, plannedTaskService, graph } = createPlannedTaskSchedulerService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const legacyTask = {
			id: 'legacy-1',
			title: 'Legacy task',
			kind: 'delegate',
			spec: 'Do the research',
			deps: [],
			status: 'planned',
		};
		graph.tasks = [legacyTask];
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		plannedTaskService.tick
			.mockResolvedValueOnce({
				type: 'dispatch',
				graph,
				tasks: [legacyTask],
			})
			.mockResolvedValueOnce({ type: 'none', graph });

		await service.doSchedulePlannedTasks(fakeUser, 'thread-a');

		expect(service.createPlannedTaskDispatchContext).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			graph,
		);
		expect(plannedTaskService.markFailed).toHaveBeenCalledWith(
			'thread-a',
			'legacy-1',
			expect.objectContaining({
				error: expect.stringContaining('no longer supported'),
			}),
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

		expect(result).toBeNull();
		expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
		expect(service.runState.activateSuspendedRun).not.toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Cancelling suspended run: user no longer authorized for AI Assistant',
			expect.objectContaining({ userId: 'user-1', threadId: 'thread-a', requestId: 'req-1' }),
		);
	});

	it('stamps the browser extension dimensions on the approval-resume trace', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue(fakeUser);
		service.browserSessionService.getExtensionTraceContext.mockReturnValue({
			connectionState: 'connected',
			version: '0.0.7',
		});

		await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(service.tracing.createOrchestratorResumeTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				browserExtension: { connectionState: 'connected', version: '0.0.7' },
			}),
		);
	});

	it('stamps the thread provenance on the approval-resume trace', async () => {
		// The build finishes on a RESUME beat, so this is where an eval build's
		// spans actually live — stamping only the message turn would leave them
		// unattributable, which is the whole point of carrying provenance.
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue(fakeUser);
		const threadMetadata = {
			source: 'evals',
			sourceContext: { evalCase: 'gmail-inbox-triage', evalIteration: 1 },
		};
		service.memoryService.getThreadMetadata.mockResolvedValue(threadMetadata);

		await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(threadProvenanceMetadata).toHaveBeenCalledWith(threadMetadata);
		expect(service.tracing.createOrchestratorResumeTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ thread_source: 'evals' }),
			}),
		);
	});

	it('resumes even when the thread provenance read fails', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue(fakeUser);
		service.memoryService.getThreadMetadata.mockRejectedValue(new Error('db down'));

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.tracing.createOrchestratorResumeTraceContext).toHaveBeenCalled();
	});

	it('passes the revalidated user into the resumed stream', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toEqual({
			ok: true,
			runId: 'run-1',
		});
		expect(service.runState.activateSuspendedRun).toHaveBeenCalledWith(
			'thread-a',
			expect.anything(),
		);
		expect(service.processResumedStream).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ approved: true }),
			expect.objectContaining({
				user: freshUser,
				toolName: 'workflows',
				suspendPayload: { workflowId: 'wf-1', setupRequests: [] },
			}),
		);
	});

	it('treats a resume already activated on this main as idempotently handled', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);
		service.runState.activateSuspendedRun.mockReturnValue(undefined);

		await expect(
			service.resumeSuspendedRun('user-1', 'req-1', { approved: true }),
		).resolves.toEqual({ ok: true, runId: 'run-1' });

		expect(service.tracing.createOrchestratorResumeTraceContext).not.toHaveBeenCalled();
		expect(service.suspendedThreads.dropPendingConfirmation).not.toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
	});

	it('defers resume trace registration and orchestration rebinding until the claim succeeds', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const staleTracing = { id: 'stale-trace' };
		const resumeTracing = { id: 'resume-trace' };
		const orchestrationContext = { tracing: staleTracing };
		service.runState.findSuspendedByRequestId.mockReturnValue({
			agent: {},
			runId: 'run-1',
			agentRunId: 'agent-run-1',
			threadId: 'thread-a',
			user: fakeUser,
			toolCallId: 'tool-call-1',
			toolName: 'workflows',
			suspendPayload: { workflowId: 'wf-1', setupRequests: [] },
			abortController: new AbortController(),
			tracing: staleTracing,
			modelId: undefined,
			messageGroupId: 'group-1',
			checkpoint: undefined,
			runHandoff: undefined,
			orchestrationContext,
		});
		service.tracing.createOrchestratorResumeTraceContext.mockResolvedValue(resumeTracing);

		await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(orchestrationContext.tracing).toBe(staleTracing);
		expect(service.tracing.createOrchestratorResumeTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({ register: false }),
		);
		expect(service.processResumedStream).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ approved: true }),
			expect.objectContaining({
				orchestrationContext,
				tracing: resumeTracing,
				resumeTracing,
				unregisteredResumeTracing: resumeTracing,
				messageGroupId: 'group-1',
			}),
		);
	});

	it('rebuilds the agent when autoSetup is set, and resumes with the rebuilt one', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const rebuiltAgent = { id: 'rebuilt-agent' };
		service.rebuildAgentForResume.mockResolvedValue({
			agent: rebuiltAgent,
			modelId: { provider: 'anthropic', model: 'claude' },
		});

		const result = await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			autoSetup: { credentialType: 'datadogApi' },
		});

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.rebuildAgentForResume).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'run-1',
			expect.any(AbortController),
			undefined,
			undefined,
			'group-1',
		);
		expect(service.processResumedStream).toHaveBeenCalledWith(
			rebuiltAgent,
			expect.objectContaining({ autoSetup: { credentialType: 'datadogApi' } }),
			expect.objectContaining({ modelId: { provider: 'anthropic', model: 'claude' } }),
		);
		const [, resumeDataArg] = service.processResumedStream.mock.calls[0] as [unknown, object];
		expect(resumeDataArg).not.toHaveProperty('requiresAgentRebuild');
	});

	it('fails the resume and cancels the run when the rebuild fails', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		const resumeTracing = { id: 'resume-trace' } as unknown as InstanceAiTraceContext;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		service.tracing.createOrchestratorResumeTraceContext.mockResolvedValue(resumeTracing);
		service.rebuildAgentForResume.mockResolvedValue(undefined);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			autoSetup: { credentialType: 'datadogApi' },
		});

		expect(result).toBeNull();
		expect(service.tracing.finalizeDetachedTraceRun).toHaveBeenCalledWith(
			'resume-rebuild:run-1',
			resumeTracing,
			{
				status: 'failed',
				error: 'Agent rebuild failed',
				metadata: { completion_source: 'resume_rebuild' },
			},
		);
		expect(service.cancelRun).toHaveBeenCalledWith('thread-a', 'agent_rebuild_failed');
		expect(service.emitTerminalRun).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-a',
				runId: 'run-1',
				status: 'errored',
				errorInfo: { errorMessage: 'Agent rebuild failed', errorSource: 'exception' },
			}),
		);
		expect(service.runState.clearActiveRun).toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
	});

	it('does not rebuild the agent for a plain resume without autoSetup', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.rebuildAgentForResume).not.toHaveBeenCalled();
	});

	it('threads the connected MCP slugs into the resume data', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);
		service.rebuildAgentForResume.mockResolvedValue({ agent: {}, modelId: undefined });

		await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			connectedSlugs: ['brave'],
		});

		const [options] = service.tracing.createOrchestratorResumeTraceContext.mock.calls[0] as [
			{ input: { resumeFields: string[] } },
		];
		expect(options.input.resumeFields).toContain('connectedSlugs');
		expect(service.processResumedStream).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ connectedSlugs: ['brave'] }),
			expect.any(Object),
		);
	});

	it('rebuilds the agent when the resume reports a newly connected MCP server', async () => {
		const service = createSuspendedRunResumeService();
		const freshUser = { id: 'user-1', disabled: false } as User;
		service.revalidateActiveUser.mockResolvedValue(freshUser);
		const rebuiltAgent = { id: 'rebuilt-agent' };
		service.rebuildAgentForResume.mockResolvedValue({
			agent: rebuiltAgent,
			modelId: { provider: 'anthropic', model: 'claude' },
		});

		const result = await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			connectedSlugs: ['notion'],
		});

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.rebuildAgentForResume).toHaveBeenCalledWith(
			freshUser,
			'thread-a',
			'run-1',
			expect.any(AbortController),
			undefined,
			undefined,
			'group-1',
		);
		expect(service.processResumedStream).toHaveBeenCalledWith(
			rebuiltAgent,
			expect.objectContaining({ connectedSlugs: ['notion'] }),
			expect.any(Object),
		);
	});

	it('does not rebuild the agent when the connect card reports no new connection', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);

		const result = await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: false,
			connectedSlugs: [],
		});

		expect(result).toEqual({ ok: true, runId: 'run-1' });
		expect(service.rebuildAgentForResume).not.toHaveBeenCalled();
		expect(service.processResumedStream).toHaveBeenCalled();
	});

	it('rebuilds the agent so the tools of a just-connected server reach the run', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);
		service.rebuildAgentForResume.mockResolvedValue({
			agent: { id: 'rebuilt-agent' },
			modelId: { provider: 'anthropic', model: 'claude' },
		});

		await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			connectedSlugs: ['linear'],
		});

		expect(service.rebuildAgentForResume).toHaveBeenCalled();
	});

	it('includes the substantive user response in the resume trace input', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);

		await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			userInput: 'Use the #alerts channel',
			credentials: { slackApi: 'cred-1' },
			answers: [{ questionId: 'q1', selectedOptions: ['Slack'], customText: 'prefer DMs' }],
		});

		expect(service.tracing.createOrchestratorResumeTraceContext).toHaveBeenCalledTimes(1);
		const [options] = service.tracing.createOrchestratorResumeTraceContext.mock.calls[0] as [
			{ input: object; register?: boolean },
		];
		expect(options.register).toBe(false);
		expect(options.input).toMatchObject({
			requestId: 'req-1',
			toolCallId: 'tool-call-1',
			approved: true,
			userInput: 'Use the #alerts channel',
			answers: [{ questionId: 'q1', selectedOptions: ['Slack'], customText: 'prefer DMs' }],
		});
		expect(options.input).not.toHaveProperty('credentials');
		expect((options.input as { resumeFields: string[] }).resumeFields).toContain('credentials');
	});

	it('forwards approval envelope fields (userInput, scope) into resumeData', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);

		await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: true,
			userInput: 'rename it first',
			scope: 'session',
		});

		const [, resumeDataArg] = service.processResumedStream.mock.calls[0] as [
			unknown,
			Record<string, unknown>,
		];
		expect(resumeDataArg).toEqual({
			approved: true,
			userInput: 'rename it first',
			scope: 'session',
		});
	});

	it('forwards planDeny denied flag into resumeData', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);

		await service.resumeSuspendedRun('user-1', 'req-1', {
			approved: false,
			denied: true,
		});

		const [, resumeDataArg] = service.processResumedStream.mock.calls[0] as [
			unknown,
			Record<string, unknown>,
		];
		expect(resumeDataArg).toEqual({
			approved: false,
			denied: true,
		});
	});
});

describe('InstanceAiService — stale confirmation resume guard', () => {
	it('rejects a suspended-run confirmation when the thread already has an active run', async () => {
		const service = createSuspendedRunResumeService();
		service.revalidateActiveUser.mockResolvedValue({ id: 'user-1', disabled: false } as User);
		service.runState.getActiveRun.mockReturnValue({ runId: 'run-2' });

		const result = await service.resumeSuspendedRun('user-1', 'req-1', { approved: true });

		expect(result).toBeNull();
		expect(service.runState.activateSuspendedRun).not.toHaveBeenCalled();
		expect(service.suspendedThreads.dropPendingConfirmation).not.toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
		expect(service.cancelRun).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — rebuildAgentForResume', () => {
	type RebuildAgentServiceInternals = {
		rebuildAgentForResume: (
			user: User,
			threadId: string,
			runId: string,
			abortController: AbortController,
			tracing: InstanceAiTraceContext | undefined,
			runHandoff: { handoffReason?: string } | undefined,
			messageGroupId?: string,
		) => Promise<{ agent: unknown; modelId?: unknown } | undefined>;
		buildFreshInstanceAgent: Mock;
		threadPushRef: { get: Mock };
		logger: { warn: Mock };
	};

	function createRebuildAgentService(): RebuildAgentServiceInternals {
		const service = Object.create(
			InstanceAiService.prototype,
		) as unknown as RebuildAgentServiceInternals;
		service.buildFreshInstanceAgent = vi.fn();
		service.threadPushRef = { get: vi.fn(() => undefined) };
		service.logger = { warn: vi.fn() };
		return service;
	}

	it('reconnects the rebuilt context to the existing runHandoff state', async () => {
		const service = createRebuildAgentService();
		const orchestrationContext = {};
		const rebuiltAgent = { id: 'rebuilt-agent' };
		service.buildFreshInstanceAgent.mockResolvedValue({
			agent: rebuiltAgent,
			modelId: { provider: 'anthropic', model: 'claude' },
			orchestrationContext,
		});
		const runHandoff = { handoffReason: undefined };

		const result = await service.rebuildAgentForResume(
			fakeUser,
			'thread-a',
			'run-1',
			new AbortController(),
			undefined,
			runHandoff,
			'group-1',
		);

		expect(result).toEqual({
			agent: rebuiltAgent,
			modelId: { provider: 'anthropic', model: 'claude' },
			orchestrationContext,
		});
		expect(createOrchestratorRunControl).toHaveBeenCalledWith(orchestrationContext, runHandoff);
	});

	it('defaults to an empty handoff state when the run never had one', async () => {
		const service = createRebuildAgentService();
		const orchestrationContext = {};
		service.buildFreshInstanceAgent.mockResolvedValue({
			agent: {},
			modelId: { provider: 'anthropic', model: 'claude' },
			orchestrationContext,
		});

		await service.rebuildAgentForResume(
			fakeUser,
			'thread-a',
			'run-1',
			new AbortController(),
			undefined,
			undefined,
			'group-1',
		);

		expect(createOrchestratorRunControl).toHaveBeenCalledWith(orchestrationContext, {});
	});

	it('returns undefined and logs a warning when the rebuild throws', async () => {
		const service = createRebuildAgentService();
		service.buildFreshInstanceAgent.mockRejectedValue(new Error('boom'));

		const result = await service.rebuildAgentForResume(
			fakeUser,
			'thread-a',
			'run-1',
			new AbortController(),
			undefined,
			undefined,
			'group-1',
		);

		expect(result).toBeUndefined();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to rebuild agent for resume',
			expect.objectContaining({ threadId: 'thread-a', runId: 'run-1' }),
		);
	});
});

describe('InstanceAiService — terminal response guard wiring', () => {
	beforeEach(() => {
		vi.mocked(resumeAgentRun).mockReset();
	});

	it('persists the resumed-run fallback error before cleanup', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		vi.mocked(resumeAgentRun).mockImplementationOnce(async (_agent, _data, resumeOptions) => {
			const onResumeClaimed = resumeOptions.onResumeClaimed;
			if (typeof onResumeClaimed === 'function') await onResumeClaimed();
			throw new Error('provider failed');
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
			},
		);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		// Thrown run-loop errors must reach telemetry too, not just the SSE stream
		expect(service.telemetry.track).toHaveBeenCalledWith('instance_ai_run_finished', {
			thread_id: 'thread-a',
			run_id: 'run-1',
			status: 'error',
			user_id: 'user-1',
		});
		expect(service.telemetry.track).toHaveBeenCalledWith('Builder generation errored', {
			thread_id: 'thread-a',
			run_id: 'run-1',
			error_message: 'provider failed',
			error_source: 'exception',
			user_id: 'user-1',
		});
	});

	it('terminates the run visibly when a resume fails before the claim', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const resumeExecutionToken = Symbol('resume-token');
		vi.mocked(resumeAgentRun).mockImplementationOnce(async () => {
			throw new Error('Invalid resume payload: data must NOT have additional properties');
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
				resumeExecutionToken,
			},
		);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ component: 'instance-ai-resume-claim' }),
		);
		expect(service.runState.clearActiveRun).toHaveBeenCalledWith('thread-a', resumeExecutionToken);
	});

	it('stays silent when the pre-claim failure is a stale resume owned elsewhere', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const resumeExecutionToken = Symbol('resume-token');
		vi.mocked(resumeAgentRun).mockImplementationOnce(async () => {
			throw Object.assign(new Error('Run agent-run-1 is not suspended. Cannot resume.'), {
				name: 'StaleResumeError',
			});
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
				resumeExecutionToken,
			},
		);

		expect(service.eventBus.events).toEqual([]);
		expect(service.instanceAiErrorReporter.report).not.toHaveBeenCalled();
		expect(service.runState.clearActiveRun).toHaveBeenCalledWith('thread-a', resumeExecutionToken);
	});

	it('tracks "Builder generation errored" when a resumed stream reports an error', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'errored',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			error: new Error('model overloaded'),
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
			},
		);

		expect(service.telemetry.track).toHaveBeenCalledWith('Builder generation errored', {
			thread_id: 'thread-a',
			run_id: 'run-1',
			error_message: 'model overloaded',
			error_source: 'stream',
			user_id: 'user-1',
		});
	});

	it('scrubs secrets from the "Builder generation errored" message', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'errored',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			error: new Error(
				'provider rejected key sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
			),
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
			},
		);

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Builder generation errored',
			expect.objectContaining({
				error_message: 'provider rejected key [REDACTED]',
			}),
		);
	});

	it('claims credits when a resumed run completes', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
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

	it('tracks browser credential setup outcome per attempt when the run finishes', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});
		service.pendingBrowserCredentialSetups.set('run-1', {
			userId: 'user-1',
			attempts: [
				{
					credentialType: 'slackApi',
					setupMethod: 'setup_card' as const,
					attemptId: 'attempt-1',
					startedAt: 1000,
					created: true,
				},
				{
					credentialType: 'notionApi',
					setupMethod: 'setup_card' as const,
					attemptId: 'attempt-2',
					startedAt: 2000,
					created: false,
					errorCode: 'missing_captured_fields',
				},
				{
					credentialType: 'githubApi',
					setupMethod: 'setup_card' as const,
					startedAt: 3000,
					created: false,
				},
			],
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
			},
		);

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			{
				user_id: 'user-1',
				credential_type: 'slackApi',
				status: 'success',
				is_valid: null,
				is_new: true,
				setup_method: 'setup_card',
				thread_id: 'thread-a',
				run_id: 'run-1',
				credential_setup_attempt_id: 'attempt-1',
				duration_ms: expect.any(Number),
			},
		);
		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			{
				user_id: 'user-1',
				credential_type: 'notionApi',
				status: 'failure',
				failure_stage: 'generation',
				error_code: 'missing_captured_fields',
				is_valid: null,
				is_new: true,
				setup_method: 'setup_card',
				thread_id: 'thread-a',
				run_id: 'run-1',
				credential_setup_attempt_id: 'attempt-2',
				duration_ms: expect.any(Number),
			},
		);
		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			{
				user_id: 'user-1',
				credential_type: 'githubApi',
				status: 'failure',
				failure_stage: 'unknown',
				error_code: 'not_attempted',
				is_valid: null,
				is_new: true,
				setup_method: 'setup_card',
				thread_id: 'thread-a',
				run_id: 'run-1',
				duration_ms: expect.any(Number),
			},
		);
		expect(service.pendingBrowserCredentialSetups.size).toBe(0);
	});

	it('reports the run termination as error code when the user stops a pending credential setup', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'cancelled',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});
		service.pendingBrowserCredentialSetups.set('run-1', {
			userId: 'user-1',
			attempts: [
				{
					credentialType: 'slackApi',
					setupMethod: 'setup_card' as const,
					startedAt: 1000,
					created: false,
				},
			],
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
			},
		);

		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			expect.objectContaining({
				credential_type: 'slackApi',
				status: 'failure',
				failure_stage: 'unknown',
				error_code: 'run_cancelled',
			}),
		);
	});

	it('tracks a conversation-driven attempt when the LLM creates a credential without a setup card', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		const tracker = service.createBrowserCredentialSetupTracker('run-1', 'user-1');
		// No markPending — the user asked in chat, no setup card was shown.
		tracker.markCreateFailed('slackApi', 'missing_captured_fields');
		tracker.markCreated('slackApi');
		tracker.markCreateFailed('notionApi', 'credential_create_failed');

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
			},
		);

		// The failed-then-retried slack attempt resolves as one success.
		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			expect.objectContaining({
				user_id: 'user-1',
				credential_type: 'slackApi',
				status: 'success',
				setup_method: 'conversation',
			}),
		);
		expect(service.telemetry.track).toHaveBeenCalledWith(
			'Instance AI Browser Use credential setup completed',
			expect.objectContaining({
				credential_type: 'notionApi',
				status: 'failure',
				failure_stage: 'persistence',
				error_code: 'credential_create_failed',
				setup_method: 'conversation',
			}),
		);
		const setupEvents = service.telemetry.track.mock.calls.filter(
			([eventName]) => eventName === 'Instance AI Browser Use credential setup completed',
		);
		expect(setupEvents).toHaveLength(2);
	});

	it('claims credits for the consumed segment when a resumed run suspends again', async () => {
		const service = createTerminalGuardOrderService();
		vi.spyOn(service.terminalOutcome, 'evaluateWaitingResponse').mockResolvedValue(undefined);
		const abortController = new AbortController();
		const usageItem = {
			type: 'llmTokens' as const,
			model: 'claude',
			uncachedInput: 10,
			cacheRead: 0,
			cacheWrite: 0,
			output: 5,
		};
		mockClaimedResumeResult({
			status: 'suspended',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			usage: {
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				costUsd: 0,
				usage: [usageItem],
			},
			suspension: { toolCallId: 'tool-call-1', requestId: 'req-1', suspendPayload: {} },
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
			},
		);

		// Every segment of a HITL run shares one agentRunId, so the suspension claim
		// must use a per-suspension dedupeId (agentRunId + requestId) to avoid
		// colliding with the terminal claim (bare agentRunId).
		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			'agent-run-1:req-1',
			[usageItem],
			'suspended',
		);
	});

	it('surfaces the user-facing suspend message in the suspension trace outputs', async () => {
		const service = createTerminalGuardOrderService();
		vi.spyOn(service.terminalOutcome, 'evaluateWaitingResponse').mockResolvedValue(undefined);
		const abortController = new AbortController();
		const tracing = {
			actorRun: { id: 'segment-a-actor' },
			withActiveSpan: vi.fn(
				async (_run: unknown, callback: () => Promise<unknown>) => await callback(),
			),
		} as unknown as InstanceAiTraceContext;
		mockClaimedResumeResult({
			status: 'suspended',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			suspension: {
				toolCallId: 'tool-call-1',
				requestId: 'req-1',
				toolName: 'ask-user',
				suspendPayload: { requestId: 'req-1', message: 'Set up the slack channel' },
			},
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
				tracing,
			},
		);

		expect(service.tracing.finalizeRunTracing).toHaveBeenCalledWith(
			'run-1',
			tracing,
			expect.objectContaining({
				status: 'suspended',
				outputs: expect.objectContaining({
					message: 'Set up the slack channel',
					pendingToolCallId: 'tool-call-1',
					toolName: 'ask-user',
					requestId: 'req-1',
				}),
			}),
		);
		expect(service.tracing.finalizeMessageTraceRoot).toHaveBeenCalledWith(
			'run-1',
			tracing,
			expect.objectContaining({
				status: 'suspended',
				outputs: expect.objectContaining({ message: 'Set up the slack channel' }),
			}),
		);
	});

	it('keeps a suspending segment from finalizing or scheduling over a fast next segment', async () => {
		const service = createTerminalGuardOrderService();
		vi.spyOn(service.terminalOutcome, 'evaluateWaitingResponse').mockResolvedValue(undefined);
		service.runState.hasSuspendedRun.mockReturnValue(false);
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {});
		const abortController = new AbortController();
		const segmentATracing = {
			actorRun: { id: 'segment-a-actor' },
			withActiveSpan: vi.fn(
				async (_run: unknown, callback: () => Promise<unknown>) => await callback(),
			),
		} as unknown as InstanceAiTraceContext;
		const segmentBTracing = {
			actorRun: { id: 'segment-b-actor' },
		} as unknown as InstanceAiTraceContext;
		service.tracing.finalizeRunTracing.mockImplementationOnce(async () => {
			// The next approval can register its trace immediately after the
			// confirmation is published, before this segment reaches finally.
			service.tracing.registerTraceContext('run-1', 'thread-a', segmentBTracing, 'group-1');
		});
		mockClaimedResumeResult({
			status: 'suspended',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			suspension: {
				toolCallId: 'tool-call-2',
				requestId: 'req-2',
				toolName: 'ask-user',
				suspendPayload: { message: 'Confirm the next step' },
			},
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
				tracing: segmentATracing,
			},
		);

		expect(service.tracing.finalizeMessageTraceRoot).toHaveBeenCalledWith(
			'run-1',
			segmentATracing,
			expect.objectContaining({ status: 'suspended' }),
		);
		expect(service.tracing.maybeFinalizeRunTraceRoot).not.toHaveBeenCalled();
		expect(service.liveness.consumeRunTimeout).not.toHaveBeenCalled();
		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.drainPendingCheckpointReentries).not.toHaveBeenCalled();
		expect(service.taskProjector.syncFromWorkflowLoop).not.toHaveBeenCalled();
		expect(service.maybeStartWorkflowSetupFollowUp).not.toHaveBeenCalled();
	});

	it('bills each segment once under disjoint keys across suspend -> resume -> continue', async () => {
		const service = createTerminalGuardOrderService();
		vi.spyOn(service.terminalOutcome, 'evaluateWaitingResponse').mockResolvedValue(undefined);
		const abortController = new AbortController();
		const segmentOneUsage = {
			type: 'llmTokens' as const,
			model: 'claude',
			uncachedInput: 10,
			cacheRead: 0,
			cacheWrite: 0,
			output: 5,
		};
		const segmentTwoUsage = {
			type: 'llmTokens' as const,
			model: 'claude',
			uncachedInput: 20,
			cacheRead: 3,
			cacheWrite: 0,
			output: 8,
		};
		const resumeOpts = {
			runId: 'run-1',
			agentRunId: 'agent-run-1',
			threadId: 'thread-a',
			user: fakeUser,
			toolCallId: 'tool-call-1',
			signal: abortController.signal,
			abortController,
		};

		// Segment A: the resumed run suspends again on HITL.
		mockClaimedResumeResult({
			status: 'suspended',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			usage: {
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				costUsd: 0,
				usage: [segmentOneUsage],
			},
			suspension: { toolCallId: 'tool-call-1', requestId: 'req-1', suspendPayload: {} },
		});
		await service.processResumedStream({}, {}, resumeOpts);

		// Segment B: the user continues and the run completes.
		mockClaimedResumeResult({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			usage: {
				promptTokens: 20,
				completionTokens: 8,
				totalTokens: 28,
				costUsd: 0,
				usage: [segmentTwoUsage],
			},
		});
		await service.processResumedStream({}, {}, resumeOpts);

		// Both segments share one agentRunId; the suspension bills under the
		// per-suspension key and the completion under the bare key, so the two
		// claims never dedupe against each other and no tokens are double-billed.
		expect(service.creditService.claimRunUsage).toHaveBeenCalledTimes(2);
		expect(service.creditService.claimRunUsage).toHaveBeenNthCalledWith(
			1,
			fakeUser,
			'thread-a',
			'agent-run-1:req-1',
			[segmentOneUsage],
			'suspended',
		);
		expect(service.creditService.claimRunUsage).toHaveBeenNthCalledWith(
			2,
			fakeUser,
			'thread-a',
			'agent-run-1',
			[segmentTwoUsage],
			'completed',
		);
	});

	it('bills each segment once under disjoint keys across suspend -> resume -> abort', async () => {
		const service = createTerminalGuardOrderService();
		vi.spyOn(service.terminalOutcome, 'evaluateWaitingResponse').mockResolvedValue(undefined);
		const abortController = new AbortController();
		const segmentOneUsage = {
			type: 'llmTokens' as const,
			model: 'claude',
			uncachedInput: 10,
			cacheRead: 0,
			cacheWrite: 0,
			output: 5,
		};
		const segmentTwoUsage = {
			type: 'llmTokens' as const,
			model: 'claude',
			uncachedInput: 20,
			cacheRead: 3,
			cacheWrite: 0,
			output: 8,
		};
		const resumeOpts = {
			runId: 'run-1',
			agentRunId: 'agent-run-1',
			threadId: 'thread-a',
			user: fakeUser,
			toolCallId: 'tool-call-1',
			signal: abortController.signal,
			abortController,
		};

		// Segment A: the resumed run suspends again on HITL.
		mockClaimedResumeResult({
			status: 'suspended',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			usage: {
				promptTokens: 10,
				completionTokens: 5,
				totalTokens: 15,
				costUsd: 0,
				usage: [segmentOneUsage],
			},
			suspension: { toolCallId: 'tool-call-1', requestId: 'req-1', suspendPayload: {} },
		});
		await service.processResumedStream({}, {}, resumeOpts);

		// Segment B: the user continues, then stops mid-generation. The abort path
		// recovers the tokens consumed so far and reports a cancelled terminal.
		mockClaimedResumeResult({
			status: 'cancelled',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
			usage: {
				promptTokens: 20,
				completionTokens: 8,
				totalTokens: 28,
				costUsd: 0,
				usage: [segmentTwoUsage],
			},
		});
		await service.processResumedStream({}, {}, resumeOpts);

		// A user stop is not a shutdown, so the cancelled segment still bills — under
		// the bare agentRunId, disjoint from the earlier suspension claim.
		expect(service.creditService.claimRunUsage).toHaveBeenCalledTimes(2);
		expect(service.creditService.claimRunUsage).toHaveBeenNthCalledWith(
			1,
			fakeUser,
			'thread-a',
			'agent-run-1:req-1',
			[segmentOneUsage],
			'suspended',
		);
		expect(service.creditService.claimRunUsage).toHaveBeenNthCalledWith(
			2,
			fakeUser,
			'thread-a',
			'agent-run-1',
			[segmentTwoUsage],
			'cancelled',
		);
	});

	it('rebinds resumed agents to resume trace telemetry', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const telemetry = { enabled: true };
		const agent = { telemetry: vi.fn() };
		const tracing = {
			traceKind: 'orchestrator_resume',
			actorRun: { id: 'actor-run' },
			getTelemetry: vi.fn(() => telemetry),
			withActiveSpan: vi.fn(async (_run: unknown, fn: () => Promise<unknown>) => await fn()),
		} as unknown as InstanceAiTraceContext;
		mockClaimedResumeResult({
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
				tracing,
			},
		);

		expect(tracing.getTelemetry).toHaveBeenCalledWith({
			agentRole: 'orchestrator',
			functionId: 'instance-ai.orchestrator',
			executionMode: 'resume',
		});
		expect(agent.telemetry).toHaveBeenCalledWith(telemetry);
		expect(agent.telemetry.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(resumeAgentRun).mock.invocationCallOrder[0],
		);
		expect(tracing.withActiveSpan).toHaveBeenCalledWith(tracing.actorRun, expect.any(Function));
	});
});

describe('InstanceAiService — emitBrowserCredentialSetupOutcomes', () => {
	const CREDENTIAL_SETUP_EVENT = 'Instance AI Browser Use credential setup completed';

	function seedAttempts(
		service: TerminalGuardOrderServiceInternals,
		attempts: Array<{
			credentialType: string;
			setupMethod: 'setup_card' | 'conversation';
			attemptId?: string;
			startedAt: number;
			created: boolean;
			errorCode?: string;
		}>,
	) {
		service.pendingBrowserCredentialSetups.set('run-1', { userId: 'user-1', attempts });
	}

	it('emits nothing when the run has no pending setups', () => {
		const service = createTerminalGuardOrderService();

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');

		expect(service.telemetry.track).not.toHaveBeenCalled();
	});

	it('emits one event per attempt and consumes the record', () => {
		const service = createTerminalGuardOrderService();
		seedAttempts(service, [
			{
				credentialType: 'slackApi',
				setupMethod: 'setup_card',
				attemptId: 'attempt-1',
				startedAt: 1000,
				created: true,
			},
			{
				credentialType: 'notionApi',
				setupMethod: 'conversation',
				startedAt: 2000,
				created: false,
				errorCode: 'unresolved_field',
			},
		]);

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');

		expect(service.telemetry.track).toHaveBeenCalledTimes(2);
		expect(service.telemetry.track).toHaveBeenCalledWith(CREDENTIAL_SETUP_EVENT, {
			user_id: 'user-1',
			credential_type: 'slackApi',
			status: 'success',
			is_valid: null,
			is_new: true,
			setup_method: 'setup_card',
			thread_id: 'thread-a',
			run_id: 'run-1',
			credential_setup_attempt_id: 'attempt-1',
			duration_ms: expect.any(Number),
		});
		expect(service.telemetry.track).toHaveBeenCalledWith(CREDENTIAL_SETUP_EVENT, {
			user_id: 'user-1',
			credential_type: 'notionApi',
			status: 'failure',
			failure_stage: 'generation',
			error_code: 'unresolved_field',
			is_valid: null,
			is_new: true,
			setup_method: 'conversation',
			thread_id: 'thread-a',
			run_id: 'run-1',
			duration_ms: expect.any(Number),
		});
		expect(service.pendingBrowserCredentialSetups.size).toBe(0);

		service.telemetry.track.mockClear();
		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'completed');
		expect(service.telemetry.track).not.toHaveBeenCalled();
	});

	it.each([
		['completed', undefined, 'not_attempted'],
		['cancelled', undefined, 'run_cancelled'],
		['cancelled', 'timeout', 'run_timed_out'],
		['errored', 'stream_error', 'run_errored'],
	] as const)(
		'maps a %s run (reason %s) without flow error to error code %s',
		(runStatus, reason, errorCode) => {
			const service = createTerminalGuardOrderService();
			seedAttempts(service, [
				{ credentialType: 'slackApi', setupMethod: 'setup_card', startedAt: 1000, created: false },
			]);

			service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', runStatus, reason);

			expect(service.telemetry.track).toHaveBeenCalledWith(
				CREDENTIAL_SETUP_EVENT,
				expect.objectContaining({
					status: 'failure',
					failure_stage: 'unknown',
					error_code: errorCode,
				}),
			);
		},
	);

	it('prefers the flow error code over the run termination code', () => {
		const service = createTerminalGuardOrderService();
		seedAttempts(service, [
			{
				credentialType: 'slackApi',
				setupMethod: 'setup_card',
				startedAt: 1000,
				created: false,
				errorCode: 'missing_captured_fields',
			},
		]);

		service.emitBrowserCredentialSetupOutcomes('thread-a', 'run-1', 'cancelled');

		expect(service.telemetry.track).toHaveBeenCalledWith(
			CREDENTIAL_SETUP_EVENT,
			expect.objectContaining({
				failure_stage: 'generation',
				error_code: 'missing_captured_fields',
			}),
		);
	});

	it('is invoked by publishRunFinish with the run status and reason', () => {
		const service = createTerminalGuardOrderService();
		seedAttempts(service, [
			{ credentialType: 'slackApi', setupMethod: 'setup_card', startedAt: 1000, created: false },
		]);

		service.publishRunFinish('thread-a', 'run-1', 'cancelled', 'timeout');

		expect(service.telemetry.track).toHaveBeenCalledWith(
			CREDENTIAL_SETUP_EVENT,
			expect.objectContaining({
				credential_type: 'slackApi',
				status: 'failure',
				error_code: 'run_timed_out',
			}),
		);
		expect(service.pendingBrowserCredentialSetups.size).toBe(0);
	});
});

describe('InstanceAiService — run error reporter lifecycle', () => {
	const resumedStreamOpts = (abortController: AbortController) => ({
		runId: 'run-1',
		agentRunId: 'agent-run-1',
		threadId: 'thread-a',
		user: fakeUser,
		toolCallId: 'tool-call-1',
		signal: abortController.signal,
		abortController,
		resumeExecutionToken: Symbol('resume-execution'),
	});

	beforeEach(() => {
		vi.mocked(resumeAgentRun).mockReset();
	});

	it('pairs beginRun/endRun when a resumed stream errors', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		vi.mocked(resumeAgentRun).mockImplementationOnce(async (_agent, _data, resumeOptions) => {
			const onResumeClaimed = resumeOptions.onResumeClaimed;
			if (typeof onResumeClaimed === 'function') await onResumeClaimed();
			throw new Error('provider failed');
		});

		await service.processResumedStream({}, {}, resumedStreamOpts(abortController));

		expect(service.instanceAiErrorReporter.beginRun).toHaveBeenCalledTimes(1);
		expect(service.instanceAiErrorReporter.beginRun).toHaveBeenCalledWith('run-1');
		expect(service.instanceAiErrorReporter.endRun).toHaveBeenCalledTimes(1);
		expect(service.instanceAiErrorReporter.endRun).toHaveBeenCalledWith(
			'run-1',
			service.instanceAiErrorReporter.beginRun.mock.results[0].value,
		);
	});

	it('treats a pre-claim stale resume as a local no-op', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const suspendedTracing = { id: 'suspended-trace' };
		const resumeTracing = {
			actorRun: { id: 'resume-actor' },
			withActiveSpan: vi.fn(
				async (_run: unknown, callback: () => Promise<unknown>) => await callback(),
			),
		} as unknown as InstanceAiTraceContext;
		const orchestrationContext = { tracing: suspendedTracing };
		const opts = {
			...resumedStreamOpts(abortController),
			tracing: resumeTracing,
			resumeTracing,
			unregisteredResumeTracing: resumeTracing,
			messageGroupId: 'group-1',
			orchestrationContext,
		};
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {});
		service.finalizeRun = vi.fn(async () => {});
		const terminalResponse = vi.spyOn(service.terminalOutcome, 'evaluateTerminalResponse');
		const staleError = Object.assign(new Error('already claimed'), { name: 'StaleResumeError' });
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(staleError);

		await service.processResumedStream({}, {}, opts);

		expect(service.runState.clearActiveRun).toHaveBeenCalledWith(
			'thread-a',
			opts.resumeExecutionToken,
		);
		expect(service.instanceAiErrorReporter.beginRun).not.toHaveBeenCalled();
		expect(service.instanceAiErrorReporter.endRun).not.toHaveBeenCalled();
		expect(service.instanceAiErrorReporter.report).not.toHaveBeenCalled();
		expect(service.logger.error).not.toHaveBeenCalled();
		expect(service.tracing.registerTraceContext).not.toHaveBeenCalled();
		expect(orchestrationContext.tracing).toBe(suspendedTracing);
		expect(service.tracing.finalizeDetachedTraceRun).toHaveBeenCalledWith(
			'stale-resume:run-1',
			resumeTracing,
			{
				status: 'cancelled',
				outputs: { runId: 'run-1' },
				metadata: { completion_source: 'stale_resume' },
			},
		);
		expect(terminalResponse).not.toHaveBeenCalled();
		expect(service.eventBus.events).toEqual([]);
		expect(service.tracing.finalizeRunTracing).not.toHaveBeenCalled();
		expect(service.tracing.maybeFinalizeRunTraceRoot).not.toHaveBeenCalled();
		expect(service.temporaryWorkflowService.reapForRun).not.toHaveBeenCalled();
		expect(service.finalizeRun).not.toHaveBeenCalled();
		expect(service.creditService.claimRunUsage).not.toHaveBeenCalled();
		expect(service.telemetry.track).not.toHaveBeenCalled();
		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.drainPendingCheckpointReentries).not.toHaveBeenCalled();
		expect(service.taskProjector.syncFromWorkflowLoop).not.toHaveBeenCalled();
		expect(service.maybeStartWorkflowSetupFollowUp).not.toHaveBeenCalled();
		expect(service.liveness.consumeRunTimeout).not.toHaveBeenCalled();
	});

	it('does not acquire local ownership when checkpoint claiming returns an error stream', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const suspendedTracing = { id: 'suspended-trace' };
		const resumeTracing = {
			actorRun: { id: 'resume-actor' },
			withActiveSpan: vi.fn(
				async (_run: unknown, callback: () => Promise<unknown>) => await callback(),
			),
		} as unknown as InstanceAiTraceContext;
		const orchestrationContext = { tracing: suspendedTracing };
		const claimError = new Error('checkpoint unavailable');
		const opts = {
			...resumedStreamOpts(abortController),
			tracing: resumeTracing,
			resumeTracing,
			unregisteredResumeTracing: resumeTracing,
			messageGroupId: 'group-1',
			orchestrationContext,
		};
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {});
		const terminalResponse = vi.spyOn(service.terminalOutcome, 'evaluateTerminalResponse');
		vi.mocked(resumeAgentRun).mockResolvedValueOnce({
			status: 'errored',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			error: claimError,
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream({}, {}, opts);

		expect(service.tracing.registerTraceContext).not.toHaveBeenCalled();
		expect(orchestrationContext.tracing).toBe(suspendedTracing);
		expect(service.instanceAiErrorReporter.beginRun).not.toHaveBeenCalled();
		expect(service.instanceAiErrorReporter.endRun).not.toHaveBeenCalled();
		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(
			claimError,
			expect.objectContaining({ component: 'instance-ai-resume-claim', runId: 'run-1' }),
		);
		expect(service.tracing.finalizeDetachedTraceRun).toHaveBeenCalledWith(
			'unclaimed-resume:run-1',
			resumeTracing,
			{
				status: 'failed',
				error: 'checkpoint unavailable',
				metadata: { completion_source: 'resume_claim' },
			},
		);
		expect(terminalResponse).toHaveBeenCalledWith('thread-a', 'run-1', 'errored', {
			messageGroupId: 'group-1',
			errorMessage: 'I could not apply that confirmation. Send a new message to continue.',
			errorCode: undefined,
		});
		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
		expect(service.tracing.finalizeRunTracing).not.toHaveBeenCalled();
		expect(service.tracing.finalizeMessageTraceRoot).not.toHaveBeenCalled();
		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.taskProjector.syncFromWorkflowLoop).not.toHaveBeenCalled();
	});

	it('stays silent when the claim returns a stale resume error instead of throwing it', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const resumeTracing = { id: 'resume-trace' } as unknown as InstanceAiTraceContext;
		const opts = {
			...resumedStreamOpts(abortController),
			resumeTracing,
			unregisteredResumeTracing: resumeTracing,
			messageGroupId: 'group-1',
		};
		const terminalResponse = vi.spyOn(service.terminalOutcome, 'evaluateTerminalResponse');
		const staleError = Object.assign(new Error('already claimed'), { name: 'StaleResumeError' });
		vi.mocked(resumeAgentRun).mockResolvedValueOnce({
			status: 'errored',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			error: staleError,
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream({}, {}, opts);

		expect(service.instanceAiErrorReporter.report).not.toHaveBeenCalled();
		expect(service.tracing.finalizeDetachedTraceRun).toHaveBeenCalledWith(
			'stale-resume:run-1',
			resumeTracing,
			{
				status: 'cancelled',
				outputs: { runId: 'run-1' },
				metadata: { completion_source: 'stale_resume' },
			},
		);
		expect(terminalResponse).not.toHaveBeenCalled();
		expect(service.eventBus.events).toEqual([]);
	});

	it('surfaces an error to the user when a resume throws before claiming its checkpoint', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		const resumeError = new Error(
			'Invalid resume payload: data must NOT have additional properties',
		);
		const userFacingMessage =
			'I could not apply that confirmation. Send a new message to continue.';
		service.temporaryWorkflowService.reapForRun.mockResolvedValue(['wf-temp-1']);
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(resumeError);

		await service.processResumedStream({}, {}, opts);

		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(
			resumeError,
			expect.objectContaining({ component: 'instance-ai-resume-claim', runId: 'run-1' }),
		);
		expect(service.temporaryWorkflowService.reapForRun).toHaveBeenCalledWith(
			'thread-a',
			fakeUser,
			undefined,
			0,
		);
		expect(service.eventBus.events).toEqual([
			expect.objectContaining({
				type: 'error',
				runId: 'run-1',
				payload: { content: userFacingMessage },
			}),
			expect.objectContaining({
				type: 'run-finish',
				runId: 'run-1',
				payload: {
					status: 'error',
					reason: userFacingMessage,
					archivedWorkflowIds: ['wf-temp-1'],
				},
			}),
		]);
		expect(service.telemetry.track).toHaveBeenCalledWith('Builder generation errored', {
			thread_id: 'thread-a',
			run_id: 'run-1',
			error_message: 'Invalid resume payload: data must NOT have additional properties',
			error_source: 'exception',
			user_id: 'user-1',
		});
		expect(service.runState.clearActiveRun).toHaveBeenCalledWith(
			'thread-a',
			opts.resumeExecutionToken,
		);
	});

	it('still finishes a failed resume when reaping temporary workflows throws', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		service.temporaryWorkflowService.reapForRun.mockRejectedValue(new Error('archive failed'));
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('Invalid resume payload'));

		await service.processResumedStream({}, {}, opts);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['error', 'run-finish']);
	});

	it('still finishes a failed resume when the guard read fails', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		service.eventBus.getEventsForRuns.mockRejectedValue(new Error('event log unavailable'));
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('Invalid resume payload'));

		await service.processResumedStream({}, {}, opts);

		expect(service.eventBus.events.map((event) => event.type)).toEqual(['run-finish']);
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to evaluate the terminal response for a settling run',
			expect.objectContaining({ error: 'event log unavailable' }),
		);
	});

	it('cancels the run when a resume is aborted before claiming its checkpoint', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		service.temporaryWorkflowService.reapForRun.mockResolvedValue(['wf-temp-1']);
		abortController.abort();
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('aborted mid-claim'));

		await service.processResumedStream({}, {}, opts);

		expect(service.instanceAiErrorReporter.report).not.toHaveBeenCalled();
		expect(service.tracing.finalizeDetachedTraceRun).toHaveBeenCalledWith(
			'cancelled-resume:run-1',
			undefined,
			{
				status: 'cancelled',
				outputs: { runId: 'run-1' },
				metadata: {
					completion_source: 'resume_cancelled',
					cancellation_reason: 'user_cancelled',
				},
			},
		);
		expect(service.eventBus.events).toEqual([
			expect.objectContaining({
				type: 'run-finish',
				payload: {
					status: 'cancelled',
					reason: 'user_cancelled',
					archivedWorkflowIds: ['wf-temp-1'],
				},
			}),
		]);
	});

	it('reports the run timeout reason when a resume times out before claiming', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		service.liveness.consumeRunTimeout = vi.fn(() => ({ timedOut: true }));
		abortController.abort();
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('aborted mid-claim'));

		await service.processResumedStream({}, {}, opts);

		expect(service.eventBus.events).toEqual([
			expect.objectContaining({
				type: 'run-finish',
				payload: { status: 'cancelled', reason: INSTANCE_AI_RUN_TIMEOUT_REASON },
			}),
		]);
	});

	it('leaves a preserved HITL run alone when a resume is aborted before claiming', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const opts = { ...resumedStreamOpts(abortController), messageGroupId: 'group-1' };
		service.preserveHitlOnShutdown.add('run-1');
		abortController.abort();
		vi.mocked(resumeAgentRun).mockRejectedValueOnce(new Error('aborted mid-claim'));

		await service.processResumedStream({}, {}, opts);

		expect(service.eventBus.events).toEqual([]);
	});

	it('terminalizes a same-name error that occurs after the resume was claimed', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		service.finalizeRun = vi.fn(async () => {});
		const staleNamedError = Object.assign(new Error('tool failed'), { name: 'StaleResumeError' });
		mockClaimedResumeResult({
			status: 'errored',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			error: staleNamedError,
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream({}, {}, resumedStreamOpts(abortController));

		expect(service.instanceAiErrorReporter.beginRun).toHaveBeenCalledWith('run-1');
		expect(service.instanceAiErrorReporter.report).toHaveBeenCalledWith(
			staleNamedError,
			expect.objectContaining({ runId: 'run-1' }),
		);
		expect(service.finalizeRun).toHaveBeenCalledWith(
			'thread-a',
			'run-1',
			'errored',
			expect.any(Object),
		);
		expect(service.instanceAiErrorReporter.endRun).toHaveBeenCalledWith(
			'run-1',
			service.instanceAiErrorReporter.beginRun.mock.results[0].value,
		);
	});

	it('pairs beginRun/endRun when a resumed stream completes', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		mockClaimedResumeResult({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream({}, {}, resumedStreamOpts(abortController));

		expect(service.instanceAiErrorReporter.beginRun).toHaveBeenCalledWith('run-1');
		expect(service.instanceAiErrorReporter.endRun).toHaveBeenCalledWith(
			'run-1',
			service.instanceAiErrorReporter.beginRun.mock.results[0].value,
		);
	});

	it('calls endRun after post-run wiring finishes', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		const callOrder: string[] = [];
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.schedulePlannedTasks = vi.fn(async () => {
			callOrder.push('schedulePlannedTasks');
		});
		service.drainPendingCheckpointReentries = vi.fn(async () => {
			callOrder.push('drainPendingCheckpointReentries');
		});
		service.taskProjector = {
			syncFromWorkflowLoop: vi.fn(async () => {
				callOrder.push('syncFromWorkflowLoop');
			}),
		};
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {
			callOrder.push('maybeStartWorkflowSetupFollowUp');
		});
		service.finalizeRun = vi.fn(async () => {
			callOrder.push('finalizeRun');
		});
		service.instanceAiErrorReporter.beginRun = vi.fn(() => {
			callOrder.push('beginRun');
			return Symbol('error-reporter-execution');
		});
		service.instanceAiErrorReporter.endRun = vi.fn(() => {
			callOrder.push('endRun');
		});
		mockClaimedResumeResult({
			status: 'completed',
			agentRunId: 'agent-run-1',
			text: Promise.resolve('done'),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});

		await service.processResumedStream({}, {}, resumedStreamOpts(abortController));

		expect(callOrder).toEqual([
			'beginRun',
			'finalizeRun',
			'schedulePlannedTasks',
			'drainPendingCheckpointReentries',
			'syncFromWorkflowLoop',
			'maybeStartWorkflowSetupFollowUp',
			'endRun',
		]);
	});

	it('skips post-run scheduling when the resumed run was cancelled', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {});
		mockClaimedResumeResult({
			status: 'cancelled',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});
		abortController.abort();

		await service.processResumedStream({}, {}, resumedStreamOpts(abortController));

		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.drainPendingCheckpointReentries).not.toHaveBeenCalled();
		// The UI projection still runs, so a stopped run's task states reach the client.
		expect(service.taskProjector.syncFromWorkflowLoop).toHaveBeenCalledWith('thread-a', 'run-1');
		expect(service.instanceAiErrorReporter.endRun).toHaveBeenCalledWith(
			'run-1',
			service.instanceAiErrorReporter.beginRun.mock.results[0].value,
		);
	});

	it('still marks an abandoned checkpoint terminal when the run was cancelled', async () => {
		const service = createTerminalGuardOrderService();
		const abortController = new AbortController();
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		service.maybeStartWorkflowSetupFollowUp = vi.fn(async () => {});
		service.syncPlannedTasksToUi = vi.fn(async () => {});
		service.backgroundTasks.getRunningTasksByParentCheckpoint = vi.fn(() => []);
		const markCheckpointFailed = vi.fn(async () => {});
		service.createPlannedTaskState = vi.fn(async () => ({
			plannedTaskService: {
				getGraph: vi.fn(async () => ({ tasks: [{ id: 'cp-1', status: 'running' }] })),
				markCheckpointFailed,
			},
		}));
		mockClaimedResumeResult({
			status: 'cancelled',
			agentRunId: 'agent-run-1',
			text: Promise.resolve(''),
			workSummary: { toolCalls: [], totalToolCalls: 0, totalToolErrors: 0 },
		});
		abortController.abort();

		await service.processResumedStream(
			{},
			{},
			{
				...resumedStreamOpts(abortController),
				checkpoint: { isCheckpointFollowUp: true, checkpointTaskId: 'cp-1' },
			},
		);

		// Without this the checkpoint task stays `running` forever and the plan
		// graph can never advance, because the cancelled run's context is the only
		// thing that knows it was a checkpoint follow-up.
		expect(markCheckpointFailed).toHaveBeenCalledWith('thread-a', 'cp-1', {
			error: 'Checkpoint run ended without reporting completion',
		});
		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
	});
});

describe('InstanceAiService — user message persistence on cancel', () => {
	type ExecuteRunInternals = {
		executeRun: (
			user: User,
			threadId: string,
			runId: string,
			message: string,
			abortController: AbortController,
		) => Promise<void>;
		agentMemory: { saveMessages: Mock };
		eventBus: { publish: Mock };
		terminalOutcome: { evaluateTerminalResponse: Mock };
		logger: { warn: Mock; error: Mock; debug: Mock };
		memoryService: { getThreadMetadata: Mock };
		createProxyRunConfig: Mock;
		isRunDebugEnabled: Mock;
		runState: { clearActiveRun: Mock; hasSuspendedRun: Mock };
		domainAccessTrackersByThread: Map<string, unknown>;
		instanceAiErrorReporter: { beginRun: Mock; endRun: Mock };
		schedulePlannedTasks: Mock;
		taskProjector: { syncFromWorkflowLoop: Mock };
		browserSessionService: { getExtensionTraceContext: Mock };
	};

	function createCancelPersistenceService(): ExecuteRunInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as ExecuteRunInternals;
		service.agentMemory = { saveMessages: vi.fn(async () => {}) };
		service.eventBus = { publish: vi.fn() };
		service.terminalOutcome = { evaluateTerminalResponse: vi.fn() };
		service.logger = { warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
		service.memoryService = { getThreadMetadata: vi.fn(async () => undefined) };
		service.createProxyRunConfig = vi.fn(async () => ({ tracingProxyConfig: undefined }));
		service.isRunDebugEnabled = vi.fn(() => false);
		// hasSuspendedRun → true short-circuits the finally's post-run scheduling
		service.runState = { clearActiveRun: vi.fn(), hasSuspendedRun: vi.fn(() => true) };
		service.domainAccessTrackersByThread = new Map();
		service.instanceAiErrorReporter = {
			beginRun: vi.fn(() => Symbol('error-reporter-execution')),
			endRun: vi.fn(),
		};
		service.browserSessionService = {
			getExtensionTraceContext: vi.fn(() => ({ connectionState: 'disconnected' })),
		};
		return service;
	}

	it('persists the user message when Stop is hit before the stream starts', async () => {
		const service = createCancelPersistenceService();
		const abortController = new AbortController();
		abortController.abort();

		await service.executeRun(fakeUser, 'thread-1', 'run-1', 'banana', abortController);

		expect(service.agentMemory.saveMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				resourceId: 'user-1',
				messages: [
					expect.objectContaining({
						role: 'user',
						content: [{ type: 'text', text: 'banana' }],
					}),
				],
			}),
		);
	});

	it('passes the connected extension version to the trace', async () => {
		const service = createCancelPersistenceService();
		service.browserSessionService.getExtensionTraceContext.mockReturnValue({
			connectionState: 'connected',
			version: '0.0.7',
		});
		const abortController = new AbortController();
		abortController.abort();

		await service.executeRun(fakeUser, 'thread-1', 'run-1', 'banana', abortController);

		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({
				browserExtension: { connectionState: 'connected', version: '0.0.7' },
			}),
		);
	});

	it('separates a connected extension that reports no version from no extension at all', async () => {
		const connected = createCancelPersistenceService();
		connected.browserSessionService.getExtensionTraceContext.mockReturnValue({
			connectionState: 'connected',
		});
		const firstAbort = new AbortController();
		firstAbort.abort();

		await connected.executeRun(fakeUser, 'thread-1', 'run-1', 'banana', firstAbort);

		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({ browserExtension: { connectionState: 'connected' } }),
		);
	});

	it('leaves the trace version undefined when no extension is connected', async () => {
		const service = createCancelPersistenceService();
		const abortController = new AbortController();
		abortController.abort();

		await service.executeRun(fakeUser, 'thread-1', 'run-1', 'banana', abortController);

		expect(createInstanceAiTraceContext).toHaveBeenCalledWith(
			expect.objectContaining({ browserExtension: { connectionState: 'disconnected' } }),
		);
	});

	it('does not persist an empty user message', async () => {
		const service = createCancelPersistenceService();
		const abortController = new AbortController();
		abortController.abort();

		await service.executeRun(fakeUser, 'thread-1', 'run-1', '', abortController);

		expect(service.agentMemory.saveMessages).not.toHaveBeenCalled();
	});

	it('does not re-arm planned-task scheduling after a cancelled run, but still projects', async () => {
		const service = createCancelPersistenceService();
		service.runState.hasSuspendedRun = vi.fn(() => false);
		service.schedulePlannedTasks = vi.fn(async () => {});
		service.taskProjector = { syncFromWorkflowLoop: vi.fn(async () => {}) };
		const abortController = new AbortController();
		abortController.abort();

		await service.executeRun(fakeUser, 'thread-1', 'run-1', 'banana', abortController);

		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.taskProjector.syncFromWorkflowLoop).toHaveBeenCalledWith('thread-1', 'run-1');
	});
});

describe('InstanceAiService — planned task settlement', () => {
	type SettlementService = {
		cancelRun: (threadId: string, reason?: string) => void;
		cancelBackgroundTask: (threadId: string, taskId: string) => void;
		schedulePlannedTasks: Mock;
		syncPlannedTasksToUi: Mock;
		eventBus: { publish: Mock };
		createPlannedTaskState: Mock;
		cancelAwaitingApprovalPlan: Mock;
		backgroundTasks: {
			cancelThread: Mock;
			cancelTask: Mock;
		};
		runState: {
			getThreadUser: Mock;
			cancelThread: Mock;
		};
		tracing: { finalizeBackgroundTaskTracing: Mock };
		terminalOutcome: { recordBackgroundTerminalOutcome: Mock };
		suspendedThreads: { dropPendingConfirmationsForThread: Mock };
	};

	const task = {
		plannedTaskId: 'task-1',
		threadId: 'thread-a',
		runId: 'task-run-1',
		agentId: 'agent-1',
		role: 'builder',
	};

	function createSettlementService() {
		const service = Object.create(InstanceAiService.prototype) as unknown as SettlementService;
		const graph = { planRunId: 'plan-run-1', tasks: [] };
		const plannedTaskService = {
			markCancelled: vi.fn(async () => graph),
			markFailed: vi.fn(async () => graph),
		};
		Object.assign(service, {
			createPlannedTaskState: vi.fn(async () => ({ plannedTaskService })),
			syncPlannedTasksToUi: vi.fn(async () => {}),
			schedulePlannedTasks: vi.fn(async () => {}),
			cancelAwaitingApprovalPlan: vi.fn(async () => {}),
			backgroundTasks: {
				cancelThread: vi.fn(() => [task]),
				cancelTask: vi.fn(() => task),
			},
			runState: {
				getThreadUser: vi.fn(() => fakeUser),
				cancelThread: vi.fn(() => ({ active: undefined, suspended: undefined })),
			},
			tracing: { finalizeBackgroundTaskTracing: vi.fn(async () => {}) },
			eventBus: { publish: vi.fn() },
			terminalOutcome: { recordBackgroundTerminalOutcome: vi.fn(async () => {}) },
			suspendedThreads: { dropPendingConfirmationsForThread: vi.fn(async () => {}) },
		});
		return { service, plannedTaskService, graph };
	}

	/** cancelRun/cancelBackgroundTask fire settlement with `void`, so let it settle. */
	const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

	it('marks the planned task cancelled but does not re-tick when the whole thread is cancelled', async () => {
		const { service, plannedTaskService, graph } = createSettlementService();

		service.cancelRun('thread-a');
		await flush();

		expect(plannedTaskService.markCancelled).toHaveBeenCalledWith('thread-a', 'task-1', {
			error: undefined,
		});
		expect(service.syncPlannedTasksToUi).toHaveBeenCalledWith('thread-a', graph);
		expect(service.schedulePlannedTasks).not.toHaveBeenCalled();
		expect(service.eventBus.publish).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({
				type: 'agent-completed',
				payload: { role: 'builder', result: '', status: 'cancelled' },
			}),
		);
	});

	it('re-ticks the scheduler when a single background task is cancelled', async () => {
		const { service, plannedTaskService } = createSettlementService();

		service.cancelBackgroundTask('thread-a', 'task-1');
		await flush();

		expect(plannedTaskService.markCancelled).toHaveBeenCalled();
		expect(service.schedulePlannedTasks).toHaveBeenCalledWith(fakeUser, 'thread-a');
		expect(service.eventBus.publish).toHaveBeenCalledWith(
			'thread-a',
			expect.objectContaining({
				type: 'agent-completed',
				payload: { role: 'builder', result: '', status: 'cancelled' },
			}),
		);
	});
});

describe('InstanceAiService — agent preview handoff scopes', () => {
	type AgentPreviewPermissionService = {
		assertAgentPreviewHandoffScopes: (user: User, projectId: string) => Promise<void>;
	};

	function createAgentPreviewPermissionService(): AgentPreviewPermissionService {
		return Object.create(InstanceAiService.prototype) as AgentPreviewPermissionService;
	}

	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
	});

	it('requires both agent read and update scopes for preview handoffs', async () => {
		const service = createAgentPreviewPermissionService();
		vi.mocked(userHasScopes).mockResolvedValue(true);

		await expect(
			service.assertAgentPreviewHandoffScopes(fakeUser, 'project-1'),
		).resolves.toBeUndefined();

		expect(userHasScopes).toHaveBeenCalledWith(fakeUser, ['agent:read', 'agent:update'], false, {
			projectId: 'project-1',
		});
	});

	it('rejects preview handoffs when either required agent scope is missing', async () => {
		const service = createAgentPreviewPermissionService();
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await expect(service.assertAgentPreviewHandoffScopes(fakeUser, 'project-1')).rejects.toThrow(
			'You do not have permission to load or edit agent previews in this project.',
		);
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

describe('InstanceAiService — editor handoff context resources', () => {
	it('builds the context block from combined workflow and agent attachments', () => {
		const source = InstanceAiService.toString();

		expect(source).toContain('buildContextResourcesBlock(contextAttachments)');
		expect(source).not.toContain('buildContextResourcesBlock(workflowAttachments)');
	});

	it('traces the attached resources, which the raw message no longer shows', () => {
		const source = InstanceAiService.toString();

		// Assignment-form tolerant: the wiring is what matters, not whether the
		// field is spread into the literal or set on it afterwards.
		expect(source).toMatch(/resourceAttachments\s*[:=]\s*contextAttachments\.map/);
	});
});

describe('InstanceAiService — agent snapshots for attached agents', () => {
	type SnapshotService = {
		logger: { debug: Mock };
		snapshotAttachedAgents: (
			attachments: Array<Record<string, unknown>>,
			orchestrationContext: Record<string, unknown>,
			tracing: unknown,
		) => Promise<void>;
	};

	const emitSnapshot = emitAgentSnapshotTraceEvent as unknown as Mock;
	const TRACING = { actorRun: { id: 'actor-1' } };
	const ARTIFACT = { config: { name: 'Support Triage' }, skills: {}, configHash: 'hash-1' };

	function createService(): SnapshotService {
		const service = Object.create(InstanceAiService.prototype) as unknown as SnapshotService;
		service.logger = { debug: vi.fn() };
		return service;
	}

	function makeContext(readAgentArtifact?: Mock) {
		return {
			domainContext: readAgentArtifact ? { builderDelegate: { readAgentArtifact } } : {},
		};
	}

	beforeEach(() => emitSnapshot.mockClear());

	it('snapshots an attached agent as it stood when the turn opened', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn(async () => await Promise.resolve(ARTIFACT));

		await service.snapshotAttachedAgents(
			[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(readAgentArtifact).toHaveBeenCalledWith('agent-1');
		expect(emitSnapshot).toHaveBeenCalledTimes(1);
		expect(emitSnapshot.mock.calls[0][1]).toMatchObject({
			agentId: 'agent-1',
			projectId: 'proj-1',
			reason: 'attached',
			artifact: ARTIFACT,
		});
	});

	it('ignores a workflow attachment — the workflow side has its own event', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn();

		await service.snapshotAttachedAgents(
			[{ type: 'workflow', id: 'wf-1' }],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(readAgentArtifact).not.toHaveBeenCalled();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('does nothing when the agents module is off, rather than failing the turn', async () => {
		const service = createService();

		await expect(
			service.snapshotAttachedAgents(
				[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
				makeContext(undefined),
				TRACING,
			),
		).resolves.toBeUndefined();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('does nothing without a trace to attach the event to', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn();

		await service.snapshotAttachedAgents(
			[{ type: 'agent', id: 'agent-1', projectId: 'proj-1' }],
			makeContext(readAgentArtifact),
			undefined,
		);

		expect(readAgentArtifact).not.toHaveBeenCalled();
		expect(emitSnapshot).not.toHaveBeenCalled();
	});

	it('skips an agent it cannot read and keeps going', async () => {
		const service = createService();
		const readAgentArtifact = vi.fn(async (agentId: string) =>
			agentId === 'agent-broken'
				? await Promise.reject(new Error('gone'))
				: await Promise.resolve(ARTIFACT),
		);

		await service.snapshotAttachedAgents(
			[
				{ type: 'agent', id: 'agent-broken', projectId: 'proj-1' },
				{ type: 'agent', id: 'agent-ok', projectId: 'proj-1' },
			],
			makeContext(readAgentArtifact),
			TRACING,
		);

		expect(emitSnapshot).toHaveBeenCalledTimes(1);
		expect(emitSnapshot.mock.calls[0][1]).toMatchObject({ agentId: 'agent-ok' });
	});
});

describe('InstanceAiService — workflow verification follow-up gate', () => {
	type VerificationGateService = {
		workflowObligations: { getObligation: Mock };
		trackWorkflowVerificationObligation: Mock;
		buildWorkflowVerificationFollowUpMessage: Mock;
		startInternalFollowUpRun: Mock;
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
		service.workflowObligations = { getObligation: vi.fn(async () => obligation) };
		service.trackWorkflowVerificationObligation = vi.fn();
		service.buildWorkflowVerificationFollowUpMessage = vi.fn(() => 'verification message');
		service.startInternalFollowUpRun = vi.fn(async () => 'follow-up-run');
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
		listWorkflowLoopRecords: Mock;
		claimWorkItemSetupRouting: Mock;
		markWorkItemSetupRouted: Mock;
		releaseWorkItemSetupRoutingClaim: Mock;
		buildWorkflowSetupFollowUpMessage: Mock;
		workflowObligations: { isPlannedRecord: Mock; obligationFromRecord: Mock };
		runState: { getMessageGroupId: Mock };
		startInternalFollowUpRun: Mock;
		trackWorkflowVerificationObligation: Mock;
		logger: { warn: Mock };
		getWorkflowSetupSuspensionWorkflowId: (
			toolName: string | undefined,
			suspendPayload: Record<string, unknown> | undefined,
		) => string | undefined;
		markWorkflowSetupHandled: (
			threadId: string,
			workflowId: string,
			runId?: string,
		) => Promise<boolean>;
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
			runId?: string;
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
				runId: 'run-1',
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
			runId: record.lastBuildOutcome.runId,
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
		service.listWorkflowLoopRecords = vi.fn(async () => Object.values(records));
		service.claimWorkItemSetupRouting = vi.fn(
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
		service.markWorkItemSetupRouted = vi.fn(
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
		service.releaseWorkItemSetupRoutingClaim = vi.fn(
			async (_threadId: string, workItemId: string, claimId: string) => {
				const storedRecord = records[workItemId];
				if (!storedRecord || storedRecord.state.setupRoutingClaimId !== claimId) return;

				delete storedRecord.state.setupRoutingClaimId;
				delete storedRecord.state.setupRoutingClaimedAt;
				delete storedRecord.state.setupRoutingClaimExpiresAt;
			},
		);
		service.buildWorkflowSetupFollowUpMessage = vi.fn(
			() => '<workflow-setup-required>\n{}\n</workflow-setup-required>',
		);
		service.workflowObligations = {
			isPlannedRecord: vi.fn(
				(record: ReturnType<typeof makeRecord>) => record.state.plannedTaskId !== undefined,
			),
			obligationFromRecord: vi.fn((_threadId: string, record: ReturnType<typeof makeRecord>) =>
				obligationFor(record),
			),
		};
		service.runState = { getMessageGroupId: vi.fn(() => 'group-1') };
		service.startInternalFollowUpRun = vi.fn(async () => 'setup-run');
		service.trackWorkflowVerificationObligation = vi.fn();
		service.logger = { warn: vi.fn() };
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

	it('marks setup handled after the original setup card completes', async () => {
		const records = { 'wi-1': makeRecord() };
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-1'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(false);
		expect(service.startInternalFollowUpRun).not.toHaveBeenCalled();
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-1' }),
			'setup_completed_by_tool',
		);
	});

	it('keeps setup for other workflows routable after one workflow setup completes', async () => {
		const records = {
			'wi-1': makeRecord(),
			'wi-2': makeRecord({
				state: { workItemId: 'wi-2', workflowId: 'wf-2' },
				outcome: { workItemId: 'wi-2', workflowId: 'wf-2' },
			}),
		};
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-1');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-1'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(records['wi-2'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-1' }),
			'setup_completed_by_tool',
		);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-2', workItemId: 'wi-2' }),
			'setup_follow_up_started',
		);
	});

	it('keeps later setup for the same workflow routable after one setup completes', async () => {
		const records = {
			'wi-old': makeRecord({
				state: { workItemId: 'wi-old', runId: 'run-old' },
				outcome: { workItemId: 'wi-old', runId: 'run-old' },
			}),
			'wi-latest': makeRecord({
				state: { workItemId: 'wi-latest', runId: 'run-latest' },
				outcome: { workItemId: 'wi-latest', runId: 'run-latest' },
			}),
		};
		const service = createSetupFollowUpService(records);

		const marked = await service.markWorkflowSetupHandled('thread-a', 'wf-1', 'run-old');
		const started = await service.maybeStartWorkflowSetupFollowUp(fakeUser, 'thread-a');

		expect(marked).toBe(true);
		expect(records['wi-old'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(records['wi-latest'].state.setupRoutedAt).toBe('2026-01-01T00:00:00.000Z');
		expect(started).toBe(true);
		expect(service.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-old' }),
			'setup_completed_by_tool',
		);
		expect(service.trackWorkflowVerificationObligation).toHaveBeenCalledWith(
			expect.objectContaining({ workflowId: 'wf-1', workItemId: 'wi-latest' }),
			'setup_follow_up_started',
		);
	});

	it('extracts workflow setup suspension ids only from workflow setup cards', () => {
		const service = createSetupFollowUpService({});

		expect(
			service.getWorkflowSetupSuspensionWorkflowId('workflows', {
				workflowId: 'wf-1',
				setupRequests: [],
			}),
		).toBe('wf-1');
		expect(
			service.getWorkflowSetupSuspensionWorkflowId('workflows', {
				workflowId: 'wf-1',
				message: 'Publish workflow?',
			}),
		).toBeUndefined();
		expect(
			service.getWorkflowSetupSuspensionWorkflowId('credentials', {
				workflowId: 'wf-1',
				setupRequests: [],
			}),
		).toBeUndefined();
	});
});

type TaskControlInternals = {
	instanceSettings: { isMultiMain: boolean };
	publisher: { publishCommand: Mock };
	backgroundTasks: { getTaskSnapshots: Mock };
	logger: { error: Mock };
	runState: { hasLiveRun: Mock };
	eventLog: { flush: Mock };
	interruptedRunSweeper: { cancelUnfinishedRuns: Mock };
	sendCorrectionToTask: Mock;
	cancelBackgroundTask: Mock;
	cancelRun: Mock;
	clearThreadState: Mock;
	routeCorrectionToTask: InstanceAiService['routeCorrectionToTask'];
	routeCancelBackgroundTask: InstanceAiService['routeCancelBackgroundTask'];
	routeCancelRun: InstanceAiService['routeCancelRun'];
	routeClearThreadState: InstanceAiService['routeClearThreadState'];
	handleRelayTaskControl: InstanceAiService['handleRelayTaskControl'];
};

function buildTaskControlService(isMultiMain: boolean): TaskControlInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as TaskControlInternals;
	service.instanceSettings = { isMultiMain };
	service.publisher = { publishCommand: vi.fn().mockResolvedValue(undefined) };
	service.backgroundTasks = { getTaskSnapshots: vi.fn(() => []) };
	service.logger = { error: vi.fn() };
	// Inert cancel-time zombie fallback — its behavior is covered by the
	// dedicated 'routeCancelRun zombie fallback' suite; these tests are about
	// routing.
	service.runState = { hasLiveRun: vi.fn(() => false) };
	service.eventLog = { flush: vi.fn(async () => {}) };
	service.interruptedRunSweeper = { cancelUnfinishedRuns: vi.fn(async () => 0) };
	service.sendCorrectionToTask = vi.fn(() => 'queued');
	service.cancelBackgroundTask = vi.fn();
	service.cancelRun = vi.fn();
	service.clearThreadState = vi.fn(async () => {});
	return service;
}

describe('InstanceAiService — cross-main task-control routing', () => {
	describe('routeCorrectionToTask', () => {
		it('broadcasts when the task is not local and multi-main', async () => {
			const service = buildTaskControlService(true);
			service.sendCorrectionToTask.mockReturnValue('task-not-found');

			await service.routeCorrectionToTask('thread-a', 'task-1', 'try again');

			expect(service.sendCorrectionToTask).toHaveBeenCalledWith('thread-a', 'task-1', 'try again');
			expect(service.publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-task-control',
				payload: {
					threadId: 'thread-a',
					taskId: 'task-1',
					action: 'correct',
					correction: 'try again',
				},
			});
		});

		it('does not broadcast when the correction was applied locally', async () => {
			const service = buildTaskControlService(true);
			service.sendCorrectionToTask.mockReturnValue('queued');

			await service.routeCorrectionToTask('thread-a', 'task-1', 'try again');

			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('does not broadcast in single-main even on a local miss', async () => {
			const service = buildTaskControlService(false);
			service.sendCorrectionToTask.mockReturnValue('task-not-found');

			await service.routeCorrectionToTask('thread-a', 'task-1', 'try again');

			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('routeCancelBackgroundTask', () => {
		it('broadcasts when the task is not local and multi-main', async () => {
			const service = buildTaskControlService(true);
			service.backgroundTasks.getTaskSnapshots.mockReturnValue([]);

			await service.routeCancelBackgroundTask('thread-a', 'task-1');

			expect(service.cancelBackgroundTask).toHaveBeenCalledWith('thread-a', 'task-1');
			expect(service.publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-task-control',
				payload: { threadId: 'thread-a', taskId: 'task-1', action: 'cancel-task' },
			});
		});

		it('does not broadcast when the task is local', async () => {
			const service = buildTaskControlService(true);
			service.backgroundTasks.getTaskSnapshots.mockReturnValue([{ taskId: 'task-1' }]);

			await service.routeCancelBackgroundTask('thread-a', 'task-1');

			expect(service.cancelBackgroundTask).toHaveBeenCalledWith('thread-a', 'task-1');
			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('routeCancelRun / routeClearThreadState', () => {
		it('routeCancelRun cancels locally and always fans out in multi-main', async () => {
			const service = buildTaskControlService(true);

			await service.routeCancelRun('thread-a');

			expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
			expect(service.publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-task-control',
				payload: { threadId: 'thread-a', action: 'cancel-thread' },
			});
		});

		it('routeCancelRun does not fan out in single-main', async () => {
			const service = buildTaskControlService(false);

			await service.routeCancelRun('thread-a');

			expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('routeClearThreadState clears locally and fans out in multi-main', async () => {
			const service = buildTaskControlService(true);

			await service.routeClearThreadState('thread-a');

			expect(service.clearThreadState).toHaveBeenCalledWith('thread-a');
			expect(service.publisher.publishCommand).toHaveBeenCalledWith({
				command: 'relay-instance-ai-task-control',
				payload: { threadId: 'thread-a', action: 'clear-thread' },
			});
		});
	});

	describe('handleRelayTaskControl', () => {
		it('applies a relayed correction via the local method and never re-broadcasts', async () => {
			const service = buildTaskControlService(true);

			await service.handleRelayTaskControl({
				threadId: 'thread-a',
				taskId: 'task-1',
				action: 'correct',
				correction: 'fix it',
			});

			expect(service.sendCorrectionToTask).toHaveBeenCalledWith('thread-a', 'task-1', 'fix it');
			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('ignores a correction relay missing its correction text', async () => {
			const service = buildTaskControlService(true);

			await service.handleRelayTaskControl({
				threadId: 'thread-a',
				taskId: 'task-1',
				action: 'correct',
			});

			expect(service.sendCorrectionToTask).not.toHaveBeenCalled();
		});

		it('routes cancel-task / cancel-thread / clear-thread to the local methods', async () => {
			const service = buildTaskControlService(true);

			await service.handleRelayTaskControl({
				threadId: 'thread-a',
				taskId: 'task-1',
				action: 'cancel-task',
			});
			await service.handleRelayTaskControl({ threadId: 'thread-a', action: 'cancel-thread' });
			await service.handleRelayTaskControl({ threadId: 'thread-a', action: 'clear-thread' });

			expect(service.cancelBackgroundTask).toHaveBeenCalledWith('thread-a', 'task-1');
			expect(service.cancelRun).toHaveBeenCalledWith('thread-a');
			expect(service.clearThreadState).toHaveBeenCalledWith('thread-a');
			expect(service.publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('swallows and logs errors from a local action (no unhandled rejection on the sibling main)', async () => {
			const service = buildTaskControlService(true);
			service.clearThreadState.mockRejectedValue(new Error('db exploded'));

			await expect(
				service.handleRelayTaskControl({ threadId: 'thread-a', action: 'clear-thread' }),
			).resolves.toBeUndefined();
			expect(service.logger.error).toHaveBeenCalledWith(
				'Failed to apply relayed Instance AI task-control',
				expect.objectContaining({ threadId: 'thread-a', action: 'clear-thread' }),
			);
		});
	});
});

describe('InstanceAiService — clearThreadState agent-builder cleanup', () => {
	type Internals = {
		threadPushRef: Map<string, string>;
		planRequestsByThread: Map<string, number>;
		runState: { clearThread: Mock };
		backgroundTasks: { cancelThread: Mock };
		schedulerLocks: Map<string, unknown>;
		failedInternalFollowUpStreaks: Map<string, number>;
		liveness: { clearThreadState: Mock };
		domainAccessTrackersByThread: Map<string, unknown>;
		evalCredentialAllowlists: EvalThreadCredentialAllowlistService;
		eventBus: { clearThread: Mock };
		tracing: {
			finalizeRunTracing: Mock;
			finalizeBackgroundTaskTracing: Mock;
			finalizeRemainingMessageTraceRoots: Mock;
			deleteTraceContextsForThread: Mock;
			getTrackedThreadIds: Mock;
			clear: Mock;
		};
		memoryTaskRegistry: { clearThread: Mock };
		sandboxService: { destroySandbox: Mock };
		temporaryWorkflowService: { reapForThreadCleanup: Mock };
		suspendedThreads: { dropPendingConfirmationsForThread: Mock };
		logger: { warn: Mock };
		clearThreadState: (threadId: string) => Promise<void>;
	};

	function buildService(): Internals {
		const service = Object.create(InstanceAiService.prototype) as unknown as Internals;

		service.threadPushRef = new Map();
		service.planRequestsByThread = new Map();
		service.runState = { clearThread: vi.fn(() => ({ active: undefined, suspended: undefined })) };
		service.backgroundTasks = { cancelThread: vi.fn(() => []) };
		service.schedulerLocks = new Map();
		service.failedInternalFollowUpStreaks = new Map();
		service.liveness = { clearThreadState: vi.fn() };
		service.domainAccessTrackersByThread = new Map();
		service.evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
		service.eventBus = { clearThread: vi.fn() };
		service.tracing = {
			finalizeRunTracing: vi.fn(async () => {}),
			finalizeBackgroundTaskTracing: vi.fn(async () => {}),
			finalizeRemainingMessageTraceRoots: vi.fn(async () => {}),
			deleteTraceContextsForThread: vi.fn(),
			getTrackedThreadIds: vi.fn(() => []),
			clear: vi.fn(),
		};
		service.memoryTaskRegistry = { clearThread: vi.fn() };
		service.sandboxService = { destroySandbox: vi.fn(async () => {}) };
		service.temporaryWorkflowService = { reapForThreadCleanup: vi.fn(async () => {}) };
		service.suspendedThreads = { dropPendingConfirmationsForThread: vi.fn(async () => {}) };
		service.logger = { warn: vi.fn() };

		return service;
	}

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('clearThreadState deletes agent-builder sessions when the agents module is active', async () => {
		const service = buildService();
		const deleteBuilderSessions = vi.fn().mockResolvedValue(undefined);
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: () => true };
			if (token === InstanceAiBuilderDelegateAdapterService) {
				return { deleteBuilderSessions };
			}
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});

		await service.clearThreadState('thread-a');

		expect(deleteBuilderSessions).toHaveBeenCalledWith('thread-a');
	});

	it('clearThreadState swallows agent-builder cleanup failures', async () => {
		const service = buildService();
		const deleteBuilderSessions = vi.fn().mockRejectedValue(new Error('cleanup failed'));
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) => {
			if (token === ModuleRegistry) return { isActive: () => true };
			if (token === InstanceAiBuilderDelegateAdapterService) {
				return { deleteBuilderSessions };
			}
			throw new Error(`Unexpected Container.get call in test: ${String(token)}`);
		});

		await expect(service.clearThreadState('thread-a')).resolves.toBeUndefined();

		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to clean up agent-builder sessions for thread',
			expect.objectContaining({ threadId: 'thread-a' }),
		);
	});
});

describe('createAgentMemoryOptions', () => {
	type MemoryOptionsInternals = {
		createAgentMemoryOptions: (
			user: User,
			threadId: string,
			runId: string,
		) => { observationalMemory: { onTaskUsage: (report: MemoryTaskUsageReport) => Promise<void> } };
		instanceAiConfig: Pick<
			InstanceAiConfig,
			'observerMessageTokens' | 'reflectorObservationTokens'
		>;
		creditService: { claimRunUsage: Mock; ensureQuotaLockApplied: Mock };
		logger: { warn: Mock };
	};

	function buildService(): MemoryOptionsInternals {
		const service = Object.create(InstanceAiService.prototype) as unknown as MemoryOptionsInternals;
		service.instanceAiConfig = { observerMessageTokens: 8_000, reflectorObservationTokens: 12_000 };
		service.creditService = {
			claimRunUsage: vi.fn(async () => {}),
			ensureQuotaLockApplied: vi.fn(async () => {}),
		};
		service.logger = { warn: vi.fn() };
		return service;
	}

	it('claims converted usage under the orchestrator dedupe key, and skips claiming when usage is zero', async () => {
		const service = buildService();
		const user = { id: 'user-1' } as User;
		const { onTaskUsage } = service.createAgentMemoryOptions(
			user,
			'thread-1',
			'run-1',
		).observationalMemory;

		await onTaskUsage({
			task: 'observer',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'thread-1',
			'run-1:memory:observer:report-1',
			[
				{
					type: 'llmTokens',
					model: 'anthropic/claude-sonnet-4-5',
					uncachedInput: 0,
					cacheRead: 0,
					cacheWrite: 0,
					output: 20,
				},
			],
			'completed',
		);

		await onTaskUsage({
			task: 'reflector',
			model: 'anthropic/claude-sonnet-4-5',
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
			reportId: 'report-2',
		});

		expect(service.creditService.claimRunUsage).toHaveBeenCalledTimes(1);
	});
});

describe('InstanceAiService — routeCancelRun zombie fallback', () => {
	function createCancelService() {
		const service = Object.create(InstanceAiService.prototype) as unknown as {
			runState: { hasLiveRun: Mock };
			eventLog: { flush: Mock };
			interruptedRunSweeper: { cancelUnfinishedRuns: Mock };
			routeTaskControl: Mock;
			routeCancelRun: (threadId: string) => Promise<void>;
		};
		service.runState = { hasLiveRun: vi.fn(() => false) };
		service.eventLog = { flush: vi.fn(async () => {}) };
		service.interruptedRunSweeper = { cancelUnfinishedRuns: vi.fn(async () => 0) };
		service.routeTaskControl = vi.fn(async () => {});
		return service;
	}

	it('terminalizes dead runs after broadcasting when nothing is live locally', async () => {
		const service = createCancelService();

		await service.routeCancelRun('thread-a');

		expect(service.routeTaskControl).toHaveBeenCalledWith({
			threadId: 'thread-a',
			action: 'cancel-thread',
		});
		// Drain settles first so a just-finished run cannot be double-terminaled.
		expect(service.eventLog.flush).toHaveBeenCalledWith('thread-a');
		expect(service.interruptedRunSweeper.cancelUnfinishedRuns).toHaveBeenCalledWith('thread-a');
		expect(service.routeTaskControl.mock.invocationCallOrder[0]).toBeLessThan(
			service.interruptedRunSweeper.cancelUnfinishedRuns.mock.invocationCallOrder[0],
		);
	});

	it('skips the fallback when a local run is live (its abort emits the terminal fact)', async () => {
		const service = createCancelService();
		service.runState.hasLiveRun = vi.fn(() => true);

		await service.routeCancelRun('thread-a');

		expect(service.routeTaskControl).toHaveBeenCalled();
		expect(service.eventLog.flush).not.toHaveBeenCalled();
		expect(service.interruptedRunSweeper.cancelUnfinishedRuns).not.toHaveBeenCalled();
	});
});

type FollowUpStreakServiceInternals = {
	failedInternalFollowUpStreaks: Map<string, number>;
	updateInternalFollowUpFailureStreak: (
		threadId: string,
		status: 'completed' | 'cancelled' | 'error' | 'suspended' | undefined,
		isInternalFollowUp: boolean,
	) => void;
	startInternalFollowUpRun: (user: User, threadId: string, message: string) => Promise<string>;
	startExecuteRun: Mock;
	defaultTimeZone: string;
	runState: {
		hasLiveRun: Mock;
		startRun: Mock;
		getTimeZone: Mock;
	};
	logger: { warn: Mock; debug: Mock; error: Mock };
};

function createFollowUpStreakService(): FollowUpStreakServiceInternals {
	// Bypass the constructor — we only exercise the follow-up circuit breaker
	// and the run-start path it gates.
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as FollowUpStreakServiceInternals;

	service.failedInternalFollowUpStreaks = new Map();
	service.startExecuteRun = vi.fn();
	service.defaultTimeZone = 'UTC';
	service.runState = {
		hasLiveRun: vi.fn(() => false),
		startRun: vi.fn(() => ({ runId: 'follow-up-run', abortController: new AbortController() })),
		getTimeZone: vi.fn(() => undefined),
	};
	service.logger = { warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

	return service;
}

describe('InstanceAiService — internal follow-up failure streak', () => {
	describe('updateInternalFollowUpFailureStreak', () => {
		it('counts consecutive errored internal follow-up runs per thread', () => {
			const service = createFollowUpStreakService();

			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBe(2);
			expect(service.failedInternalFollowUpStreaks.get('thread-b')).toBeUndefined();
		});

		it('does not count errored runs that were not internal follow-ups', () => {
			const service = createFollowUpStreakService();

			service.updateInternalFollowUpFailureStreak('thread-a', 'error', false);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();
		});

		it('resets the streak when a run completes or suspends', () => {
			const service = createFollowUpStreakService();

			service.failedInternalFollowUpStreaks.set('thread-a', 3);
			service.updateInternalFollowUpFailureStreak('thread-a', 'completed', false);
			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();

			service.failedInternalFollowUpStreaks.set('thread-a', 3);
			service.updateInternalFollowUpFailureStreak('thread-a', 'suspended', true);
			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBeUndefined();
		});

		it('keeps the streak unchanged on cancelled runs and missing terminal status', () => {
			const service = createFollowUpStreakService();
			service.failedInternalFollowUpStreaks.set('thread-a', 2);

			service.updateInternalFollowUpFailureStreak('thread-a', 'cancelled', true);
			service.updateInternalFollowUpFailureStreak('thread-a', undefined, true);

			expect(service.failedInternalFollowUpStreaks.get('thread-a')).toBe(2);
		});
	});

	describe('startInternalFollowUpRun circuit breaker', () => {
		it('starts the follow-up while the streak is below the cap', async () => {
			const service = createFollowUpStreakService();
			service.failedInternalFollowUpStreaks.set('thread-a', 2);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('follow-up-run');
			expect(service.startExecuteRun).toHaveBeenCalled();
		});

		it('skips the follow-up once the streak reaches the cap', async () => {
			const service = createFollowUpStreakService();
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('');
			expect(service.startExecuteRun).not.toHaveBeenCalled();
			expect(service.logger.warn).toHaveBeenCalledWith(
				'Skipping internal follow-up: consecutive follow-up runs keep failing',
				expect.objectContaining({ threadId: 'thread-a', failedStreak: 3 }),
			);
		});

		it('allows follow-ups again after a healthy run resets the streak', async () => {
			const service = createFollowUpStreakService();
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'error', true);
			service.updateInternalFollowUpFailureStreak('thread-a', 'completed', false);

			const runId = await service.startInternalFollowUpRun(fakeUser, 'thread-a', 'verify');

			expect(runId).toBe('follow-up-run');
			expect(service.startExecuteRun).toHaveBeenCalled();
		});
	});
});
