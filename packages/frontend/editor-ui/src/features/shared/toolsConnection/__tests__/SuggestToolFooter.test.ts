import { beforeEach, describe, expect, it, vi } from 'vitest';

import { REQUEST_NODE_FORM_URL, SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';

import SuggestToolFooter from '../SuggestToolFooter.vue';

const getFeatureFlagPayload = vi.hoisted(() => vi.fn());

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getFeatureFlagPayload }),
}));

const renderComponent = createComponentRenderer(SuggestToolFooter);

describe('SuggestToolFooter', () => {
	beforeEach(() => {
		getFeatureFlagPayload.mockReset();
	});

	it('uses the remote config URL for service suggestions', () => {
		const remoteUrl = 'https://example.com/suggest-service';
		getFeatureFlagPayload.mockReturnValue(remoteUrl);

		const { getByRole } = renderComponent();

		expect(getByRole('link')).toHaveAttribute('href', remoteUrl);
		expect(getFeatureFlagPayload).toHaveBeenCalledWith(SUGGEST_SERVICE_FORM_URL_REMOTE_CONFIG_KEY);
	});

	it.each([undefined, 'javascript:alert(1)', 'not a URL'])(
		'falls back to the node request form for an invalid payload (%s)',
		(payload) => {
			getFeatureFlagPayload.mockReturnValue(payload);

			const { getByRole } = renderComponent();

			expect(getByRole('link')).toHaveAttribute('href', REQUEST_NODE_FORM_URL);
		},
	);

	it('keeps node suggestions on the node request form', () => {
		getFeatureFlagPayload.mockReturnValue('https://example.com/suggest-service');

		const { getByRole } = renderComponent({ props: { variant: 'node' } });

		expect(getByRole('link')).toHaveAttribute('href', REQUEST_NODE_FORM_URL);
		expect(getFeatureFlagPayload).not.toHaveBeenCalled();
	});
});
