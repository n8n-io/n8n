import { computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

/**
 * The locale the editor shows. The personal locale wins when the instance allows it.
 * Otherwise, and for signed-out users, the instance default applies.
 */
export function useEffectiveLocale() {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	return computed(() => {
		// The stored locale stays in the database, so it applies again if the override is turned on.
		const personalLocale = settingsStore.settings.localeUserOverride
			? usersStore.currentUser?.settings?.locale
			: undefined;
		return personalLocale || rootStore.defaultLocale;
	});
}
