// @vitest-environment jsdom
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import Canvas from '@/components/canvas/Canvas.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { CanvasConnection, CanvasNode } from '@/types';
import { createCanvasConnection, createCanvasNodeElement } from '@/__tests__/data';
import { NodeConnectionType } from 'n8n-workflow';
import type { useDeviceSupport } from 'n8n-design-system';

const matchMedia = global.window.matchMedia;
// @ts-expect-error Initialize window object
global.window = jsdom.window as unknown as Window & typeof globalThis;
global.window.matchMedia = matchMedia;

vi.mock('n8n-design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof useDeviceSupport>();
	return { ...actual, useDeviceSupport: vi.fn(() => ({ isCtrlKeyPressed: vi.fn() })) };
});

let renderComponent: ReturnType<typeof createComponentRenderer>;
beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	renderComponent = createComponentRenderer(Canvas, { pinia });
});

afterEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe('Canvas', () => {
	it('should initialize with default props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('canvas')).toBeVisible();
		expect(getByTestId('canvas-background')).toBeVisible();
		expect(getByTestId('canvas-controls')).toBeVisible();
		expect(getByTestId('canvas-minimap')).toBeInTheDocument();
	});

	it('should render nodes and edges', async () => {
		const nodes: CanvasNode[] = [
			createCanvasNodeElement({
				id: '1',
				label: 'Node 1',
				data: {
					outputs: [
						{
							type: NodeConnectionType.Main,
							index: 0,
						},
					],
				},
			}),
			createCanvasNodeElement({
				id: '2',
				label: 'Node 2',
				position: { x: 200, y: 200 },
				data: {
					inputs: [
						{
							type: NodeConnectionType.Main,
							index: 0,
						},
					],
				},
			}),
		];

		const connections: CanvasConnection[] = [createCanvasConnection(nodes[0], nodes[1])];

		const { container } = renderComponent({
			props: {
				nodes,
				connections,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector(`[data-id="${nodes[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${nodes[1].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${connections[0].id}"]`)).toBeInTheDocument();
	});

	it('should handle `update:nodes:position` event', async () => {
		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;
		await fireEvent.mouseDown(node, { view: window });
		await fireEvent.mouseMove(node, {
			view: window,
			clientX: 20,
			clientY: 20,
		});
		await fireEvent.mouseMove(node, {
			view: window,
			clientX: 40,
			clientY: 40,
		});
		await fireEvent.mouseUp(node, { view: window });

		expect(emitted()['update:nodes:position']).toEqual([
			[
				[
					{
						id: '1',
						position: { x: 120, y: 120 },
					},
				],
			],
		]);
	});

	describe('minimap', () => {
		const minimapVisibilityDelay = 1000;
		const minimapTransitionDuration = 300;

		it('should show minimap for 1sec after panning', async () => {
			vi.useFakeTimers();

			const nodes = [createCanvasNodeElement()];
			const { getByTestId, container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			const canvas = getByTestId('canvas');
			const pane = canvas.querySelector('.vue-flow__pane');
			if (!pane) throw new Error('VueFlow pane not found');

			await fireEvent.keyDown(pane, { view: window, key: ' ' });
			await fireEvent.mouseDown(pane, { view: window });
			await fireEvent.mouseMove(pane, {
				view: window,
				clientX: 100,
				clientY: 100,
			});
			await fireEvent.mouseUp(pane, { view: window });
			await fireEvent.keyUp(pane, { view: window, key: ' ' });

			vi.advanceTimersByTime(minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).not.toBeVisible());
		});

		it('should keep minimap visible when hovered', async () => {
			vi.useFakeTimers();

			const nodes = [createCanvasNodeElement()];
			const { getByTestId, container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			const canvas = getByTestId('canvas');
			const pane = canvas.querySelector('.vue-flow__pane');
			if (!pane) throw new Error('VueFlow pane not found');

			await fireEvent.keyDown(pane, { view: window, key: ' ' });
			await fireEvent.mouseDown(pane, { view: window });
			await fireEvent.mouseMove(pane, {
				view: window,
				clientX: 100,
				clientY: 100,
			});
			await fireEvent.mouseUp(pane, { view: window });
			await fireEvent.keyUp(pane, { view: window, key: ' ' });

			vi.advanceTimersByTime(minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());

			await fireEvent.mouseEnter(getByTestId('canvas-minimap'));
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).toBeVisible());

			await fireEvent.mouseLeave(getByTestId('canvas-minimap'));
			vi.advanceTimersByTime(minimapVisibilityDelay + minimapTransitionDuration);
			await waitFor(() => expect(getByTestId('canvas-minimap')).not.toBeVisible());
		});
	});

	describe('background', () => {
		it('should render default background', () => {
			const { container } = renderComponent();
			expect(container.querySelector('#pattern-canvas')).toBeInTheDocument();
		});

		it('should render striped background', () => {
			const { container } = renderComponent({ props: { readOnly: true } });
			expect(container.querySelector('#pattern-canvas')).not.toBeInTheDocument();
			expect(container.querySelector('#diagonalHatch')).toBeInTheDocument();
		});
	});
});
