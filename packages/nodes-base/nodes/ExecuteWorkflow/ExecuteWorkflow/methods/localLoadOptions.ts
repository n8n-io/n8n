import type { ILocalLoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

/**
 * Lists the Execute Workflow Trigger nodes of the workflow selected in
 * `workflowId`, so the caller can choose which entry point to start from.
 */
export async function loadSubWorkflowTriggers(
	this: ILocalLoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const nodes = await this.getWorkflowNodes(true);

	return nodes
		.filter((node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)
		.map((node) => ({
			name: node.name,
			value: node.name,
		}));
}
