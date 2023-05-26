import { createPinia, setActivePinia } from 'pinia';
import SettingsSso from '@/views/SettingsSso.vue';

import { renderComponent, retry } from '@/__tests__/utils';
import { setupServer } from '@/__tests__/server';
import { afterAll, beforeAll } from 'vitest';
import { useSettingsStore } from '@/stores';
import userEvent from '@testing-library/user-event';
import { useSSOStore } from '@/stores/sso.store';
import { i18nInstance } from '@/plugins/i18n';

let pinia: ReturnType<typeof createPinia>;
let ssoStore: ReturnType<typeof useSSOStore>;
let server: ReturnType<typeof setupServer>;

describe('SettingsSso', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);

		window.open = vi.fn();

		await useSettingsStore().getSettings();
		ssoStore = useSSOStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', () => {
		const { getByTestId, queryByTestId, queryByRole } = renderComponent(SettingsSso, {
			pinia,
			i18n: i18nInstance,
		});

		expect(queryByRole('checkbox')).not.toBeInTheDocument();
		expect(queryByTestId('sso-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('sso-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);

		const { getByTestId, queryByTestId, getByRole } = renderComponent(SettingsSso, {
			pinia,
			i18n: i18nInstance,
		});

		expect(getByRole('checkbox')).toBeInTheDocument();
		expect(getByTestId('sso-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('sso-content-unlicensed')).not.toBeInTheDocument();
	});

	it('should enable activation checkbox and test button if data is already saved', async () => {
		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);

		const { container, getByTestId, getByRole } = renderComponent(SettingsSso, {
			pinia,
			i18n: i18nInstance,
		});

		await retry(() =>
			expect(container.querySelector('textarea[name="metadata"]')).toHaveValue(
				'<?xml version="1.0"?>',
			),
		);

		expect(getByRole('checkbox')).toBeEnabled();
		expect(getByTestId('sso-test')).toBeEnabled();
	});

	it('should enable activation checkbox after data is saved', async () => {
		await ssoStore.saveSamlConfig({ metadata: '' });

		vi.spyOn(ssoStore, 'isEnterpriseSamlEnabled', 'get').mockReturnValue(true);

		const saveSpy = vi.spyOn(ssoStore, 'saveSamlConfig');
		const getSpy = vi.spyOn(ssoStore, 'getSamlConfig');

		const { container, getByRole, getByTestId } = renderComponent(SettingsSso, {
			pinia,
			i18n: i18nInstance,
		});
		const checkbox = getByRole('checkbox');
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
