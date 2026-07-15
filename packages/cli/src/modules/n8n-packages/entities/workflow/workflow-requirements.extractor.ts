import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { getSubworkflowId } from 'n8n-workflow';

import type { RequirementsExtractor } from '../requirements-extractor';
import type { WorkflowWorkflowRequirement } from './workflow.types';

@Service()
export class WorkflowRequirementsExtractor
	implements RequirementsExtractor<WorkflowWorkflowRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowWorkflowRequirement[] {
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
}
