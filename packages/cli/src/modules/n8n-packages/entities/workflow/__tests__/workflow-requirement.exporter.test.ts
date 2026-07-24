import type { ManifestEntry } from '../../../spec/manifest.schema';
import { WorkflowRequirementExporter } from '../workflow-requirement.exporter';

function workflowEntry(id: string, name: string): ManifestEntry {
	return { id, name, target: `workflows/${id}` };
}

describe('WorkflowRequirementExporter', () => {
	it('groups requirements by referenced workflow and aggregates usedByWorkflows', () => {
		const exporter = new WorkflowRequirementExporter();

		const result = exporter.export({
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
	});

	it('returns no package requirements when there are no workflow requirements', () => {
		const exporter = new WorkflowRequirementExporter();

		const result = exporter.export({
			requirements: [],
			workflows: [workflowEntry('wf-parent', 'Parent')],
		});

		expect(result.requirements).toEqual([]);
	});
});
