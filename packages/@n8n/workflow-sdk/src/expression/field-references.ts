/**
 * Static field references in n8n expressions.
 *
 * An expression such as `={{ $json.user.email }}` reads a field from an input
 * item. When the field does not exist, the expression resolves to empty and the
 * run still succeeds. The helpers here find those references with a real
 * JavaScript parser, so callers do not need their own regular expressions.
 */
import { parseExpressionAt } from 'acorn';
import type { Expression, MemberExpression, Node } from 'estree';
import { ExpressionParser } from 'n8n-workflow';

import { isPlainObject } from '../utils/safe-access';

/** Where a referenced field comes from. */
export type FieldReferenceSource =
	/** `$json`, `$input.item.json`, `$input.first().json`: the current input item. */
	| { kind: 'input' }
	/** `$('Node').item.json`, `$('Node').first().json`: an item of a named node. */
	| { kind: 'node'; nodeName: string };

export interface FieldReference {
	source: FieldReferenceSource;
	/** Static path below `json`, e.g. `['user', 'email']` or `['items', '0', 'id']`. */
	path: string[];
}

/** Item accessors that return one item of a node (`.item`, `.first()`, `.last()`). */
const ITEM_PROPERTIES = new Set(['item']);
const ITEM_METHODS = new Set(['first', 'last']);

function isNode(value: unknown): value is Node {
	return isPlainObject(value) && typeof value.type === 'string';
}

function childNodes(node: Node): Node[] {
	const children: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === 'loc' || key === 'range') continue;
		if (Array.isArray(value)) {
			for (const entry of value) if (isNode(entry)) children.push(entry);
		} else if (isNode(value)) {
			children.push(value);
		}
	}
	return children;
}

function staticPropertyName(member: MemberExpression): string | undefined {
	if (!member.computed && member.property.type === 'Identifier') return member.property.name;
	if (member.computed && member.property.type === 'Literal') {
		const { value } = member.property;
		if (typeof value === 'string' || typeof value === 'number') return String(value);
	}
	return undefined;
}

function unwrapChain(node: Node): Node {
	return node.type === 'ChainExpression' ? node.expression : node;
}

/** `$('Name')` with a string literal argument. */
function nodeSelectorName(node: Node): string | undefined {
	if (node.type !== 'CallExpression') return undefined;
	if (node.callee.type !== 'Identifier' || node.callee.name !== '$') return undefined;
	const [arg] = node.arguments;
	return arg?.type === 'Literal' && typeof arg.value === 'string' ? arg.value : undefined;
}

/**
 * Resolves the object an item accessor is called on (`$input`, `$('Name')`)
 * from the expression that returns one item (`X.item`, `X.first()`).
 */
function itemOwner(node: Node): Node | undefined {
	const target = unwrapChain(node);
	if (target.type === 'MemberExpression') {
		const name = staticPropertyName(target);
		return name && ITEM_PROPERTIES.has(name) ? unwrapChain(target.object) : undefined;
	}
	if (target.type === 'CallExpression' && target.arguments.length === 0) {
		const callee = unwrapChain(target.callee);
		if (callee.type !== 'MemberExpression') return undefined;
		const name = staticPropertyName(callee);
		return name && ITEM_METHODS.has(name) ? unwrapChain(callee.object) : undefined;
	}
	return undefined;
}

/** The source of the `json` object that `node` evaluates to, if it is one we know. */
function jsonSource(node: Node): FieldReferenceSource | undefined {
	const target = unwrapChain(node);
	if (target.type === 'Identifier' && target.name === '$json') return { kind: 'input' };
	if (target.type !== 'MemberExpression' || staticPropertyName(target) !== 'json') {
		return undefined;
	}
	const owner = itemOwner(target.object);
	if (!owner) return undefined;
	if (owner.type === 'Identifier' && owner.name === '$input') return { kind: 'input' };
	const nodeName = nodeSelectorName(owner);
	return nodeName === undefined ? undefined : { kind: 'node', nodeName };
}

/**
 * Reads the longest static member chain that starts at a known `json` source.
 * `$json.items[0].id` gives `['items', '0', 'id']`. A dynamic segment
 * (`$json[key]`) ends the path.
 */
function readReference(node: Node): FieldReference | undefined {
	const segments: string[] = [];
	let current: Node = unwrapChain(node);
	while (current.type === 'MemberExpression') {
		const source = jsonSource(current);
		if (source) return segments.length > 0 ? { source, path: segments.reverse() } : undefined;
		const name = staticPropertyName(current);
		if (name === undefined) {
			// `$json[key].x`: keep only what comes before the dynamic segment.
			segments.length = 0;
		} else {
			segments.push(name);
		}
		current = unwrapChain(current.object);
	}
	const source = jsonSource(current);
	return source && segments.length > 0 ? { source, path: segments.reverse() } : undefined;
}

function collectFromAst(root: Node, out: FieldReference[]): void {
	const visit = (node: Node, parent: Node | undefined): void => {
		// Only the outermost member of a chain is a complete reference.
		const isChainLink = parent?.type === 'MemberExpression' && parent.object === node;
		if (node.type === 'MemberExpression' && !isChainLink) {
			// `$json.name.toUpperCase()`: the method is not a field.
			const isCallee = parent?.type === 'CallExpression' && parent.callee === node;
			const reference = readReference(isCallee ? node.object : node);
			if (reference) out.push(reference);
		}
		for (const child of childNodes(node)) visit(child, node);
	};
	visit(root, undefined);
}

function parseCodeChunk(code: string): Expression | undefined {
	try {
		return parseExpressionAt(code, 0, { ecmaVersion: 'latest' }) as unknown as Expression;
	} catch {
		// Not a single expression (n8n also accepts statement-like code). Skip it.
		return undefined;
	}
}

function referenceKey(reference: FieldReference): string {
	const source = reference.source.kind === 'node' ? `node:${reference.source.nodeName}` : 'input';
	return `${source}|${reference.path.join('.')}`;
}

/**
 * Returns the static field references in one n8n expression string.
 * Returns an empty list for a value that is not an expression (no `=` prefix).
 */
export function extractFieldReferences(expression: string): FieldReference[] {
	if (!expression.startsWith('=')) return [];
	const references: FieldReference[] = [];
	for (const chunk of ExpressionParser.splitExpression(expression.slice(1))) {
		if (chunk.type !== 'code') continue;
		const ast = parseCodeChunk(chunk.text);
		if (ast) collectFromAst(ast, references);
	}
	const seen = new Set<string>();
	return references.filter((reference) => {
		const key = referenceKey(reference);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Every expression string in a parameter tree, with its parameter path. */
export function collectExpressionStrings(
	parameters: unknown,
): Array<{ expression: string; parameterPath: string }> {
	const results: Array<{ expression: string; parameterPath: string }> = [];
	const visit = (value: unknown, path: string): void => {
		if (typeof value === 'string') {
			if (value.startsWith('=')) results.push({ expression: value, parameterPath: path });
		} else if (Array.isArray(value)) {
			value.forEach((entry, index) => visit(entry, `${path}[${index}]`));
		} else if (isPlainObject(value)) {
			for (const [key, entry] of Object.entries(value)) visit(entry, path ? `${path}.${key}` : key);
		}
	};
	visit(parameters, '');
	return results;
}

export interface MissingFieldReference {
	/** The node whose expression reads the field. */
	nodeName: string;
	parameterPath: string;
	reference: FieldReference;
	/** The node whose items were checked. */
	sourceNodeName: string;
	/** The first path segment that no item has. */
	missingSegment: string;
	/** The part of the path that resolved before the missing segment. */
	resolvedPath: string[];
	/** Keys of the object where the walk stopped, from the first item. */
	availableKeys: string[];
	/** Array fields at that object whose entries have the missing key: the input needs splitting. */
	arrayFieldsWithSegment: string[];
}

export interface FindMissingFieldReferencesInput {
	nodes: ReadonlyArray<{ name: string; parameters?: unknown }>;
	/** The single main input node of a node. Return undefined to skip `$json` checks for it. */
	inputNodeOf: (nodeName: string) => string | undefined;
	/** The output items (the `json` objects) of a node. Return undefined when unknown. */
	itemsOf: (nodeName: string) => ReadonlyArray<Record<string, unknown>> | undefined;
}

interface PathMiss {
	at: Record<string, unknown>;
	segment: string;
	resolved: string[];
}

/** Walks `path` through `item`. Returns undefined when it resolves or stops on a non-object. */
function findPathMiss(item: unknown, path: string[]): PathMiss | undefined {
	let current: unknown = item;
	for (let index = 0; index < path.length; index++) {
		const segment = path[index];
		if (Array.isArray(current)) {
			current = current[Number(segment)];
			continue;
		}
		// A primitive or null is a value problem, not a field name problem.
		if (!isPlainObject(current)) return undefined;
		if (!(segment in current)) return { at: current, segment, resolved: path.slice(0, index) };
		current = current[segment];
	}
	return undefined;
}

/**
 * Returns true when `path` resolves in `item`. A path that reaches a primitive
 * (`$json.name.length`) resolves: the field exists, the rest reads its value.
 */
export function fieldPathResolves(item: unknown, path: string[]): boolean {
	return findPathMiss(item, path) === undefined;
}

/**
 * Finds expression references to fields that no item of the source node has.
 * A reference is reported only when every item misses it, so optional fields
 * that some items have are not reported.
 */
export function findMissingFieldReferences(
	input: FindMissingFieldReferencesInput,
): MissingFieldReference[] {
	const findings: MissingFieldReference[] = [];
	for (const node of input.nodes) {
		for (const { expression, parameterPath } of collectExpressionStrings(node.parameters)) {
			for (const reference of extractFieldReferences(expression)) {
				const sourceNodeName =
					reference.source.kind === 'node'
						? reference.source.nodeName
						: input.inputNodeOf(node.name);
				if (!sourceNodeName) continue;
				const items = input.itemsOf(sourceNodeName);
				if (!items || items.length === 0) continue;
				const misses = items.map((item) => findPathMiss(item, reference.path));
				const [first] = misses;
				if (!first || misses.some((miss) => miss === undefined)) continue;
				findings.push({
					nodeName: node.name,
					parameterPath,
					reference,
					sourceNodeName,
					missingSegment: first.segment,
					resolvedPath: first.resolved,
					availableKeys: Object.keys(first.at),
					arrayFieldsWithSegment: Object.keys(first.at).filter((key) => {
						const value = first.at[key];
						return (
							Array.isArray(value) &&
							value.some((entry) => isPlainObject(entry) && first.segment in entry)
						);
					}),
				});
			}
		}
	}
	return findings;
}
