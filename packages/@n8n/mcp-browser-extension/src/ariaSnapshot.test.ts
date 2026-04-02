/* eslint-disable @typescript-eslint/naming-convention */
import type { Protocol } from 'devtools-protocol';

import { buildSnapshot, computeSnapshotDiff, renderSnapshot, type TreeNode } from './ariaSnapshot';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roleVal = (value: string): Protocol.Accessibility.AXValue => ({ type: 'role', value });
const nameVal = (value: string): Protocol.Accessibility.AXValue => ({ type: 'string', value });

/** No-op fetchAttributes — returns empty attrs (no test-ID, no id) */
const noAttrs = async (_id: number): Promise<string[]> => await Promise.resolve([]);

/** Build a fetchAttributes mock that returns given attrs for given backendNodeIds */
function attrsMock(map: Record<number, string[]>): (id: number) => Promise<string[]> {
	return async (id: number) => await Promise.resolve(map[id] ?? []);
}

function axNode(
	nodeId: string,
	role: string,
	opts: {
		name?: string;
		childIds?: string[];
		backendDOMNodeId?: number;
		ignored?: boolean;
		parentId?: string;
	} = {},
): Protocol.Accessibility.AXNode {
	return {
		nodeId,
		role: roleVal(role),
		name: opts.name !== undefined ? nameVal(opts.name) : undefined,
		childIds: opts.childIds ?? [],
		backendDOMNodeId: opts.backendDOMNodeId,
		ignored: opts.ignored ?? false,
		parentId: opts.parentId,
	};
}

// ---------------------------------------------------------------------------
// Snapshot building tests
// ---------------------------------------------------------------------------

describe('buildSnapshot', () => {
	it('returns empty nodes for empty axNodes', async () => {
		const result = await buildSnapshot({ axNodes: [], fetchAttributes: noAttrs });
		expect(result.nodes).toEqual([]);
		expect(result.refs.size).toBe(0);
	});

	it('includes interactive button and context navigation', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'navigation', { childIds: ['4'], backendDOMNodeId: 10 }),
			axNode('3', 'main', { childIds: ['5'], backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Home', childIds: [], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 13 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('excludes headings in interactive-only mode (default)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'heading', { name: 'Page Title', childIds: [] }),
			axNode('3', 'button', { name: 'Click me', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('includes headings in full mode', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'heading', { name: 'Page Title', childIds: [] }),
			axNode('3', 'button', { name: 'Click me', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({
			axNodes,
			fetchAttributes: noAttrs,
			type: 'full',
		});
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('hoists button out of generic wrapper', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('includes label text in label context', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'labeltext', { childIds: ['3', '4'] }),
			axNode('3', 'statictext', { name: 'Email', childIds: [] }),
			axNode('4', 'textbox', { name: 'Email', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('preserves indent offset for children of ignored nodes', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { childIds: ['3'], ignored: true, backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'Go', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		// Children of ignored node get +1 indent
		const allNodes = flattenNodes(result.nodes);
		const button = allNodes.find((n) => n.role === 'button');
		expect(button).toBeDefined();
		expect(button!.indentOffset ?? 0).toBeGreaterThanOrEqual(1);
	});

	it('uses data-testid attr as ref (highest priority)', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['data-testid', 'save-btn', 'id', 'btn1'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('falls back to id attr as ref when no test-ID attr present', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['id', 'my-save-btn'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('falls back to role+name ref when no stable attr', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Save', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('deduplicates identical selectors in refs map with >> nth=', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });
		const text = renderSnapshot(result.nodes);

		// Rendered output has two distinct refs
		expect(text).toMatchSnapshot();

		// Refs map has nth= selectors to distinguish the duplicates
		expect(result.refs.get('btn-ok')).toBe('role=button[name="OK"] >> nth=0');
		expect(result.refs.get('btn-ok-2')).toBe('role=button[name="OK"] >> nth=1');
	});

	it('promotes contenteditable generic div to textbox', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'generic', { name: '', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['contenteditable', 'true', 'class', 'editor'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('scopes snapshot to scopeNodeId subtree', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'navigation', { childIds: ['4'], backendDOMNodeId: 10 }),
			axNode('3', 'main', { childIds: ['5'], backendDOMNodeId: 11 }),
			axNode('4', 'link', { name: 'Nav Link', childIds: [], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Main Button', childIds: [], backendDOMNodeId: 13 }),
		];

		// Scope to 'main' node (id='3')
		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, scopeNodeId: '3' });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('assigns stable refs from data-testid', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 10 }),
		];

		const fetch = attrsMock({ 10: ['data-testid', 'submit-btn'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });

		expect(result.refs.has('submit-btn')).toBe(true);
		expect(result.refs.get('submit-btn')).toBe('[data-testid="submit-btn"]');
	});

	it('assigns role+name refs when no stable attrs', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'A', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'B', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn-a')).toBe(true);
		expect(result.refs.has('btn-b')).toBe(true);
	});

	it('assigns role+name ref for button with no stable attr', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', { name: 'Submit', childIds: [], backendDOMNodeId: 10 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn-submit')).toBe(true);
		expect(result.refs.get('btn-submit')).toBe('role=button[name="Submit"]');
	});

	it('appends -2 suffix on ref collision', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2', '3'] }),
			axNode('2', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 10 }),
			axNode('3', 'button', { name: 'OK', childIds: [], backendDOMNodeId: 11 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		expect(result.refs.has('btn-ok')).toBe(true);
		expect(result.refs.has('btn-ok-2')).toBe(true);
	});

	it('truncates long name slug at word boundary', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'button', {
				name: 'This is a very long button label',
				childIds: [],
				backendDOMNodeId: 10,
			}),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs });

		// "this-is-a-very-long-button-label" → slice(0,20)="this-is-a-very-long-" → lastDash=19 → "this-is-a-very-long"
		expect(result.refs.has('btn-this-is-a-very-long')).toBe(true);
	});

	it('produces expected inline snapshot', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'navigation', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'link', { name: 'Home', childIds: [], backendDOMNodeId: 11 }),
		];

		const fetch = attrsMock({ 11: ['data-testid', 'home-link'] });
		const result = await buildSnapshot({ axNodes, fetchAttributes: fetch });
		const text = renderSnapshot(result.nodes);

		expect(text).toMatchSnapshot();
	});

	it('truncates structural nodes beyond maxDepth', async () => {
		// currentDepth: main=0, section=1, list=2, listitem=2(check triggers at list level)
		// list hits maxDepth=2, so list+listitem are dropped; button is interactive so it surfaces
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'list', { childIds: ['5'], backendDOMNodeId: 12 }),
			axNode('5', 'listitem', { childIds: ['6'], backendDOMNodeId: 13 }),
			axNode('6', 'button', { name: 'Deep Button', childIds: [], backendDOMNodeId: 14 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 2 });
		const text = renderSnapshot(result.nodes);

		// list and listitem are at/beyond maxDepth so they are dropped
		expect(text).not.toContain('list');
		// but the interactive button inside them still appears
		expect(text).toContain('Deep Button');
	});

	it('always includes interactive elements regardless of depth', async () => {
		// A deeply nested button should always appear even at maxDepth=1
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'navigation', { childIds: ['5'], backendDOMNodeId: 12 }),
			axNode('5', 'button', { name: 'Nested Button', childIds: [], backendDOMNodeId: 13 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 1 });
		const text = renderSnapshot(result.nodes);

		expect(text).toContain('Nested Button');
	});

	it('does not truncate when nesting is within maxDepth', async () => {
		const axNodes: Protocol.Accessibility.AXNode[] = [
			axNode('1', 'rootwebarea', { childIds: ['2'] }),
			axNode('2', 'main', { childIds: ['3'], backendDOMNodeId: 10 }),
			axNode('3', 'section', { childIds: ['4'], backendDOMNodeId: 11 }),
			axNode('4', 'button', { name: 'Shallow Button', childIds: [], backendDOMNodeId: 12 }),
		];

		const result = await buildSnapshot({ axNodes, fetchAttributes: noAttrs, maxDepth: 6 });
		const text = renderSnapshot(result.nodes);

		// All nodes within depth should appear
		expect(text).toContain('main');
		expect(text).toContain('section');
		expect(text).toContain('Shallow Button');
	});
});

// ---------------------------------------------------------------------------
// computeSnapshotDiff tests
// ---------------------------------------------------------------------------

describe('computeSnapshotDiff', () => {
	function makeTree(nodes: Array<{ role: string; name: string; ref?: string }>): TreeNode[] {
		return nodes.map(({ role, name, ref }) => ({ role, name, ref, children: [] }));
	}

	it('returns full on empty previous (first call)', () => {
		const next = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff([], next);
		expect(result.diffType).toBe('full');
		expect(result.content).toMatchSnapshot();
	});

	it('returns no-change for identical trees', () => {
		const nodes = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff(nodes, [...nodes.map((n) => ({ ...n }))]);
		expect(result.diffType).toBe('no-change');
		expect(result.content).toBe('');
	});

	it('returns diff with ~ marker for changed node name', () => {
		const prev = makeTree([{ role: 'button', name: 'Submit', ref: 'submit-btn' }]);
		const next = makeTree([{ role: 'button', name: 'Save', ref: 'submit-btn' }]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('returns diff with + marker for added node', () => {
		const prev = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const next = makeTree([
			{ role: 'button', name: 'Save', ref: 'btn-save' },
			{ role: 'button', name: 'Export', ref: 'btn-export' },
		]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('returns diff with - marker for removed node', () => {
		const prev = makeTree([
			{ role: 'button', name: 'Save', ref: 'btn-save' },
			{ role: 'button', name: 'Delete', ref: 'btn-delete' },
		]);
		const next = makeTree([{ role: 'button', name: 'Save', ref: 'btn-save' }]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});

	it('detects moved node as stable (same ref, different position)', () => {
		const prev = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'B', ref: 'btn-b' },
		]);
		// B moved before A
		const next = makeTree([
			{ role: 'button', name: 'B', ref: 'btn-b' },
			{ role: 'button', name: 'A', ref: 'btn-a' },
		]);
		// Both refs match — no changes
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('no-change');
	});

	it('returns full when more than 50% of nodes changed', () => {
		const prev = makeTree([
			{ role: 'button', name: 'A', ref: 'btn-a' },
			{ role: 'button', name: 'B', ref: 'btn-b' },
			{ role: 'button', name: 'C', ref: 'btn-c' },
		]);
		const next = makeTree([
			{ role: 'button', name: 'X', ref: 'btn-x' },
			{ role: 'button', name: 'Y', ref: 'btn-y' },
			{ role: 'button', name: 'Z', ref: 'btn-z' },
		]);
		const result = computeSnapshotDiff(prev, next);
		expect(result.diffType).toBe('full');
		expect(result.content).toMatchSnapshot();
	});

	it('includes breadcrumb context in diff output', () => {
		// Build a tree with parent context
		const parentNode: TreeNode = {
			role: 'navigation',
			name: 'Main nav',
			children: [{ role: 'link', name: 'About', ref: 'about-link', children: [] }],
		};
		const nextParent: TreeNode = {
			role: 'navigation',
			name: 'Main nav',
			children: [{ role: 'link', name: 'About us', ref: 'about-link', children: [] }],
		};

		const result = computeSnapshotDiff([parentNode], [nextParent]);
		expect(result.diffType).toBe('diff');
		expect(result.content).toMatchSnapshot();
	});
});

// ---------------------------------------------------------------------------
// renderSnapshot tests
// ---------------------------------------------------------------------------

describe('renderSnapshot', () => {
	it('renders nested tree with correct indentation', () => {
		const nodes: TreeNode[] = [
			{
				role: 'navigation',
				name: '',
				children: [
					{
						role: 'link',
						name: 'Home',
						children: [],
					},
				],
			},
		];

		expect(renderSnapshot(nodes)).toMatchSnapshot();
	});
});

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function flattenNodes(nodes: TreeNode[]): TreeNode[] {
	return nodes.flatMap((n) => [n, ...flattenNodes(n.children)]);
}
