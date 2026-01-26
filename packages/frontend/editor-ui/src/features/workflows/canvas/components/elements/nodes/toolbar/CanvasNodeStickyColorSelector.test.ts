import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CanvasNodeStickyColorSelector from './CanvasNodeStickyColorSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';

const renderComponent = createComponentRenderer(CanvasNodeStickyColorSelector);

describe('CanvasNodeStickyColorSelector', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render trigger correctly', () => {
		const { getByTestId } = renderComponent({
			pinia,
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
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[2]);

		expect(emitted()).toHaveProperty('update');
		expect(emitted().update[0]).toEqual([3]);
	});
});
