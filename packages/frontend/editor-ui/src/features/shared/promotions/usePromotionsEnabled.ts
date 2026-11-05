import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

/**
 * Gates all workflow-promotion surfaces. `isAvailable` means the `promotions` module is active.
 * `isEnabled` also needs the instance to be on Environments v2, which hides the v1 surfaces.
 */
export const usePromotionsEnabled = () => {
	const settingsStore = useSettingsStore();
	const sourceControlStore = useSourceControlStore();

	const isAvailable = computed(() => settingsStore.isModuleActive('promotions'));
	const isEnabled = computed(
		() => isAvailable.value && sourceControlStore.preferences.environmentsVersion === 'v2',
	);

	return { isAvailable, isEnabled };
};
