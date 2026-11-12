import { render } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import N8nChatScrollArea from './ChatScrollArea.vue';

describe('N8nChatScrollArea', () => {
	it('should render the default and input slots', () => {
		const { getByText, getByTestId } = render(N8nChatScrollArea, {
			slots: {
				default: '<p>First message</p>',
				input: '<div>Chat input</div>',
			},
		});

		expect(getByTestId('chat-scroll-area')).toBeInTheDocument();
		expect(getByText('First message')).toBeInTheDocument();
		expect(getByText('Chat input')).toBeInTheDocument();
	});

	it('should match the snapshot', () => {
		const { html } = render(N8nChatScrollArea, {
			slots: {
				default: '<p>First message</p>',
				input: '<div>Chat input</div>',
			},
		});

		expect(html()).toMatchSnapshot();
	});
});
