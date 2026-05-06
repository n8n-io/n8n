import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { collectStrings, nodeHasName } from './column-ref-utils';

export interface NamedRef {
	/** Source node name extracted from $('NodeName') reference. */
	nodeName: string;
	/** Field after .item.json.<field>. */
	field: string;
	/** Original expression substring, useful for the rewrite step (no $('… surrounding). E.g., "$('Voice or Text').item.json.text". */
	originalExpression: string;
	/** Proposed dataset column name. Equals `field` when unique; otherwise `<node_slug>_<field>` to disambiguate. */
	column: string;
}

const PATTERNS = [
	/\$\('([^']+)'\)\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	/\$\("([^"]+)"\)\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	/\$node\["([^"]+)"\]\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
];

function slug(name: string): string {
	const result = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return result.length > 0 ? result : 'node';
}

interface RawMatch {
	nodeName: string;
	field: string;
	originalExpression: string;
}

function extractNamedRefs(text: string): RawMatch[] {
	const matches: RawMatch[] = [];
	for (const pattern of PATTERNS) {
		// Reset lastIndex since patterns have /g flag
		pattern.lastIndex = 0;
		for (const match of text.matchAll(pattern)) {
			const nodeName = match[1];
			const field = match[2];
			if (nodeName !== undefined && field !== undefined) {
				matches.push({
					nodeName,
					field,
					originalExpression: match[0],
				});
			}
		}
	}
	return matches;
}

export function detectAgentNamedRefs(workflow: WorkflowJSON, agentNodeName: string): NamedRef[] {
	const node = (workflow.nodes ?? []).find((n) => nodeHasName(n) && n.name === agentNodeName);
	if (!node) {
		throw new Error(`Agent node "${agentNodeName}" not found in workflow`);
	}

	// Collect all raw matches across all parameter strings
	const allMatches = collectStrings(node.parameters).flatMap((text) => extractNamedRefs(text));

	// Deduplicate by (nodeName, field) — keep first occurrence's originalExpression
	const seen = new Map<string, RawMatch>();
	for (const match of allMatches) {
		const key = `${match.nodeName}\x00${match.field}`;
		if (!seen.has(key)) {
			seen.set(key, match);
		}
	}

	const unique = [...seen.values()];

	// Group by field to detect collisions
	const byField = new Map<string, RawMatch[]>();
	for (const match of unique) {
		const existing = byField.get(match.field) ?? [];
		existing.push(match);
		byField.set(match.field, existing);
	}

	// Assign column names
	return unique.map((match) => {
		const group = byField.get(match.field)!;
		const column = group.length === 1 ? match.field : `${slug(match.nodeName)}_${match.field}`;
		return {
			nodeName: match.nodeName,
			field: match.field,
			originalExpression: match.originalExpression,
			column,
		};
	});
}
