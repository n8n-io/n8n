import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { getSubworkflowId } from 'n8n-workflow';

import type { RequirementsExtractor } from '../requirements-extractor';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';

@Service()
export class WorkflowRequirementsExtractor
	implements RequirementsExtractor<WorkflowSubWorkflowRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowSubWorkflowRequirement[] {
		const byId = new Map<string, WorkflowSubWorkflowRequirement>();

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
