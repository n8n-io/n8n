import type { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CallableWorkflowRunner } from '@/workflows/callable/callable-workflow-runner.service';

import { WorkflowToolAdapter } from '../workflow-tool.adapter';

const PROJECT_ID = 'project-1';
const WORKFLOW_ID = 'workflow-1';

function setup() {
	const runner = mock<CallableWorkflowRunner>();
	return {
		runner,
		adapter: new WorkflowToolAdapter(
			runner,
			mock<SharedWorkflowRepository>(),
			mock<WorkflowRepository>(),
		),
	};
}

describe('WorkflowToolAdapter', () => {
	it('reports a callable workflow without giving the workflow to the module', async () => {
		const { runner, adapter } = setup();
		runner.check.mockResolvedValue({ callable: true, workflow: new WorkflowEntity() });

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
