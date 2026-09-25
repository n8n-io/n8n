import { describe, it, expect, vi, afterEach } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { TAB_DRAG_IGNORE_ATTRIBUTE, useTabDragReorder } from '../composables/useTabDragReorder';

const POINTER_ID = 1;
const GAP = 4;

// jsdom has no layout, so each tab gets a fixed box: [id, width].
function createTabs(layout: Array<[string, number]>) {
	let left = 0;
	return layout.map(([id, width]) => {
		const element = document.createElement('div');
		element.dataset.tabItemId = id;
		const box = { left, width };
		element.getBoundingClientRect = () =>
			({ left: box.left, width: box.width, right: box.left + box.width }) as DOMRect;
		left += width + GAP;
		return element;
	});
}

function pointerEvent(
	type: string,
	init: { clientX?: number; button?: number; pointerType?: string; target?: Element } = {},
) {
	const event = new MouseEvent(type, {
		clientX: init.clientX ?? 0,
		button: init.button ?? 0,
		bubbles: true,
		cancelable: true,
	});
	Object.defineProperty(event, 'pointerId', { value: POINTER_ID });
	Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
	if (init.target) Object.defineProperty(event, 'target', { value: init.target });
	return event as PointerEvent;
}

describe('useTabDragReorder', () => {
	let scope: EffectScope;

	function setup(layout: Array<[string, number]>) {
		const elements = createTabs(layout);
		const onReorder = vi.fn();
		const onDragStart = vi.fn();
		scope = effectScope();
		const drag = scope.run(() =>
			useTabDragReorder({ getTabElements: () => elements, onReorder, onDragStart }),
		)!;

		function press(tabId: string, clientX: number, init: Parameters<typeof pointerEvent>[1] = {}) {
			drag.onPointerDown(tabId, pointerEvent('pointerdown', { clientX, ...init }));
		}
		const move = (clientX: number) =>
			window.dispatchEvent(pointerEvent('pointermove', { clientX }));
		const release = () => window.dispatchEvent(pointerEvent('pointerup'));

		return { ...drag, elements, onReorder, onDragStart, press, move, release };
	}

	afterEach(() => {
		scope?.stop();
	});

	it('does not start a drag for a small movement', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);

		ctx.press('a', 50);
		ctx.move(53);
		ctx.release();

		expect(ctx.onDragStart).not.toHaveBeenCalled();
		expect(ctx.onReorder).not.toHaveBeenCalled();
	});

	it('moves the other tabs aside and drops the tab after a tab it passes to the right', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
			['c', 100],
		]);

		ctx.press('a', 50);
		ctx.move(110);

		expect(ctx.onDragStart).toHaveBeenCalledTimes(1);
		expect(ctx.draggedTabId.value).toBe('a');
		expect(ctx.offsets.value).toEqual({ a: 60, b: -104 });

		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('a', 1);
		expect(ctx.draggedTabId.value).toBeUndefined();
		expect(ctx.offsets.value).toEqual({});
	});

	it('drops the tab before a tab it passes to the left', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
			['c', 100],
		]);

		ctx.press('c', 250);
		ctx.move(140);
		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('c', 1);
	});

	it('moves the second tab to the first place when the first tab is narrower', () => {
		const ctx = setup([
			['narrow', 60],
			['wide', 200],
			['other', 100],
		]);

		// Drag well past the start of the row. The tab stops at the first tab's left edge.
		ctx.press('wide', 150);
		ctx.move(-200);

		expect(ctx.offsets.value.wide).toBe(-64);
		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('wide', 0);
	});

	it('moves a tab to the last place when the last tab is narrower', () => {
		const ctx = setup([
			['wide', 200],
			['middle', 100],
			['narrow', 60],
		]);

		ctx.press('wide', 100);
		ctx.move(1000);
		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('wide', 2);
	});

	it('does not reorder when the tab is dropped in its own place', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);

		ctx.press('a', 50);
		ctx.move(70);
		ctx.release();

		expect(ctx.onDragStart).toHaveBeenCalled();
		expect(ctx.onReorder).not.toHaveBeenCalled();
	});

	it('cancels the drag when Escape is pressed', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);

		ctx.press('a', 50);
		ctx.move(200);
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		ctx.release();

		expect(ctx.onReorder).not.toHaveBeenCalled();
		expect(ctx.draggedTabId.value).toBeUndefined();
		expect(ctx.offsets.value).toEqual({});
	});

	it('does not start a drag from the close button', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);
		const closeButton = document.createElement('button');
		closeButton.setAttribute(TAB_DRAG_IGNORE_ATTRIBUTE, '');
		ctx.elements[0].appendChild(closeButton);

		ctx.press('a', 90, { target: closeButton });
		ctx.move(200);
		ctx.release();

		expect(ctx.onDragStart).not.toHaveBeenCalled();
		expect(ctx.onReorder).not.toHaveBeenCalled();
	});

	it('does not start a drag from touch or from a secondary button', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);

		ctx.press('a', 50, { pointerType: 'touch' });
		ctx.move(200);
		ctx.release();
		ctx.press('a', 50, { button: 2 });
		ctx.move(200);
		ctx.release();

		expect(ctx.onDragStart).not.toHaveBeenCalled();
		expect(ctx.onReorder).not.toHaveBeenCalled();
	});
});
