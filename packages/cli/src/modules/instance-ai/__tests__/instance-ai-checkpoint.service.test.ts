import type { User } from '@n8n/db';
import type { PlannedTaskGraph, PlannedTaskRecord } from '@n8n/instance-ai';

import { InstanceAiCheckpointService } from '../checkpoint/instance-ai-checkpoint.service';

const fakeUser = { id: 'user-1' } as User;

function makeCheckpoint(id: string): PlannedTaskRecord {
	return {
		id,
		title: 'Verify work',
		kind: 'checkpoint',
		status: 'running',
		deps: [],
		spec: 'Check the work',
	} as PlannedTaskRecord;
}

function makeGraph(checkpoints: string[]): PlannedTaskGraph {
	return {
		status: 'active',
		planRunId: 'run-plan',
		messageGroupId: 'group-1',
		tasks: checkpoints.map((id) => makeCheckpoint(id)),
	} as PlannedTaskGraph;
}

function createCheckpointService(graph = makeGraph(['cp-1', 'cp-2'])) {
	const plannedTaskService = {
		getGraph: jest.fn(async () => graph),
		markCheckpointFailed: jest.fn(async () => null),
	};
	const deps = {
		backgroundTasks: {
			getRunningTasksByParentCheckpoint: jest.fn<Array<{ taskId: string }>, [string, string]>(
				(_threadId: string, _checkpointId: string) => [],
			),
		},
		runState: {
			getActiveRunId: jest.fn<string | undefined, [string]>(() => undefined),
			hasSuspendedRun: jest.fn(() => false),
			getThreadResearchMode: jest.fn(() => false),
		},
		logger: {
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
		createPlannedTaskState: jest.fn(async () => ({ plannedTaskService })),
		buildPlannedTaskFollowUpMessage: jest.fn(() => '<planned-task-follow-up />'),
		startInternalFollowUpRun: jest.fn(async () => 'run-follow-up'),
		syncPlannedTasksToUi: jest.fn(async () => {}),
		schedulePlannedTasks: jest.fn(async () => {}),
	};

	return { service: new InstanceAiCheckpointService(deps as never), deps, plannedTaskService };
}

describe('InstanceAiCheckpointService', () => {
	describe('queuePendingCheckpointReentry', () => {
		it('records a marker keyed by threadId + checkpointTaskId', () => {
			const { service } = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');

			expect(service.getPendingForThread('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('deduplicates markers for the same (thread, checkpoint) pair', () => {
			const { service } = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');

			expect(service.getPendingForThread('thread-a')?.size).toBe(1);
		});

		it('keeps markers for different threads separate', () => {
			const { service } = createCheckpointService();

			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-b', 'cp-1');

			expect(service.getPendingForThread('thread-a')).toEqual(new Set(['cp-1']));
			expect(service.getPendingForThread('thread-b')).toEqual(new Set(['cp-1']));
		});
	});

	describe('drainPendingCheckpointReentries', () => {
		it('fires re-entry for each queued marker when the thread is idle', async () => {
			const { service, deps } = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(deps.startInternalFollowUpRun).toHaveBeenCalledTimes(2);
			expect(deps.startInternalFollowUpRun).toHaveBeenCalledWith(
				fakeUser,
				'thread-a',
				'<planned-task-follow-up />',
				false,
				undefined,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: 'cp-1' },
			);
			expect(deps.startInternalFollowUpRun).toHaveBeenCalledWith(
				fakeUser,
				'thread-a',
				'<planned-task-follow-up />',
				false,
				undefined,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: 'cp-2' },
			);
			expect(service.getPendingForThread('thread-a')).toBeUndefined();
		});

		it('stops draining if a new run starts mid-drain', async () => {
			const { service, deps } = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			let calls = 0;
			deps.startInternalFollowUpRun.mockImplementation(async () => {
				calls += 1;
				if (calls === 1) {
					deps.runState.getActiveRunId.mockReturnValue('run-new');
				}
				return 'run-follow-up';
			});

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(deps.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
			expect(service.getPendingForThread('thread-a')).toEqual(new Set(['cp-2']));
		});

		it('skips a marker whose parent-tagged siblings are still running', async () => {
			const { service, deps } = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			service.queuePendingCheckpointReentry('thread-a', 'cp-2');

			deps.backgroundTasks.getRunningTasksByParentCheckpoint.mockImplementation(
				(_threadId: string, checkpointId: string) =>
					checkpointId === 'cp-1' ? [{ taskId: 'sibling-running' }] : [],
			);

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(deps.startInternalFollowUpRun).toHaveBeenCalledTimes(1);
			expect(deps.startInternalFollowUpRun).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				expect.anything(),
				expect.anything(),
				undefined,
				expect.anything(),
				{ isCheckpointFollowUp: true, checkpointTaskId: 'cp-2' },
			);
			expect(service.getPendingForThread('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('returns early when a suspended run is present', async () => {
			const { service, deps } = createCheckpointService();
			service.queuePendingCheckpointReentry('thread-a', 'cp-1');
			deps.runState.hasSuspendedRun.mockReturnValue(true);

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(deps.startInternalFollowUpRun).not.toHaveBeenCalled();
			expect(service.getPendingForThread('thread-a')).toEqual(new Set(['cp-1']));
		});

		it('is a no-op when no markers are queued', async () => {
			const { service, deps } = createCheckpointService();

			await service.drainPendingCheckpointReentries(fakeUser, 'thread-nonexistent');

			expect(deps.startInternalFollowUpRun).not.toHaveBeenCalled();
		});
	});
});
