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
	backgroundTasks: {
		getRunningTasksByParentCheckpoint: jest.Mock;
	};
	runState: {
		getActiveRunId: jest.Mock;
		hasSuspendedRun: jest.Mock;
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
