import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

/**
 * Gates all workflow-promotion surfaces. `isAvailable` means the instance can use promotions:
 * the `promotions` module is active and the `N8N_ENV_FEAT_PROMOTIONS` rollout flag is on.
 * `isEnabled` also needs the instance to be on Environments v2, which hides the v1 surfaces.
 */
export const usePromotionsEnabled = () => {
	const settingsStore = useSettingsStore();
	const sourceControlStore = useSourceControlStore();
	const { check } = useEnvFeatureFlag();

	const isAvailable = computed(
		() => settingsStore.isModuleActive('promotions') && check.value('PROMOTIONS'),
	);
	const isEnabled = computed(
		() => isAvailable.value && sourceControlStore.preferences.environmentsVersion === 'v2',
	);

	return { isAvailable, isEnabled };
};
