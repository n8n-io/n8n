import type { InstanceAiEvent } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { ManagedBackgroundTask, SpawnManagedBackgroundTaskOptions } from '@n8n/instance-ai';

import {
	InstanceAiBackgroundTaskService,
	type InstanceAiBackgroundTaskServiceDeps,
} from '../background-tasks/instance-ai-background-task.service';

const fakeUser = { id: 'user-1' } as User;

function createTask(overrides: Partial<ManagedBackgroundTask> = {}): ManagedBackgroundTask {
	return {
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
		...overrides,
	};
}

function createService({ timedOutThread = false }: { timedOutThread?: boolean } = {}) {
	let spawnOptions: SpawnManagedBackgroundTaskOptions | undefined;
	const task = createTask();
	const snapshotStorage = {} as InstanceAiBackgroundTaskServiceDeps['dbSnapshotStorage'];
	const deps = {
		orchestratorAgentId: 'agent-001',
		backgroundTasks: {
			spawn: jest.fn((options: SpawnManagedBackgroundTaskOptions) => {
				spawnOptions = options;
				return { status: 'started', task };
			}),
			getRunningTasks: jest.fn((_threadId: string) => []),
			cancelThread: jest.fn((_threadId: string) => []),
			cancelTask: jest.fn((_threadId: string, _taskId: string) => undefined),
			cancelAll: jest.fn(() => []),
			queueCorrection: jest.fn(() => 'queued'),
			getTaskSnapshots: jest.fn(() => []),
		},
		runState: {
			startRun: jest.fn(),
			clearActiveRun: jest.fn(),
			cancelThread: jest.fn(() => ({})),
			getMessageGroupId: jest.fn((_threadId: string) => 'group-1'),
			getThreadUser: jest.fn((_threadId: string) => fakeUser),
			getActiveRunId: jest.fn((_threadId: string) => undefined),
			hasSuspendedRun: jest.fn((_threadId: string) => false),
			getThreadResearchMode: jest.fn((_threadId: string) => false),
		},
		liveness: {
			backgroundTaskIdleTimeoutMs: 100,
			hasTimedOutActiveRunThread: jest.fn((threadId: string) =>
				timedOutThread ? threadId === 'thread-a' : false,
			),
			markRunTimedOut: jest.fn(),
		},
		eventBus: { publish: jest.fn((_threadId: string, _event: InstanceAiEvent) => {}) },
		logger: { warn: jest.fn(), debug: jest.fn() },
		dbSnapshotStorage: snapshotStorage,
		finalizeDetachedTraceRun: jest.fn(async () => {}),
		finalizeBackgroundTaskTracing: jest.fn(async () => {}),
		handlePlannedTaskSettlement: jest.fn(async () => {}),
		recordBackgroundTerminalOutcome: jest.fn(async () => {}),
		saveAgentTreeSnapshot: jest.fn(async () => {}),
		startInternalFollowUpRun: jest.fn(async () => 'run-follow-up'),
		queuePendingCheckpointReentry: jest.fn(),
		maybeReenterParentCheckpoint: jest.fn(async () => false),
		cancelAwaitingApprovalPlan: jest.fn(async () => {}),
		finalizeCancelledSuspendedRun: jest.fn(async () => {}),
	} satisfies InstanceAiBackgroundTaskServiceDeps;

	return {
		deps,
		snapshotStorage,
		task,
		service: new InstanceAiBackgroundTaskService(deps),
		getSpawnOptions: () => {
			if (!spawnOptions) throw new Error('Background task was not spawned');
			return spawnOptions;
		},
	};
}

describe('InstanceAiBackgroundTaskService', () => {
	it('starts an internal follow-up when the last direct background task settles normally', async () => {
		const { deps, service, snapshotStorage, task, getSpawnOptions } = createService();

		const result = service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'task-1',
				threadId: 'thread-a',
				agentId: 'agent-builder',
				role: 'workflow-builder',
				run: async () => 'done',
			},
			snapshotStorage,
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(result).toEqual({ status: 'started', taskId: 'task-1', agentId: 'agent-builder' });
		expect(deps.startInternalFollowUpRun).toHaveBeenCalledWith(
			fakeUser,
			'thread-a',
			expect.stringContaining('<background-task-completed>'),
			false,
			'group-1',
		);
	});

	it('skips internal follow-up when the active run already timed out', async () => {
		const { deps, service, snapshotStorage, task, getSpawnOptions } = createService({
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
			snapshotStorage,
			'group-1',
		);
		await getSpawnOptions().onSettled?.(task);

		expect(deps.startInternalFollowUpRun).not.toHaveBeenCalled();
		expect(deps.recordBackgroundTerminalOutcome).toHaveBeenCalledWith(task);
		expect(deps.saveAgentTreeSnapshot).toHaveBeenCalledWith(
			'thread-a',
			'run-1',
			snapshotStorage,
			true,
			'group-1',
		);
	});
});
