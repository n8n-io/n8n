import { getSubworkflowId, isNodeWithWorkflowSelector, type INode } from 'n8n-workflow';

/**
 * Extract workflow id from a node that references a sub-workflow.
 *
 * It only supports static references to a sub-workflow from a resource-locator field
 * or plain string workflowId for backwards compatibility with older node versions.
 */
export function getStaticSubworkflowId(node: INode): string | undefined {
	if (!isNodeWithWorkflowSelector(node)) return undefined;

	// Older nodes may omit `source`; database is their implicit default.
	// Only 'database' (or missing) sources references a workflow by id.
	const { source = 'database' } = node.parameters;
	if (source !== 'database') return undefined;

	// Newer versions store the id in a resource-locator (resolved by the shared
	// helper); legacy versions store it as a plain string.
	const { workflowId: storedWorkflowId } = node.parameters;
	const workflowId = getSubworkflowId(node) ?? storedWorkflowId;

	return toStaticId(workflowId);
}

function toStaticId(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	// Expressions are resolved at runtime, so they are not static dependencies.
	if (trimmed === '' || trimmed.startsWith('=')) return undefined;
	return trimmed;
}
