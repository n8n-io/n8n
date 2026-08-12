import cloneDeep from 'lodash/cloneDeep';
import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';

import { useUiDocument } from './useUiDocument';
import type { UiNode } from '../../core/types';

/** A document ref, a `write` spy, and the composable built on both. */
function harness(doc?: UiNode) {
	const value = ref<string | object | undefined>(doc);
	const writes: UiNode[] = [];
	const readOnly = ref(false);

	const api = useUiDocument(value, (definition) => writes.push(definition), readOnly);

	return { ...api, value, writes };
}

function frameDoc(): UiNode {
	return {
		id: 'frame-1',
		type: 'frame',
		props: {},
		tree: {
			header: [],
			default: [{ id: 'page-1', type: 'page', props: {}, tree: {} }],
			footer: [],
		},
	};
}

describe('useUiDocument selection', () => {
	it('selecting a node clears a region selection', () => {
		const { selectNode, selectRegion, selectedId, selectedRegion } = harness(frameDoc());

		selectRegion({ id: 'frame-1', region: 'header' });
		expect(selectedRegion.value).toEqual({ id: 'frame-1', region: 'header' });

		selectNode('page-1');
		expect(selectedId.value).toBe('page-1');
		expect(selectedRegion.value).toBeUndefined();
	});

	it('selecting a region clears a node selection', () => {
		const { selectNode, selectRegion, selectedId, selectedRegion } = harness(frameDoc());

		selectNode('page-1');
		selectRegion({ id: 'frame-1', region: 'footer' });

		expect(selectedRegion.value).toEqual({ id: 'frame-1', region: 'footer' });
		expect(selectedId.value).toBeUndefined();
	});

	it('describes the selected region by its icon and label', () => {
		const { selectRegion, selectedPseudo } = harness(frameDoc());

		selectRegion({ id: 'frame-1', region: 'header' });

		expect(selectedPseudo.value).toEqual({ name: 'header', label: 'Header', icon: 'menu' });
	});
});

describe('useUiDocument write round-trip', () => {
	it('ignores its own commit handed back as a new object', async () => {
		const { value, writes, doc, selectNode, setProp } = harness(frameDoc());

		selectNode('page-1');
		setProp('title', 'Home');
		const before = doc.value;

		value.value = cloneDeep(writes[writes.length - 1]);
		await nextTick();

		expect(doc.value).toBe(before);
	});

	it('does not write a prop that already holds that value', () => {
		const { writes, selectNode, setProp } = harness(frameDoc());

		selectNode('page-1');
		setProp('title', 'Home');
		setProp('title', 'Home');

		expect(writes).toHaveLength(1);
	});
});

describe('useUiDocument addComponent targeting', () => {
	it('adds into the exact region a pseudo-selection names', () => {
		const { selectRegion, addComponent, doc } = harness(frameDoc());

		selectRegion({ id: 'frame-1', region: 'footer' });
		addComponent('text');

		expect(doc.value.tree.footer.map((node: UiNode) => node.type)).toEqual(['text']);
	});

	it('adds into the first region of a selected node that takes children', () => {
		const { selectNode, addComponent, doc } = harness(frameDoc());
		const frame = doc.value;

		selectNode('frame-1');
		addComponent('button');

		expect(frame.tree.header.map((node: UiNode) => node.type)).toEqual(['button']);
	});

	it('walks up to the nearest ancestor that takes children when the selection does not', () => {
		const document: UiNode = {
			id: 'page-1',
			type: 'page',
			props: {},
			tree: {
				default: [
					{
						id: 'stack-1',
						type: 'stack',
						props: {},
						tree: { default: [{ id: 'text-1', type: 'text', props: {}, tree: {} }] },
					},
				],
			},
		};
		const { selectNode, addComponent, doc } = harness(document);

		// `text` has no regions of its own: the button should land beside it in
		// the stack, the nearest ancestor that takes children, not at the root.
		selectNode('text-1');
		addComponent('button');

		const stack = doc.value.tree.default[0];
		expect(stack.tree.default.map((node: UiNode) => node.type)).toEqual(['text', 'button']);
	});

	it('defaults to the frame’s pages region when nothing is selected', () => {
		const { addComponent, doc } = harness(frameDoc());

		addComponent('page');

		expect(doc.value.tree.default.map((node: UiNode) => node.type)).toEqual(['page', 'page']);
	});

	it('falls back to the root’s own region when nothing is selected and there is no frame', () => {
		const document: UiNode = { id: 'page-1', type: 'page', props: {}, tree: {} };
		const { addComponent, doc } = harness(document);

		addComponent('text');

		expect(doc.value.tree.default.map((node: UiNode) => node.type)).toEqual(['text']);
	});
});
