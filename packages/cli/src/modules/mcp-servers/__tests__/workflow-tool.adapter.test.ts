import type { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';

import { WorkflowToolAdapter } from '../workflow-tool.adapter';

const PROJECT_ID = 'project-1';
const WORKFLOW_ID = 'workflow-1';

function setup() {
	const runner = mock<CallableWorkflowRunner>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	return {
		runner,
		sharedWorkflowRepository,
		workflowRepository,
		adapter: new WorkflowToolAdapter(runner, sharedWorkflowRepository, workflowRepository),
	};
}

function workflows(count: number, overrides: Partial<WorkflowEntity> = {}): WorkflowEntity[] {
	return Array.from({ length: count }, (_, i) =>
		Object.assign(new WorkflowEntity(), {
			id: `workflow-${i}`,
			name: `Workflow ${i}`,
			description: null,
			isArchived: false,
			...overrides,
		}),
	);
}

function setupList(projectWorkflows: WorkflowEntity[]) {
	const context = setup();
	context.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects.mockResolvedValue(
		projectWorkflows.map(({ id }) => id),
	);
	context.workflowRepository.findByIds.mockResolvedValue(projectWorkflows);
	context.runner.check.mockResolvedValue({ callable: false, reason: 'not_published' });
	return context;
}

describe('WorkflowToolAdapter', () => {
	it('reports a callable workflow', async () => {
		const { runner, adapter } = setup();
		runner.check.mockResolvedValue({ callable: true });

		await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({ callable: true });
		expect(runner.check).toHaveBeenCalledWith(PROJECT_ID, WORKFLOW_ID);
	});

	it('gives the reason when the workflow cannot be a tool', async () => {
		const { runner, adapter } = setup();
		runner.check.mockResolvedValue({ callable: false, reason: 'not_callable' });

		await expect(adapter.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
			callable: false,
			reason: 'not_callable',
		});
	});

	it('describes the workflow with the input schema of the runner', async () => {
		const { runner, adapter } = setup();
		const description = {
			callable: true as const,
			name: 'Get pipeline summary',
			description: null,
			inputSchema: { type: 'object' as const, additionalProperties: true },
			nodeNames: ['When Executed by Another Workflow'],
		};
		runner.describe.mockResolvedValue(description);

		await expect(adapter.describe(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual(description);
		expect(runner.describe).toHaveBeenCalledWith(PROJECT_ID, WORKFLOW_ID);
	});

	it('runs the workflow through the shared runner, with the wait of the caller', async () => {
		const { runner, adapter } = setup();
		runner.run.mockResolvedValue({ status: 'busy' });

		await expect(
			adapter.run(PROJECT_ID, WORKFLOW_ID, { email: 'a@b.c' }, { waitMs: 5_000 }),
		).resolves.toEqual({ status: 'busy' });
		expect(runner.run).toHaveBeenCalledWith(
			PROJECT_ID,
			WORKFLOW_ID,
			{ email: 'a@b.c' },
			{ waitMs: 5_000 },
		);
	});

	describe('list', () => {
		it('gives no items and runs no check for a project without workflows', async () => {
			const { runner, adapter } = setupList([]);

			await expect(adapter.list(PROJECT_ID)).resolves.toEqual([]);
			expect(runner.check).not.toHaveBeenCalled();
		});

		it.each([10, 11, 25])('gives one item for each of %i workflows, in order', async (count) => {
			const projectWorkflows = workflows(count);
			const { runner, adapter } = setupList(projectWorkflows);

			const items = await adapter.list(PROJECT_ID);

			expect(items.map(({ workflowId }) => workflowId)).toEqual(
				projectWorkflows.map(({ id }) => id),
			);
			expect(items[0]).toEqual({
				workflowId: 'workflow-0',
				name: 'Workflow 0',
				description: null,
				check: { callable: false, reason: 'not_published' },
			});
			expect(runner.check).toHaveBeenCalledTimes(count);
		});

		it('leaves out an archived workflow and does not check it', async () => {
			const [open] = workflows(1);
			const archived = Object.assign(new WorkflowEntity(), {
				id: 'archived',
				name: 'Archived',
				isArchived: true,
			});
			const { runner, adapter } = setupList([open, archived]);

			const items = await adapter.list(PROJECT_ID);

			expect(items.map(({ workflowId }) => workflowId)).toEqual([open.id]);
			expect(runner.check).toHaveBeenCalledTimes(1);
			expect(runner.check).not.toHaveBeenCalledWith(PROJECT_ID, 'archived');
		});

		it('runs at most 10 checks at the same time', async () => {
			const { runner, adapter } = setupList(workflows(25));
			let running = 0;
			let mostRunning = 0;
			runner.check.mockImplementation(async () => {
				running++;
				mostRunning = Math.max(mostRunning, running);
				await new Promise((resolve) => setImmediate(resolve));
				running--;
				return { callable: false, reason: 'not_published' };
			});

			await adapter.list(PROJECT_ID);

			expect(mostRunning).toBe(10);
		});
	});
});
