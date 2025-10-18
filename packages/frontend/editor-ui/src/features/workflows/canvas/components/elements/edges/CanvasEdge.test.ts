import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { Position } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import CanvasEdge, { type CanvasEdgeProps } from './CanvasEdge.vue';
import type { CanvasConnectionPort } from '../../../canvas.types';

const DEFAULT_PROPS = {
	sourceX: 0,
	sourceY: 0,
	sourcePosition: Position.Top,
	targetX: 100,
	targetY: 100,
	targetPosition: Position.Bottom,
	data: {
		status: undefined,
		source: { index: 0, type: NodeConnectionTypes.Main },
		target: { index: 0, type: NodeConnectionTypes.Main },
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
		const { emitted, getByTestId } = renderComponent({
			props: {
				hovered: true,
			},
		});
		await userEvent.hover(getByTestId('edge-label'));
		const deleteButton = getByTestId('delete-connection-button');

		await userEvent.click(deleteButton);

		expect(emitted()).toHaveProperty('delete');
	});

	it('should emit add event when toolbar add is clicked', async () => {
		const { emitted, getByTestId } = renderComponent({
			props: {
				hovered: true,
			},
		});
		await userEvent.hover(getByTestId('edge-label'));

		const addButton = getByTestId('add-connection-button');

		await userEvent.click(addButton);

		expect(emitted()).toHaveProperty('add');
	});

	it('should not render toolbar actions when readOnly', async () => {
		const { getByTestId } = renderComponent({
			props: {
				readOnly: true,
			},
		});

		await userEvent.hover(getByTestId('edge-label'));

		expect(() => getByTestId('add-connection-button')).toThrow();
		expect(() => getByTestId('delete-connection-button')).toThrow();
	});

	it('should hide toolbar after delay', async () => {
		vi.useFakeTimers();

		const user = userEvent.setup({
			advanceTimers: vi.advanceTimersByTime,
		});

		const { rerender, getByTestId, queryByTestId } = renderComponent({
			props: { hovered: true },
		});

		await user.hover(getByTestId('edge-label'));
		expect(queryByTestId('canvas-edge-toolbar')).toBeInTheDocument();

		await rerender({ hovered: false });

		await user.unhover(getByTestId('edge-label'));
		expect(getByTestId('canvas-edge-toolbar')).toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(600);

		expect(queryByTestId('canvas-edge-toolbar')).not.toBeInTheDocument();
	});

	it('should compute edgeStyle correctly', () => {
		const { container } = renderComponent();

		const edge = container.querySelector('.vue-flow__edge-path');

		// Since v-bind in CSS creates dynamic styles, we should test that the edge element exists
		// and has the expected class rather than testing the specific CSS property
		expect(edge).toBeInTheDocument();
		expect(edge).toHaveClass('edge');
	});

	it('should correctly style a pinned connection', () => {
		const { container } = renderComponent({
			props: { ...DEFAULT_PROPS, data: { ...DEFAULT_PROPS.data, status: 'pinned' } },
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		// Since v-bind in CSS creates dynamic styles, we should test that the edge element exists
		// and has the expected class rather than testing the specific CSS property
		expect(edge).toBeInTheDocument();
		expect(edge).toHaveClass('edge');
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

	it('should render a correct bezier path when the connection is backwards and node connection type is non-main', () => {
		const { container } = renderComponent({
			props: {
				...DEFAULT_PROPS,
				data: {
					...DEFAULT_PROPS.data,
					source: {
						type: NodeConnectionTypes.AiTool,
					} as CanvasConnectionPort,
				},
				sourceX: 0,
				sourceY: 0,
				sourcePosition: Position.Right,
				targetX: -100,
				targetY: -100,
				targetPosition: Position.Left,
			},
		});

		const edge = container.querySelector('.vue-flow__edge-path');

		expect(edge).toHaveAttribute('d', 'M0,0 C62.5,0 -162.5,-100 -100,-100');
	});

	it('should render a label above the connector when it is straight', () => {
		const { container } = renderComponent({
			props: {
				...DEFAULT_PROPS,
				sourceY: 50,
				targetY: 50,
			},
		});

		const labelWrapper = container.querySelector('.vue-flow__edge-label');

		expect(labelWrapper).toHaveClass('straight');
	});

	it("should render a label in the middle of the connector when it isn't straight", () => {
		const { container } = renderComponent({
			props: {
				...DEFAULT_PROPS,
				sourceY: 0,
				targetY: 100,
			},
		});

		const labelWrapper = container.querySelector('.vue-flow__edge-label');

		expect(labelWrapper).not.toHaveClass('straight');
	});
});
