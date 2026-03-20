import type { SpawnBackgroundTaskOptions, SpawnBackgroundTaskResult } from '@n8n/instance-ai';

jest.mock('@n8n/instance-ai', () => ({
	addPlanArtifact: jest.fn(),
	createInstanceAgent: jest.fn(),
	createAllTools: jest.fn(),
	createMemory: jest.fn(),
	createSandbox: jest.fn(),
	createWorkspace: jest.fn(),
	McpClientManager: jest.fn(),
	mapMastraChunkToEvent: jest.fn(),
	BuilderSandboxFactory: jest.fn(),
	SnapshotManager: jest.fn(),
	createDomainAccessTracker: jest.fn(),
	derivePlanStatus: jest.fn(),
	ensurePlanExecutionContext: jest.fn(),
	getPhaseExecution: jest.fn(),
	getRunnablePhaseIds: jest.fn(),
	patchPlanPhase: jest.fn(),
	reconcilePlanPhases: jest.fn(),
	startBuildWorkflowAgentTask: jest.fn(),
	startDataTableAgentTask: jest.fn(),
	startResearchWithAgentTask: jest.fn(),
}));

import { InstanceAiService } from '../instance-ai.service';

type DetachedTaskStub = {
	taskId: string;
	threadId: string;
	runId: string;
	role: string;
	agentId: string;
	kind: string;
	executionKey: string;
	title: string;
	status: 'running' | 'suspended' | 'completed' | 'failed';
	startedAt: number;
	updatedAt: number;
	abortController: AbortController;
	corrections: string[];
};

type ServiceInternalView = {
	backgroundTasks: Map<string, DetachedTaskStub>;
	saveTaskRunSnapshot: jest.Mock<Promise<void>, [string, unknown, 'task-created' | 'task-updated']>;
	createPlanStorage: jest.Mock;
	shouldPersistDetachedSnapshot: jest.Mock<boolean, [string, string]>;
	patchPlanFromTaskResult: jest.Mock<Promise<void>, unknown[]>;
	saveAgentTreeSnapshot: jest.Mock<Promise<void>, unknown[]>;
	continuePlanExecution: jest.Mock<Promise<void>, unknown[]>;
	maybeCleanupThreadState: jest.Mock<void, [string]>;
	getCurrentMessageGroupId: jest.Mock<string, [string]>;
	logger: { warn: jest.Mock; error: jest.Mock };
	MAX_BACKGROUND_TASKS_PER_THREAD: number;
	spawnBackgroundTask: (
		runId: string,
		opts: SpawnBackgroundTaskOptions,
		snapshotStorage: unknown,
	) => SpawnBackgroundTaskResult;
};

function createService(): ServiceInternalView {
	const service = Object.create(InstanceAiService.prototype) as InstanceAiService;
	const internal = service as unknown as ServiceInternalView;
	internal.backgroundTasks = new Map();
	internal.saveTaskRunSnapshot = jest.fn().mockResolvedValue(undefined);
	internal.createPlanStorage = jest.fn().mockReturnValue({
		get: jest.fn(),
	});
	internal.shouldPersistDetachedSnapshot = jest.fn().mockReturnValue(false);
	internal.patchPlanFromTaskResult = jest.fn().mockResolvedValue(undefined);
	internal.saveAgentTreeSnapshot = jest.fn().mockResolvedValue(undefined);
	internal.continuePlanExecution = jest.fn().mockResolvedValue(undefined);
	internal.maybeCleanupThreadState = jest.fn();
	internal.getCurrentMessageGroupId = jest.fn().mockReturnValue('mg-1');
	internal.logger = {
		warn: jest.fn(),
		error: jest.fn(),
	};
	internal.MAX_BACKGROUND_TASKS_PER_THREAD = 5;
	return internal;
}

describe('InstanceAiService background task single-flight', () => {
	it('reuses an active task with the same execution key', () => {
		const service = createService();
		const existingTask: DetachedTaskStub = {
			taskId: 'build-existing',
			threadId: 'thread-1',
			runId: 'run-1',
			role: 'workflow-builder',
			agentId: 'agent-builder-existing',
			kind: 'workflow-build',
			executionKey: 'plan:plan-1:phase-1:workflow-build',
			title: 'Building workflow',
			status: 'running',
			startedAt: 1,
			updatedAt: 1,
			abortController: new AbortController(),
			corrections: [],
		};
		service.backgroundTasks.set(existingTask.taskId, existingTask);

		const result = service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'build-new',
				threadId: 'thread-1',
				agentId: 'agent-builder-new',
				role: 'workflow-builder',
				kind: 'workflow-build',
				executionKey: 'plan:plan-1:phase-1:workflow-build',
				title: 'Building workflow',
				run: async () => '',
			},
			{},
		);

		expect(result).toEqual({
			started: true,
			reused: true,
			taskId: 'build-existing',
			executionKey: 'plan:plan-1:phase-1:workflow-build',
		});
		expect(service.backgroundTasks.size).toBe(1);
		expect(service.saveTaskRunSnapshot).not.toHaveBeenCalled();
	});

	it('persists executionKey on a newly created task run', () => {
		const service = createService();

		const result = service.spawnBackgroundTask(
			'run-1',
			{
				taskId: 'build-new',
				threadId: 'thread-1',
				agentId: 'agent-builder-new',
				role: 'workflow-builder',
				kind: 'workflow-build',
				executionKey: 'workflow-build:new:abc123',
				title: 'Building workflow',
				run: async () => await new Promise<string>(() => {}),
			},
			{},
		);

		expect(result).toEqual({
			started: true,
			reused: false,
			taskId: 'build-new',
			executionKey: 'workflow-build:new:abc123',
		});
		expect(service.saveTaskRunSnapshot).toHaveBeenCalledWith(
			'thread-1',
			expect.objectContaining({
				taskId: 'build-new',
				executionKey: 'workflow-build:new:abc123',
			}),
			'task-created',
		);
	});
});
