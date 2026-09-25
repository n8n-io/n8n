import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';
import { dropRedactionPolicy, getWorkflowProjectDetailsSafe } from '@/workflows/utils';

describe('dropRedactionPolicy', () => {
	it('removes redactionPolicy when present', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { redactionPolicy: 'all', executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings.redactionPolicy).toBeUndefined();
		expect(workflow.settings.executionOrder).toBe('v1');
	});

	it('is a no-op when settings has no redactionPolicy', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings).toEqual({ executionOrder: 'v1' });
	});

	it('is a no-op when settings is undefined', () => {
		const workflow = new WorkflowEntity();

		expect(() => dropRedactionPolicy(workflow)).not.toThrow();
		expect(workflow.settings).toBeUndefined();
	});
});

describe('getWorkflowProjectDetailsSafe', () => {
	const logger = mockInstance(Logger);

	it('returns the project id and name when the lookup succeeds', async () => {
		const ownershipService = mock<OwnershipService>();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'project-id', name: 'Project Name' }),
		);

		const result = await getWorkflowProjectDetailsSafe(ownershipService, 'workflow-id');

		expect(result).toEqual({ projectId: 'project-id', projectName: 'Project Name' });
		expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-id');
	});

	it('falls back to empty strings when the lookup throws', async () => {
		const ownershipService = mock<OwnershipService>();
		ownershipService.getWorkflowProjectCached.mockRejectedValue(new Error('no project'));

		const result = await getWorkflowProjectDetailsSafe(ownershipService, 'workflow-id');

		expect(result).toEqual({ projectId: '', projectName: '' });
		expect(logger.warn).toHaveBeenCalled();
	});
});
