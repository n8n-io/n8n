import CanvasNodeTooltip from './CanvasNodeTooltip.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CanvasNodeDefaultRender } from '../../../../../canvas.types';
import { createCanvasNodeProvide } from '@/features/canvas/__tests__/utils';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(CanvasNodeTooltip);

describe('CanvasNodeTooltip', () => {
	describe('rendering', () => {
		it('should render tooltip when tooltip option is provided', async () => {
			const { container, getByText } = renderComponent({
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
			await waitFor(() => expect(container.querySelector('.el-popper')).toBeVisible());
		});

		it('should not render tooltip when tooltip option is not provided', () => {
			const { container } = renderComponent({
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

			expect(container.querySelector('.el-popper')).not.toBeVisible();
		});
	});
});
