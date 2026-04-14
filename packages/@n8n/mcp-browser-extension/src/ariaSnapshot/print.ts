/**
 * Snapshot emitter — converts the TreeNode AST into YAML-like text.
 *
 * Architecture follows a compiler printer pattern:
 *   emitLine(node)  → produces the text content for a single line
 *   printTree(nodes) → handles indentation and child recursion
 */

import type { AriaProps, TreeNode } from './types';
import { escapeAttr } from './types';

// ---------------------------------------------------------------------------
// Attribute schema — declarative, ordered, one entry per ARIA attr
// ---------------------------------------------------------------------------

/**
 * Ordered list of ARIA attributes and how they render.
 *
 * Each attribute has a `render` function that maps its value to a bracket
 * string, or `undefined` to omit. This is the single source of truth for
 * attribute rendering — adding a new ARIA attr means adding one row here
 * (and the field to AriaProps).
 */
const ARIA_ATTRS: ReadonlyArray<{
	key: keyof AriaProps;
	render: (value: NonNullable<AriaProps[keyof AriaProps]>) => string;
}> = [
	// true → [checked], false → [checked=false], 'mixed' → [checked=mixed]
	{ key: 'checked', render: (v) => (v === true ? '[checked]' : `[checked=${v}]`) },
	// true → [disabled], false is never stored by extractAriaProps
	{ key: 'disabled', render: () => '[disabled]' },
	// true → [expanded], false → [expanded=false]
	{ key: 'expanded', render: (v) => (v === true ? '[expanded]' : `[expanded=${v}]`) },
	// number → [level=N]
	{ key: 'level', render: (v) => `[level=${v}]` },
	// true → [pressed], false → [pressed=false], 'mixed' → [pressed=mixed]
	{ key: 'pressed', render: (v) => (v === true ? '[pressed]' : `[pressed=${v}]`) },
	// true → [selected], false is never stored by extractAriaProps
	{ key: 'selected', render: () => '[selected]' },
];

// ---------------------------------------------------------------------------
// emitLine — produces the text content for a single node (no indentation)
// ---------------------------------------------------------------------------

function emitLine(node: TreeNode): string {
	if (node.role === 'text') return `text: "${escapeAttr(node.name)}"`;

	const segments: string[] = [node.role];

	if (node.name) segments.push(` "${escapeAttr(node.name)}"`);

	for (const { key, render } of ARIA_ATTRS) {
		const val = node[key];
		if (val !== undefined) segments.push(` ${render(val)}`);
	}

	for (const [key, val] of Object.entries(node.props ?? {})) {
		segments.push(` [${key}=${escapeAttr(val)}]`);
	}

	if (node.ref) segments.push(` [ref=${node.ref}]`);

	// Inline value (like Playwright): `textbox "Email" [ref=...]: user@test.com`
	if (node.value) segments.push(`: ${node.value}`);

	return segments.join('');
}

// ---------------------------------------------------------------------------
// printTree — recursive printer, handles only indentation and child layout
// ---------------------------------------------------------------------------

function printTree(nodes: TreeNode[], indent: number): string {
	return nodes
		.map((node) => {
			const depth = indent + (node.indentOffset ?? 0);
			const line = `${'  '.repeat(depth)}- ${emitLine(node)}`;
			return node.children.length > 0 ? `${line}\n${printTree(node.children, depth + 1)}` : line;
		})
		.join('\n');
}

export function renderSnapshot(nodes: TreeNode[], indent = 0): string {
	return printTree(nodes, indent);
}
