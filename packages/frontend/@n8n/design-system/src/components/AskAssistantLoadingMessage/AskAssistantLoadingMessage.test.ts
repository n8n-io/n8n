import { render } from '@testing-library/vue';

import AssistantLoadingMessage from './AssistantLoadingMessage.vue';

describe('AssistantLoadingMessage', () => {
	it('renders loading message correctly', () => {
		const { container } = render(AssistantLoadingMessage, {
			props: {
				message: 'Thinking...',
			},
			global: {
				stubs: {
					N8nText: true,
				},
			},
		});
		expect(container).toMatchSnapshot();
	});
});
