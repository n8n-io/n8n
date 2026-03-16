/**
 * Shared helpers for rendering trigger-workflow nodes in both
 * the workflow graph canvas and the execution graph.
 */

export const TRIGGER_WORKFLOW_NODE_COLOR = '#6366f1';

export function getTriggerWorkflowLabel(config?: Record<string, unknown>): string {
	const workflow = config?.workflow as string | undefined;
	if (workflow) return `Trigger: ${workflow}`;
	return 'Trigger Workflow';
}

export function getTriggerWorkflowDetail(config?: Record<string, unknown>): string | undefined {
	const workflow = config?.workflow as string | undefined;
	if (workflow) return workflow;
	return undefined;
}
