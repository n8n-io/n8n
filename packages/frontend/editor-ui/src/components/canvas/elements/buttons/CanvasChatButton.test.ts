import { createComponentRenderer } from '@/__tests__/render';
import CanvasChatButton from './CanvasChatButton.vue';

const renderComponent = createComponentRenderer(CanvasChatButton);

describe('CanvasChatButton', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
