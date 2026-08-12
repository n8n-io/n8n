import { describe, expect, it } from 'vitest';
import { ref } from 'vue';

import { useOutline } from './useOutline';
import type { UiNode } from '../../core/types';

function leaf(id: string, type = 'text'): UiNode {
	return { id, type, props: {}, tree: {} };
}

function card(id: string, header: UiNode[], body: UiNode[]): UiNode {
	return { id, type: 'card', props: {}, tree: { header, default: body } };
}

function stack(id: string, children: UiNode[]): UiNode {
	return { id, type: 'stack', props: {}, tree: { default: children } };
}

function frame(header: UiNode[], pages: UiNode[], footer: UiNode[]): UiNode {
	return { id: 'frame-1', type: 'frame', props: {}, tree: { header, default: pages, footer } };
}

describe('useOutline', () => {
	it('marks a childless node as not expandable', () => {
		const doc = ref<UiNode>(stack('stack-1', []));

		const { outlineRows } = useOutline(doc);
		const row = outlineRows.value[0];

		expect(row.kind).toBe('node');
		if (row.kind === 'node') {
			expect(row.hasChildren).toBe(false);
			expect(row.collapsed).toBe(false);
		}
	});

	it('marks a node with children as expandable and expanded by default', () => {
		const doc = ref<UiNode>(stack('stack-1', [leaf('text-1')]));

		const { outlineRows } = useOutline(doc);
		const [root, child] = outlineRows.value;

		expect(root.kind).toBe('node');
		if (root.kind === 'node') {
			expect(root.hasChildren).toBe(true);
			expect(root.collapsed).toBe(false);
		}
		expect(child.key).toBe('text-1');
	});

	it('hides every descendant row once a node is collapsed', () => {
		const doc = ref<UiNode>(
			card('card-1', [leaf('heading-1', 'heading')], [stack('stack-1', [leaf('text-1')])]),
		);

		const { outlineRows, toggleCollapsed } = useOutline(doc);

		// Card has three regions, so each is its own pseudo-component row: header,
		// body (default) and footer, the last shown even though it holds nothing.
		expect(outlineRows.value.map((row) => row.key)).toEqual([
			'card-1',
			'card-1/header',
			'heading-1',
			'card-1/default',
			'stack-1',
			'text-1',
			'card-1/footer',
		]);

		toggleCollapsed('card-1');

		expect(outlineRows.value.map((row) => row.key)).toEqual(['card-1']);
		const collapsedRoot = outlineRows.value[0];
		expect(collapsedRoot.kind).toBe('node');
		if (collapsedRoot.kind === 'node') expect(collapsedRoot.collapsed).toBe(true);
	});

	describe('a multi-region component other than the frame', () => {
		it('shows each region as a pseudo-component, even one with no icon of its own', () => {
			const doc = ref<UiNode>(card('card-1', [], []));

			const { outlineRows } = useOutline(doc);
			const [, header, body, footer] = outlineRows.value;

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'card-1',
				'card-1/header',
				'card-1/default',
				'card-1/footer',
			]);

			for (const row of [header, body, footer]) {
				expect(row.kind).toBe('pseudo');
				if (row.kind === 'pseudo') expect(row.nodeId).toBe('card-1');
			}

			// CARD_DEF sets no icon on any region and none on the component itself,
			// so the fallback has nothing to fall back to: no icon is the honest
			// answer, not a broken one.
			expect(header.icon).toBeUndefined();
			expect(body.icon).toBeUndefined();
			expect(footer.icon).toBeUndefined();
			expect(body.label).toBe('Body');
		});
	});

	describe('a single-region component', () => {
		it('renders no pseudo row for its one region', () => {
			const doc = ref<UiNode>(stack('stack-1', [leaf('text-1')]));

			const { outlineRows } = useOutline(doc);

			expect(outlineRows.value.map((row) => row.key)).toEqual(['stack-1', 'text-1']);
			expect(outlineRows.value.some((row) => row.kind === 'pseudo')).toBe(false);
		});
	});

	it('collapsing an inner node only hides its own descendants', () => {
		const doc = ref<UiNode>(stack('stack-1', [stack('stack-2', [leaf('text-1')])]));

		const { outlineRows, toggleCollapsed } = useOutline(doc);

		toggleCollapsed('stack-2');

		expect(outlineRows.value.map((row) => row.key)).toEqual(['stack-1', 'stack-2']);
	});

	it('toggling back expands a node again', () => {
		const doc = ref<UiNode>(stack('stack-1', [leaf('text-1')]));

		const { outlineRows, toggleCollapsed } = useOutline(doc);

		toggleCollapsed('stack-1');
		expect(outlineRows.value).toHaveLength(1);

		toggleCollapsed('stack-1');
		expect(outlineRows.value.map((row) => row.key)).toEqual(['stack-1', 'text-1']);
	});

	describe('the app frame', () => {
		it('shows header, pages and footer as pseudo-components even when empty', () => {
			const doc = ref<UiNode>(frame([], [], []));

			const { outlineRows } = useOutline(doc);
			const [, header, pages, footer] = outlineRows.value;

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'frame-1/default',
				'frame-1/footer',
			]);

			for (const row of [header, pages, footer]) {
				expect(row.kind).toBe('pseudo');
				if (row.kind === 'pseudo') expect(row.nodeId).toBe('frame-1');
			}
			expect(header.icon).toBe('menu');
			expect(pages.icon).toBe('files');
			expect(footer.icon).toBe('info');
			expect(pages.label).toBe('Pages');
		});

		it('nests each region’s children under its pseudo-component row', () => {
			const doc = ref<UiNode>(frame([leaf('heading-1', 'heading')], [leaf('page-1', 'page')], []));

			const { outlineRows } = useOutline(doc);

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'heading-1',
				'frame-1/default',
				'page-1',
				'frame-1/footer',
			]);
		});

		it('marks the frame as expandable and hides the pseudo-components on collapse', () => {
			const doc = ref<UiNode>(frame([], [], []));

			const { outlineRows, toggleCollapsed } = useOutline(doc);
			const root = outlineRows.value[0];

			expect(root.kind).toBe('node');
			if (root.kind === 'node') expect(root.hasChildren).toBe(true);

			toggleCollapsed('frame-1');
			expect(outlineRows.value.map((row) => row.key)).toEqual(['frame-1']);
		});

		it('gives the paged region exactly one pseudo row no matter how many pages it holds', () => {
			const doc = ref<UiNode>(
				frame([], [leaf('page-1', 'page'), leaf('page-2', 'page'), leaf('page-3', 'page')], []),
			);

			const { outlineRows } = useOutline(doc);

			// One "frame-1/default" row for the region itself, not one per page: a
			// pseudo row names the slot, and the pages inside it are the slot's
			// ordinary children, the same as any other region's contents.
			const pseudoRows = outlineRows.value.filter((row) => row.kind === 'pseudo');
			expect(pseudoRows).toHaveLength(3); // header, pages, footer - one each
			expect(pseudoRows.filter((row) => row.key === 'frame-1/default')).toHaveLength(1);

			const pagesPseudo = pseudoRows.find((row) => row.key === 'frame-1/default');
			expect(pagesPseudo?.label).toBe('Pages');

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'frame-1/default',
				'page-1',
				'page-2',
				'page-3',
				'frame-1/footer',
			]);
		});

		it('marks a pseudo row with children as expandable, and one without as not', () => {
			const doc = ref<UiNode>(frame([leaf('heading-1', 'heading')], [], []));

			const { outlineRows } = useOutline(doc);
			const header = outlineRows.value.find((row) => row.key === 'frame-1/header');
			const pages = outlineRows.value.find((row) => row.key === 'frame-1/default');

			expect(header?.kind).toBe('pseudo');
			if (header?.kind === 'pseudo') {
				expect(header.hasChildren).toBe(true);
				expect(header.collapsed).toBe(false);
			}

			expect(pages?.kind).toBe('pseudo');
			if (pages?.kind === 'pseudo') expect(pages.hasChildren).toBe(false);
		});

		it('collapsing a pseudo row hides its own children, and toggling back reveals them', () => {
			const doc = ref<UiNode>(frame([leaf('heading-1', 'heading')], [], []));

			const { outlineRows, toggleCollapsed } = useOutline(doc);

			toggleCollapsed('frame-1/header');

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'frame-1/default',
				'frame-1/footer',
			]);
			const header = outlineRows.value.find((row) => row.key === 'frame-1/header');
			expect(header?.kind).toBe('pseudo');
			if (header?.kind === 'pseudo') expect(header.collapsed).toBe(true);

			toggleCollapsed('frame-1/header');

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'heading-1',
				'frame-1/default',
				'frame-1/footer',
			]);
		});

		it('collapsing a pseudo row leaves other pseudo rows and the frame itself untouched', () => {
			const doc = ref<UiNode>(
				frame([leaf('heading-1', 'heading')], [leaf('page-1', 'page')], [leaf('text-1')]),
			);

			const { outlineRows, toggleCollapsed } = useOutline(doc);

			toggleCollapsed('frame-1/default');

			expect(outlineRows.value.map((row) => row.key)).toEqual([
				'frame-1',
				'frame-1/header',
				'heading-1',
				'frame-1/default',
				'frame-1/footer',
				'text-1',
			]);
		});

		it('nests a pseudo row and its children one and two levels under the frame, matching a region heading', () => {
			const doc = ref<UiNode>(frame([leaf('heading-1', 'heading')], [], []));

			const { outlineRows } = useOutline(doc);
			const [root, headerPseudo, headingChild] = outlineRows.value;

			expect(root.depth).toBe(0);
			expect(headerPseudo.depth).toBe(1);
			expect(headingChild.depth).toBe(2);
		});

		describe('an active page', () => {
			function page(id: string, children: UiNode[]): UiNode {
				return { id, type: 'page', props: {}, tree: { default: children } };
			}

			it('shows only the active page under Pages, not the whole document', () => {
				const doc = ref<UiNode>(
					frame(
						[],
						[
							page('page-1', [leaf('heading-1', 'heading'), leaf('table-1', 'table')]),
							page('page-2', [leaf('heading-2', 'heading'), stack('stack-1', [leaf('input-1')])]),
						],
						[],
					),
				);
				const activePageId = ref('page-2');

				const { outlineRows } = useOutline(doc, activePageId);

				// page-1's row and subtree are gone entirely; page-2's is flattened
				// as normal, matching what the canvas has on screen. header/footer
				// are still shown, empty as they are: they stay on screen regardless
				// of which page is active.
				expect(outlineRows.value.map((row) => row.key)).toEqual([
					'frame-1',
					'frame-1/header',
					'frame-1/default',
					'page-2',
					'heading-2',
					'stack-1',
					'input-1',
					'frame-1/footer',
				]);
			});

			it('follows the active page when it changes', () => {
				const doc = ref<UiNode>(
					frame([], [page('page-1', [leaf('heading-1', 'heading')]), page('page-2', [])], []),
				);
				const activePageId = ref('page-1');

				const { outlineRows } = useOutline(doc, activePageId);

				expect(outlineRows.value.map((row) => row.key)).toEqual([
					'frame-1',
					'frame-1/header',
					'frame-1/default',
					'page-1',
					'heading-1',
					'frame-1/footer',
				]);

				activePageId.value = 'page-2';

				expect(outlineRows.value.map((row) => row.key)).toEqual([
					'frame-1',
					'frame-1/header',
					'frame-1/default',
					'page-2',
					'frame-1/footer',
				]);
			});

			it('falls back to showing every page when there is no active page', () => {
				const doc = ref<UiNode>(frame([], [page('page-1', []), page('page-2', [])], []));

				const { outlineRows } = useOutline(doc, ref(undefined));

				expect(outlineRows.value.map((row) => row.key)).toEqual([
					'frame-1',
					'frame-1/header',
					'frame-1/default',
					'page-1',
					'page-2',
					'frame-1/footer',
				]);
			});
		});
	});
});
