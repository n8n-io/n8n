// @vitest-environment jsdom
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import Canvas from '@/components/canvas/Canvas.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { CanvasConnection, CanvasNode } from '@/types';
import { createCanvasConnection, createCanvasNodeElement } from '@/__tests__/data';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useVueFlow } from '@vue-flow/core';
import { SIMULATE_NODE_TYPE } from '@/constants';
import { canvasEventBus } from '@/event-bus/canvas';

const matchMedia = global.window.matchMedia;
// @ts-expect-error Initialize window object
global.window = jsdom.window as unknown as Window & typeof globalThis;
global.window.matchMedia = matchMedia;

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof useDeviceSupport>();
	return { ...actual, useDeviceSupport: vi.fn(() => ({ isCtrlKeyPressed: vi.fn() })) };
});

const canvasId = 'canvas';

let renderComponent: ReturnType<typeof createComponentRenderer>;
beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	renderComponent = createComponentRenderer(Canvas, {
		pinia,
		props: {
			id: canvasId,
			nodes: [],
			connections: [],
		},
	});
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
							type: NodeConnectionTypes.Main,
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
							type: NodeConnectionTypes.Main,
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

	it('should emit `update:nodes:position` event', async () => {
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
						position: { x: 112, y: 112 },
					},
				],
			],
		]);
	});

	it('should emit `update:node:name` event', async () => {
		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;

		const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
		addSelectedNodes(graphNodes.value);

		await waitFor(() => expect(container.querySelector('.selected')).toBeInTheDocument());

		await fireEvent.keyDown(node, { key: ' ', view: window });
		await fireEvent.keyUp(node, { key: ' ', view: window });

		expect(emitted()['update:node:name']).toEqual([['1']]);
	});

	it('should update viewport if nodes:select event is received with panIntoView=true', async () => {
		const node = createCanvasNodeElement({ position: { x: -1000, y: -500 } });

		renderComponent({
			props: {
				id: 'c0',
				nodes: [node],
				eventBus: canvasEventBus,
			},
		});

		const { getViewport } = useVueFlow('c0');

		expect(getViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
		canvasEventBus.emit('nodes:select', { ids: [node.id], panIntoView: true });
		await waitFor(() => expect(getViewport()).toEqual({ x: 1100, y: 600, zoom: 1 }));
	});

	it('should not emit `update:node:name` event if long key press', async () => {
		vi.useFakeTimers();

		const nodes = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				nodes,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${nodes[0].id}"]`) as Element;

		const { addSelectedNodes, nodes: graphNodes } = useVueFlow({ id: canvasId });
		addSelectedNodes(graphNodes.value);

		await waitFor(() => expect(container.querySelector('.selected')).toBeInTheDocument());

		await fireEvent.keyDown(node, { key: ' ', view: window });
		await vi.advanceTimersByTimeAsync(1000);
		await fireEvent.keyUp(node, { key: ' ', view: window });

		expect(emitted()['update:node:name']).toBeUndefined();
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
			const patternCanvas = container.querySelector('#pattern-canvas');
			expect(patternCanvas).toBeInTheDocument();
			expect(patternCanvas?.innerHTML).toContain('<circle');
			expect(patternCanvas?.innerHTML).not.toContain('<path');
		});

		it('should render striped background', () => {
			const { container } = renderComponent({ props: { readOnly: true } });
			const patternCanvas = container.querySelector('#pattern-canvas');
			expect(patternCanvas).toBeInTheDocument();
			expect(patternCanvas?.innerHTML).toContain('<path');
			expect(patternCanvas?.innerHTML).not.toContain('<circle');
		});
	});

	describe('simulate', () => {
		it('should render simulate node', async () => {
			const nodes = [
				createCanvasNodeElement({
					id: '1',
					label: 'Node',
					position: { x: 200, y: 200 },
					data: {
						type: SIMULATE_NODE_TYPE,
						typeVersion: 1,
					},
				}),
			];

			const { container } = renderComponent({
				props: {
					nodes,
				},
			});

			await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

			expect(container.querySelector('.icon')).toBeInTheDocument();
		});
	});
});
