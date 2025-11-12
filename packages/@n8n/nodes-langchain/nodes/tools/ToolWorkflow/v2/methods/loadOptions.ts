import type { ILocalLoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';

/**
 * Load options method to get available Execute Workflow Trigger nodes from the selected workflow
 *
 * This dynamically loads all non-disabled Execute Workflow Trigger nodes from the selected workflow
 * and returns them as dropdown options.
 */
export async function getTriggerNodes(
	this: ILocalLoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		// Get all executeWorkflowTrigger nodes from the selected workflow
		// This automatically filters out disabled nodes
		const triggerNodes: Awaited<ReturnType<ILocalLoadOptionsFunctions['getAllWorkflowNodes']>> =
			await this.getAllWorkflowNodes(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);

		// Return empty array if no triggers found
		if (triggerNodes.length === 0) {
			return [];
		}

		// Map to dropdown options using node name
		return triggerNodes.map((node) => ({
			name: node.name,
			value: node.name,
		}));
	} catch (error) {
		// Return empty array on error to prevent breaking the UI
		return [];
	}
}
