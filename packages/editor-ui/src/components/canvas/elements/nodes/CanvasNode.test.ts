import CanvasNode from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { NodeConnectionType } from 'n8n-workflow';
import { fireEvent } from '@testing-library/vue';
import { createCanvasNodeProps, createCanvasProvide } from '@/__tests__/data';

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

	renderComponent = createComponentRenderer(CanvasNode, {
		pinia,
		global: {
			provide: {
				...createCanvasProvide(),
			},
		},
	});
});

describe('CanvasNode', () => {
	it('should render node correctly', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				...createCanvasNodeProps(),
			},
		});

		expect(getByText('Test Node')).toBeInTheDocument();
		expect(getByTestId('canvas-node')).toBeInTheDocument();
	});

	describe('classes', () => {
		it('should apply selected class when node is selected', async () => {
			const { getByText } = renderComponent({
				props: {
					...createCanvasNodeProps({ selected: true }),
				},
			});

			expect(getByText('Test Node').closest('.node')).toHaveClass('selected');
		});
	});

	describe('handles', () => {
		it('should render correct number of input and output handles', async () => {
			const { getAllByTestId } = renderComponent({
				props: {
					...createCanvasNodeProps({
						data: {
							inputs: [
								{ type: NodeConnectionType.Main, index: 0 },
								{ type: NodeConnectionType.Main, index: 0 },
								{ type: NodeConnectionType.Main, index: 0 },
							],
							outputs: [
								{ type: NodeConnectionType.Main, index: 0 },
								{ type: NodeConnectionType.Main, index: 0 },
							],
						},
					}),
				},
				global: {
					stubs: {
						CanvasHandleRenderer: true,
					},
				},
			});

			const inputHandles = getAllByTestId('canvas-node-input-handle');
			const outputHandles = getAllByTestId('canvas-node-output-handle');

			expect(inputHandles.length).toBe(3);
			expect(outputHandles.length).toBe(2);
		});
	});

	describe('toolbar', () => {
		it('should render toolbar when node is hovered', async () => {
			const { getByTestId } = renderComponent({
				props: {
					...createCanvasNodeProps(),
				},
			});

			const node = getByTestId('canvas-node');
			await fireEvent.mouseOver(node);

			expect(getByTestId('canvas-node-toolbar')).toBeInTheDocument();
			expect(getByTestId('execute-node-button')).toBeInTheDocument();
			expect(getByTestId('disable-node-button')).toBeInTheDocument();
			expect(getByTestId('delete-node-button')).toBeInTheDocument();
			expect(getByTestId('overflow-node-button')).toBeInTheDocument();
		});

		it('should contain only context menu when node is disabled', async () => {
			const { getByTestId } = renderComponent({
				props: {
					...createCanvasNodeProps({
						readOnly: true,
					}),
				},
			});

			const node = getByTestId('canvas-node');
			await fireEvent.mouseOver(node);

			expect(getByTestId('canvas-node-toolbar')).toBeInTheDocument();
			expect(() => getByTestId('execute-node-button')).toThrow();
			expect(() => getByTestId('disable-node-button')).toThrow();
			expect(() => getByTestId('delete-node-button')).toThrow();
			expect(getByTestId('overflow-node-button')).toBeInTheDocument();
		});
	});
});
