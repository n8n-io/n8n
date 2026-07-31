import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ManifestEntry } from '../../../spec/manifest.schema';
import { WorkflowRequirementExporter } from '../workflow-requirement.exporter';

const user = mock<User>({ id: 'user-1' });

function workflowEntry(id: string, name: string): ManifestEntry {
	return { id, name, target: `workflows/${id}` };
}

function makeExporter(accessibleWorkflows: Array<{ id: string; name: string }> = []) {
	const workflowFinder = mock<WorkflowFinderService>();
	workflowFinder.findWorkflowsByIdsForUser.mockImplementation(
		async (workflowIds) =>
			accessibleWorkflows.filter(({ id }) => workflowIds.includes(id)) as WorkflowEntity[],
	);

	return { exporter: new WorkflowRequirementExporter(workflowFinder), workflowFinder };
}

describe('WorkflowRequirementExporter', () => {
	it('groups requirements by referenced workflow and aggregates usedByWorkflows', async () => {
		const { exporter, workflowFinder } = makeExporter();

		const result = await exporter.export({
			user,
			requirements: [
				{ workflowId: 'wf-parent-a', referencedWorkflowId: 'wf-child' },
				{ workflowId: 'wf-parent-a', referencedWorkflowId: 'wf-child' },
				{ workflowId: 'wf-parent-b', referencedWorkflowId: 'wf-child' },
				{ workflowId: 'wf-child', referencedWorkflowId: 'wf-grandchild' },
			],
			workflows: [
				workflowEntry('wf-parent-a', 'Parent A'),
				workflowEntry('wf-parent-b', 'Parent B'),
				workflowEntry('wf-child', 'Child'),
				workflowEntry('wf-grandchild', 'Grandchild'),
			],
		});

		expect(result.requirements).toEqual([
			{
				id: 'wf-child',
				name: 'Child',
				usedByWorkflows: ['wf-parent-a', 'wf-parent-b'],
			},
			{
				id: 'wf-grandchild',
				name: 'Grandchild',
				usedByWorkflows: ['wf-child'],
			},
		]);
		// Every referenced workflow is in the package, so no name lookup is needed.
		expect(workflowFinder.findWorkflowsByIdsForUser).not.toHaveBeenCalled();
	});

	it('fetches best-effort names for referenced workflows not in the package', async () => {
		const { exporter, workflowFinder } = makeExporter([{ id: 'wf-known', name: 'Known Child' }]);

		const result = await exporter.export({
			user,
			requirements: [
				{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-known' },
				{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-unknown' },
			],
			workflows: [workflowEntry('wf-parent', 'Parent')],
		});

		expect(result.requirements).toEqual([
			{ id: 'wf-known', name: 'Known Child', usedByWorkflows: ['wf-parent'] },
			{ id: 'wf-unknown', usedByWorkflows: ['wf-parent'] },
		]);
		expect(result.requirements[1]).not.toHaveProperty('name');
		expect(workflowFinder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			['wf-known', 'wf-unknown'],
			user,
			['workflow:export'],
		);
	});

	it('returns no package requirements when there are no workflow requirements', async () => {
		const { exporter, workflowFinder } = makeExporter();

		const result = await exporter.export({
			user,
			requirements: [],
			workflows: [workflowEntry('wf-parent', 'Parent')],
		});

		expect(result.requirements).toEqual([]);
		expect(workflowFinder.findWorkflowsByIdsForUser).not.toHaveBeenCalled();
	});
});
