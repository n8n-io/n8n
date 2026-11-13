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

const NEW_TOKEN = 'n8n_scim_Q1abnpRsYXQcCspzl1kOpxzQn';

const renderComponent = createComponentRenderer(ScimProvisioningSection, {
	pinia: createTestingPinia(),
});

describe('ScimProvisioningSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getScimConfig.mockResolvedValue(baseConfig);
	});

	it('shows the base URL and says that turning SCIM on creates the token', async () => {
		const { getByTestId, getByText, queryByTestId } = renderComponent({
			props: { ssoEnabled: true },
		});

		await waitFor(() => expect(getByTestId('sso-scim-base-url')).toBeInTheDocument());
		expect(getByText('n8n creates a token when you turn on SCIM.')).toBeVisible();
		expect(queryByTestId('sso-scim-generate-token')).not.toBeInTheDocument();
		expect(queryByTestId('sso-scim-token')).not.toBeInTheDocument();
	});

	it('offers to generate a token when SCIM is on without one', async () => {
		getScimConfig.mockResolvedValue({ ...baseConfig, enabled: true });
		generateScimToken.mockResolvedValue({ token: NEW_TOKEN, baseUrl: baseConfig.baseUrl });

		const { getByTestId, getByText } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-generate-token')).toBeInTheDocument());

		await userEvent.click(getByTestId('sso-scim-generate-token'));

		await waitFor(() => expect(getByTestId('sso-scim-token')).toBeInTheDocument());
		expect(getByText('Copy this token now. You will not see it again.')).toBeVisible();
		// The token response is enough: a failed reload cannot hide the new token state.
		expect(getScimConfig).toHaveBeenCalledTimes(1);
	});

	it('shows the new token masked and copies the full token', async () => {
		getScimConfig.mockResolvedValue({ ...baseConfig, enabled: true });
		generateScimToken.mockResolvedValue({ token: NEW_TOKEN, baseUrl: baseConfig.baseUrl });

		const { getByTestId, getByRole } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-generate-token')).toBeInTheDocument());
		await userEvent.click(getByTestId('sso-scim-generate-token'));

		await waitFor(() =>
			expect(getByRole('textbox', { name: 'Token' })).toHaveValue('n8n_scim_••••••••xzQn'),
		);
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		// The base URL row comes first, so the last copy button belongs to the token.
		const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
		await userEvent.click(copyButtons[copyButtons.length - 1]);
		await waitFor(() => expect(writeText).toHaveBeenCalledWith(NEW_TOKEN));
	});

	it('shows only the end of a token that exists, without copy', async () => {
		getScimConfig.mockResolvedValue({
			...baseConfig,
			enabled: true,
			hasToken: true,
			tokenHint: 'abcd',
		});

		const { getByTestId, getByRole } = renderComponent({ props: { ssoEnabled: true } });

		await waitFor(() =>
			expect(getByRole('textbox', { name: 'Token' })).toHaveValue('n8n_scim_••••••••abcd'),
		);
		// Only the base URL can be copied: the full token is not known any more.
		expect(getByTestId('sso-scim-token')).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(1);
	});

	it('loads the config again when single sign-on changes', async () => {
		const { getByTestId, rerender } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-enabled-select')).toBeInTheDocument());

		getScimConfig.mockResolvedValue(baseConfig);
		await rerender({ ssoEnabled: false });

		await waitFor(() => expect(getScimConfig).toHaveBeenCalledTimes(2));
	});

	it('rotates the token from its button after a confirmation', async () => {
		getScimConfig.mockResolvedValue({
			...baseConfig,
			enabled: true,
			hasToken: true,
			tokenHint: 'abcd',
		});
		generateScimToken.mockResolvedValue({ token: NEW_TOKEN, baseUrl: baseConfig.baseUrl });

		const { getByTestId, getByRole } = renderComponent({ props: { ssoEnabled: true } });
		await waitFor(() => expect(getByTestId('sso-scim-token-rotate')).toBeInTheDocument());

		expect(screen.queryAllByText('Rotate token')).toHaveLength(0);
		await userEvent.hover(getByTestId('sso-scim-token-rotate'));
		expect((await screen.findAllByText('Rotate token')).length).toBeGreaterThan(0);

		await userEvent.click(getByTestId('sso-scim-token-rotate'));
		await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());
		expect(generateScimToken).not.toHaveBeenCalled();

		await userEvent.click(
			within(getByRole('dialog')).getByRole('button', { name: 'Rotate token' }),
		);

		await waitFor(() => expect(generateScimToken).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(getByRole('textbox', { name: 'Token' })).toHaveValue('n8n_scim_••••••••xzQn'),
		);
	});

	it('shows the Preview badge next to the title', async () => {
		const { findByTestId } = renderComponent({ props: { ssoEnabled: true } });

		expect(await findByTestId('sso-scim-preview-badge')).toHaveTextContent('Preview');
	});

	it('names the select for assistive technology', async () => {
		const { findByRole } = renderComponent({ props: { ssoEnabled: true } });

		expect(await findByRole('combobox', { name: 'SCIM provisioning' })).toBeInTheDocument();
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
		getScimConfig.mockResolvedValue({ ...baseConfig, enabled: true });
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
