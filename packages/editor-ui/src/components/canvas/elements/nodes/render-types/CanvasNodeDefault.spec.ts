import CanvasNodeDefault from '@/components/canvas/elements/nodes/render-types/CanvasNodeDefault.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { NodeConnectionType } from 'n8n-workflow';
import { createCanvasNodeProvide } from '@/__tests__/data';

const renderComponent = createComponentRenderer(CanvasNodeDefault);

describe('CanvasNodeDefault', () => {
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

	describe('outputs', () => {
		it('should adjust height css variable based on the number of outputs (1 output)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								outputs: [{ type: NodeConnectionType.Main }],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--node-main-output-count': '1' }); // height calculation based on the number of outputs
		});

		it('should adjust height css variable based on the number of outputs (multiple outputs)', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({
							data: {
								outputs: [
									{ type: NodeConnectionType.Main },
									{ type: NodeConnectionType.Main },
									{ type: NodeConnectionType.Main },
								],
							},
						}),
					},
				},
			});

			const nodeElement = getByText('Test Node').closest('.node');
			expect(nodeElement).toHaveStyle({ '--node-main-output-count': '3' }); // height calculation based on the number of outputs
		});
	});

	describe('selected', () => {
		it('should apply selected class when node is selected', () => {
			const { getByText } = renderComponent({
				global: {
					provide: {
						...createCanvasNodeProvide({ selected: true }),
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
});
