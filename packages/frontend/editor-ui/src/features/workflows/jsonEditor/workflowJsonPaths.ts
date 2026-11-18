import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode, Tree } from '@lezer/common';

import type { JsonPath, TextRange, WorkflowNodeRef } from './workflowJson.types';

const VALUE_NODES = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);

const fullTree = (state: EditorState, upto = state.doc.length): Tree =>
	ensureSyntaxTree(state, upto, 200) ?? syntaxTree(state);

function readKey(state: EditorState, keyNode: SyntaxNode): string {
	const raw = state.sliceDoc(keyNode.from, keyNode.to);
	try {
		const key: unknown = JSON.parse(raw);
		return typeof key === 'string' ? key : raw;
	} catch {
		return raw.replace(/^"|"$/g, '');
	}
}

export function propertyValue(property: SyntaxNode): SyntaxNode | null {
	for (let n = property.getChild('PropertyName')?.nextSibling ?? null; n; n = n.nextSibling) {
		if (VALUE_NODES.has(n.name)) return n;
	}
	return null;
}

export function findProperty(
	state: EditorState,
	object: SyntaxNode,
	key: string,
): SyntaxNode | null {
	// JSON.parse keeps the last duplicate key, so do the same
	return (
		object
			.getChildren('Property')
			.filter((property) => {
				const keyNode = property.getChild('PropertyName');
				return keyNode !== null && readKey(state, keyNode) === key;
			})
			.at(-1) ?? null
	);
}

function arrayIndex(node: SyntaxNode): number {
	let index = 0;
	for (let sibling = node.prevSibling; sibling; sibling = sibling.prevSibling) {
		if (VALUE_NODES.has(sibling.name)) index++;
	}
	return index;
}

export function nodePath(state: EditorState, node: SyntaxNode | null): JsonPath {
	const path: JsonPath = [];
	for (; node?.parent; node = node.parent) {
		if (node.name === 'Property') {
			const key = node.getChild('PropertyName');
			if (key) path.unshift(readKey(state, key));
		} else if (node.parent.name === 'Array' && VALUE_NODES.has(node.name)) {
			path.unshift(arrayIndex(node));
		}
	}
	return path;
}

export const cursorToPath = (state: EditorState, pos: number): JsonPath =>
	nodePath(state, fullTree(state, pos).resolveInner(pos, 1));

export function pathToValueNode(state: EditorState, path: JsonPath): SyntaxNode | null {
	const top = fullTree(state).topNode;
	let value: SyntaxNode | null = top.getChild('Object') ?? top.getChild('Array');
	for (const segment of path) {
		if (!value) return null;
		if (typeof segment === 'number') {
			if (value.name !== 'Array') return null;
			let index = 0;
			let found: SyntaxNode | null = null;
			for (let child = value.firstChild; child && !found; child = child.nextSibling) {
				if (VALUE_NODES.has(child.name) && index++ === segment) found = child;
			}
			value = found;
		} else {
			if (value.name !== 'Object') return null;
			const property = findProperty(state, value, segment);
			value = property ? propertyValue(property) : null;
		}
	}
	return value;
}

/** Range of the value at `path`. For object members the range starts at the key. */
export function pathToRange(state: EditorState, path: JsonPath): TextRange | null {
	const node = pathToValueNode(state, path);
	if (!node) return null;
	return { from: node.parent?.name === 'Property' ? node.parent.from : node.from, to: node.to };
}

/** Range of the deepest part of `path` that exists in the document. */
export function closestRange(state: EditorState, path: JsonPath): TextRange | null {
	for (let length = path.length; length >= 0; length--) {
		const range = pathToRange(state, path.slice(0, length));
		if (range) return range;
	}
	return null;
}

export function readField(state: EditorState, object: SyntaxNode, key: string): unknown {
	const property = findProperty(state, object, key);
	const value = property ? propertyValue(property) : null;
	if (!value) return undefined;
	try {
		return JSON.parse(state.sliceDoc(value.from, value.to));
	} catch {
		return undefined;
	}
}

function nodeObjects(state: EditorState): SyntaxNode[] {
	const nodes = pathToValueNode(state, ['nodes']);
	if (nodes?.name !== 'Array') return [];
	return nodes.getChildren('Object');
}

export function findWorkflowNodeRange(state: EditorState, ref: WorkflowNodeRef): TextRange | null {
	const objects = nodeObjects(state);
	const object =
		(ref.id ? objects.find((o) => readField(state, o, 'id') === ref.id) : undefined) ??
		(ref.name ? objects.find((o) => readField(state, o, 'name') === ref.name) : undefined);
	return object ? { from: object.from, to: object.to } : null;
}

/** The workflow node under `pos`: an entry of `nodes`, or a key of `connections` or `pinData`. */
export function workflowNodeAtPos(state: EditorState, pos: number): WorkflowNodeRef | null {
	const path = cursorToPath(state, pos);
	if (path[0] === 'nodes' && typeof path[1] === 'number') {
		const object = pathToValueNode(state, ['nodes', path[1]]);
		if (object?.name !== 'Object') return null;
		const id = readField(state, object, 'id');
		const name = readField(state, object, 'name');
		return {
			id: typeof id === 'string' ? id : undefined,
			name: typeof name === 'string' ? name : undefined,
		};
	}
	if ((path[0] === 'connections' || path[0] === 'pinData') && typeof path[1] === 'string') {
		// The id also finds a node that a draft renamed. An old name finds no object and falls back to the name.
		const name = path[1];
		const object = nodeObjects(state).find((o) => readField(state, o, 'name') === name);
		const id = object ? readField(state, object, 'id') : undefined;
		return { id: typeof id === 'string' ? id : undefined, name };
	}
	return null;
}
