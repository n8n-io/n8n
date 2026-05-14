import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isRecord } from '../../utils/stream-helpers';

export { isRecord };

export type WorkflowNode = WorkflowJSON['nodes'][number];

export function unique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.length > 0))];
}

export function nodeTypeEndsWith(node: WorkflowNode, suffix: string): boolean {
	return node.type === suffix || node.type.endsWith(`.${suffix}`);
}

export function nodeHasName(node: WorkflowNode): node is WorkflowNode & { name: string } {
	return typeof node.name === 'string' && node.name.length > 0;
}

export function collectStrings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(collectStrings);
	if (!isRecord(value)) return [];
	return Object.values(value).flatMap(collectStrings);
}

export function extractJsonColumnRefs(text: string): string[] {
	const refs: string[] = [];
	const patterns = [
		/\$json\.([A-Za-z_][A-Za-z0-9_]*)/g,
		/\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
		/item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	];
	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern)) {
			if (match[1]) refs.push(match[1]);
		}
	}
	return unique(refs);
}

/**
 * Match named cross-node references in expressions.
 * Captures (sourceNodeName, field) pairs for:
 *   - $('Name').item.json.field
 *   - $("Name").item.json.field
 *   - $node["Name"].json.field   (legacy)
 */
const NAMED_REF_PATTERNS = [
	/\$\('([^']+)'\)\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	/\$\("([^"]+)"\)\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	/\$node\["([^"]+)"\]\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
];

export interface NamedRefMatch {
	nodeName: string;
	field: string;
	originalExpression: string;
}

export function extractNamedRefMatches(text: string): NamedRefMatch[] {
	const matches: NamedRefMatch[] = [];
	for (const pattern of NAMED_REF_PATTERNS) {
		// Reset lastIndex since patterns have /g flag
		pattern.lastIndex = 0;
		for (const match of text.matchAll(pattern)) {
			const nodeName = match[1];
			const field = match[2];
			if (nodeName !== undefined && field !== undefined) {
				matches.push({ nodeName, field, originalExpression: match[0] });
			}
		}
	}
	return matches;
}

/**
 * Returns names of nodes connected into `agentNodeName` via any `ai_*`
 * connection type — i.e. tools, memory, output parsers, etc.
 */
export function findAgentSubComponents(workflow: WorkflowJSON, agentNodeName: string): string[] {
	const subs = new Set<string>();
	for (const [sourceName, byType] of Object.entries(workflow.connections ?? {})) {
		if (!isRecord(byType)) continue;
		for (const [connType, slot] of Object.entries(byType)) {
			if (!connType.startsWith('ai_')) continue;
			if (!Array.isArray(slot)) continue;
			for (const inner of slot) {
				if (!Array.isArray(inner)) continue;
				for (const conn of inner) {
					if (isRecord(conn) && conn.node === agentNodeName) {
						subs.add(sourceName);
						break;
					}
				}
			}
		}
	}
	return [...subs];
}
