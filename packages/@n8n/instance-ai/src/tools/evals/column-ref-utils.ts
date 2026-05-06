import type { WorkflowJSON } from '@n8n/workflow-sdk';

export type WorkflowNode = WorkflowJSON['nodes'][number];

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

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
