import { fireEvent } from '@testing-library/vue';
import CanvasEdge, { type CanvasEdgeProps } from './CanvasEdge.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { Position } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';

const DEFAULT_PROPS = {
	sourceX: 0,
	sourceY: 0,
	sourcePosition: Position.Top,
	targetX: 100,
	targetY: 100,
	targetPosition: Position.Bottom,
	data: {
		status: undefined,
		source: { index: 0, type: NodeConnectionType.Main },
		target: { index: 0, type: NodeConnectionType.Main },
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

	it('should emit add event when toolbar add is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();
		const addButton = getByTestId('add-connection-button');

		await fireEvent.click(addButton);

		expect(emitted()).toHaveProperty('add');
	});

	it('should not render toolbar actions when readOnly', async () => {
		const { getByTestId } = renderComponent({
			props: {
				readOnly: true,
			},
		});

		expect(() => getByTestId('add-connection-button')).toThrow();
		expect(() => getByTestId('delete-connection-button')).toThrow();
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
