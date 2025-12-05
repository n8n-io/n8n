import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CanvasNodeStickyColorSelector from './CanvasNodeStickyColorSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';

const renderComponent = createComponentRenderer(CanvasNodeStickyColorSelector);

describe('CanvasNodeStickyColorSelector', () => {
	it('should render trigger correctly', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});
		const colorSelector = getByTestId('change-sticky-color');
		expect(colorSelector).toBeVisible();
	});

	it('should render all colors and apply selected color correctly', async () => {
		// Start with visible=true to bypass click.stop issue
		const { emitted } = renderComponent({
			props: {
				visible: true,
			},
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		const colorOption = screen.getAllByTestId('color');
		const selectedIndex = 2;

		await userEvent.click(colorOption[selectedIndex]);

		expect(emitted()).toHaveProperty('update');
		expect(emitted().update[0]).toEqual([selectedIndex + 1]);
	});
});
