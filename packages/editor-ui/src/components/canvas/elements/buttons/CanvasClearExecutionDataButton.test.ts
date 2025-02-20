import { createComponentRenderer } from '@/__tests__/render';
import CanvasClearExecutionDataButton from './CanvasClearExecutionDataButton.vue';

const renderComponent = createComponentRenderer(CanvasClearExecutionDataButton);

describe('CanvasClearExecutionDataButton', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
