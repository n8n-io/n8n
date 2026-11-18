import type { WorkflowTestFile } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	User,
	WorkflowDependencyRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowTestCallerService } from '../workflow-test-caller.service';
import type { WorkflowTestFileService } from '../workflow-test-file.service';
import { WorkflowTestRunQueue } from '../workflow-test-run-queue.service';

const user = mock<User>({ id: 'user-1' });

const workflow = (id: string, name: string, isArchived = false) =>
	mock<WorkflowEntity>({ id, name, isArchived });

const testFile = (workflowId: string): WorkflowTestFile => ({
	id: `file-${workflowId}`,
	workflowId,
	source: '',
	updatedAt: '2026-11-18T10:00:00.000Z',
	lastRun: null,
});

describe('WorkflowTestCallerService', () => {
	const dependencyRepository = mock<WorkflowDependencyRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const fileService = mock<WorkflowTestFileService>();

	const service = new WorkflowTestCallerService(
		mock<Logger>(),
		dependencyRepository,
		workflowRepository,
		workflowFinderService,
		fileService,
		new WorkflowTestRunQueue(),
	);

	beforeEach(() => {
		vi.resetAllMocks();
		// The draft and the published version of `billing` both call the sub-workflow.
		dependencyRepository.findDependenciesForResources.mockResolvedValue([
			{
				workflowId: 'billing',
				dependencyType: 'workflowCall',
				dependencyKey: 'sub',
				publishedVersionId: null,
			},
			{
				workflowId: 'billing',
				dependencyType: 'workflowCall',
				dependencyKey: 'sub',
				publishedVersionId: 'v1',
			},
			{
				workflowId: 'signup',
				dependencyType: 'workflowCall',
				dependencyKey: 'sub',
				publishedVersionId: null,
			},
			{
				workflowId: 'old',
				dependencyType: 'workflowCall',
				dependencyKey: 'sub',
				publishedVersionId: null,
			},
			{
				workflowId: 'sub',
				dependencyType: 'workflowCall',
				dependencyKey: 'sub',
				publishedVersionId: null,
			},
		]);
		workflowRepository.findByIds.mockResolvedValue([
			workflow('signup', 'Signup flow'),
			workflow('billing', 'Billing flow'),
			workflow('old', 'Old flow', true),
		]);
	});

	it('finds each caller once, without the workflow itself and without archived callers', async () => {
		const callers = await service.findCallers('sub');

		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['billing', 'signup', 'old'], {
			fields: ['name', 'isArchived'],
		});
		expect(callers).toEqual([
			{ workflowId: 'billing', name: 'Billing flow' },
			{ workflowId: 'signup', name: 'Signup flow' },
		]);
	});

	it('lists the readable callers and counts the others', async () => {
		fileService.get.mockImplementation(async (id) => (id === 'billing' ? testFile(id) : null));
		workflowFinderService.findWorkflowForUser.mockImplementation(async (id) =>
			id === 'billing' ? workflow(id, 'Billing flow') : null,
		);

		expect(await service.listForUser(user, 'sub')).toEqual({
			callers: [
				{
					workflowId: 'billing',
					name: 'Billing flow',
					testFileId: 'file-billing',
					running: false,
					lastRun: null,
				},
			],
			inaccessibleCount: 1,
		});
	});

	it('runs the tests of each caller with tests once, until the run ends', async () => {
		fileService.get.mockImplementation(async (id) => testFile(id));
		workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow('any', 'Any'));
		let finishRuns: () => void = () => {};
		const runsEnd = new Promise<void>((resolve) => (finishRuns = resolve));
		fileService.run.mockImplementation(async () => {
			await runsEnd;
			return { runId: 'r', status: 'passed', errors: [], tests: [], finishedAt: '' };
		});

		expect(await service.startForUser(user, 'sub')).toEqual({ started: ['billing', 'signup'] });
		expect(await service.startForUser(user, 'sub')).toEqual({ started: [] });

		const { callers } = await service.listForUser(user, 'sub');
		expect(callers.map((caller) => caller.running)).toEqual([true, true]);

		finishRuns();
		await vi.waitFor(() => expect(fileService.run).toHaveBeenCalledTimes(2));
		await vi.waitFor(async () => {
			const after = await service.listForUser(user, 'sub');
			expect(after.callers.map((caller) => caller.running)).toEqual([false, false]);
		});
		expect(fileService.run).toHaveBeenCalledWith(user, 'billing', 'file-billing');
	});
});
