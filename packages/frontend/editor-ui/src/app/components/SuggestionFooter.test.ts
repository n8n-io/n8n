import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REQUEST_NODE_FORM_URL, SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';

import SuggestionFooter from './SuggestionFooter.vue';
import type { SuggestionLinkSource } from './SuggestionFooter.vue';

const getFeatureFlagPayload = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getFeatureFlagPayload }),
}));

const renderComponent = createComponentRenderer(SuggestionFooter);

function renderFooter(
	props: Partial<{ prompt: string; action: string; linkSource: SuggestionLinkSource }> = {},
) {
	return renderComponent({
		props: {
			prompt: 'Need another capability?',
			action: 'Suggest a tool',
			linkSource: {
				type: 'posthog',
				key: SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY,
			},
			...props,
		},
	});
}

describe('SuggestionFooter', () => {
	beforeEach(() => {
		getFeatureFlagPayload.mockReset();
	});

	it('uses the remote config URL for service suggestions', () => {
		const remoteUrl = 'https://example.com/suggest-service';
		getFeatureFlagPayload.mockReturnValue(remoteUrl);

		const { getByRole } = renderFooter();

		expect(getByRole('link')).toHaveAttribute('href', remoteUrl);
		expect(getFeatureFlagPayload).toHaveBeenCalledWith(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
	});

	it.each([undefined, 'javascript:alert(1)', 'not a URL'])(
		'hides the footer for an invalid payload (%s)',
		(payload) => {
			getFeatureFlagPayload.mockReturnValue(payload);

			const { queryByTestId } = renderFooter();

			expect(queryByTestId('suggest-tool-footer')).toBeNull();
		},
	);

	it('renders custom copy and uses the provided URL', () => {
		getFeatureFlagPayload.mockReturnValue('https://example.com/suggest-service');

		const { getByRole, getByText } = renderFooter({
			prompt: 'Need a native integration?',
			action: 'Suggest a node',
			linkSource: { type: 'url', url: REQUEST_NODE_FORM_URL },
		});

		expect(getByText('Need a native integration?')).toBeInTheDocument();
		expect(getByRole('link')).toHaveTextContent('Suggest a node');
		expect(getByRole('link')).toHaveAttribute('href', REQUEST_NODE_FORM_URL);
		expect(getFeatureFlagPayload).not.toHaveBeenCalled();
	});
});
