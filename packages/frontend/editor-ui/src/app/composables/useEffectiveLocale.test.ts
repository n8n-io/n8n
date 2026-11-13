import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ROLE } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useEffectiveLocale } from './useEffectiveLocale';

const user = {
	id: '1',
	email: 'user@example.com',
	role: ROLE.Member,
	isDefaultUser: false,
	isPendingUser: false,
	mfaEnabled: false,
};

describe(useEffectiveLocale, () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let usersStore: ReturnType<typeof useUsersStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useRootStore().setDefaultLocale('fr');
		settingsStore = useSettingsStore();
		usersStore = useUsersStore();
	});

	function signIn(locale?: string) {
		usersStore.usersById[user.id] = { ...user, settings: locale ? { locale } : {} };
		usersStore.currentUserId = user.id;
	}

	it('uses the instance default when no user is signed in', () => {
		settingsStore.settings.localeUserOverride = true;

		expect(useEffectiveLocale().value).toBe('fr');
	});

	it('uses the personal locale when the override is on', () => {
		settingsStore.settings.localeUserOverride = true;
		signIn('de');

		expect(useEffectiveLocale().value).toBe('de');
	});

	it('uses the instance default when the user has no personal locale', () => {
		settingsStore.settings.localeUserOverride = true;
		signIn();

		expect(useEffectiveLocale().value).toBe('fr');
	});

	it('ignores the personal locale when the override is off', () => {
		settingsStore.settings.localeUserOverride = false;
		signIn('de');

		expect(useEffectiveLocale().value).toBe('fr');
	});
});
