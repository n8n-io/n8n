import CanvasConnectionLine from './CanvasConnectionLine.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ConnectionLineProps } from '@vue-flow/core';
import { Position } from '@vue-flow/core';
import { createCanvasProvide } from '@/__tests__/data';
import { waitFor } from '@testing-library/vue';

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
	global: {
		provide: {
			...createCanvasProvide(),
		},
	},
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

		const edges = container.querySelectorAll('.vue-flow__edge-path');

		expect(edges[0]).toHaveAttribute(
			'd',
			'M0 0L 24,0Q 40,0 40,16L 40,114Q 40,130 24,130L-10 130L-50 130',
		);
		expect(edges[1]).toHaveAttribute(
			'd',
			'M-50 130L-90 130L -124,130Q -140,130 -140,114L -140,-84Q -140,-100 -124,-100L-100 -100',
		);
	});

	it('should show the connection line after a short delay', async () => {
		vi.useFakeTimers();
		const { container } = renderComponent({
			props: DEFAULT_PROPS,
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).not.toHaveClass('visible');

		vi.advanceTimersByTime(300);

		await waitFor(() => expect(edge).toHaveClass('visible'));
	});
});
