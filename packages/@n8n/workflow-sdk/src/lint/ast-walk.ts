import type { Node } from 'estree';

import type { SourceLintIssue } from './types';

function isEstreeNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && 'type' in value;
}

/**
 * Depth-first AST walk. `visit` runs before children. When `skipChildren`
 * returns true, descendants are not visited (the node itself still is).
 */
export function walkAst(
	node: Node,
	visit: (n: Node, parent: Node | undefined) => void,
	options: {
		parent?: Node;
		skipChildren?: (n: Node, parent: Node | undefined) => boolean;
	} = {},
): void {
	const { parent, skipChildren } = options;
	visit(node, parent);
	if (skipChildren?.(node, parent)) return;

	for (const key of Object.keys(node) as Array<keyof Node>) {
		if (key === 'loc' || key === 'range') continue;
		const value = node[key];
		if (!value || typeof value !== 'object') continue;
		if (Array.isArray(value)) {
			for (const entry of value) {
				if (isEstreeNode(entry)) {
					walkAst(entry, visit, { parent: node, skipChildren });
				}
			}
		} else if (isEstreeNode(value)) {
			walkAst(value, visit, { parent: node, skipChildren });
		}
	}
}

export function dedupeSourceLintIssues(issues: SourceLintIssue[]): SourceLintIssue[] {
	const seen = new Set<string>();
	const out: SourceLintIssue[] = [];
	for (const issue of issues) {
		const key = `${issue.lintTarget}|${issue.code}|${issue.line ?? ''}|${issue.message}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(issue);
	}
	return out;
}
