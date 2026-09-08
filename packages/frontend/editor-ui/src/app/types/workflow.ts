import type { Workflow } from 'n8n-workflow';

/**
 * Temporary interface describing the subset of the Workflow class used across the frontend.
 * Will be removed when workflowsStore.workflowObject migration is complete.
 */
export type WorkflowObjectAccessors = Pick<
	Workflow,
	| 'id'
	| 'connectionsBySourceNode'
	| 'expression'
	| 'pinData'
	| 'getNode'
	| 'getChildNodes'
	| 'getParentNodes'
	| 'getParentNodesByDepth'
	| 'getNodeConnectionIndexes'
	| 'getParentMainInputNode'
>;
