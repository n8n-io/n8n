import { getStaticSubworkflowId, setStaticSubworkflowId } from 'n8n-workflow';

import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/**
 * Find and extract subworkflow references from a workflow
 *
 * Update subworkflow references from the import bindings
 */
export const subWorkflowNodeReference: EntityReference<WorkflowSubWorkflowRequirement> = {
	extract(workflow) {
		const requirements: WorkflowSubWorkflowRequirement[] = [];
		for (const node of workflow.nodes ?? []) {
			const referencedWorkflowId = getStaticSubworkflowId(node);
			if (referencedWorkflowId) {
				requirements.push({ workflowId: workflow.id, referencedWorkflowId });
			}
		}
		return requirements;
	},
	apply(workflow, bindings) {
		for (const node of workflow.nodes ?? []) {
			const currentId = getStaticSubworkflowId(node);
			if (!currentId) continue;
			const targetId = bindings.workflows.get(currentId);
			if (targetId) setStaticSubworkflowId(node, targetId);
		}
	},
};
