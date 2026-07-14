import type { WorkflowEntity } from '@n8n/db';
import { getSubworkflowId } from 'n8n-workflow';

export interface WorkflowSubWorkflowReference {
	workflowId: string;
	referencedWorkflowId: string;
}

export function extractSubWorkflowRequirements(
	workflow: WorkflowEntity,
): WorkflowSubWorkflowReference[] {
	const byId = new Map<string, WorkflowSubWorkflowReference>();

	for (const node of workflow.nodes ?? []) {
		const referencedWorkflowId = getSubworkflowId(node);
		if (!referencedWorkflowId || byId.has(referencedWorkflowId)) continue;

		byId.set(referencedWorkflowId, {
			workflowId: workflow.id,
			referencedWorkflowId,
		});
	}

	return [...byId.values()];
}
