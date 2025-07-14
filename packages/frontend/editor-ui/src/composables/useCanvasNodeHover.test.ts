/* eslint-disable vue/one-component-per-file */
import { renderComponent } from '@/__tests__/render';
import { type CanvasNode } from '@/types';
import { fireEvent } from '@testing-library/dom';
import { type Rect, useVueFlow, VueFlow } from '@vue-flow/core';
import { describe, expect, it } from 'vitest';
import { computed, defineComponent, h } from 'vue';
import { useCanvasNodeHover } from './useCanvasNodeHover';

describe(useCanvasNodeHover, () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	function getHitBoxMargin10(rect: Rect): Rect {
		return {
			x: rect.x - 10,
			y: rect.y - 10,
			width: rect.width + 20,
			height: rect.height + 20,
		};
	}

	function getHitBoxMargin100(rect: Rect): Rect {
		return {
			x: rect.x - 100,
			y: rect.y - 100,
			width: rect.width + 200,
			height: rect.height + 200,
		};
	}

	const nodesRef = computed<CanvasNode[]>(() => [
		{ id: 'node-1', position: { x: 100, y: 100 } },
		{ id: 'node-2', position: { x: 100, y: 200 } },
	]);

	it('should return ID of the node which a mousemove event was emitted on', async () => {
		vi.useFakeTimers();

		const TestComponent = defineComponent({
			setup() {
				const store = useVueFlow();
				return useCanvasNodeHover(nodesRef, store, getHitBoxMargin10);
			},
			render() {
				return h('div', [
					h('div', { 'data-test-id': 'hovered' }, this.id ?? 'no match'),
					h(VueFlow, { 'data-test-id': 'canvas', nodes: nodesRef.value }),
				]);
			},
		});
		const wrapper = renderComponent(TestComponent);

		expect(wrapper.getByTestId('hovered')).toHaveTextContent('no match');

		fireEvent.mouseMove(wrapper.getByTestId('canvas'), { clientX: 90, clientY: 90 });
		await wrapper.rerender({});
		expect(wrapper.getByTestId('hovered')).toHaveTextContent('node-1');

		vi.advanceTimersByTime(1000); // Advance timer to circumvent throttling

		fireEvent.mouseMove(wrapper.getByTestId('canvas'), { clientX: 110, clientY: 210 });
		await wrapper.rerender({});
		expect(wrapper.getByTestId('hovered')).toHaveTextContent('node-2');

		vi.advanceTimersByTime(1000); // Advance timer to circumvent throttling

		fireEvent.mouseMove(wrapper.getByTestId('canvas'), { clientX: 0, clientY: 0 });
		await wrapper.rerender({});
		expect(wrapper.getByTestId('hovered')).toHaveTextContent('no match');
	});

	it('should return ID of the closest node if more than one node exist near the coordinate of mousemove event', async () => {
		const TestComponent = defineComponent({
			setup() {
				const store = useVueFlow();
				return useCanvasNodeHover(nodesRef, store, getHitBoxMargin100);
			},
			render() {
				return h('div', [
					h('div', { 'data-test-id': 'hovered' }, this.id ?? 'no match'),
					h(VueFlow, { 'data-test-id': 'canvas', nodes: nodesRef.value }),
				]);
			},
		});
		const wrapper = renderComponent(TestComponent);

		fireEvent.mouseMove(wrapper.getByTestId('canvas'), { clientX: 100, clientY: 160 });
		await wrapper.rerender({});
		expect(wrapper.getByTestId('hovered')).toHaveTextContent('node-2');
	});
});
