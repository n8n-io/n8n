// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import Canvas from '@/components/canvas/Canvas.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { CanvasConnection, CanvasElement } from '@/types';
import { createCanvasConnection, createCanvasNodeElement } from '@/__tests__/data';
import { NodeConnectionType } from 'n8n-workflow';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
global.window = jsdom.window as unknown as Window & typeof globalThis;

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn(() => ({
			name: 'test',
			description: 'Test Node Description',
		})),
	})),
}));

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
		const elements: CanvasElement[] = [
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

		const connections: CanvasConnection[] = [createCanvasConnection(elements[0], elements[1])];

		const { container } = renderComponent({
			props: {
				elements,
				connections,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2));

		expect(container.querySelector(`[data-id="${elements[0].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${elements[1].id}"]`)).toBeInTheDocument();
		expect(container.querySelector(`[data-id="${connections[0].id}"]`)).toBeInTheDocument();
	});

	it('should handle node drag stop event', async () => {
		const elements = [createCanvasNodeElement()];
		const { container, emitted } = renderComponent({
			props: {
				elements,
			},
		});

		await waitFor(() => expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(1));

		const node = container.querySelector(`[data-id="${elements[0].id}"]`) as Element;
		await fireEvent.mouseDown(node, { view: window });
		await fireEvent.mouseMove(node, {
			view: window,
			clientX: 100,
			clientY: 100,
		});
		await fireEvent.mouseUp(node, { view: window });

		expect(emitted()['update:node:position']).toEqual([['1', { x: 100, y: 100 }]]);
	});
});
