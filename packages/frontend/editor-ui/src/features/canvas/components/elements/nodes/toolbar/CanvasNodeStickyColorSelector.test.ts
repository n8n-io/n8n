import { fireEvent } from '@testing-library/vue';
import CanvasNodeStickyColorSelector from './CanvasNodeStickyColorSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/canvas/__tests__/utils';

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
		const { getByTestId, getAllByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		const colorSelector = getByTestId('change-sticky-color');

		await fireEvent.click(colorSelector);

		const colorOption = getAllByTestId('color');
		const selectedIndex = 2;

		await fireEvent.click(colorOption[selectedIndex]);

		expect(colorOption).toHaveLength(7);
		expect(emitted()).toHaveProperty('update');
		expect(emitted().update[0]).toEqual([selectedIndex + 1]);
	});
});
