import CanvasHandleDiamond from './CanvasHandleDiamond.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasHandleDiamond, {});

describe('CanvasHandleDiamond', () => {
	it('should render with default props', () => {
		const { html } = renderComponent();

		expect(html()).toMatchSnapshot();
	});

	it('should apply `handleClasses` prop correctly', () => {
		const customClass = 'custom-handle-class';
		const wrapper = renderComponent({
			props: { handleClasses: customClass },
		});

		expect(wrapper.container.querySelector(`.${customClass}`)).toBeTruthy();
	});
});
