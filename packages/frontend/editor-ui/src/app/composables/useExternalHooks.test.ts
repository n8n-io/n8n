import type { FrontendSettings } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';

import { runExternalHook } from '@/app/composables/useExternalHooks';
import { useSettingsStore } from '@n8n/stores/settings.store';

/**
 * Payload `GET /rest/settings` returns to unauthenticated callers: no `license`,
 * no `security`. Built as a plain object so the absent branches really are
 * `undefined` (a `mock<FrontendSettings>()` auto-vivifies every nested key).
 */
const publicSettings = {
	settingsMode: 'public',
	defaultLocale: 'en',
	userManagement: {
		authenticationMethod: 'email',
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		passwordMinLength: 8,
	},
	sso: {
		saml: { loginEnabled: false },
		ldap: { loginEnabled: false, loginLabel: '' },
		oidc: { loginEnabled: false, loginUrl: '' },
	},
	authCookie: { secure: false },
	previewMode: false,
	enterprise: { saml: true, ldap: true, oidc: true },
	communityNodesEnabled: true,
} as unknown as FrontendSettings;

describe('runExternalHook', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		window.n8nExternalHooks = { app: { mount: [vi.fn()] } };
	});

	afterEach(() => {
		delete window.n8nExternalHooks;
	});

	it('should pass the store to the hook when settings have not been fetched yet', async () => {
		const hook = vi.fn();
		window.n8nExternalHooks = { app: { mount: [hook] } };

		await runExternalHook('app.mount');

		expect(hook).toHaveBeenCalledTimes(1);
	});

	it('should pass the store to the hook when only public settings are available', async () => {
		const hook = vi.fn();
		window.n8nExternalHooks = { app: { mount: [hook] } };
		useSettingsStore().setSettings(publicSettings);

		await runExternalHook('app.mount');

		expect(hook).toHaveBeenCalledTimes(1);
		expect(hook.mock.calls[0][0]).toMatchObject({ planName: 'Community' });
	});
});
