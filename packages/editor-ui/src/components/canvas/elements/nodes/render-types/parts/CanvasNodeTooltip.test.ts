import CanvasNodeTooltip from '@/components/canvas/elements/nodes/CanvasNodeTooltip.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeDefaultRender } from '@/types';
import { createCanvasNodeProvide } from '@/__tests__/data';

const renderComponent = createComponentRenderer(CanvasNodeTooltip);

describe('CanvasNodeTooltip', () => {
	describe('rendering', () => {
		it('should render tooltip when tooltip option is provided', () => {
			const { getByText } = renderComponent({
				props: {
					visible: true,
				},
				global: {
					provide: createCanvasNodeProvide({
						data: {
							render: {
								options: {
									tooltip: 'Test tooltip text',
								},
							},
						},
					}),
				},
			});

			expect(getByText('Test tooltip text')).toBeInTheDocument();
		});

		// it('should not render tooltip when tooltip option is not provided', () => {
		// 	vi.mocked(useCanvasNode).mockReturnValue({
		// 		render: ref({
		// 			options: {} as CanvasNodeDefaultRender['options'],
		// 		}),
		// 	});
		//
		// 	const { container } = renderComponent({
		// 		props: {
		// 			visible: true,
		// 		},
		// 	});
		//
		// 	expect(container.querySelector('.tooltipTrigger')).not.toBeInTheDocument();
		// });
	});

	// describe('props', () => {
	// 	it('should pass correct props to N8nTooltip component', () => {
	// 		vi.mocked(useCanvasNode).mockReturnValue({
	// 			render: ref({
	// 				options: {
	// 					tooltip: 'Test tooltip text',
	// 				} as CanvasNodeDefaultRender['options'],
	// 			}),
	// 		});
	//
	// 		const { getByRole } = renderComponent({
	// 			props: {
	// 				visible: true,
	// 			},
	// 		});
	//
	// 		const tooltip = getByRole('tooltip');
	// 		expect(tooltip).toHaveAttribute('placement', 'top');
	// 		expect(tooltip).toHaveAttribute('show-after', '500');
	// 		expect(tooltip).toHaveAttribute('visible', 'true');
	// 		expect(tooltip).toHaveAttribute('teleported', 'false');
	// 	});
	//
	// 	it('should respect visible prop', () => {
	// 		vi.mocked(useCanvasNode).mockReturnValue({
	// 			render: ref({
	// 				options: {
	// 					tooltip: 'Test tooltip text',
	// 				} as CanvasNodeDefaultRender['options'],
	// 			}),
	// 		});
	//
	// 		const { rerender, queryByRole } = renderComponent({
	// 			props: {
	// 				visible: false,
	// 			},
	// 		});
	//
	// 		expect(queryByRole('tooltip')).not.toBeInTheDocument();
	//
	// 		rerender({ visible: true });
	// 		expect(queryByRole('tooltip')).toBeInTheDocument();
	// 	});
	// });
	//
	// describe('styling', () => {
	// 	it('should apply correct CSS classes', () => {
	// 		vi.mocked(useCanvasNode).mockReturnValue({
	// 			render: ref({
	// 				options: {
	// 					tooltip: 'Test tooltip text',
	// 				} as CanvasNodeDefaultRender['options'],
	// 			}),
	// 		});
	//
	// 		const { container } = renderComponent({
	// 			props: {
	// 				visible: true,
	// 			},
	// 		});
	//
	// 		const tooltipTrigger = container.querySelector('.tooltipTrigger');
	// 		expect(tooltipTrigger).toHaveStyle({
	// 			position: 'absolute',
	// 			top: '0',
	// 			left: '0',
	// 			width: '100%',
	// 			height: '1px',
	// 		});
	// 	});
	// });
});
