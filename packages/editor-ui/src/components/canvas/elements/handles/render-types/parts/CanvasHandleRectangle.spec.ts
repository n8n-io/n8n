import CanvasHandleRectangle from './CanvasHandleRectangle.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CanvasHandleRectangle, {});

describe('CanvasHandleRectangle', () => {
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

	it('should apply sourceEdgeHovered prop correctly', () => {
		const wrapper = renderComponent({
			props: { sourceEdgeHovered: true },
		});

		expect(wrapper.container.querySelector('.rectangle--hovered')).toBeTruthy();
	});
});
