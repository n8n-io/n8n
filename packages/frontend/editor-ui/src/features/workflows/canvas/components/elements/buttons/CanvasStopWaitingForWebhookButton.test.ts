import { createComponentRenderer } from '@/__tests__/render';
import CanvasStopWaitingForWebhookButton from './CanvasStopWaitingForWebhookButton.vue';

const renderComponent = createComponentRenderer(CanvasStopWaitingForWebhookButton, {
	global: {
		stubs: {
			N8nIconButton: true,
		},
	},
});

describe('CanvasStopCurrentExecutionButton', () => {
	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
