import CanvasNode from '@/components/canvas/elements/nodes/CanvasNode.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import { fireEvent } from '@testing-library/vue';
import { createCanvasNodeData, createCanvasNodeProps, createCanvasProvide } from '@/__tests__/data';
import { CanvasNodeRenderType } from '@/types';

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
								{ type: NodeConnectionTypes.Main, index: 0 },
								{ type: NodeConnectionTypes.Main, index: 0 },
								{ type: NodeConnectionTypes.Main, index: 0 },
							],
							outputs: [
								{ type: NodeConnectionTypes.Main, index: 0 },
								{ type: NodeConnectionTypes.Main, index: 0 },
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

		it('should insert spacers after required non-main input handle', () => {
			const { getAllByTestId } = renderComponent({
				props: {
					...createCanvasNodeProps({
						data: {
							inputs: [
								{ type: NodeConnectionTypes.Main, index: 0 },
								{ type: NodeConnectionTypes.AiAgent, index: 0, required: true },
								{ type: NodeConnectionTypes.AiMemory, index: 0 },
								{ type: NodeConnectionTypes.AiTool, index: 0 },
							],
							outputs: [],
						},
					}),
				},
				global: {
					stubs: {
						Handle: true,
					},
				},
			});

			const inputHandles = getAllByTestId('canvas-node-input-handle');

			expect(inputHandles[1]).toHaveStyle('left: 40px');
			expect(inputHandles[2]).toHaveStyle('left: 136px');
			expect(inputHandles[3]).toHaveStyle('left: 184px');
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

	describe('execute workflow button', () => {
		const triggerNodeData = createCanvasNodeData({
			name: 'foo',
			render: {
				type: CanvasNodeRenderType.Default,
				options: { trigger: true },
			},
		});

		it('should render execute workflow button if the node is a trigger node and is not read only', () => {
			const { queryByTestId } = renderComponent({
				props: createCanvasNodeProps({ readOnly: false, data: triggerNodeData }),
			});

			expect(queryByTestId('execute-workflow-button-foo')).toBeInTheDocument();
		});

		it('should not render execute workflow button if the node is a trigger node and is read only', () => {
			const { queryByTestId } = renderComponent({
				props: createCanvasNodeProps({ readOnly: true, data: triggerNodeData }),
			});

			expect(queryByTestId('execute-workflow-button-foo')).not.toBeInTheDocument();
		});
	});
});
