import { fireEvent } from '@testing-library/vue';
import CanvasEdge, { type CanvasEdgeProps } from './CanvasEdge.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { Position } from '@vue-flow/core';

const DEFAULT_PROPS = {
	sourceX: 0,
	sourceY: 0,
	sourcePosition: Position.Top,
	targetX: 100,
	targetY: 100,
	targetPosition: Position.Bottom,
	data: {
		status: undefined,
		source: { index: 0, type: 'main' },
		target: { index: 0, type: 'main' },
	},
} satisfies Partial<CanvasEdgeProps>;
const renderComponent = createComponentRenderer(CanvasEdge, {
	props: DEFAULT_PROPS,
});

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

describe('CanvasEdge', () => {
	it('should emit delete event when toolbar delete is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();
		const deleteButton = getByTestId('delete-connection-button');

		await fireEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});

	it('should compute edgeStyle correctly', () => {
		const { container } = renderComponent();

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveStyle({
			stroke: 'var(--color-foreground-xdark)',
		});
	});

	it('should correctly style a running connection', () => {
		const { container } = renderComponent({
			props: { ...DEFAULT_PROPS, data: { ...DEFAULT_PROPS.data, status: 'running' } },
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveStyle({
			stroke: 'var(--color-primary)',
		});
	});

	it('should correctly style a pinned connection', () => {
		const { container } = renderComponent({
			props: { ...DEFAULT_PROPS, data: { ...DEFAULT_PROPS.data, status: 'pinned' } },
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveStyle({
			stroke: 'var(--color-secondary)',
		});
	});
});
