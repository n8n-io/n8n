import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AttachableWorkflowsService } from '../attachable-workflows.service';

type FoundWorkflow = WorkflowEntity & { projectId: string };

function wf(overrides: Partial<FoundWorkflow>): FoundWorkflow {
	return {
		id: 'wf-1',
		name: 'Workflow',
		active: false,
		nodes: [],
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		projectId: 'project-1',
		...overrides,
	} as FoundWorkflow;
}

const manualTrigger = { type: 'n8n-nodes-base.manualTrigger' } as WorkflowEntity['nodes'][number];
const noTrigger = { type: 'n8n-nodes-base.set' } as WorkflowEntity['nodes'][number];

function setup() {
	const workflowFinderService = mock<WorkflowFinderService>();
	const service = new AttachableWorkflowsService(workflowFinderService);
	const user = mock<User>({ id: 'user-1' });
	return { service, workflowFinderService, user };
}

describe('AttachableWorkflowsService', () => {
	it('scopes the lookup to the caller and workflow:read', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);

		await service.list(user, 'project-9');

		expect(workflowFinderService.findAllWorkflowsForUser).toHaveBeenCalledWith(
			user,
			['workflow:read'],
			undefined,
			'project-9',
		);
	});

	it('returns only workflows with a supported trigger, mapped to name/active/triggerType', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([
			wf({ id: 'a', name: 'Has trigger', active: true, nodes: [noTrigger, manualTrigger] }),
			wf({ id: 'b', name: 'No trigger', nodes: [noTrigger] }),
		]);

		const result = await service.list(user, 'project-1');

		expect(result).toEqual([{ name: 'Has trigger', active: true, triggerType: 'manual' }]);
	});

	it('dedupes workflows that surface via multiple share paths', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([
			wf({ id: 'dup', name: 'Dup', nodes: [manualTrigger] }),
			wf({ id: 'dup', name: 'Dup', nodes: [manualTrigger] }),
		]);

		const result = await service.list(user, 'project-1');

		expect(result).toHaveLength(1);
	});

	it('returns nothing when the user cannot read any workflow', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);

		expect(await service.list(user, 'project-1')).toEqual([]);
	});
});
