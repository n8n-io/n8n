import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { TAB_DRAG_IGNORE_ATTRIBUTE, useTabDragReorder } from '../composables/useTabDragReorder';

const GAP = 4;
const pointer = { pointerId: 1, pointerType: 'mouse' };

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

describe('useTabDragReorder', () => {
	let scope: EffectScope;
	let frameCallbacks: FrameRequestCallback[] = [];

	// Positions update once per animation frame; tests draw a frame on demand.
	function flushFrame() {
		const callbacks = frameCallbacks;
		frameCallbacks = [];
		callbacks.forEach((callback) => callback(0));
	}

	beforeEach(() => {
		frameCallbacks = [];
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			frameCallbacks.push(callback);
			return frameCallbacks.length;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {
			frameCallbacks = [];
		});
	});

	function setup(layout: Array<[string, number]>) {
		const elements = createTabs(layout);
		// Attached, so events on a tab bubble up to the window like in the app.
		elements.forEach((element) => document.body.appendChild(element));
		const onReorder = vi.fn();
		const onDragStart = vi.fn();
		scope = effectScope();
		const drag = scope.run(() =>
			useTabDragReorder({ getTabElements: () => elements, onReorder, onDragStart }),
		)!;
		// The tab bar binds each tab's pointerdown to the composable the same way.
		elements.forEach((element) =>
			element.addEventListener('pointerdown', (event) =>
				drag.onPointerDown(element.dataset.tabItemId ?? '', event),
			),
		);

		function press(
			tabId: string,
			clientX: number,
			init: { button?: number; pointerType?: string; target?: Element } = {},
		) {
			const tab = elements.find((element) => element.dataset.tabItemId === tabId);
			const { target = tab, ...eventInit } = init;
			if (target) fireEvent.pointerDown(target, { clientX, ...pointer, ...eventInit });
		}
		const move = (clientX: number) => {
			fireEvent.pointerMove(window, { clientX, ...pointer });
			flushFrame();
		};
		const transforms = () =>
			Object.fromEntries(
				elements.map((element) => [element.dataset.tabItemId, element.style.transform]),
			);
		const release = () => fireEvent.pointerUp(window, pointer);

		return { ...drag, elements, onReorder, onDragStart, press, move, release, transforms };
	}

	afterEach(() => {
		scope?.stop();
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
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
		expect(ctx.transforms()).toEqual({ a: 'translateX(60px)', b: 'translateX(-104px)', c: '' });

		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('a', 1);
		expect(ctx.draggedTabId.value).toBeUndefined();
		expect(ctx.transforms()).toEqual({ a: '', b: '', c: '' });
		expect(ctx.elements.map((element) => element.style.transition)).toEqual(['', '', '']);
	});

	it('moves the tabs once per frame, however many pointer moves arrive', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);
		ctx.press('a', 50);

		fireEvent.pointerMove(window, { clientX: 60, ...pointer });
		fireEvent.pointerMove(window, { clientX: 70, ...pointer });
		expect(frameCallbacks).toHaveLength(1);
		expect(ctx.transforms().a).toBe('');

		flushFrame();
		expect(ctx.transforms().a).toBe('translateX(20px)');
	});

	it('drops at the last pointer position when the pointer is released before the next frame', () => {
		const ctx = setup([
			['a', 100],
			['b', 100],
		]);
		ctx.press('a', 50);

		fireEvent.pointerMove(window, { clientX: 200, ...pointer });
		ctx.release();

		expect(ctx.onReorder).toHaveBeenCalledWith('a', 1);
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

		expect(ctx.transforms().wide).toBe('translateX(-64px)');
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

	describe('when the tabs change during a drag', () => {
		it('drops next to the passed tab when a tab opens before it', () => {
			const ctx = setup([
				['a', 100],
				['b', 100],
				['c', 100],
			]);
			ctx.press('a', 50);
			ctx.move(160);

			// The agent opens a tab at the start while the pointer is down.
			const [opened] = createTabs([['new', 100]]);
			ctx.elements.unshift(opened);
			ctx.release();

			// "a" passed "b", so it lands after "b": index 2 in [new, a, b, c].
			expect(ctx.onReorder).toHaveBeenCalledWith('a', 2);
		});

		it('does not reorder when the passed tab closes', () => {
			const ctx = setup([
				['a', 100],
				['b', 100],
				['c', 100],
			]);
			ctx.press('a', 50);
			ctx.move(160);

			ctx.elements.splice(1, 1);
			ctx.release();

			expect(ctx.onReorder).not.toHaveBeenCalled();
		});

		it('does not reorder when the dragged tab closes', () => {
			const ctx = setup([
				['a', 100],
				['b', 100],
			]);
			ctx.press('a', 50);
			ctx.move(160);

			ctx.elements.splice(0, 1);
			ctx.release();

			expect(ctx.onReorder).not.toHaveBeenCalled();
		});
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
		expect(ctx.transforms()).toEqual({ a: '', b: '' });
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
