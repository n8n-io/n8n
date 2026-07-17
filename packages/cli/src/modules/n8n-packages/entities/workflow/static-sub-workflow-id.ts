import { getSubworkflowId, isNodeWithWorkflowSelector, type INode } from 'n8n-workflow';

/**
 * Resolves the statically-referenced database sub-workflow id from an
 * "Execute Sub-workflow" / "Call n8n Workflow Tool" node, across every node
 * version.
 *
 * The shared `getSubworkflowId` only understands the resource-locator shape
 * (`workflowSelector`) added in the newer versions. Older versions store the id
 * as a plain string, which would otherwise slip through export undetected. We
 * also skip dynamic (expression) and non-database references so they never
 * become export requirements.
 */
export function getStaticSubworkflowId(node: INode): string | undefined {
	if (!isNodeWithWorkflowSelector(node)) return undefined;

	// Only the "database" source references a workflow by id. When unset, the
	// node falls back to its default source, which is "database".
	const source = node.parameters.source ?? 'database';
	if (source !== 'database') return undefined;

	// Newer versions store the id in a resource-locator (resolved by the shared
	// helper); legacy versions store it as a plain string.
	const workflowId = getSubworkflowId(node) ?? node.parameters.workflowId;
	return toStaticId(workflowId);
}

function toStaticId(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	// Expressions are resolved at runtime, so they are not static dependencies.
	if (trimmed === '' || trimmed.startsWith('=')) return undefined;
	return trimmed;
}
