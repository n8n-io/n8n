import type { IWorkflowBase } from 'n8n-workflow';

/**
 * Display a workflow in a user-friendly format
 */
export function formatWorkflow(workflow: IWorkflowBase) {
	return `"${workflow.name}" (ID: ${workflow.id})`;
}
