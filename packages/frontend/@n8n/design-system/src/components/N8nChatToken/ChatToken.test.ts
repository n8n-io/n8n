import { render } from '@testing-library/vue';

import N8nChatToken from './ChatToken.vue';

describe('N8nChatToken', () => {
	it('shows the label and the full name as a title', () => {
		const { getByTestId } = render(N8nChatToken, { props: { label: 'Order sync' } });

		const token = getByTestId('chat-token');
		expect(token).toHaveTextContent('Order sync');
		expect(token).toHaveAttribute('title', '@Order sync');
		expect(token.querySelector('svg, .n8n-icon')).toBeNull();
	});

	it('shows the icon of the resource kind', () => {
		const { getByTestId } = render(N8nChatToken, {
			props: { label: 'Order sync', icon: 'workflow' },
		});

		expect(getByTestId('chat-token').querySelector('.n8n-icon, svg')).not.toBeNull();
	});
});
