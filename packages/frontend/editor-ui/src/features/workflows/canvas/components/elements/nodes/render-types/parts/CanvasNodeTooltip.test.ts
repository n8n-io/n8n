import CanvasNodeTooltip from './CanvasNodeTooltip.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { queryTooltip } from '@/__tests__/utils';
import type { CanvasNodeDefaultRender } from '../../../../../canvas.types';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(CanvasNodeTooltip);

describe('CanvasNodeTooltip', () => {
	describe('rendering', () => {
		it('should render tooltip when tooltip option is provided', async () => {
			renderComponent({
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

			await waitFor(() => {
				const tooltipContent = queryTooltip();
				expect(tooltipContent).toBeVisible();
				expect(tooltipContent).toHaveTextContent('Test tooltip text');
			});
		});

		it('should not render tooltip when tooltip option is not provided', () => {
			renderComponent({
				props: {
					visible: false,
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

			expect(queryTooltip()).not.toBeInTheDocument();
		});
	});
});
