import { render } from '@testing-library/vue';

import AskAssistantButton from './AskAssistantButton.vue';

describe('AskAssistantButton', () => {
	it('renders default button correctly', () => {
		const { container } = render(AskAssistantButton, {});
		expect(container).toMatchSnapshot();
	});
	it('renders button with unread messages correctly', () => {
		const { container } = render(AskAssistantButton, {
			props: {
				unreadCount: 3,
			},
		});
		expect(container).toMatchSnapshot();
	});
});
