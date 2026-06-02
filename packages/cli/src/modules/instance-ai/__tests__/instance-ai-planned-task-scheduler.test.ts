jest.mock('@n8n/instance-ai', () => ({
	ThreadTaskStorage: class {},
	PlannedTaskStorage: class {},
	PlannedTaskCoordinator: class {},
	createAllTools: jest.fn(() => new Map()),
	applyPlannedTaskPermissions: jest.fn((context: unknown) => context),
	startBuildWorkflowAgentTask: jest.fn(),
	startDetachedDelegateTask: jest.fn(),
}));

import type { User } from '@n8n/db';
import type {
	ManagedBackgroundTask,
	OrchestrationContext,
	PlannedTaskGraph,
	PlannedTaskRecord,
} from '@n8n/instance-ai';

import {
	InstanceAiPlannedTaskScheduler,
	type InstanceAiPlannedTaskSchedulerHost,
} from '../instance-ai-planned-task-scheduler';

const fakeUser = { id: 'user-1' } as User;

type PlannedTaskCoordinatorMock = {
	getGraph: jest.Mock;
	tick: jest.Mock;
	markSucceeded: jest.Mock;
	markFailed: jest.Mock;
	markCancelled: jest.Mock;
	markRunning: jest.Mock;
	markCheckpointFailed: jest.Mock;
	revertToActive: jest.Mock;
	revertCheckpointToPlanned: jest.Mock;
	clear: jest.Mock;
};

type SchedulerInternals = {
	doSchedulePlannedTasks: (user: User, threadId: string) => Promise<void>;
	reenterCheckpointById: InstanceAiPlannedTaskScheduler['reenterCheckpointById'];
	queuePendingCheckpointReentry: InstanceAiPlannedTaskScheduler['queuePendingCheckpointReentry'];
	createPlannedTaskState: jest.Mock;
	pendingCheckpointReentries: Map<string, Set<string>>;
};

function buildScheduler(
	overrides: {
		host?: Partial<InstanceAiPlannedTaskSchedulerHost>;
		runState?: Record<string, unknown>;
		backgroundTasks?: Record<string, unknown>;
		eventBus?: Record<string, unknown>;
		maxConcurrentTasksPerThread?: number;
	} = {},
): {
	scheduler: InstanceAiPlannedTaskScheduler;
	internals: SchedulerInternals;
	host: InstanceAiPlannedTaskSchedulerHost;
	plannedTaskService: PlannedTaskCoordinatorMock;
	eventBus: { publish: jest.Mock };
} {
	const host: InstanceAiPlannedTaskSchedulerHost = {
		revalidateActiveUser: jest.fn(async () => fakeUser),
		cancelRun: jest.fn(),
		startInternalFollowUpRun: jest.fn(async () => 'follow-up-run'),
		createPlannedTaskEnvironment: jest.fn(async () => ({
			orchestrationContext: {} as OrchestrationContext,
		})),
		...overrides.host,
	};
	const eventBus = (overrides.eventBus ?? { publish: jest.fn() }) as { publish: jest.Mock };
	const scheduler = new InstanceAiPlannedTaskScheduler({
		logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() } as never,
		eventBus: eventBus as never,
		agentMemory: {} as never,
		runState: (overrides.runState ?? {
			hasLiveRun: jest.fn(() => false),
			getActiveRunId: jest.fn(() => undefined),
			hasSuspendedRun: jest.fn(() => false),
		}) as never,
		backgroundTasks: (overrides.backgroundTasks ?? {
			getRunningTasks: jest.fn(() => []),
			getRunningTasksByParentCheckpoint: jest.fn(() => []),
		}) as never,
		maxConcurrentTasksPerThread: overrides.maxConcurrentTasksPerThread ?? 5,
		host,
	});

	const plannedTaskService: PlannedTaskCoordinatorMock = {
		getGraph: jest.fn(async () => null),
		tick: jest.fn(async () => ({ type: 'none' })),
		markSucceeded: jest.fn(async () => null),
		markFailed: jest.fn(async () => null),
		markCancelled: jest.fn(async () => null),
		markRunning: jest.fn(async () => {}),
		markCheckpointFailed: jest.fn(async () => {}),
		revertToActive: jest.fn(async () => {}),
		revertCheckpointToPlanned: jest.fn(async () => {}),
		clear: jest.fn(async () => {}),
	};
	const internals = scheduler as unknown as SchedulerInternals;
	internals.createPlannedTaskState = jest.fn(async () => ({
		plannedTaskService,
		taskStorage: { save: jest.fn(async () => {}) },
		memory: {},
	}));

	return { scheduler, internals, host, plannedTaskService, eventBus };
}

describe('InstanceAiPlannedTaskScheduler', () => {
	describe('buildPlannedTaskFollowUpMessage', () => {
		it('wraps the plan payload in a typed follow-up envelope', () => {
			const { scheduler } = buildScheduler();
			const graph = {
				tasks: [
					{ id: 't1', title: 'Build', kind: 'build-workflow', status: 'succeeded', deps: [] },
				],
			} as unknown as PlannedTaskGraph;

			const message = scheduler.buildPlannedTaskFollowUpMessage('synthesize', graph);

			expect(message).toContain('<planned-task-follow-up type="synthesize">');
			expect(message).toContain('"id": "t1"');
			expect(message).toContain('(continue)');
		});

		it('includes the checkpoint dependency context when provided', () => {
			const { scheduler } = buildScheduler();
			const graph = {
				tasks: [
					{
						id: 'dep',
						title: 'Builder',
						kind: 'build-workflow',
						status: 'succeeded',
						deps: [],
						outcome: { workflowId: 'wf-1' },
					},
					{ id: 'cp', title: 'Verify', kind: 'checkpoint', status: 'running', deps: ['dep'] },
				],
			} as unknown as PlannedTaskGraph;
			const checkpoint = graph.tasks[1] as PlannedTaskRecord;

			const message = scheduler.buildPlannedTaskFollowUpMessage('checkpoint', graph, {
				checkpoint,
			});

			expect(message).toContain('<planned-task-follow-up type="checkpoint">');
			expect(message).toContain('"dependsOn"');
			expect(message).toContain('"id": "dep"');
		});
	});

	describe('getCheckpointAllowedWorkflowIds', () => {
		it('returns the workflow IDs of the checkpoint dependencies', async () => {
			const { scheduler, plannedTaskService } = buildScheduler();
			plannedTaskService.getGraph.mockResolvedValue({
				tasks: [
					{ id: 'dep', deps: [], outcome: { workflowId: 'wf-1' } },
					{ id: 'other', deps: [], outcome: { workflowId: 'wf-2' } },
					{ id: 'cp', kind: 'checkpoint', deps: ['dep'] },
				],
			});

			const allowed = await scheduler.getCheckpointAllowedWorkflowIds('thread-a', 'cp');

			expect([...allowed]).toEqual(['wf-1']);
		});

		it('returns an empty set when the checkpoint is missing', async () => {
			const { scheduler, plannedTaskService } = buildScheduler();
			plannedTaskService.getGraph.mockResolvedValue({ tasks: [] });

			const allowed = await scheduler.getCheckpointAllowedWorkflowIds('thread-a', 'cp');

			expect(allowed.size).toBe(0);
		});
	});

	describe('handlePlannedTaskSettlement', () => {
		it('ignores tasks that are not planned tasks', async () => {
			const { scheduler, host } = buildScheduler();
			const task = { threadId: 'thread-a' } as ManagedBackgroundTask;

			await scheduler.handlePlannedTaskSettlement(fakeUser, task, 'succeeded');

			expect(host.startInternalFollowUpRun).not.toHaveBeenCalled();
		});

		it('marks the planned task succeeded and reschedules', async () => {
			const { scheduler, plannedTaskService, internals } = buildScheduler();
			const task = {
				threadId: 'thread-a',
				plannedTaskId: 'pt-1',
				result: 'done',
			} as ManagedBackgroundTask;

			await scheduler.handlePlannedTaskSettlement(fakeUser, task, 'succeeded');

			expect(plannedTaskService.markSucceeded).toHaveBeenCalledWith('thread-a', 'pt-1', {
				result: 'done',
				outcome: undefined,
			});
			// schedulePlannedTasks → doSchedulePlannedTasks revalidates the owner.
			expect(internals.createPlannedTaskState).toHaveBeenCalled();
		});
	});

	describe('doSchedulePlannedTasks', () => {
		it('cancels the run when the owner is no longer authorized', async () => {
			const { host, internals } = buildScheduler({
				host: { revalidateActiveUser: jest.fn(async () => null) },
			});

			await internals.doSchedulePlannedTasks(fakeUser, 'thread-a');

			expect(host.cancelRun).toHaveBeenCalledWith('thread-a');
			expect(internals.createPlannedTaskState).not.toHaveBeenCalled();
		});

		it('starts a replan follow-up for the revalidated owner', async () => {
			const freshUser = { id: 'user-1' } as User;
			const { scheduler, host, plannedTaskService } = buildScheduler({
				host: { revalidateActiveUser: jest.fn(async () => freshUser) },
			});
			const graph = { planRunId: 'plan-1', messageGroupId: 'group-1', tasks: [] };
			plannedTaskService.getGraph.mockResolvedValue(graph);
			plannedTaskService.tick.mockResolvedValue({ type: 'replan', graph, failedTask: undefined });

			await (scheduler as unknown as SchedulerInternals).doSchedulePlannedTasks(
				fakeUser,
				'thread-a',
			);

			expect(host.startInternalFollowUpRun).toHaveBeenCalledWith(
				freshUser,
				'thread-a',
				expect.stringContaining('<planned-task-follow-up type="replan">'),
				'group-1',
				true,
			);
		});

		it('reverts the graph to active when the replan follow-up cannot start', async () => {
			const { scheduler, plannedTaskService } = buildScheduler({
				host: {
					revalidateActiveUser: jest.fn(async () => fakeUser),
					startInternalFollowUpRun: jest.fn(async () => ''),
				},
			});
			const graph = { planRunId: 'plan-1', messageGroupId: 'group-1', tasks: [] };
			plannedTaskService.getGraph.mockResolvedValue(graph);
			plannedTaskService.tick.mockResolvedValue({ type: 'replan', graph, failedTask: undefined });

			await (scheduler as unknown as SchedulerInternals).doSchedulePlannedTasks(
				fakeUser,
				'thread-a',
			);

			expect(plannedTaskService.revertToActive).toHaveBeenCalledWith('thread-a');
		});
	});

	describe('reenterCheckpointById', () => {
		it('re-enters a running checkpoint follow-up', async () => {
			const { scheduler, host, plannedTaskService } = buildScheduler();
			plannedTaskService.getGraph.mockResolvedValue({
				tasks: [{ id: 'cp', kind: 'checkpoint', status: 'running', deps: [] }],
			});

			const result = await scheduler.reenterCheckpointById(fakeUser, 'thread-a', 'cp');

			expect(result).toBe(true);
			expect(host.startInternalFollowUpRun).toHaveBeenCalledWith(
				fakeUser,
				'thread-a',
				expect.stringContaining('<planned-task-follow-up type="checkpoint">'),
				undefined,
				false,
				{ isCheckpointFollowUp: true, checkpointTaskId: 'cp' },
			);
		});

		it('does not re-enter when the checkpoint is no longer running', async () => {
			const { scheduler, host, plannedTaskService } = buildScheduler();
			plannedTaskService.getGraph.mockResolvedValue({
				tasks: [{ id: 'cp', kind: 'checkpoint', status: 'succeeded', deps: [] }],
			});

			const result = await scheduler.reenterCheckpointById(fakeUser, 'thread-a', 'cp');

			expect(result).toBe(false);
			expect(host.startInternalFollowUpRun).not.toHaveBeenCalled();
		});
	});

	describe('drainPendingCheckpointReentries', () => {
		it('re-enters each queued checkpoint when the thread is idle', async () => {
			const { scheduler, internals } = buildScheduler();
			internals.reenterCheckpointById = jest.fn(async () => true);
			scheduler.queuePendingCheckpointReentry('thread-a', 'cp-1');
			scheduler.queuePendingCheckpointReentry('thread-a', 'cp-2');

			await scheduler.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(internals.reenterCheckpointById).toHaveBeenCalledTimes(2);
			expect(internals.pendingCheckpointReentries.get('thread-a')).toBeUndefined();
		});

		it('keeps a marker queued when its parent siblings are still running', async () => {
			const backgroundTasks = {
				getRunningTasksByParentCheckpoint: jest.fn((_threadId: string, cp: string) =>
					cp === 'cp-1' ? [{ taskId: 'sibling' }] : [],
				),
			};
			const { scheduler, internals } = buildScheduler({
				runState: {
					getActiveRunId: jest.fn(() => undefined),
					hasSuspendedRun: jest.fn(() => false),
				},
				backgroundTasks,
			});
			internals.reenterCheckpointById = jest.fn(async () => true);
			scheduler.queuePendingCheckpointReentry('thread-a', 'cp-1');
			scheduler.queuePendingCheckpointReentry('thread-a', 'cp-2');

			await scheduler.drainPendingCheckpointReentries(fakeUser, 'thread-a');

			expect(internals.reenterCheckpointById).toHaveBeenCalledTimes(1);
			expect(internals.reenterCheckpointById).toHaveBeenCalledWith(fakeUser, 'thread-a', 'cp-2');
			expect(internals.pendingCheckpointReentries.get('thread-a')).toEqual(new Set(['cp-1']));
		});
	});
});
