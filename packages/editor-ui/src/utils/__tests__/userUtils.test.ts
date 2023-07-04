import { beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { merge } from 'lodash-es';
import { isAuthorized } from '@/utils';
import { useSettingsStore, useSSOStore } from '@/stores';
import type { IUser } from '@/Interface';
import { routes } from '@/router';
import { VIEWS } from '@/constants';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import type { IN8nUISettings } from 'n8n-workflow';

const DEFAULT_SETTINGS: IN8nUISettings = SETTINGS_STORE_DEFAULT_STATE.settings;

const DEFAULT_USER: IUser = {
	id: '1',
	isPending: false,
	isDefaultUser: true,
	isOwner: false,
	isPendingUser: false,
	globalRole: {
		name: 'default',
		id: '1',
		createdAt: new Date(),
	},
};

describe('userUtils', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let ssoStore: ReturnType<typeof useSSOStore>;

	describe('isAuthorized', () => {
		beforeAll(() => {
			setActivePinia(createPinia());
			settingsStore = useSettingsStore();
			ssoStore = useSSOStore();
		});

		it('should check SSO settings route permissions', () => {
			const ssoSettingsPermissions = routes
				.find((route) => route.path.startsWith('/settings'))
				?.children?.find((route) => route.name === VIEWS.SSO_SETTINGS)?.meta?.permissions;

			const user: IUser = merge({}, DEFAULT_USER, {
				isDefaultUser: false,
				isOwner: true,
				globalRole: {
					id: '1',
					name: 'owner',
					createdAt: new Date(),
				},
			});

			settingsStore.setSettings(merge({}, DEFAULT_SETTINGS, { enterprise: { saml: true } }));

			expect(isAuthorized(ssoSettingsPermissions, user)).toBe(true);
		});
	});
});
