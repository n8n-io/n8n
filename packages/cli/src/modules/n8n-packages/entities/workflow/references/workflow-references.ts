import { callerIdsReference } from './caller-ids.reference';
import { errorWorkflowReference } from './error-workflow.reference';
import { subWorkflowNodeReference } from './sub-workflow-node.reference';
import type { EntityReference } from '../../reference';
import type { WorkflowSubWorkflowRequirement } from '../workflow.types';

/** Every place a workflow can reference another workflow, for both extract and rebind. */
export const workflowReferences: Array<EntityReference<WorkflowSubWorkflowRequirement>> = [
	subWorkflowNodeReference,
	errorWorkflowReference,
	callerIdsReference,
];
