// @vitest-environment jsdom
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import Canvas from '@/components/canvas/Canvas.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { CanvasConnection, CanvasNode } from '@/types';
import { createCanvasConnection, createCanvasNodeElement } from '@/__tests__/data';
import { NodeConnectionType } from 'n8n-workflow';
import type { useDeviceSupport } from 'n8n-design-system';

// @ts-expect-error Initialize window object
global.window = jsdom.window as unknown as Window & typeof globalThis;

vi.mock('n8n-design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof useDeviceSupport>();
	return { ...actual, useDeviceSupport: vi.fn(() => ({ isCtrlKeyPressed: vi.fn() })) };
});

vi.mock('@/composables/useDeviceSupport');

let renderComponent: ReturnType<typeof createComponentRenderer>;
beforeEach(() => {
	const pinia = createPinia();
	setActivePinia(pinia);

	renderComponent = createComponentRenderer(Canvas, { pinia });
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('Canvas', () => {
	it('should initialize with default props', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('canvas')).toBeVisible();
		expect(getByTestId('canvas-background')).toBeVisible();
		expect(getByTestId('canvas-minimap')).toBeVisible();
		expect(getByTestId('canvas-controls')).toBeVisible();
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

	it('should handle node drag stop event', async () => {
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
			clientX: 96,
			clientY: 96,
		});
		await fireEvent.mouseUp(node, { view: window });

		// Snap to 20px grid: 96 -> 100
		expect(emitted()['update:nodes:position']).toEqual([
			[[{ id: '1', position: { x: 100, y: 100 } }]],
		]);
	});
});
