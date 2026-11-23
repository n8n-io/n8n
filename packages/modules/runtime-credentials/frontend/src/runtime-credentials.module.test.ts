import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { RUNTIME_CREDENTIALS_SETTINGS_VIEW } from './runtime-credentials.constants';
import { RuntimeCredentialsModule } from './runtime-credentials.module';

describe('RuntimeCredentialsModule', () => {
	const settingsPage = () =>
		RuntimeCredentialsModule.settingsPages?.find(
			(item) => item.id === 'settings-runtime-credentials',
		);

	const setUp = ({ enabled, canManage }: { enabled: boolean; canManage: boolean }) => {
		useSettingsStore().moduleSettings = { 'runtime-credentials': { enabled, aliases: [] } };
		useRBACStore().setGlobalScopes(canManage ? ['securitySettings:manage'] : []);
	};

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it.each([
		[{ enabled: true, canManage: true }, true],
		[{ enabled: false, canManage: true }, false],
		[{ enabled: true, canManage: false }, false],
	])('shows the settings link when %o: %s', (state, expected) => {
		setUp(state);

		expect(settingsPage()?.available).toBe(expected);
	});

	it('links to its own settings route under the security section', () => {
		expect(settingsPage()?.section).toBe('security');
		expect(RuntimeCredentialsModule.routes?.[0]?.name).toBe(RUNTIME_CREDENTIALS_SETTINGS_VIEW);
	});

	it.each([
		[true, true],
		[false, '/'],
	])('lets the route open when enabled is %s', (enabled, expected) => {
		setUp({ enabled, canManage: true });
		const route = RuntimeCredentialsModule.routes?.[0] as { beforeEnter?: () => unknown };

		expect(route.beforeEnter?.()).toBe(expected);
	});
});
