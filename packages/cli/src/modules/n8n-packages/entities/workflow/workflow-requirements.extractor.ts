import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { RequirementsExtractor } from '../requirements-extractor';
import { getStaticSubworkflowId } from './static-sub-workflow-id';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';

@Service()
export class WorkflowRequirementsExtractor
	implements RequirementsExtractor<WorkflowSubWorkflowRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowSubWorkflowRequirement[] {
		const byId = new Map<string, WorkflowSubWorkflowRequirement>();

		const addRequirement = (referencedWorkflowId: string | undefined) => {
			if (!referencedWorkflowId || byId.has(referencedWorkflowId)) return;

			byId.set(referencedWorkflowId, {
				workflowId: workflow.id,
				referencedWorkflowId,
			});
		};

		for (const node of workflow.nodes ?? []) {
			addRequirement(getStaticSubworkflowId(node));
		}

		addRequirement(this.getErrorWorkflowId(workflow));

		return [...byId.values()];
	}

	private getErrorWorkflowId(workflow: WorkflowEntity): string | undefined {
		const errorWorkflow = workflow.settings?.errorWorkflow;

		return !errorWorkflow || errorWorkflow === 'DEFAULT' ? undefined : errorWorkflow;
	}
}
