import type { Node, ObjectExpression, Program, Property } from 'estree';

import { parseSDKCode } from '../ast-interpreter';

export type CodeExecutionMode = 'runOnceForAllItems' | 'runOnceForEachItem';

export interface EmbeddedCodeSnippet {
	parameter: 'jsCode' | 'pythonCode';
	code: string;
	/** 1-based line of the property value in the prepared source. */
	line?: number;
	mode?: CodeExecutionMode;
}

function lineOf(node: Node): number | undefined {
	return node.loc?.start.line;
}

function propertyKeyName(key: Property['key']): string | undefined {
	if (key.type === 'Identifier') return key.name;
	if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
	return undefined;
}

function stringFromNode(node: Node, source: string): string | undefined {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value;
	}
	if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
		return node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('');
	}
	if (
		'start' in node &&
		'end' in node &&
		typeof node.start === 'number' &&
		typeof node.end === 'number'
	) {
		const raw = source.slice(node.start, node.end);
		if (node.type === 'TemplateLiteral') {
			return raw.slice(1, raw.endsWith('`') ? -1 : undefined);
		}
	}
	return undefined;
}

function modeFromObject(obj: ObjectExpression): CodeExecutionMode | undefined {
	for (const prop of obj.properties) {
		if (prop.type !== 'Property' || prop.computed) continue;
		if (propertyKeyName(prop.key) !== 'mode') continue;
		if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
			if (prop.value.value === 'runOnceForEachItem') return 'runOnceForEachItem';
			if (prop.value.value === 'runOnceForAllItems') return 'runOnceForAllItems';
		}
	}
	return undefined;
}

function isEstreeNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && 'type' in value;
}

function walkWithParent(
	node: Node,
	visit: (n: Node, parent: Node | undefined) => void,
	parent?: Node,
): void {
	visit(node, parent);
	for (const key of Object.keys(node) as Array<keyof Node>) {
		if (key === 'loc' || key === 'range') continue;
		const value = node[key];
		if (!value || typeof value !== 'object') continue;
		if (Array.isArray(value)) {
			for (const entry of value) {
				if (isEstreeNode(entry)) {
					walkWithParent(entry, visit, node);
				}
			}
		} else if (isEstreeNode(value)) {
			walkWithParent(value, visit, node);
		}
	}
}

function enclosingObjectExpression(
	node: Node,
	parents: ReadonlyMap<Node, Node>,
): ObjectExpression | undefined {
	let current: Node | undefined = node;
	while (current) {
		if (current.type === 'ObjectExpression') return current;
		current = parents.get(current);
	}
	return undefined;
}

/** Whether SDK source lint should skip descending into this node. */
export function isEmbeddedCodePropertyValue(node: Node, parent: Node | undefined): boolean {
	if (parent?.type !== 'Property' || parent.computed) return false;
	const key = propertyKeyName(parent.key);
	if (key !== 'jsCode' && key !== 'pythonCode') return false;
	return node === parent.value;
}

export function buildParentMap(ast: Program): Map<Node, Node> {
	const parents = new Map<Node, Node>();
	walkWithParent(ast, (node, parent) => {
		if (parent) parents.set(node, parent);
	});
	return parents;
}

/**
 * Extract jsCode / pythonCode string values from a parsed SDK workflow AST.
 */
export function extractEmbeddedCodeSnippets(
	ast: Program,
	source: string,
	parents: ReadonlyMap<Node, Node> = buildParentMap(ast),
): EmbeddedCodeSnippet[] {
	const snippets: EmbeddedCodeSnippet[] = [];

	walkWithParent(ast, (node) => {
		if (node.type !== 'Property' || node.computed) return;
		const key = propertyKeyName(node.key);
		if (key !== 'jsCode' && key !== 'pythonCode') return;

		const code = stringFromNode(node.value, source);
		if (code === undefined || code.length === 0) return;

		const enclosing = enclosingObjectExpression(node, parents);
		snippets.push({
			parameter: key,
			code,
			line: lineOf(node.value),
			mode: enclosing ? modeFromObject(enclosing) : undefined,
		});
	});

	return snippets;
}

/** Parse prepared SDK source and extract embedded Code node snippets. */
export function extractEmbeddedCodeSnippetsFromSource(source: string): EmbeddedCodeSnippet[] {
	let ast: Program;
	try {
		ast = parseSDKCode(source);
	} catch {
		return [];
	}
	return extractEmbeddedCodeSnippets(ast, source, buildParentMap(ast));
}
