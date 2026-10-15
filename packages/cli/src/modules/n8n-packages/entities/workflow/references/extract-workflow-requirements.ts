import type { WorkflowEntity } from '@n8n/db';

import { workflowReferences } from './workflow-references';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/**
 * Every workflow the given workflow depends on, folded to one requirement per referenced id — the
 * same workflow reached through two references (a sub-workflow node and `errorWorkflow`, say) is a
 * single dependency.
 */
export function extractWorkflowRequirements(
	workflow: WorkflowEntity,
): WorkflowSubWorkflowRequirement[] {
	const byId = new Map<string, WorkflowSubWorkflowRequirement>();
	for (const reference of workflowReferences) {
		for (const requirement of reference.extract(workflow)) {
			if (!byId.has(requirement.referencedWorkflowId)) {
				byId.set(requirement.referencedWorkflowId, requirement);
			}
		}
	}
	return [...byId.values()];
}
