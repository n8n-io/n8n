import CanvasConnectionLine from './CanvasConnectionLine.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ConnectionLineProps } from '@vue-flow/core';
import { Position } from '@vue-flow/core';

const DEFAULT_PROPS = {
	sourceX: 0,
	sourceY: 0,
	sourcePosition: Position.Top,
	targetX: 100,
	targetY: 100,
	targetPosition: Position.Bottom,
} satisfies Partial<ConnectionLineProps>;
const renderComponent = createComponentRenderer(CanvasConnectionLine, {
	props: DEFAULT_PROPS,
});

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasConnectionLine', () => {
	it('should render a correct bezier path', () => {
		const { container } = renderComponent({
			props: DEFAULT_PROPS,
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveAttribute('d', 'M0,0 C0,-62.5 100,162.5 100,100');
	});

	it('should render a correct smooth step path when the connection is backwards', () => {
		const { container } = renderComponent({
			props: {
				...DEFAULT_PROPS,
				sourceX: 0,
				sourceY: 0,
				sourcePosition: Position.Right,
				targetX: -100,
				targetY: -100,
				targetPosition: Position.Left,
			},
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveAttribute(
			'd',
			'M0 0L 32,0Q 40,0 40,8L 40,132Q 40,140 32,140L1 140L0 140M0 140L-40 140L -132,140Q -140,140 -140,132L -140,-92Q -140,-100 -132,-100L-100 -100',
		);
	});
});
