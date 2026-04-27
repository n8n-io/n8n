// packages/@n8n/agents/src/toolsets/manifest.ts
import type { INodeTypeDescription } from 'n8n-workflow';

import type { AppDefinition, OperationEntry } from './types';

/**
 * Resolve the LLM-facing description for an app's dispatcher tool.
 * - String manifest → returned verbatim.
 * - Function manifest → invoked with the loaded node description.
 * - Undefined manifest → derived from the app label, node description, and
 *   per-resource operation summary.
 */
export function buildManifest(
	appDef: AppDefinition,
	description: INodeTypeDescription,
	operations: OperationEntry[],
): string {
	if (typeof appDef.manifest === 'string') return appDef.manifest;
	if (typeof appDef.manifest === 'function') return appDef.manifest(description);
	return defaultManifest(appDef, description, operations);
}

function defaultManifest(
	appDef: AppDefinition,
	description: INodeTypeDescription,
	operations: OperationEntry[],
): string {
	const header = `${appDef.label} — ${description.description ?? ''}`.trim();
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
