import { beforeAll } from 'vitest';
import { setActivePinia } from 'pinia';
import { merge } from 'lodash-es';
import { isAuthorized, ROLE } from '@/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { useSSOStore } from '@/stores/sso.store';
import type { IUser } from '@/Interface';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import type { IN8nUISettings } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';

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
			setActivePinia(createTestingPinia());
			settingsStore = useSettingsStore();
			ssoStore = useSSOStore();
		});

		// @TODO Move to routes tests in the future
		it('should check SSO settings route permissions', () => {
			const ssoSettingsPermissions = {
				allow: {
					role: [ROLE.Owner],
				},
				deny: {
					shouldDeny: () => {
						const settingsStore = useSettingsStore();
						return settingsStore.isDesktopDeployment;
					},
				},
			};

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
