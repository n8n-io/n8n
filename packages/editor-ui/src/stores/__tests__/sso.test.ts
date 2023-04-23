import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { useSSOStore } from '@/stores/sso';
import { merge } from 'lodash-es';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { IN8nUISettings } from 'n8n-workflow';

let ssoStore: ReturnType<typeof useSSOStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

const DEFAULT_SETTINGS: IN8nUISettings = SETTINGS_STORE_DEFAULT_STATE.settings;

describe('SSO store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		ssoStore = useSSOStore();
		settingsStore = useSettingsStore();
	});

	test.each([
		['saml', true, true, true],
		['saml', false, true, false],
		['saml', false, false, false],
		['saml', true, false, false],
		['email', true, true, false],
	])(
		'should check SSO login button availability when authenticationMethod is %s and enterprise feature is %s and sso login is set to %s',
		(authenticationMethod, saml, loginEnabled, expectation) => {
			settingsStore.setSettings(
				merge({}, DEFAULT_SETTINGS, {
					userManagement: {
						authenticationMethod,
					},
					enterprise: {
						saml,
					},
					sso: {
						saml: {
							loginEnabled,
						},
					},
				}),
			);

			expect(ssoStore.showSsoLoginButton).toBe(expectation);
		},
	);
});
