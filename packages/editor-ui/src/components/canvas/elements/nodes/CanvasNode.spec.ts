import CanvasNode from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { NodeConnectionType } from 'n8n-workflow';
import { fireEvent } from '@testing-library/vue';
import { createCanvasNodeProps } from '@/__tests__/data';

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

	renderComponent = createComponentRenderer(CanvasNode, { pinia });
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
								{ type: NodeConnectionType.Main },
								{ type: NodeConnectionType.Main },
								{ type: NodeConnectionType.Main },
							],
							outputs: [{ type: NodeConnectionType.Main }, { type: NodeConnectionType.Main }],
						},
					}),
				},
				global: {
					stubs: {
						HandleRenderer: true,
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
			const { getByTestId, container } = renderComponent({
				props: {
					...createCanvasNodeProps(),
				},
			});

			const node = getByTestId('canvas-node');
			await fireEvent.mouseOver(node);

			expect(getByTestId('canvas-node-toolbar')).toBeInTheDocument();
		});
	});
});
