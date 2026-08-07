import { computed } from 'vue';

import { useSettingsStore } from '@/app/stores/settings.store';
import { BRANCH_SYNC_MODULE_NAME } from '@/features/branch-sync/constants';

/** The branch-sync backend module is opt-in (`N8N_ENABLED_MODULES=branch-sync`). */
export function useBranchSyncFeature() {
	const settingsStore = useSettingsStore();

	const isBranchSyncEnabled = computed(
		() => settingsStore.isModuleActive(BRANCH_SYNC_MODULE_NAME) === true,
	);

	return { isBranchSyncEnabled };
}
