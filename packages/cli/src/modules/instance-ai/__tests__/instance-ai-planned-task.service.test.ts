jest.mock('@n8n/instance-ai', () => ({
	applyPlannedTaskPermissions: jest.fn((context) => context),
	createAllTools: jest.fn(),
	createMemory: jest.fn(),
	MastraTaskStorage: class {},
	PlannedTaskCoordinator: class {},
	PlannedTaskStorage: class {},
	startBuildWorkflowAgentTask: jest.fn(),
	startDataTableAgentTask: jest.fn(),
	startDetachedDelegateTask: jest.fn(),
	startResearchAgentTask: jest.fn(),
}));

import type { User } from '@n8n/db';
import type { PlannedTaskGraph, PlannedTaskRecord } from '@n8n/instance-ai';

import { InstanceAiPlannedTaskService } from '../planned-tasks/instance-ai-planned-task.service';

const fakeUser = { id: 'user-1' } as User;

function createPlannedTaskService() {
	const deps = {
		orchestratorAgentId: 'agent-001',
		maxConcurrentBackgroundTasksPerThread: 5,
		defaultTimeZone: 'Europe/Madrid',
		eventBus: { publish: jest.fn() },
		logger: { warn: jest.fn() },
		runState: {
			startRun: jest.fn(() => ({
				runId: 'run-follow-up',
				abortController: new AbortController(),
				messageGroupId: 'group-1',
			})),
			hasLiveRun: jest.fn(() => false),
			getTimeZone: jest.fn(() => 'America/New_York'),
			getThreadResearchMode: jest.fn(() => false),
		},
		backgroundTasks: { getRunningTasks: jest.fn(() => []) },
		createMemoryConfig: jest.fn(() => ({})),
		revalidateActiveUser: jest.fn(async () => fakeUser),
		cancelRun: jest.fn(),
		createExecutionEnvironment: jest.fn(),
		executeRun: jest.fn(),
		getThreadPushRef: jest.fn(() => undefined),
	};

	return { service: new InstanceAiPlannedTaskService(deps as never), deps };
}

function makeTask(overrides: Partial<PlannedTaskRecord> = {}): PlannedTaskRecord {
	return {
		id: 'task-1',
		title: 'Build workflow',
		kind: 'build-workflow',
		status: 'succeeded',
		deps: [],
		spec: 'Build it',
		result: 'Workflow created',
		outcome: { workflowId: 'wf-1' },
		...overrides,
	} as PlannedTaskRecord;
}

function makeGraph(tasks: PlannedTaskRecord[]): PlannedTaskGraph {
	return {
		status: 'active',
		planRunId: 'run-plan',
		messageGroupId: 'group-1',
		tasks,
	} as PlannedTaskGraph;
}

describe('InstanceAiPlannedTaskService', () => {
	it('starts internal follow-up runs with the thread timezone', async () => {
		const { service, deps } = createPlannedTaskService();

		const runId = await service.startInternalFollowUpRun(
			fakeUser,
			'thread-a',
			'<planned-task-follow-up />',
			false,
			'group-1',
		);

		expect(runId).toBe('run-follow-up');
		expect(deps.runState.startRun).toHaveBeenCalledWith({
			threadId: 'thread-a',
			user: fakeUser,
			researchMode: false,
			messageGroupId: 'group-1',
		});
		expect(deps.executeRun).toHaveBeenCalledWith(
			expect.objectContaining({
				user: fakeUser,
				threadId: 'thread-a',
				runId: 'run-follow-up',
				message: '<planned-task-follow-up />',
				researchMode: false,
				messageGroupId: 'group-1',
				timeZone: 'America/New_York',
			}),
		);
	});

	it('does not start internal follow-up runs while a live run exists', async () => {
		const { service, deps } = createPlannedTaskService();
		deps.runState.hasLiveRun.mockReturnValue(true);

		await expect(
			service.startInternalFollowUpRun(fakeUser, 'thread-a', 'message', false),
		).resolves.toBe('');

		expect(deps.runState.startRun).not.toHaveBeenCalled();
		expect(deps.executeRun).not.toHaveBeenCalled();
		expect(deps.logger.warn).toHaveBeenCalledWith(
			'Skipping internal follow-up: active run exists',
			{
				threadId: 'thread-a',
			},
		);
	});

	it('includes checkpoint dependency outcomes in follow-up payloads', () => {
		const { service } = createPlannedTaskService();
		const buildTask = makeTask();
		const checkpoint = makeTask({
			id: 'cp-1',
			title: 'Verify workflow',
			kind: 'checkpoint',
			status: 'running',
			deps: ['task-1'],
			spec: 'Verify it',
			result: undefined,
			outcome: undefined,
		});
		const graph = makeGraph([buildTask, checkpoint]);

		const message = service.buildPlannedTaskFollowUpMessage('checkpoint', graph, { checkpoint });

		expect(message).toContain('<planned-task-follow-up type="checkpoint">');
		expect(message).toContain('"workflowId": "wf-1"');
		expect(message).toContain('(continue)');
	});
});
