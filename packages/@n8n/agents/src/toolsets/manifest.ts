// packages/@n8n/agents/src/toolsets/manifest.ts
import type { INodeTypeDescription } from 'n8n-workflow';

import type { OperationEntry } from './types';

/**
 * Build the LLM-facing description for an app's dispatcher tool from the node
 * description and the auto-discovered operations. No hand-rolled manifest text
 * lives in the registry — `displayName` + `description` + grouped op listing
 * is enough for the agent to know what surface it has.
 */
export function buildManifest(
	description: INodeTypeDescription,
	operations: OperationEntry[],
): string {
	const header = `${description.displayName} — ${description.description ?? ''}`.trim();

	const groups = new Map<string, string[]>();
	for (const op of operations) {
		const list = groups.get(op.resource) ?? [];
		list.push(op.operation);
		groups.set(op.resource, list);
	}

	const lines: string[] = [];
	for (const [resource, ops] of groups) {
		lines.push(`- ${capitalize(resource)}: ${ops.join(', ')}`);
	}

	return [
		header,
		'',
		'Capabilities:',
		...lines,
		'',
		'Use list_operations to enumerate exact operation names, then describe_operation to get the parameter schema for one operation, then invoke_operation to execute it.',
	].join('\n');
}

function capitalize(s: string): string {
	return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
