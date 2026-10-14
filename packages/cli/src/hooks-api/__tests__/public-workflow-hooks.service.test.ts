import { mock } from 'vitest-mock-extended';
import type { Workflow } from 'n8n-workflow';

import { ExternalHooks } from '@/external-hooks';
import type { WorkflowHookContextService } from '@/workflow-hook-context.service';

import { PublicWorkflowHooksService } from '../v1/public-workflow-hooks.service';

describe('PublicWorkflowHooksService', () => {
	it('should pass a V1 event, not the internal workflow, to the pre-execute handler', async () => {
		const externalHooks = new ExternalHooks(mock(), mock(), mock(), mock(), mock(), mock(), mock());
		const service = new PublicWorkflowHooksService(externalHooks);
		const handler = vi.fn();

		service.onPreExecute(handler);

		const workflow = mock<Workflow>({ id: 'wf-1', name: 'My workflow', active: true });
		await externalHooks.run('workflow.preExecute', [
			workflow,
			'trigger',
			mock<WorkflowHookContextService>(),
			'instance_ai',
		]);

		expect(handler).toHaveBeenCalledWith({
			workflow: { id: 'wf-1', name: 'My workflow', active: true },
			mode: 'trigger',
			source: 'instance_ai',
		});
		expect(handler.mock.calls[0][0].workflow).not.toBe(workflow);
	});

	it('should let a handler error stop the execution', async () => {
		const externalHooks = new ExternalHooks(mock(), mock(), mock(), mock(), mock(), mock(), mock());
		const service = new PublicWorkflowHooksService(externalHooks);
		service.onPreExecute(vi.fn().mockRejectedValue(new Error('Execution limit reached')));

		await expect(
			externalHooks.run('workflow.preExecute', [
				mock<Workflow>({ id: 'wf-1' }),
				'manual',
				mock<WorkflowHookContextService>(),
			]),
		).rejects.toThrow('Execution limit reached');
	});
});
