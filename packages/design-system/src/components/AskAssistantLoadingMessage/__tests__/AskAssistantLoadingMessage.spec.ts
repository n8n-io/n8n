import { render } from '@testing-library/vue';
import AssistantLoadingMessage from '../AssistantLoadingMessage.vue';

describe('AssistantLoadingMessage', () => {
	it('renders loading message correctly', () => {
		const { container } = render(AssistantLoadingMessage, {
			props: {
				loadingMessage: 'Thinking...',
			},
		});
		expect(container).toMatchSnapshot();
	});
});
