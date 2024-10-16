import { createComponentRenderer } from '@/__tests__/render';
import CanvasControlButtons from './CanvasControlButtons.vue';

const renderComponent = createComponentRenderer(CanvasControlButtons);

describe('CanvasControlButtons', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.getByTestId('zoom-in-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-out-button')).toBeVisible();
		expect(wrapper.getByTestId('zoom-to-fit')).toBeVisible();

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should show reset zoom button when zoom is not equal to 1', () => {
		const wrapper = renderComponent({
			props: {
				zoom: 1.5,
			},
		});

		expect(wrapper.getByTestId('reset-zoom-button')).toBeVisible();
	});
});
