import { createPinia, setActivePinia } from 'pinia';
import SettingsSso from '@/views/SettingsSso.vue';

import { retry } from '@/__tests__/utils';
import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';
import { useSettingsStore } from '@/stores/settings.store';
import userEvent from '@testing-library/user-event';
import { useSSOStore } from '@/stores/sso.store';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
import { nextTick } from 'vue';

let pinia: ReturnType<typeof createPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsSso);

describe('SettingsSso', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		window.open = vi.fn();

		pinia = createPinia();
		setActivePinia(pinia);

		ssoStore = useSSOStore();
		settingsStore = useSettingsStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId, queryByRole } = renderComponent({
			pinia,
		});

		expect(queryByRole('checkbox')).not.toBeInTheDocument();
		expect(queryByTestId('sso-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('sso-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Saml] = true;
		await nextTick();

		const { getByTestId, queryByTestId, getByRole } = renderComponent({
			pinia,
		});

		expect(getByRole('switch')).toBeInTheDocument();
		expect(getByTestId('sso-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('sso-content-unlicensed')).not.toBeInTheDocument();
	});

	it('should enable activation checkbox and test button if data is already saved', async () => {
		await ssoStore.getSamlConfig();
		settingsStore.settings.enterprise[EnterpriseEditionFeature.Saml] = true;
		await nextTick();

		const { container, getByTestId, getByRole } = renderComponent({
			pinia,
		});

		const xmlRadioButton = getByTestId('radio-button-xml');
		await userEvent.click(xmlRadioButton);

		await retry(() =>
			expect(container.querySelector('textarea[name="metadata"]')).toHaveValue(
				'<?xml version="1.0"?>',
			),
		);

		expect(getByRole('switch')).toBeEnabled();
		expect(getByTestId('sso-test')).toBeEnabled();
	});

	it('should enable activation checkbox after data is saved', async () => {
		await ssoStore.saveSamlConfig({ metadata: '' });

		settingsStore.settings.enterprise[EnterpriseEditionFeature.Saml] = true;
		await nextTick();

		const saveSpy = vi.spyOn(ssoStore, 'saveSamlConfig');
		const getSpy = vi.spyOn(ssoStore, 'getSamlConfig');

		const { container, getByRole, getByTestId } = renderComponent({
			pinia,
		});
		const checkbox = getByRole('switch');
		const btnSave = getByTestId('sso-save');
		const btnTest = getByTestId('sso-test');

		expect(checkbox).toBeDisabled();
		[btnSave, btnTest].forEach((el) => {
			expect(el).toBeDisabled();
		});

		const xmlRadioButton = getByTestId('radio-button-xml');
		await userEvent.click(xmlRadioButton);

		await retry(() => expect(container.querySelector('textarea[name="metadata"]')).toBeVisible());
		await userEvent.type(
			container.querySelector('textarea[name="metadata"]')!,
			'<?xml version="1.0"?>',
		);

		expect(checkbox).toBeDisabled();
		expect(btnTest).toBeDisabled();
		expect(btnSave).toBeEnabled();

		await userEvent.click(btnSave);

		expect(saveSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalled();
	});
});
