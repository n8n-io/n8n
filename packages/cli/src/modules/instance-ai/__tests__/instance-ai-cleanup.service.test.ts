import type { User } from '@n8n/db';

import { InstanceAiCleanupService } from '../cleanup/instance-ai-cleanup.service';

type RunningTask = { taskId: string };
type MarkedWorkflow = { workflowId: string };
type ArchiveIfAiTemporary = jest.MockedFunction<(workflowId: string) => Promise<boolean>>;

const fakeUser = { id: 'user-1' } as User;

function createCleanupService({
	runningTaskCount = 0,
	markedWorkflows = [],
	archivedWorkflowIds = new Set<string>(),
}: {
	runningTaskCount?: number;
	markedWorkflows?: MarkedWorkflow[];
	archivedWorkflowIds?: Set<string>;
} = {}) {
	const runningTasks: RunningTask[] = Array.from({ length: runningTaskCount }, (_value, index) => ({
		taskId: `task-${index}`,
	}));
	const archiveIfAiTemporary: ArchiveIfAiTemporary = jest.fn(async (workflowId: string) =>
		archivedWorkflowIds.has(workflowId),
	);
	const deps = {
		backgroundTasks: {
			getRunningTasks: jest.fn((_threadId: string) => runningTasks),
		},
		aiBuilderTemporaryWorkflowRepository: {
			findByThread: jest.fn(async (_threadId: string) => markedWorkflows),
		},
		adapterService: {
			createContext: jest.fn((_user: User, _options: { threadId: string }) => ({
				workflowService: { archiveIfAiTemporary },
			})),
		},
		threadRepo: { findOneBy: jest.fn() },
		userRepository: { findOneBy: jest.fn() },
		compositeStore: { stores: { workflows: { deleteAllByRunId: jest.fn() } } },
		logger: { debug: jest.fn(), warn: jest.fn() },
	};

	return { service: new InstanceAiCleanupService(deps as never), deps, archiveIfAiTemporary };
}

describe('InstanceAiCleanupService', () => {
	it('defers cleanup while background tasks are running', async () => {
		const { service, deps, archiveIfAiTemporary } = createCleanupService({
			runningTaskCount: 1,
			markedWorkflows: [{ workflowId: 'wf-marked' }],
			archivedWorkflowIds: new Set(['wf-marked', 'wf-created']),
		});

		await expect(
			service.reapAiTemporaryFromRun('thread-a', fakeUser, new Set(['wf-created'])),
		).resolves.toEqual([]);

		expect(deps.backgroundTasks.getRunningTasks).toHaveBeenCalledWith('thread-a');
		expect(deps.aiBuilderTemporaryWorkflowRepository.findByThread).not.toHaveBeenCalled();
		expect(deps.adapterService.createContext).not.toHaveBeenCalled();
		expect(archiveIfAiTemporary).not.toHaveBeenCalled();
		expect(deps.logger.debug).toHaveBeenCalledWith(
			'Deferring AI-builder temporary workflow cleanup until tasks settle',
			{
				threadId: 'thread-a',
				runningTaskCount: 1,
			},
		);
	});

	it('archives marked temporary workflows after background tasks settle', async () => {
		const { service, deps, archiveIfAiTemporary } = createCleanupService({
			markedWorkflows: [{ workflowId: 'wf-marked' }],
			archivedWorkflowIds: new Set(['wf-marked', 'wf-created']),
		});

		await expect(
			service.reapAiTemporaryFromRun('thread-a', fakeUser, new Set(['wf-created'])),
		).resolves.toEqual(['wf-marked', 'wf-created']);

		expect(deps.backgroundTasks.getRunningTasks).toHaveBeenCalledWith('thread-a');
		expect(deps.aiBuilderTemporaryWorkflowRepository.findByThread).toHaveBeenCalledWith('thread-a');
		expect(deps.adapterService.createContext).toHaveBeenCalledWith(fakeUser, {
			threadId: 'thread-a',
		});
		expect(archiveIfAiTemporary).toHaveBeenCalledTimes(2);
		expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(1, 'wf-marked');
		expect(archiveIfAiTemporary).toHaveBeenNthCalledWith(2, 'wf-created');
	});
});
