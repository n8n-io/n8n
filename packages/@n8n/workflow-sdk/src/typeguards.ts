import type { WorkflowBuilder, WorkflowJSON } from './types/base';

export function isWorkflowBuilder(value: unknown): value is WorkflowBuilder {
	return (
		typeof value === 'object' &&
		value !== null &&
		'regenerateNodeIds' in value &&
		typeof value.regenerateNodeIds === 'function'
	);
}

export function isWorkflowJSON(value: unknown): value is WorkflowJSON {
	return (
		typeof value === 'object' && value !== null && 'nodes' in value && Array.isArray(value.nodes)
	);
}
