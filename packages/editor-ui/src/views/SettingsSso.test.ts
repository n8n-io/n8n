import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsSso from './SettingsSso.vue';
import { useSSOStore } from '@/stores/sso.store';
import { useUIStore } from '@/stores/ui.store';
import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mockedStore } from '@/__tests__/utils';

const renderView = createComponentRenderer(SettingsSso);

const samlConfig = {
	metadata: 'metadata dummy',
	metadataUrl:
		'https://dev-qqkrykgkoo0p63d5.eu.auth0.com/samlp/metadata/KR1cSrRrxaZT2gV8ZhPAUIUHtEY4duhN',
	entityID: 'https://n8n-tunnel.myhost.com/rest/sso/saml/metadata',
	returnUrl: 'https://n8n-tunnel.myhost.com/rest/sso/saml/acs',
};

const telemetryTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: telemetryTrack,
	}),
}));

const showError = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError,
	}),
}));

const confirmMessage = vi.fn();
vi.mock('@/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: confirmMessage,
	}),
}));

describe('SettingsSso View', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
		confirmMessage.mockReset();
		showError.mockReset();
	});

	it('should show upgrade banner when enterprise SAML is disabled', async () => {
		const pinia = createTestingPinia();
		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = false;

		const uiStore = useUIStore();

		const { getByTestId } = renderView({ pinia });

		const actionBox = getByTestId('sso-content-unlicensed');
		expect(actionBox).toBeInTheDocument();

		await userEvent.click(await within(actionBox).findByText('See plans'));
		expect(uiStore.goToUpgrade).toHaveBeenCalledWith('sso', 'upgrade-sso');
	});

	it('should show user SSO config', async () => {
		const pinia = createTestingPinia();

		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = true;

		ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

		const { getAllByTestId } = renderView({ pinia });

		expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);

		await waitFor(async () => {
			const copyInputs = getAllByTestId('copy-input');
			expect(copyInputs[0].textContent).toContain(samlConfig.returnUrl);
			expect(copyInputs[1].textContent).toContain(samlConfig.entityID);
		});
	});

	it('allows user to toggle SSO', async () => {
		const pinia = createTestingPinia();

		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = true;
		ssoStore.isSamlLoginEnabled = false;

		ssoStore.getSamlConfig.mockResolvedValue(samlConfig);

		const { getByTestId } = renderView({ pinia });

		const toggle = getByTestId('sso-toggle');

		expect(toggle.textContent).toContain('Deactivated');

		await userEvent.click(toggle);
		expect(toggle.textContent).toContain('Activated');

		await userEvent.click(toggle);
		expect(toggle.textContent).toContain('Deactivated');
	});

	it("allows user to fill Identity Provider's URL", async () => {
		confirmMessage.mockResolvedValueOnce('confirm');

		const pinia = createTestingPinia();
		const windowOpenSpy = vi.spyOn(window, 'open');

		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = true;

		const { getByTestId } = renderView({ pinia });

		const saveButton = getByTestId('sso-save');
		expect(saveButton).toBeDisabled();

		const urlinput = getByTestId('sso-provider-url');

		expect(urlinput).toBeVisible();
		await userEvent.type(urlinput, samlConfig.metadataUrl);

		expect(saveButton).not.toBeDisabled();
		await userEvent.click(saveButton);

		expect(ssoStore.saveSamlConfig).toHaveBeenCalledWith(
			expect.objectContaining({ metadataUrl: samlConfig.metadataUrl }),
		);

		expect(ssoStore.testSamlConfig).toHaveBeenCalled();
		expect(windowOpenSpy).toHaveBeenCalled();

		expect(telemetryTrack).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ identity_provider: 'metadata' }),
		);

		expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(2);
	});

	it("allows user to fill Identity Provider's XML", async () => {
		confirmMessage.mockResolvedValueOnce('confirm');

		const pinia = createTestingPinia();
		const windowOpenSpy = vi.spyOn(window, 'open');

		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = true;

		const { getByTestId } = renderView({ pinia });

		const saveButton = getByTestId('sso-save');
		expect(saveButton).toBeDisabled();

		await userEvent.click(getByTestId('radio-button-xml'));

		const xmlInput = getByTestId('sso-provider-xml');

		expect(xmlInput).toBeVisible();
		await userEvent.type(xmlInput, samlConfig.metadata);

		expect(saveButton).not.toBeDisabled();
		await userEvent.click(saveButton);

		expect(ssoStore.saveSamlConfig).toHaveBeenCalledWith(
			expect.objectContaining({ metadata: samlConfig.metadata }),
		);

		expect(ssoStore.testSamlConfig).toHaveBeenCalled();
		expect(windowOpenSpy).toHaveBeenCalled();

		expect(telemetryTrack).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ identity_provider: 'xml' }),
		);

		expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(2);
	});

	it('PAY-1812: allows user to disable SSO even if config request failed', async () => {
		const pinia = createTestingPinia();

		const ssoStore = mockedStore(useSSOStore);
		ssoStore.isEnterpriseSamlEnabled = true;
		ssoStore.isSamlLoginEnabled = true;

		const error = new Error('Request failed with status code 404');
		ssoStore.getSamlConfig.mockRejectedValue(error);

		const { getByTestId } = renderView({ pinia });

		expect(ssoStore.getSamlConfig).toHaveBeenCalledTimes(1);

		await waitFor(async () => {
			expect(showError).toHaveBeenCalledWith(error, 'error');
			const toggle = getByTestId('sso-toggle');
			expect(toggle.textContent).toContain('Activated');
			await userEvent.click(toggle);
			expect(toggle.textContent).toContain('Deactivated');
		});
	});
});
