import { createComponentRenderer } from '@/__tests__/render';
import CanvasStopCurrentExecutionButton from './CanvasStopCurrentExecutionButton.vue';

const renderComponent = createComponentRenderer(CanvasStopCurrentExecutionButton);

describe('CanvasStopCurrentExecutionButton', () => {
	it('displays title when not loading', () => {
		const wrapper = renderComponent({
			props: {
				loading: false,
			},
		});

		expect(wrapper.getByTitle('Stop current execution')).toBeInTheDocument();
	});

	it('displays different title when loading', () => {
		const wrapper = renderComponent({
			props: {
				loading: true,
			},
		});

		expect(wrapper.getByTitle('Stopping current execution')).toBeInTheDocument();
	});
});
