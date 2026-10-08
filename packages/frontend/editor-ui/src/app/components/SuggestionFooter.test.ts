import { describe, expect, it } from 'vitest';

import { REQUEST_NODE_FORM_URL } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';

import SuggestionFooter from './SuggestionFooter.vue';

const renderComponent = createComponentRenderer(SuggestionFooter);

function renderFooter(props: Partial<{ prompt: string; action: string; url: string }> = {}) {
	return renderComponent({
		props: {
			prompt: 'Need another capability?',
			action: 'Suggest a tool',
			url: 'https://example.com/suggest-service',
			...props,
		},
	});
}

describe('SuggestionFooter', () => {
	it('uses the provided URL for service suggestions', () => {
		const remoteUrl = 'https://example.com/suggest-service';

		const { getByRole } = renderFooter({ url: remoteUrl });

		expect(getByRole('link')).toHaveAttribute('href', remoteUrl);
	});

	it.each([undefined, 'http://example.com', 'javascript:alert(1)', 'not a URL'])(
		'hides the footer for an invalid URL (%s)',
		(url) => {
			const { queryByTestId } = renderFooter({ url });

			expect(queryByTestId('suggest-tool-footer')).toBeNull();
		},
	);

	it('renders custom copy and uses the provided URL', () => {
		const { getByRole, getByText } = renderFooter({
			prompt: 'Need a native integration?',
			action: 'Suggest a node',
			url: REQUEST_NODE_FORM_URL,
		});

		expect(getByText('Need a native integration?')).toBeInTheDocument();
		expect(getByRole('link')).toHaveTextContent('Suggest a node');
		expect(getByRole('link')).toHaveAttribute('href', REQUEST_NODE_FORM_URL);
	});
});
