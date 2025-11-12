import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * Load options method to get available Execute Workflow Trigger nodes from the selected workflow
 *
 * Note: This is a placeholder implementation. The full implementation requires
 * access to the workflow loader which is not directly available in standard loadOptions methods.
 *
 * For now, users should manually enter the trigger node name. The node name must exactly match
 * the name of an Execute Workflow Trigger node in the target workflow.
 *
 * Future enhancement: Implement dynamic loading of trigger nodes using workflow loader service.
 */
export async function getTriggerNodes(): Promise<INodePropertyOptions[]> {
	// Return empty array for now
	// This allows the field to be a string input instead of a dropdown
	return [];
}
