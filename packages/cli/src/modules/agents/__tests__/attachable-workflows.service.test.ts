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

		await service.list(user, 'project-9', 'billing');

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

	it('filters workflows by search term', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([
			wf({ id: 'a', name: 'Billing follow-up', nodes: [manualTrigger] }),
			wf({ id: 'b', name: 'Sales outreach', nodes: [manualTrigger] }),
		]);

		const result = await service.list(user, 'project-1', 'billing');

		expect(result).toEqual([{ name: 'Billing follow-up', active: false, triggerType: 'manual' }]);
	});

	it('returns at most 10 most recently updated workflows when search term is omitted', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
			Array.from({ length: 60 }, (_, index) =>
				wf({
					id: `wf-${index}`,
					name: `Workflow ${index}`,
					nodes: [manualTrigger],
					updatedAt: new Date(Date.UTC(2026, 0, index + 1)),
				}),
			),
		);

		const result = await service.list(user, 'project-1');

		expect(result).toHaveLength(10);
		expect(result[0]).toEqual({
			name: 'Workflow 59',
			active: false,
			triggerType: 'manual',
		});
		expect(result.at(-1)).toEqual({
			name: 'Workflow 50',
			active: false,
			triggerType: 'manual',
		});
	});

	it('returns nothing when the user cannot read any workflow', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue([]);

		expect(await service.list(user, 'project-1')).toEqual([]);
	});

	it('caps the result at 10 most recently updated workflows', async () => {
		const { service, workflowFinderService, user } = setup();
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(
			Array.from({ length: 150 }, (_, i) =>
				wf({
					id: `wf-${i}`,
					name: `Workflow ${i}`,
					nodes: [manualTrigger],
					updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
				}),
			),
		);

		const result = await service.list(user, 'project-1');

		expect(result).toHaveLength(10);
		// Sorted by updatedAt desc: the newest (highest index) comes first and
		// the older workflows fall off the end.
		expect(result[0].name).toBe('Workflow 149');
		expect(result[9].name).toBe('Workflow 140');
	});

	it('applies the cap after trigger filtering, not before', async () => {
		const { service, workflowFinderService, user } = setup();
		const workflows = Array.from({ length: 15 }, (_, i) =>
			wf({
				id: `wf-${i}`,
				name: `Workflow ${i}`,
				nodes: i >= 10 ? [noTrigger] : [manualTrigger],
				updatedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
			}),
		);
		workflowFinderService.findAllWorkflowsForUser.mockResolvedValue(workflows);

		const result = await service.list(user, 'project-1');

		// A cap applied before filtering would waste slots on the newest
		// no-trigger entries and return fewer than 10.
		expect(result).toHaveLength(10);
		expect(result.every((w) => w.triggerType === 'manual')).toBe(true);
		expect(result[0].name).toBe('Workflow 9');
	});
});
