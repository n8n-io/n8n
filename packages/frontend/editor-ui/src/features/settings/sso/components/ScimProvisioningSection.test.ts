import type { ScimConfigResponse } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';

import ScimProvisioningSection from './ScimProvisioningSection.vue';

const getScimConfig = vi.fn();
const setScimEnabled = vi.fn();
const generateScimToken = vi.fn();

vi.mock('@n8n/rest-api-client/api/scim', () => ({
	getScimConfig: async (...args: unknown[]) => await getScimConfig(...args),
	setScimEnabled: async (...args: unknown[]) => await setScimEnabled(...args),
	generateScimToken: async (...args: unknown[]) => await generateScimToken(...args),
}));

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const baseConfig: ScimConfigResponse = {
	enabled: false,
	hasToken: false,
	tokenHint: null,
	baseUrl: 'https://n8n.example.com/scim/v2',
	onDelete: 'disable',
	dataAction: 'transfer',
	transferProjectId: null,
};

const renderComponent = createComponentRenderer(ScimProvisioningSection, {
	pinia: createTestingPinia(),
});

describe('ScimProvisioningSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getScimConfig.mockResolvedValue(baseConfig);
	});

	it('shows the base URL and asks for a token when none exists', async () => {
		const { getByTestId, getByText } = renderComponent({ props: { ssoEnabled: true } });

		await waitFor(() => expect(getByTestId('sso-scim-base-url')).toBeInTheDocument());
		expect(getByText('Generate a token and paste it into your identity provider.')).toBeVisible();
		expect(getByTestId('sso-scim-generate-token')).toHaveTextContent('Generate token');
	});

	it('shows the new token once after it is generated', async () => {
		generateScimToken.mockResolvedValue({ token: 'n8n_scim_secret', baseUrl: baseConfig.baseUrl });

		const { getByTestId, getByText, getByRole } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-generate-token')).toBeInTheDocument());

		await userEvent.click(getByTestId('sso-scim-generate-token'));

		await waitFor(() => expect(getByTestId('sso-scim-token')).toBeInTheDocument());
		expect(getByRole('textbox', { name: 'Token' })).toHaveValue('n8n_scim_secret');
		expect(getByText('Copy this token now. You will not see it again.')).toBeVisible();
		expect(getByTestId('sso-scim-generate-token')).toHaveTextContent('Generate new token');
		// The token response is enough: a failed reload cannot hide the new token state.
		expect(getScimConfig).toHaveBeenCalledTimes(1);
	});

	it('loads the config again when single sign-on changes', async () => {
		const { getByTestId, rerender } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-enabled-select')).toBeInTheDocument());

		getScimConfig.mockResolvedValue(baseConfig);
		await rerender({ ssoEnabled: false });

		await waitFor(() => expect(getScimConfig).toHaveBeenCalledTimes(2));
	});

	it('asks for confirmation before it replaces an existing token', async () => {
		getScimConfig.mockResolvedValue({ ...baseConfig, hasToken: true, tokenHint: 'abcd' });
		generateScimToken.mockResolvedValue({ token: 'n8n_scim_new', baseUrl: baseConfig.baseUrl });

		const { getByTestId, getByRole, getByText, queryByTestId } = renderComponent({
			props: { ssoEnabled: true },
		});
		await waitFor(() => expect(getByText('A token ending in abcd is active.')).toBeVisible());
		expect(queryByTestId('sso-scim-token')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('sso-scim-generate-token'));
		await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());
		expect(generateScimToken).not.toHaveBeenCalled();

		await userEvent.click(
			within(getByRole('dialog')).getByRole('button', { name: 'Generate new token' }),
		);

		await waitFor(() => expect(generateScimToken).toHaveBeenCalledTimes(1));
	});

	it('shows the Preview badge next to the title', async () => {
		const { findByTestId } = renderComponent({ props: { ssoEnabled: true } });

		expect(await findByTestId('sso-scim-preview-badge')).toHaveTextContent('Preview');
	});

	it('does not save the select value on change', async () => {
		const { getByTestId } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-enabled-select')).toBeInTheDocument());

		await userEvent.click(within(getByTestId('sso-scim-enabled-select')).getByRole('combobox'));
		const options = await screen.findAllByTestId('sso-scim-enabled-option');
		await userEvent.click(options.find((option) => option.textContent?.includes('Enabled'))!);

		// The SSO page saves SCIM with its save bar.
		expect(setScimEnabled).not.toHaveBeenCalled();
	});

	it('disables the select and explains why while single sign-on is off', async () => {
		const { getByTestId } = renderComponent({ props: { ssoEnabled: false } });
		await waitFor(() => expect(getByTestId('sso-scim-enabled-select')).toBeInTheDocument());

		expect(within(getByTestId('sso-scim-enabled-select')).getByRole('combobox')).toBeDisabled();

		await userEvent.hover(getByTestId('sso-scim-enabled-select-wrapper'));
		expect(
			await screen.findByText('SSO needs to be enabled first in order to use SCIM'),
		).toBeInTheDocument();
	});

	it('shows an error when the token request fails', async () => {
		generateScimToken.mockRejectedValue(new Error('conflict'));

		const { getByTestId } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-generate-token')).toBeInTheDocument());

		await userEvent.click(getByTestId('sso-scim-generate-token'));

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'Could not generate the SCIM token',
			),
		);
	});
});
