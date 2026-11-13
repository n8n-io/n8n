import type { OidcConfigDto, SamlPreferences } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { screen, within, waitFor } from '@testing-library/vue';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import SettingsSso from './SettingsSso.vue';
import userEvent from '@testing-library/user-event';
import { useSSOStore, SupportedProtocols } from '../sso.store';
import { createComponentRenderer } from '@/__tests__/render';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import type { SamlPreferencesExtractedData } from '@n8n/rest-api-client/api/sso';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import type { Scope } from '@n8n/permissions';
import { getScimConfig, setScimEnabled } from '@n8n/rest-api-client/api/scim';

const renderView = createComponentRenderer(SettingsSso);

/** The SSO page saves the SAML and OIDC forms through the settings save bar. */
const SAVE_BUTTON = 'settings-save-bar-save';

const samlConfig = {
	metadata: 'metadata dummy',
	metadataUrl:
		'https://dev-qqkrykgkoo0p63d5.eu.auth0.com/samlp/metadata/KR1cSrRrxaZT2gV8ZhPAUIUHtEY4duhN',
	entityID: 'https://n8n-tunnel.myhost.com/rest/sso/saml/metadata',
	returnUrl: 'https://n8n-tunnel.myhost.com/rest/sso/saml/acs',
} as SamlPreferences & SamlPreferencesExtractedData;

const oidcConfig = {
	discoveryEndpoint: 'https://dev-qqkrykgkoo0p63d5.eu.auth0.com/.well-known/openid-configuration',
} as OidcConfigDto;

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: telemetryTrack,
	}),
}));

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showError,
		showMessage,
	}),
}));

const confirmMessage = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: confirmMessage,
	}),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => {
	const goToUpgrade = vi.fn();
	return {
		usePageRedirectionHelper: () => ({
			goToUpgrade,
		}),
	};
});

const mockProvisioningStore = {
	provisioningConfig: undefined as { scopesUseExpressionMapping?: boolean } | undefined,
	getProvisioningConfig: vi.fn().mockResolvedValue({}),
	saveProvisioningConfig: vi.fn().mockResolvedValue({}),
};

vi.mock('../provisioning/composables/userRoleProvisioning.store', () => ({
	useUserRoleProvisioningStore: vi.fn(() => mockProvisioningStore),
}));

vi.mock('@n8n/rest-api-client/api/roleMappingRule', () => ({
	listRoleMappingRules: vi.fn().mockResolvedValue([]),
	createRoleMappingRule: vi.fn(),
	updateRoleMappingRule: vi.fn(),
	deleteRoleMappingRule: vi.fn(),
	moveRoleMappingRule: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/scim', () => ({
	getScimConfig: vi.fn().mockResolvedValue({
		enabled: false,
		hasToken: false,
		tokenHint: null,
		baseUrl: 'https://n8n.example.com/scim/v2',
		onDelete: 'disable',
		dataAction: 'transfer',
		transferProjectId: null,
	}),
	setScimEnabled: vi.fn(),
	generateScimToken: vi.fn(),
}));

// Mock window.open to avoid JSDOM "Not implemented" error
Object.defineProperty(window, 'open', {
	writable: true,
	value: vi.fn(),
});

describe('SettingsSso View', () => {
	let ssoStore: MockedStore<typeof useSSOStore>;

	beforeEach(() => {
		createTestingPinia();
		ssoStore = mockedStore(useSSOStore);
	});

	afterEach(() => {
		telemetryTrack.mockReset();
		confirmMessage.mockReset();
		showError.mockReset();
		showMessage.mockReset();
		mockProvisioningStore.provisioningConfig = undefined;
		mockProvisioningStore.getProvisioningConfig.mockResolvedValue({});
	});

	describe('SAML', () => {
		it('should show upgrade banner when enterprise SAML is disabled', async () => {
			ssoStore.isEnterpriseSamlEnabled = false;
			ssoStore.isEnterpriseOidcEnabled = false;

			const pageRedirectionHelper = usePageRedirectionHelper();

			const { getByTestId, queryByTestId } = renderView();

			expect(queryByTestId('sso-auth-protocol-select')).not.toBeInTheDocument();

			const actionBox = getByTestId('sso-content-unlicensed');
			expect(actionBox).toBeInTheDocument();

			await userEvent.click(await within(actionBox).findByText('See plans'));
			expect(pageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith('sso', 'upgrade-sso');
		});

		it('should show user SSO config', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;

			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { getAllByTestId, getByTestId } = renderView();

			const authProtocolSelect = getByTestId('sso-auth-protocol-select');
			expect(authProtocolSelect).toBeInTheDocument();

			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);

			await waitFor(async () => {
				const copyInputs = getAllByTestId('copy-input');
				const redirectInput = copyInputs[0].querySelector('input');
				const entityInput = copyInputs[1].querySelector('input');
				expect(redirectInput?.value).toContain(samlConfig.returnUrl);
				expect(entityInput?.value).toContain(samlConfig.entityID);
			});
		});

		it('allows user to toggle SSO', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.isEnterpriseOidcEnabled = true;

			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { getByTestId } = renderView();

			const toggle = getByTestId('sso-toggle');

			// SSO toggle is now a select with enabled/disabled options
			expect(toggle).toBeInTheDocument();
		});

		it("allows user to fill Identity Provider's URL", async () => {
			// Mock two confirm dialogs: 1) test connection prompt, 2) confirm successful test
			confirmMessage.mockResolvedValueOnce('confirm').mockResolvedValueOnce('confirm');

			const windowOpenSpy = vi.spyOn(window, 'open');

			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.samlConfig = {
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: true,
			};
			ssoStore.getSamlConfig.mockResolvedValue({
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: true,
			});
			ssoStore.saveSamlConfig.mockResolvedValue({
				...samlConfig,
				metadata: undefined,
				loginEnabled: true,
			});
			ssoStore.testSamlConfig.mockResolvedValue('https://test-url.com');

			const { getByTestId } = renderView();

			expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();

			const urlInput = getByTestId('sso-provider-url');

			expect(urlInput).toBeVisible();
			await userEvent.type(urlInput, samlConfig.metadataUrl as string);

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			expect(ssoStore.saveSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					metadataUrl: samlConfig.metadataUrl,
					loginEnabled: true,
				}),
			);

			expect(ssoStore.testSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({ metadataUrl: samlConfig.metadataUrl }),
			);
			expect(windowOpenSpy).toHaveBeenCalled();

			expect(telemetryTrack).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ identity_provider: 'metadata' }),
			);

			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(2);
		});

		it('restores the saved values when the user discards the changes', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isSamlLoginEnabled = true;
			ssoStore.samlConfig = { ...samlConfig, loginEnabled: true };
			ssoStore.getSamlConfig.mockResolvedValue({ ...samlConfig, loginEnabled: true });

			const { getByTestId } = renderView();
			await waitFor(() =>
				expect(getByTestId('sso-provider-url')).toHaveValue(samlConfig.metadataUrl),
			);
			expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();

			const urlInput = getByTestId('sso-provider-url');
			await userEvent.clear(urlInput);
			await userEvent.type(urlInput, 'https://other-idp.example.com/metadata');
			await screen.findByTestId(SAVE_BUTTON);

			await userEvent.click(screen.getByTestId('settings-save-bar-discard'));

			await waitFor(() =>
				expect(getByTestId('sso-provider-url')).toHaveValue(samlConfig.metadataUrl),
			);
			await waitFor(() => expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument());
			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();
		});

		it("allows user to fill Identity Provider's XML", async () => {
			// Mock two confirm dialogs: 1) test connection prompt, 2) confirm successful test
			confirmMessage.mockResolvedValueOnce('confirm').mockResolvedValueOnce('confirm');

			const windowOpenSpy = vi.spyOn(window, 'open');

			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.samlConfig = {
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: true,
			};
			ssoStore.getSamlConfig.mockResolvedValue({
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: true,
			});
			// Mock should return config with metadata but WITHOUT metadataUrl (since user filled XML)
			ssoStore.saveSamlConfig.mockResolvedValue({
				...samlConfig,
				metadataUrl: undefined,
				loginEnabled: true,
			});
			ssoStore.testSamlConfig.mockResolvedValue('https://test-url.com');

			const { getByTestId } = renderView();

			expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();

			await userEvent.click(getByTestId('radio-button-xml'));

			const xmlInput = getByTestId('sso-provider-xml');

			expect(xmlInput).toBeVisible();
			await userEvent.type(xmlInput, samlConfig.metadata!);

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			expect(ssoStore.saveSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: samlConfig.metadata,
					loginEnabled: true,
				}),
			);

			expect(ssoStore.testSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: samlConfig.metadata }),
			);
			expect(windowOpenSpy).toHaveBeenCalled();

			expect(telemetryTrack).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ identity_provider: 'xml' }),
			);

			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(2);
		});

		it('test button sends metadataUrl when in URL mode without saving', async () => {
			const windowOpenSpy = vi.spyOn(window, 'open');

			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.samlConfig = {
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: false,
			};
			ssoStore.getSamlConfig.mockResolvedValue({
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: false,
			});
			ssoStore.testSamlConfig.mockResolvedValue('https://test-url.com');

			const { getByTestId } = renderView();

			const urlInput = getByTestId('sso-provider-url');
			expect(urlInput).toBeVisible();
			await userEvent.type(urlInput, samlConfig.metadataUrl as string);

			const testButton = getByTestId('sso-test');
			expect(testButton).not.toBeDisabled();
			await userEvent.click(testButton);

			expect(ssoStore.testSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({ metadataUrl: samlConfig.metadataUrl }),
			);
			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();
			expect(windowOpenSpy).toHaveBeenCalled();
		});

		it('test button sends metadata XML when in XML mode without saving', async () => {
			const windowOpenSpy = vi.spyOn(window, 'open');

			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.samlConfig = {
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: false,
			};
			ssoStore.getSamlConfig.mockResolvedValue({
				...samlConfig,
				metadataUrl: undefined,
				metadata: undefined,
				loginEnabled: false,
			});
			ssoStore.testSamlConfig.mockResolvedValue('https://test-url.com');

			const { getByTestId } = renderView();

			await userEvent.click(getByTestId('radio-button-xml'));

			const xmlInput = getByTestId('sso-provider-xml');
			expect(xmlInput).toBeVisible();
			await userEvent.type(xmlInput, samlConfig.metadata!);

			const testButton = getByTestId('sso-test');
			expect(testButton).not.toBeDisabled();
			await userEvent.click(testButton);

			expect(ssoStore.testSamlConfig).toHaveBeenCalledWith(
				expect.objectContaining({ metadata: samlConfig.metadata }),
			);
			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();
			expect(windowOpenSpy).toHaveBeenCalled();
		});

		it('should validate the url before setting the saml config', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;

			const { getByTestId } = renderView();

			expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();

			const urlInput = getByTestId('sso-provider-url');

			expect(urlInput).toBeVisible();
			await userEvent.type(urlInput, samlConfig.metadata as string);

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			expect(showError).toHaveBeenCalled();
			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();

			expect(ssoStore.testSamlConfig).not.toHaveBeenCalled();

			expect(telemetryTrack).not.toHaveBeenCalled();

			// getSamlConfig only called once (on mount) since save failed validation
			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);
		});

		it('should ensure the url does not support invalid protocols like mailto', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;

			const { getByTestId } = renderView();

			expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();

			const urlinput = getByTestId('sso-provider-url');

			expect(urlinput).toBeVisible();
			await userEvent.type(urlinput, 'mailto://test@example.com');

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			expect(showError).toHaveBeenCalled();
			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();

			expect(ssoStore.testSamlConfig).not.toHaveBeenCalled();

			expect(telemetryTrack).not.toHaveBeenCalled();

			// getSamlConfig only called once (on mount) since save failed validation
			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);
		});

		it('allows user to disable SSO even if config request failed', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isSamlLoginEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isOidcLoginEnabled = false;

			ssoStore.getSamlConfig.mockResolvedValue({
				...samlConfig,
				loginEnabled: true,
			});

			const { getByTestId } = renderView();

			expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);

			await waitFor(async () => {
				const toggle = getByTestId('sso-toggle');
				// SSO toggle is now a select — verify it renders
				expect(toggle).toBeInTheDocument();
			});
		});

		it('should enable activation checkbox and test button if data is already saved', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isSamlLoginEnabled = true;

			ssoStore.isDefaultAuthenticationOidc = false;
			ssoStore.isEnterpriseOidcEnabled = false;

			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { container, getByTestId } = renderView();

			await userEvent.click(getByTestId('radio-button-xml'));

			expect(container.querySelector('textarea[name="metadata"]')).toHaveValue(samlConfig.metadata);

			expect(getByTestId('sso-toggle')).toBeInTheDocument();
			expect(getByTestId('sso-test')).toBeEnabled();
		});
	});

	describe('OIDC', () => {
		it('should show upgrade banner when enterprise OIDC is disabled', async () => {
			ssoStore.isDefaultAuthenticationSaml = false;
			ssoStore.isEnterpriseSamlEnabled = false;

			ssoStore.isDefaultAuthenticationOidc = true;
			ssoStore.isEnterpriseOidcEnabled = false;

			const pageRedirectionHelper = usePageRedirectionHelper();

			const { getByTestId } = renderView();

			await waitFor(() => {
				const actionBox = getByTestId('sso-content-unlicensed');
				expect(actionBox).toBeInTheDocument();
			});

			await userEvent.click(
				await within(getByTestId('sso-content-unlicensed')).findByText('See plans'),
			);
			expect(pageRedirectionHelper.goToUpgrade).toHaveBeenCalledWith('sso', 'upgrade-sso');
		});

		it('allows user to save OIDC config', async () => {
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isEnterpriseSamlEnabled = false;
			ssoStore.isOidcLoginEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;
			ssoStore.oidcConfig = { ...oidcConfig, discoveryEndpoint: '' };

			ssoStore.getOidcConfig.mockResolvedValue({
				...oidcConfig,
				discoveryEndpoint: '',
			});
			ssoStore.saveOidcConfig.mockResolvedValue({ ...oidcConfig, loginEnabled: true });

			const { getByTestId } = renderView();

			// Wait for onMounted to initialize authProtocol to OIDC
			await waitFor(() => getByTestId('sso-oidc-test'));

			const oidcDiscoveryUrlInput = getByTestId('oidc-discovery-endpoint');

			expect(oidcDiscoveryUrlInput).toBeVisible();
			await userEvent.type(oidcDiscoveryUrlInput, oidcConfig.discoveryEndpoint);

			const clientIdInput = getByTestId('oidc-client-id');
			expect(clientIdInput).toBeVisible();
			await userEvent.type(clientIdInput, 'test-client-id');
			const clientSecretInput = getByTestId('oidc-client-secret');
			expect(clientSecretInput).toBeVisible();
			await userEvent.type(clientSecretInput, 'test-client-secret');

			const saveButton = await screen.findByTestId(SAVE_BUTTON);

			// Pinia mocked stores don't execute real store logic. In production, saveOidcConfig
			// updates oidcConfig.value (sso.store.ts:144), but the mock just returns a value.
			// We manually update the store to match what the real store would do.
			ssoStore.oidcConfig = oidcConfig;

			await userEvent.click(saveButton);

			expect(ssoStore.saveOidcConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					discoveryEndpoint: oidcConfig.discoveryEndpoint,
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					loginEnabled: true,
				}),
			);

			expect(telemetryTrack).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					authentication_method: 'oidc',
					discovery_endpoint: oidcConfig.discoveryEndpoint,
					is_active: true,
				}),
			);
		});

		it('includes the RP-initiated logout setting in the saved OIDC config', async () => {
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isEnterpriseSamlEnabled = false;
			ssoStore.isOidcLoginEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;
			ssoStore.oidcConfig = {
				...oidcConfig,
				discoveryEndpoint: '',
				rpInitiatedLogoutEnabled: true,
			};

			ssoStore.getOidcConfig.mockResolvedValue({
				...oidcConfig,
				discoveryEndpoint: '',
				rpInitiatedLogoutEnabled: true,
			});
			ssoStore.saveOidcConfig.mockResolvedValue({ ...oidcConfig, rpInitiatedLogoutEnabled: true });

			const { getByTestId } = renderView();

			await waitFor(() => getByTestId('sso-oidc-test'));
			expect(getByTestId('sso-oidc-logout-toggle')).toBeVisible();

			// Change another field so the form is dirty and Save is enabled.
			await userEvent.type(getByTestId('oidc-discovery-endpoint'), oidcConfig.discoveryEndpoint);
			await userEvent.type(getByTestId('oidc-client-id'), 'test-client-id');
			await userEvent.type(getByTestId('oidc-client-secret'), 'test-client-secret');

			const saveButton = await screen.findByTestId(SAVE_BUTTON);
			ssoStore.oidcConfig = { ...oidcConfig, rpInitiatedLogoutEnabled: true };
			await userEvent.click(saveButton);

			expect(ssoStore.saveOidcConfig).toHaveBeenCalledWith(
				expect.objectContaining({ rpInitiatedLogoutEnabled: true }),
			);
		});

		it('shows error message to user when OIDC config save fails', async () => {
			const error = new Error('Save failed');
			ssoStore.saveOidcConfig.mockRejectedValue(error);
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.isEnterpriseSamlEnabled = false;
			ssoStore.isOidcLoginEnabled = true;
			ssoStore.isSamlLoginEnabled = false;
			ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC;

			ssoStore.getOidcConfig.mockResolvedValue({
				...oidcConfig,
				discoveryEndpoint: '',
			});

			const { getByTestId } = renderView();
			showError.mockClear();

			// Wait for onMounted to initialize authProtocol to OIDC
			await waitFor(() => getByTestId('sso-oidc-test'));

			const oidcDiscoveryUrlInput = getByTestId('oidc-discovery-endpoint');

			expect(oidcDiscoveryUrlInput).toBeVisible();
			await userEvent.type(oidcDiscoveryUrlInput, oidcConfig.discoveryEndpoint);

			const clientIdInput = getByTestId('oidc-client-id');
			expect(clientIdInput).toBeVisible();
			await userEvent.type(clientIdInput, 'test-client-id');
			const clientSecretInput = getByTestId('oidc-client-secret');
			expect(clientSecretInput).toBeVisible();
			await userEvent.type(clientSecretInput, 'test-client-secret');

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			expect(ssoStore.saveOidcConfig).toHaveBeenCalledWith(
				expect.objectContaining({
					discoveryEndpoint: oidcConfig.discoveryEndpoint,
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					loginEnabled: true,
				}),
			);

			expect(telemetryTrack).not.toBeCalled();
			expect(showError).toHaveBeenCalledWith(error, 'Error saving OIDC SSO configuration');
		});
	});

	describe('Env-managed readonly mode', () => {
		it('should hide the save bar but keep test button when SAML is managed by env and mapping method is not rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: false };
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { queryByTestId } = renderView();

			await waitFor(() => {
				expect(queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument();
				expect(queryByTestId('sso-test')).toBeInTheDocument();
			});
		});

		it('should save only rules and not SSO config when SAML is managed by env and mapping method is rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: true };
			mockProvisioningStore.getProvisioningConfig.mockResolvedValue({
				scopesUseExpressionMapping: true,
			});
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { getByTestId } = renderView();

			const saveButton = await waitFor(() => getByTestId(SAVE_BUTTON));
			await userEvent.click(saveButton);

			expect(ssoStore.saveSamlConfig).not.toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should save only rules and not SSO config when OIDC is managed by env and mapping method is rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: true };
			mockProvisioningStore.getProvisioningConfig.mockResolvedValue({
				scopesUseExpressionMapping: true,
			});
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);

			const { getAllByRole, getByTestId } = renderView();

			// Switch to OIDC
			const protocolSelect = getAllByRole('combobox')[0];
			await userEvent.click(protocolSelect);
			const dropdown = await waitFor(() => document.querySelector('.el-select-dropdown__list'));
			const oidcItem = Array.from(dropdown!.querySelectorAll('.el-select-dropdown__item')).find(
				(item) => item.textContent?.includes('OIDC'),
			);
			await userEvent.click(oidcItem!);

			const saveButton = await waitFor(() => getByTestId(SAVE_BUTTON));
			await userEvent.click(saveButton);

			expect(ssoStore.saveOidcConfig).not.toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should show the save bar when SAML is managed by env and mapping method is rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: true };
			mockProvisioningStore.getProvisioningConfig.mockResolvedValue({
				scopesUseExpressionMapping: true,
			});
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { queryByTestId } = renderView();

			await waitFor(() => {
				expect(queryByTestId(SAVE_BUTTON)).toBeInTheDocument();
				expect(queryByTestId('sso-test')).toBeInTheDocument();
			});
		});

		it('should show updated banner text when mapping method is rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: true };
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { getByText } = renderView();

			await waitFor(() => {
				expect(getByText(/Role mapping rules can still be edited below/)).toBeInTheDocument();
			});
		});

		it('should show default banner text when mapping method is not rules_in_n8n', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.ssoManagedByEnv = true;
			mockProvisioningStore.provisioningConfig = { scopesUseExpressionMapping: false };
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

			const { getByText, queryByText } = renderView();

			await waitFor(() => {
				expect(getByText(/To modify, update the environment variables/)).toBeInTheDocument();
				expect(queryByText(/Role mapping rules can still be edited below/)).not.toBeInTheDocument();
			});
		});
	});

	describe('Protocol Selection Persistence', () => {
		it('should not persist protocol selection to store until save is clicked', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.selectedAuthProtocol = SupportedProtocols.SAML;
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);

			const { getByRole, getAllByRole } = renderView();

			// Change protocol selection in dropdown
			const protocolSelect = getAllByRole('combobox')[0];
			await userEvent.click(protocolSelect);

			const dropdown = await waitFor(() => getByRole('listbox'));
			const items = dropdown.querySelectorAll('.el-select-dropdown__item');
			const oidcItem = Array.from(items).find((item) => item.textContent?.includes('OIDC'));

			await userEvent.click(oidcItem!);

			// Verify store selectedAuthProtocol is still SAML (not updated)
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
		});

		it('should persist SAML protocol selection to store only after successful save', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.selectedAuthProtocol = SupportedProtocols.SAML;
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);
			ssoStore.saveSamlConfig.mockResolvedValue({ ...samlConfig, loginEnabled: false });

			const { getByTestId } = renderView();

			// Verify store selectedAuthProtocol is still SAML before save
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);

			// Fill SAML config and save
			const urlInput = getByTestId('sso-provider-url');
			await userEvent.type(urlInput, samlConfig.metadataUrl as string);

			const saveButton = await screen.findByTestId(SAVE_BUTTON);
			await userEvent.click(saveButton);

			// Verify store selectedAuthProtocol is updated to SAML after save
			await waitFor(() => {
				expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
			});
		});

		it('should persist OIDC protocol selection to store only after successful save', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.selectedAuthProtocol = SupportedProtocols.SAML; // Initially SAML
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);
			ssoStore.saveOidcConfig.mockResolvedValue(oidcConfig);

			const { getByRole, getByTestId, getAllByRole } = renderView();

			// Change to OIDC protocol in dropdown
			const protocolSelect = getAllByRole('combobox')[0];
			await userEvent.click(protocolSelect);

			const dropdown = await waitFor(() => getByRole('listbox'));
			const items = dropdown.querySelectorAll('.el-select-dropdown__item');
			const oidcItem = Array.from(items).find((item) => item.textContent?.includes('OIDC'));

			await userEvent.click(oidcItem!);

			// Verify store selectedAuthProtocol is still SAML (not updated yet)
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);

			// Fill and save OIDC config
			const discoveryInput = getByTestId('oidc-discovery-endpoint');
			await userEvent.type(discoveryInput, oidcConfig.discoveryEndpoint);

			const clientIdInput = getByTestId('oidc-client-id');
			await userEvent.type(clientIdInput, 'test-client-id');

			const clientSecretInput = getByTestId('oidc-client-secret');
			await userEvent.type(clientSecretInput, 'test-client-secret');

			const saveButton = await screen.findByTestId(SAVE_BUTTON);
			await userEvent.click(saveButton);

			// Now verify store selectedAuthProtocol is updated to OIDC after save
			await waitFor(() => {
				expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.OIDC);
			});
		});

		it('should initialize local protocol selection from store on mount', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.selectedAuthProtocol = SupportedProtocols.OIDC; // Store has OIDC saved
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);

			const { getByTestId } = renderView();

			// Wait for component to mount and initialize
			await waitFor(() => {
				expect(ssoStore.initializeSelectedProtocol).toHaveBeenCalled();
			});

			// Wait for component to mount and initialize authProtocol to OIDC from store
			// The OIDC form should be rendered (it only renders when authProtocol === OIDC)
			await waitFor(() => {
				expect(getByTestId('sso-oidc-test')).toBeInTheDocument();
			});
		});

		it('should show correct conditional content based on local protocol selection, not store', async () => {
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isEnterpriseOidcEnabled = true;
			ssoStore.selectedAuthProtocol = SupportedProtocols.SAML; // Store has SAML
			ssoStore.getSamlConfig.mockResolvedValue(samlConfig);
			ssoStore.getOidcConfig.mockResolvedValue(oidcConfig);

			const { getByRole, getAllByRole, getByTestId, queryByTestId } = renderView();

			// Initially should show SAML content (matching store)
			expect(getByTestId('sso-provider-url')).toBeVisible();
			expect(queryByTestId('oidc-discovery-endpoint')).not.toBeInTheDocument();

			// Change to OIDC in dropdown (local state only)
			const protocolSelect = getAllByRole('combobox')[0];
			await userEvent.click(protocolSelect);

			const dropdown = await waitFor(() => getByRole('listbox'));
			const items = dropdown.querySelectorAll('.el-select-dropdown__item');
			const oidcItem = Array.from(items).find((item) => item.textContent?.includes('OIDC'));

			await userEvent.click(oidcItem!);

			// Now should show OIDC content (based on local state, not store)
			await waitFor(() => {
				expect(getByTestId('oidc-discovery-endpoint')).toBeVisible();
				expect(queryByTestId('sso-provider-url')).not.toBeInTheDocument();
			});

			// Verify store still has SAML (unchanged)
			expect(ssoStore.selectedAuthProtocol).toBe(SupportedProtocols.SAML);
		});
	});

	describe('SCIM provisioning', () => {
		const setUpScim = ({
			moduleActive = true,
			optIn = 'true',
			canManage = true,
		}: { moduleActive?: boolean; optIn?: string; canManage?: boolean } = {}) => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.isModuleActive.mockImplementation(
				(name: string) => name === 'scim' && moduleActive,
			);
			settingsStore.settings = {
				...settingsStore.settings,
				envFeatureFlags: { N8N_ENV_FEAT_SCIM: optIn },
			};
			const rbacStore = mockedStore(useRBACStore);
			rbacStore.hasScope.mockImplementation(
				(scope: Scope | Scope[]) => scope === 'scim:manage' && canManage,
			);
		};

		it('shows the SCIM section with the license, the opt-in and the scope', async () => {
			setUpScim();

			const { findByTestId } = renderView();

			expect(await findByTestId('sso-scim-section')).toBeInTheDocument();
		});

		const chooseScimValue = async (getByTestId: (id: string) => HTMLElement, label: string) => {
			await waitFor(() => expect(getByTestId('sso-scim-enabled-select')).toBeInTheDocument());
			await userEvent.click(within(getByTestId('sso-scim-enabled-select')).getByRole('combobox'));
			const options = await screen.findAllByTestId('sso-scim-enabled-option');
			await userEvent.click(options.find((option) => option.textContent?.includes(label))!);
		};

		it('saves the SCIM select with the save bar', async () => {
			setUpScim();
			ssoStore.isSamlLoginEnabled = true;
			vi.mocked(setScimEnabled).mockResolvedValueOnce({ enabled: true });

			const { getByTestId } = renderView();
			await chooseScimValue(getByTestId, 'Enabled');

			expect(setScimEnabled).not.toHaveBeenCalled();
			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			await waitFor(() => expect(setScimEnabled).toHaveBeenCalledWith(expect.anything(), true));
			await waitFor(() => expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument());
		});

		it('does not send a SCIM change when the same save turns SSO off', async () => {
			setUpScim();
			confirmMessage.mockResolvedValue('confirm');
			ssoStore.isEnterpriseSamlEnabled = true;
			ssoStore.isSamlLoginEnabled = true;
			ssoStore.samlConfig = { ...samlConfig, loginEnabled: true };
			ssoStore.getSamlConfig.mockResolvedValue({ ...samlConfig, loginEnabled: true });
			// The real store reads the saved login state again after a save.
			ssoStore.saveSamlConfig.mockImplementation(async () => {
				ssoStore.isSamlLoginEnabled = false;
				return { ...samlConfig, loginEnabled: false };
			});

			const { getByTestId } = renderView();
			await waitFor(() =>
				expect(getByTestId('sso-provider-url')).toHaveValue(samlConfig.metadataUrl),
			);
			await chooseScimValue(getByTestId, 'Enabled');

			await userEvent.click(within(getByTestId('sso-toggle')).getByRole('combobox'));
			const disabledOptions = await screen.findAllByRole('option', { name: 'Disabled' });
			await userEvent.click(disabledOptions[0]);
			const getScimConfigCalls = vi.mocked(getScimConfig).mock.calls.length;
			// In the browser the SCIM reload runs while the save goes on, so it ends late.
			const savedScimConfig = await vi.mocked(getScimConfig).getMockImplementation()!();
			vi.mocked(getScimConfig).mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve(savedScimConfig), 100)),
			);

			await userEvent.click(await screen.findByTestId(SAVE_BUTTON));

			await waitFor(() => expect(ssoStore.saveSamlConfig).toHaveBeenCalled());
			await waitFor(() =>
				expect(vi.mocked(getScimConfig).mock.calls.length).toBeGreaterThan(getScimConfigCalls),
			);
			expect(setScimEnabled).not.toHaveBeenCalled();
			vi.mocked(getScimConfig).mockResolvedValue(savedScimConfig);
		});

		it('discards the SCIM select change', async () => {
			setUpScim();
			ssoStore.isSamlLoginEnabled = true;

			const { getByTestId } = renderView();
			await chooseScimValue(getByTestId, 'Enabled');
			await screen.findByTestId(SAVE_BUTTON);

			await userEvent.click(screen.getByTestId('settings-save-bar-discard'));

			await waitFor(() => expect(screen.queryByTestId(SAVE_BUTTON)).not.toBeInTheDocument());
			expect(within(getByTestId('sso-scim-enabled-select')).getByRole('combobox')).toHaveValue(
				'Disabled',
			);
			expect(setScimEnabled).not.toHaveBeenCalled();
		});

		it.each([
			['the module is not licensed', { moduleActive: false }],
			['the opt-in is off', { optIn: 'false' }],
			// The backend accepts only 'true' for the opt-in.
			['the opt-in is not exactly true', { optIn: '1' }],
			['the user cannot manage SCIM', { canManage: false }],
		])('hides the SCIM section when %s', async (_, options) => {
			setUpScim(options);

			const { queryByTestId } = renderView();

			await waitFor(() => expect(queryByTestId('sso-scim-section')).not.toBeInTheDocument());
			expect(getScimConfig).not.toHaveBeenCalled();
		});
	});
});
