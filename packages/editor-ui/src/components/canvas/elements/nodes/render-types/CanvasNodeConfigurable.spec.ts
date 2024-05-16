import CanvasNodeConfigurable from '@/components/canvas/elements/nodes/render-types/CanvasNodeConfigurable.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide } from '@/__tests__/data';

const renderComponent = createComponentRenderer(CanvasNodeConfigurable);

describe('CanvasNodeConfigurable', () => {
	it('should render node correctly', () => {
		const { getByText } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByText('Test Node')).toBeInTheDocument();
	});

	describe('selected', () => {
		it('should apply selected class when node is selected', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							selected: true,
						}),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).toHaveClass('selected');
		});

		it('should not apply selected class when node is not selected', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide(),
					},
				},
			});
			expect(getByText('Test Node').closest('.node')).not.toHaveClass('selected');
		});
	});

	describe('inputs', () => {
		it('should adjust width css variable based on the number of non-main inputs', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								inputs: [
									{ type: NodeConnectionType.Main },
									{ type: NodeConnectionType.AiTool },
									{ type: NodeConnectionType.AiDocument, required: true },
									{ type: NodeConnectionType.AiMemory, required: true },
								],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--configurable-node-input-count': '3' });
		});
	});
});
