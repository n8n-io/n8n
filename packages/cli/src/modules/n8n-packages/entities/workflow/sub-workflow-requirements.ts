import type { WorkflowEntity } from '@n8n/db';
import { getSubworkflowId } from 'n8n-workflow';

export interface WorkflowSubWorkflowReference {
	workflowId: string;
	sourceWorkflowId: string;
}

export function extractSubWorkflowRequirements(
	workflow: WorkflowEntity,
): WorkflowSubWorkflowReference[] {
	const byId = new Map<string, WorkflowSubWorkflowReference>();

	for (const node of workflow.nodes ?? []) {
		const sourceWorkflowId = getSubworkflowId(node);
		if (!sourceWorkflowId || byId.has(sourceWorkflowId)) continue;

		byId.set(sourceWorkflowId, {
			workflowId: workflow.id,
			sourceWorkflowId,
		});
	}

	return [...byId.values()];
}
