import type { WorkflowEntity } from '@n8n/db';
import { getSubworkflowId } from 'n8n-workflow';

import type { WorkflowWorkflowRequirement } from './workflow.types';

export function extractSubWorkflowRequirements(
	workflow: WorkflowEntity,
): WorkflowWorkflowRequirement[] {
	const byId = new Map<string, WorkflowWorkflowRequirement>();

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
