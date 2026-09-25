import type { WorkflowEntity } from '@n8n/db';

import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/**
 * Extract and replace error workflow id references
 */
export const errorWorkflowReference: EntityReference<WorkflowSubWorkflowRequirement> = {
	extract(workflow) {
		const referencedWorkflowId = staticErrorWorkflowId(workflow);
		return referencedWorkflowId ? [{ workflowId: workflow.id, referencedWorkflowId }] : [];
	},
	apply(workflow, bindings) {
		const currentId = staticErrorWorkflowId(workflow);
		if (!currentId || !workflow.settings) return;
		workflow.settings.errorWorkflow = bindings.workflows.get(currentId) ?? currentId;
	},
};

function staticErrorWorkflowId(workflow: WorkflowEntity): string | undefined {
	const errorWorkflow = workflow.settings?.errorWorkflow;
	if (
		typeof errorWorkflow !== 'string' ||
		errorWorkflow === 'DEFAULT' ||
		errorWorkflow.startsWith('=')
	) {
		return undefined;
	}
	return errorWorkflow;
}
