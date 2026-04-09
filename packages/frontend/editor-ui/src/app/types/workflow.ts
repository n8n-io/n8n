import type { Workflow } from 'n8n-workflow';

/**
 * Temporary interface describing the subset of the Workflow class used across the frontend.
 * Will be removed when workflowsStore.workflowObject migration is complete.
 */
export interface WorkflowObjectAccessors {
	connectionsBySourceNode: Workflow['connectionsByDestinationNode'];
	expression: Workflow['expression'];
	pinData?: Workflow['pinData'];
	getNode: Workflow['getNode'];
	getChildNodes: Workflow['getChildNodes'];
	getParentNodes: Workflow['getParentNodes'];
	getParentNodesByDepth: Workflow['getParentNodesByDepth'];
	getNodeConnectionIndexes: Workflow['getNodeConnectionIndexes'];
	getParentMainInputNode: Workflow['getParentMainInputNode'];
}
