import { createComponentRenderer } from '@/__tests__/render';
import CanvasStopCurrentExecutionButton from './CanvasStopCurrentExecutionButton.vue';

const renderComponent = createComponentRenderer(CanvasStopCurrentExecutionButton, {
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

	it('should render different title when loading', () => {
		const wrapper = renderComponent({
			props: {
				stopping: true,
			},
		});

		expect(wrapper.getByTitle('Stopping current execution')).toBeInTheDocument();
	});
});
