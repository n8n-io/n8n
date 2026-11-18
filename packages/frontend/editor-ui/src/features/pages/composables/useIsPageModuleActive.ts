import { computed, type ComputedRef } from 'vue';

import { useSettingsStore } from '@n8n/stores/settings.store';

/** Must match the id of the page module descriptor. */
const PAGE_MODULE_ID = 'page';

/** Tells if the instance has the page module turned on. */
export function useIsPageModuleActive(): ComputedRef<boolean> {
	const settingsStore = useSettingsStore();
	return computed(() => Boolean(settingsStore.isModuleActive(PAGE_MODULE_ID)));
}
