import { describe, expect, it } from 'vitest';

import {
	createEmptyDocument,
	createNode,
	findNode,
	findPlacement,
	insertRelativeTo,
	moveWithinRegion,
	normaliseNode,
	regionsOf,
	removeNode,
} from './document';
import { DEFAULT_REGION } from './types';
import type { UiNode } from './types';
import { getComponentDef } from '../kit';

function leaf(id: string): UiNode {
	return { id, type: 'text', props: {}, tree: {} };
}

describe('createNode', () => {
	it('numbers a new node from one', () => {
		expect(createNode('button', createEmptyDocument()).id).toBe('button-1');
	});

	it('gives every node an id no other node in the document has', () => {
		const root = createEmptyDocument();

		const first = createNode('button', root);
		insertRelativeTo(root, undefined, first);
		const second = createNode('button', root);
		insertRelativeTo(root, undefined, second);
		const third = createNode('button', root);

		expect([first.id, second.id, third.id]).toEqual(['button-1', 'button-2', 'button-3']);
	});

	it('skips past an id already taken deeper in the tree', () => {
		const root = createEmptyDocument();
		root.tree[DEFAULT_REGION] = [
			{ id: 'card-1', type: 'card', props: {}, tree: { default: [leaf('button-1')] } },
		];

		expect(createNode('button', root).id).toBe('button-2');
	});

	it('copies an object-valued default, so two nodes do not share one action list', () => {
		const root = createEmptyDocument();
		const first = createNode('button', root);
		const second = createNode('button', root);

		(first.props.onClick as unknown[]).push({ kind: 'navigate', to: '/orders' });

		expect(second.props.onClick).toEqual([]);
	});

	it("leaves the descriptor's own default alone", () => {
		const root = createEmptyDocument();
		const node = createNode('button', root);

		(node.props.onClick as unknown[]).push({ kind: 'navigate', to: '/orders' });

		const descriptor = getComponentDef('button')?.props.find((prop) => prop.name === 'onClick');
		expect(descriptor?.default).toEqual([]);
	});

	it('takes a primitive default as it is', () => {
		const node = createNode('button', createEmptyDocument());

		expect(node.props.label).toBe('Button');
		expect(node.props.disabled).toBe(false);
	});
});

describe('normaliseNode', () => {
	it('reads the older bare-array children as the default region', () => {
		const older = {
			id: 'stack-1',
			type: 'stack',
			props: {},
			tree: [leaf('text-1')],
		} as unknown as UiNode;

		const node = normaliseNode(older);

		expect(Object.keys(node.tree)).toEqual([DEFAULT_REGION]);
		expect(node.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['text-1']);
	});

	it('reads a node with no children at all as having no regions', () => {
		const node = normaliseNode({ id: 'text-1', type: 'text', props: {} } as unknown as UiNode);

		expect(node.tree).toEqual({});
	});

	it('normalises children all the way down', () => {
		const older = {
			id: 'stack-1',
			type: 'stack',
			props: {},
			tree: [{ id: 'stack-2', type: 'stack', props: {}, tree: [leaf('text-1')] }],
		} as unknown as UiNode;

		const inner = normaliseNode(older).tree[DEFAULT_REGION][0];

		expect(inner.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['text-1']);
	});

	it('does not mutate the node it was given', () => {
		const older = {
			id: 'stack-1',
			type: 'stack',
			props: {},
			tree: [leaf('text-1')],
		} as unknown as UiNode;

		normaliseNode(older);

		expect(Array.isArray(older.tree)).toBe(true);
	});

	it("does not write into the caller's region arrays", () => {
		const given: UiNode = { id: 'stack-1', type: 'stack', props: {}, tree: { default: [] } };

		normaliseNode(given).tree[DEFAULT_REGION].push(leaf('text-1'));

		expect(given.tree[DEFAULT_REGION]).toEqual([]);
	});
});

describe('findNode and findPlacement', () => {
	it('finds a node nested in a named region', () => {
		const root = createEmptyDocument();
		const card: UiNode = { id: 'card-1', type: 'card', props: {}, tree: { footer: [leaf('t')] } };
		root.tree[DEFAULT_REGION] = [card];

		expect(findNode(root, 't')?.id).toBe('t');
		expect(findPlacement(root, 't')).toEqual({ parent: card, region: 'footer', index: 0 });
	});

	it('finds nothing for an id the document does not hold', () => {
		expect(findNode(createEmptyDocument(), 'nope')).toBeUndefined();
		expect(findPlacement(createEmptyDocument(), 'nope')).toBeUndefined();
	});
});

describe('insertRelativeTo', () => {
	it('appends to the root when nothing is selected', () => {
		const root = createEmptyDocument();

		insertRelativeTo(root, undefined, leaf('text-1'));

		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['text-1']);
		expect(regionsOf(root)[0].name).toBe(DEFAULT_REGION);
	});

	it('puts the child inside a selected component that has regions', () => {
		const root = createEmptyDocument();
		const card: UiNode = { id: 'card-1', type: 'card', props: {}, tree: {} };
		root.tree[DEFAULT_REGION] = [card];

		insertRelativeTo(root, 'card-1', leaf('text-1'));

		expect(card.tree.header.map((child) => child.id)).toEqual(['text-1']);
	});

	it('honours the named region of the selection', () => {
		const root = createEmptyDocument();
		const card: UiNode = { id: 'card-1', type: 'card', props: {}, tree: {} };
		root.tree[DEFAULT_REGION] = [card];

		insertRelativeTo(root, { id: 'card-1', region: 'footer' }, leaf('text-1'));

		expect(card.tree.footer.map((child) => child.id)).toEqual(['text-1']);
	});

	it("falls back to the first region when the named one is not the selection's", () => {
		const root = createEmptyDocument();
		const card: UiNode = { id: 'card-1', type: 'card', props: {}, tree: {} };
		root.tree[DEFAULT_REGION] = [card];

		insertRelativeTo(root, { id: 'card-1', region: 'nowhere' }, leaf('text-1'));

		expect(card.tree.header.map((child) => child.id)).toEqual(['text-1']);
	});

	it('puts the child after a selected leaf, among its siblings', () => {
		const root = createEmptyDocument();
		root.tree[DEFAULT_REGION] = [leaf('text-1'), leaf('text-2')];

		insertRelativeTo(root, 'text-1', leaf('text-3'));

		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual([
			'text-1',
			'text-3',
			'text-2',
		]);
	});

	it('appends to the root when the selection is not in the document', () => {
		const root = createEmptyDocument();

		insertRelativeTo(root, 'gone', leaf('text-1'));

		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['text-1']);
	});
});

describe('moveWithinRegion', () => {
	it('moves a node down among its siblings', () => {
		const root = createEmptyDocument();
		root.tree[DEFAULT_REGION] = [leaf('a'), leaf('b'), leaf('c')];

		expect(moveWithinRegion(root, 'a', 1)).toBe(true);
		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['b', 'a', 'c']);
	});

	it('moves a node up among its siblings', () => {
		const root = createEmptyDocument();
		root.tree[DEFAULT_REGION] = [leaf('a'), leaf('b')];

		expect(moveWithinRegion(root, 'b', -1)).toBe(true);
		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['b', 'a']);
	});

	it('stops at the region boundary rather than spilling into the next region', () => {
		const root = createEmptyDocument();
		const card: UiNode = {
			id: 'card-1',
			type: 'card',
			props: {},
			tree: { header: [leaf('a')], default: [leaf('b')] },
		};
		root.tree[DEFAULT_REGION] = [card];

		expect(moveWithinRegion(root, 'a', 1)).toBe(false);
		expect(card.tree.header.map((child) => child.id)).toEqual(['a']);
		expect(card.tree.default.map((child) => child.id)).toEqual(['b']);
	});

	it('does not move a node the document does not hold', () => {
		expect(moveWithinRegion(createEmptyDocument(), 'gone', 1)).toBe(false);
	});
});

describe('removeNode', () => {
	it('removes a node and everything under it', () => {
		const root = createEmptyDocument();
		root.tree[DEFAULT_REGION] = [
			{ id: 'card-1', type: 'card', props: {}, tree: { default: [leaf('text-1')] } },
			leaf('text-2'),
		];

		expect(removeNode(root, 'card-1')).toBe(true);
		expect(root.tree[DEFAULT_REGION].map((child) => child.id)).toEqual(['text-2']);
		expect(findNode(root, 'text-1')).toBeUndefined();
	});

	it('refuses to remove the root', () => {
		const root = createEmptyDocument();

		expect(removeNode(root, root.id)).toBe(false);
	});

	it('removes nothing for an id the document does not hold', () => {
		expect(removeNode(createEmptyDocument(), 'gone')).toBe(false);
	});
});
