import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';

import McpRegistrySuggestionFooter from './McpRegistrySuggestionFooter.vue';

const getFeatureFlagPayload = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getFeatureFlagPayload }),
}));

const renderComponent = createComponentRenderer(McpRegistrySuggestionFooter);

describe('McpRegistrySuggestionFooter', () => {
	beforeEach(() => {
		getFeatureFlagPayload.mockReset();
	});

	it('renders the supplied copy with the configured URL', () => {
		getFeatureFlagPayload.mockReturnValue('https://example.com/suggest-service');

		const { getByRole, getByText } = renderComponent({
			props: { prompt: 'Missing a service?', action: 'Suggest a connector' },
		});

		expect(getFeatureFlagPayload).toHaveBeenCalledWith(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
		expect(getByText('Missing a service?')).toBeInTheDocument();
		expect(getByRole('link')).toHaveTextContent('Suggest a connector');
		expect(getByRole('link')).toHaveAttribute('href', 'https://example.com/suggest-service');
	});

	it('hides the footer when the configured value is not a string', () => {
		getFeatureFlagPayload.mockReturnValue({ url: 'https://example.com' });

		const { queryByTestId } = renderComponent({
			props: { prompt: 'Need another capability?', action: 'Suggest a tool' },
		});

		expect(queryByTestId('suggest-tool-footer')).not.toBeInTheDocument();
	});
});
