import type { z as zType } from 'zod';

// Manual mocks — must be declared before any imports that touch the mocked modules.
jest.mock('@n8n/instance-ai', () => {
	const { z } = jest.requireActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
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
		createInstanceAgent: jest.fn(),
		createAllTools: jest.fn(),
		createMemory: jest.fn(),
		mapMastraChunkToEvent: jest.fn(),
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

import { InstanceAiService } from '../instance-ai.service';

type ServiceInternals = {
	pendingCheckpointReentries: Map<string, Set<string>>;
	queuePendingCheckpointReentry: (threadId: string, checkpointTaskId: string) => void;
	drainPendingCheckpointReentries: (user: User, threadId: string) => Promise<void>;
	reenterCheckpointById: jest.Mock<Promise<boolean>, [User, string, string, string?]>;
	isThreadSuspended: jest.MockedFunction<(threadId: string) => Promise<boolean>>;
	backgroundTasks: {
		getRunningTasksByParentCheckpoint: jest.Mock;
	};
	runState: {
		getActiveRunId: jest.Mock;
	};
	logger: { debug: jest.Mock; warn: jest.Mock; error: jest.Mock };
};

type RunningTask = { taskId: string };
type MarkedWorkflow = { workflowId: string };
type ArchiveIfAiTemporary = jest.MockedFunction<(workflowId: string) => Promise<boolean>>;

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
	service.isThreadSuspended = jest.fn(async (_threadId: string) => false);
	service.backgroundTasks = {
		getRunningTasksByParentCheckpoint: jest.fn(() => []),
	};
	service.runState = {
		getActiveRunId: jest.fn(() => undefined),
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
			service.isThreadSuspended.mockResolvedValueOnce(true);

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

// ---------------------------------------------------------------------------
// Durable HITL pending confirmations — INS-198
// ---------------------------------------------------------------------------

type PersistedConfirmation = {
	requestId: string;
	threadId: string;
	userId: string;
	kind: 'suspended' | 'inline';
	mastraRunId?: string | null;
	toolCallId?: string | null;
	runId?: string;
	messageGroupId?: string | null;
	checkpointTaskId?: string | null;
};

type ResolveConfirmationServiceInternals = {
	resolveConfirmation: (
		userId: string,
		requestId: string,
		request: { kind: 'approval'; approved: boolean },
	) => Promise<'resolved' | 'not-found' | 'interrupted'>;
	restoreSuspendedRunFromDb: jest.Mock;
	runState: {
		resolvePendingConfirmation: jest.Mock;
	};
	pendingConfirmationRepository: {
		findByRequestId: jest.MockedFunction<
			(requestId: string) => Promise<PersistedConfirmation | null>
		>;
		deleteByRequestId: jest.MockedFunction<(requestId: string) => Promise<void>>;
	};
	deletePersistedConfirmation: jest.Mock;
	logger: { debug: jest.Mock; warn: jest.Mock; info: jest.Mock; error: jest.Mock };
};

function createResolveConfirmationService(): ResolveConfirmationServiceInternals {
	const service = Object.create(
		InstanceAiService.prototype,
	) as unknown as ResolveConfirmationServiceInternals;

	service.runState = {
		resolvePendingConfirmation: jest.fn(() => false),
	};
	service.restoreSuspendedRunFromDb = jest.fn(async () => 'resolved' as const);
	service.pendingConfirmationRepository = {
		findByRequestId: jest.fn(async (_requestId: string) => null),
		deleteByRequestId: jest.fn(async (_requestId: string) => undefined),
	};
	service.deletePersistedConfirmation = jest.fn(async () => undefined);
	service.logger = {
		debug: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
	};
	return service;
}

describe('InstanceAiService — resolveConfirmation outcomes', () => {
	const approvalRequest = { kind: 'approval' as const, approved: true };

	it("returns 'resolved' on local sub-agent (inline) hit and deletes the persisted row", async () => {
		const service = createResolveConfirmationService();
		service.runState.resolvePendingConfirmation.mockReturnValue(true);

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('resolved');
		expect(service.deletePersistedConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.restoreSuspendedRunFromDb).not.toHaveBeenCalled();
		expect(service.pendingConfirmationRepository.findByRequestId).not.toHaveBeenCalled();
	});

	it("dispatches to restoreSuspendedRunFromDb when the DB has a kind='suspended' row", async () => {
		const service = createResolveConfirmationService();
		const row: PersistedConfirmation = {
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'suspended',
			mastraRunId: 'mastra-1',
			toolCallId: 'tool-1',
			runId: 'run-1',
		};
		service.pendingConfirmationRepository.findByRequestId.mockResolvedValueOnce(row);
		service.restoreSuspendedRunFromDb.mockResolvedValueOnce('resolved');

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('resolved');
		expect(service.restoreSuspendedRunFromDb).toHaveBeenCalledWith(
			row,
			expect.objectContaining({ approved: true }),
		);
		expect(service.deletePersistedConfirmation).not.toHaveBeenCalled();
	});

	it("returns 'interrupted' when the DB has a kind='inline' row (parent run is dead)", async () => {
		const service = createResolveConfirmationService();
		service.pendingConfirmationRepository.findByRequestId.mockResolvedValueOnce({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'inline',
		});

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('interrupted');
		expect(service.restoreSuspendedRunFromDb).not.toHaveBeenCalled();
	});

	it("returns 'not-found' when neither local maps nor the DB have the request", async () => {
		const service = createResolveConfirmationService();

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('not-found');
	});

	it("returns 'not-found' when the DB row belongs to a different user", async () => {
		const service = createResolveConfirmationService();
		service.pendingConfirmationRepository.findByRequestId.mockResolvedValueOnce({
			requestId: 'req-1',
			threadId: 'thread-1',
			userId: 'user-other',
			kind: 'suspended',
		});

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('not-found');
	});

	it("returns 'not-found' when the DB lookup throws (does not leak as interrupted)", async () => {
		const service = createResolveConfirmationService();
		service.pendingConfirmationRepository.findByRequestId.mockRejectedValueOnce(
			new Error('db down'),
		);

		const outcome = await service.resolveConfirmation('user-1', 'req-1', approvalRequest);

		expect(outcome).toBe('not-found');
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Failed to look up persisted confirmation',
			expect.objectContaining({ requestId: 'req-1' }),
		);
	});
});

// ---------------------------------------------------------------------------
// Suspended-run reconstruction from DB (Phase 2)
// ---------------------------------------------------------------------------

type RestoreServiceInternals = {
	restoreSuspendedRunFromDb: (
		row: PersistedConfirmation,
		data: { approved: boolean },
	) => Promise<'resolved' | 'not-found'>;
	buildResumeData: (data: { approved: boolean }) => Record<string, unknown>;
	createMemoryConfig: jest.Mock;
	createExecutionEnvironment: jest.Mock;
	parseMcpServers: jest.Mock;
	processResumedStream: jest.Mock;
	deletePersistedConfirmation: jest.Mock;
	getTraceContext: jest.MockedFunction<(runId: string) => unknown>;
	pendingConfirmationRepository: {
		claim: jest.MockedFunction<(requestId: string) => Promise<boolean>>;
	};
	userRepository: {
		findOne: jest.MockedFunction<(opts: unknown) => Promise<User | null>>;
	};
	runState: {
		startRun: jest.Mock;
		clearActiveRun: jest.Mock;
	};
	instanceAiConfig: { mcpServers: string };
	dbSnapshotStorage: object;
	defaultTimeZone: string;
	logger: { debug: jest.Mock; warn: jest.Mock; info: jest.Mock; error: jest.Mock };
};

function buildRow(overrides: Partial<PersistedConfirmation> = {}): PersistedConfirmation {
	return {
		requestId: 'req-1',
		threadId: 'thread-1',
		userId: 'user-1',
		kind: 'suspended',
		mastraRunId: 'mastra-1',
		toolCallId: 'tool-1',
		runId: 'run-original',
		messageGroupId: 'mg-1',
		checkpointTaskId: null,
		...overrides,
	};
}

function createRestoreService(): RestoreServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as unknown as RestoreServiceInternals;

	service.pendingConfirmationRepository = {
		claim: jest.fn(async (_requestId: string) => true),
	};
	service.userRepository = {
		findOne: jest.fn(async (_opts: unknown) => ({ id: 'user-1', disabled: false }) as User),
	};
	service.runState = {
		// Mirror real behavior: startRun returns whatever runId was passed in
		// (so callers reusing the original runId from the DB row get it back).
		startRun: jest.fn((options: { runId?: string; messageGroupId?: string }) => ({
			runId: options.runId ?? 'run-new',
			abortController: new AbortController(),
			messageGroupId: options.messageGroupId ?? 'mg-1',
		})),
		clearActiveRun: jest.fn(),
	};
	service.createExecutionEnvironment = jest.fn(async () => ({
		modelId: { type: 'anthropic', model: 'claude' },
		context: {},
		orchestrationContext: {},
		memory: {},
	}));
	service.parseMcpServers = jest.fn(() => []);
	service.createMemoryConfig = jest.fn(() => ({}));
	service.processResumedStream = jest.fn(async () => undefined);
	service.deletePersistedConfirmation = jest.fn(async () => undefined);
	service.getTraceContext = jest.fn((_runId: string) => undefined);
	service.instanceAiConfig = { mcpServers: '' };
	service.dbSnapshotStorage = {};
	service.defaultTimeZone = 'UTC';
	service.logger = {
		debug: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
	};
	return service;
}

describe('InstanceAiService — restoreSuspendedRunFromDb', () => {
	const data = { approved: true };

	it("returns 'resolved' on the happy path: claim wins, agent rebuilt, processResumedStream fires", async () => {
		const service = createRestoreService();
		const row = buildRow();

		const outcome = await service.restoreSuspendedRunFromDb(row, data);

		expect(outcome).toBe('resolved');
		expect(service.pendingConfirmationRepository.claim).toHaveBeenCalledWith('req-1');
		expect(service.userRepository.findOne).toHaveBeenCalledWith({
			where: { id: 'user-1' },
			relations: ['role'],
		});
		expect(service.runState.startRun).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				runId: 'run-original',
				messageGroupId: 'mg-1',
			}),
		);
		expect(service.createExecutionEnvironment).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			'thread-1',
			'run-original',
			expect.any(AbortSignal),
			undefined,
			'mg-1',
		);
		const [, resumeData, opts] = service.processResumedStream.mock.calls[0];
		expect(resumeData).toEqual(expect.objectContaining({ approved: true }));
		expect(opts).toEqual(
			expect.objectContaining({
				mastraRunId: 'mastra-1',
				toolCallId: 'tool-1',
				threadId: 'thread-1',
				// Reused from row.runId — events fire under this key so the
				// frontend's `groupIdByRunId` correlation works.
				runId: 'run-original',
			}),
		);
	});

	it("returns 'not-found' when claim loses the race (concurrent confirm or sweeper won)", async () => {
		const service = createRestoreService();
		service.pendingConfirmationRepository.claim.mockResolvedValueOnce(false);

		const outcome = await service.restoreSuspendedRunFromDb(buildRow(), data);

		expect(outcome).toBe('not-found');
		expect(service.userRepository.findOne).not.toHaveBeenCalled();
		expect(service.processResumedStream).not.toHaveBeenCalled();
	});

	it("returns 'not-found' and logs when the row is missing mastraRunId", async () => {
		const service = createRestoreService();
		const row = buildRow({ mastraRunId: null });

		const outcome = await service.restoreSuspendedRunFromDb(row, data);

		expect(outcome).toBe('not-found');
		expect(service.deletePersistedConfirmation).toHaveBeenCalledWith('req-1');
		expect(service.pendingConfirmationRepository.claim).not.toHaveBeenCalled();
		expect(service.logger.warn).toHaveBeenCalledWith(
			'Suspended confirmation row missing mastraRunId or toolCallId',
			expect.objectContaining({ requestId: 'req-1' }),
		);
	});

	it("returns 'not-found' when the user no longer exists", async () => {
		const service = createRestoreService();
		service.userRepository.findOne.mockResolvedValueOnce(null);

		const outcome = await service.restoreSuspendedRunFromDb(buildRow(), data);

		expect(outcome).toBe('not-found');
		expect(service.processResumedStream).not.toHaveBeenCalled();
	});

	it("returns 'not-found' when the user is disabled", async () => {
		const service = createRestoreService();
		service.userRepository.findOne.mockResolvedValueOnce({
			id: 'user-1',
			disabled: true,
		} as User);

		const outcome = await service.restoreSuspendedRunFromDb(buildRow(), data);

		expect(outcome).toBe('not-found');
		expect(service.processResumedStream).not.toHaveBeenCalled();
	});

	it('clears the active-run registration when reconstruction throws', async () => {
		const service = createRestoreService();
		service.createExecutionEnvironment.mockRejectedValueOnce(new Error('sandbox boom'));

		const outcome = await service.restoreSuspendedRunFromDb(buildRow(), data);

		expect(outcome).toBe('not-found');
		expect(service.runState.clearActiveRun).toHaveBeenCalledWith('thread-1');
		expect(service.processResumedStream).not.toHaveBeenCalled();
		expect(service.logger.error).toHaveBeenCalledWith(
			'Failed to restore suspended run from DB',
			expect.objectContaining({ requestId: 'req-1' }),
		);
	});

	it('passes checkpoint metadata through when the row is a planned-task follow-up', async () => {
		const service = createRestoreService();
		const row = buildRow({ checkpointTaskId: 'cp-task-1' });

		await service.restoreSuspendedRunFromDb(row, data);

		const [, , opts] = service.processResumedStream.mock.calls[0];
		expect(opts).toEqual(
			expect.objectContaining({
				checkpoint: { isCheckpointFollowUp: true, checkpointTaskId: 'cp-task-1' },
			}),
		);
	});

	it('passes the same-process trace context through when getTraceContext returns one', async () => {
		const service = createRestoreService();
		const tracingSentinel = { actorRun: { id: 'lf-actor-1' } };
		service.getTraceContext.mockReturnValueOnce(tracingSentinel);

		await service.restoreSuspendedRunFromDb(buildRow(), { approved: true });

		expect(service.getTraceContext).toHaveBeenCalledWith('run-original');
		const [, , opts] = service.processResumedStream.mock.calls[0];
		expect(opts).toEqual(expect.objectContaining({ tracing: tracingSentinel }));
	});

	it('proceeds with undefined tracing when no same-process context exists', async () => {
		const service = createRestoreService();
		// default mock returns undefined

		await service.restoreSuspendedRunFromDb(buildRow(), { approved: true });

		const [, , opts] = service.processResumedStream.mock.calls[0];
		expect(opts.tracing).toBeUndefined();
	});
});
