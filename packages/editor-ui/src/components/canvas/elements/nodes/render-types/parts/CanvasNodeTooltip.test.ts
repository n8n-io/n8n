import CanvasNodeTooltip from './CanvasNodeTooltip.vue';
import { createComponentRenderer } from '@/__tests__/render';
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
							} as CanvasNodeDefaultRender,
						},
					}),
				},
			});

			expect(getByText('Test tooltip text')).toBeInTheDocument();
		});

		it('should not render tooltip when tooltip option is not provided', () => {
			const { container } = renderComponent({
				props: {
					visible: true,
				},
				global: {
					provide: createCanvasNodeProvide({
						data: {
							render: {
								options: {},
							} as CanvasNodeDefaultRender,
						},
					}),
				},
			});

			expect(container.querySelector('.tooltipTrigger')).not.toBeInTheDocument();
		});
	});
});
