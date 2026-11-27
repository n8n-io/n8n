import type { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';

import { WorkflowToolAdapter } from '../workflow-tool.adapter';

const PROJECT_ID = 'project-1';
const WORKFLOW_ID = 'workflow-1';

function setup() {
	const runner = mock<CallableWorkflowRunner>();
	const sharedWorkflows = mock<SharedWorkflowRepository>();
	const workflows = mock<WorkflowRepository>();
	return {
		runner,
		sharedWorkflows,
		workflows,
		adapter: new WorkflowToolAdapter(runner, sharedWorkflows, workflows),
	};
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

	it('lists the workflows of the project without the check, and leaves out archived ones', async () => {
		const { runner, sharedWorkflows, workflows, adapter } = setup();
		sharedWorkflows.findOwnedWorkflowIdsByProjects.mockResolvedValue(['w-1', 'w-2']);
		workflows.findByIds.mockResolvedValue([
			Object.assign(new WorkflowEntity(), { id: 'w-1', name: 'Lead score', description: null }),
			Object.assign(new WorkflowEntity(), { id: 'w-2', name: 'Old', isArchived: true }),
		]);

		await expect(adapter.list(PROJECT_ID)).resolves.toEqual([
			{ workflowId: 'w-1', name: 'Lead score', description: null },
		]);
		expect(runner.check).not.toHaveBeenCalled();
	});

	it('lists only the given workflows that the project owns', async () => {
		const { sharedWorkflows, workflows, adapter } = setup();
		sharedWorkflows.findOwnedWorkflowIdsByProjects.mockResolvedValue(['w-1', 'w-2']);
		workflows.findByIds.mockResolvedValue([]);

		await adapter.list(PROJECT_ID, ['w-2', 'w-9']);

		expect(workflows.findByIds).toHaveBeenCalledWith(['w-2'], expect.anything());
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
});
