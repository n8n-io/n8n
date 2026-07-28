import type { WorkflowEntity } from '@n8n/db';

import { callerIdsReference } from './caller-ids.reference';
import { errorWorkflowReference } from './error-workflow.reference';
import { subWorkflowNodeReference } from './sub-workflow-node.reference';
import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

export const workflowReferences: Array<EntityReference<WorkflowSubWorkflowRequirement>> = [
	subWorkflowNodeReference,
	errorWorkflowReference,
	callerIdsReference,
];

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
