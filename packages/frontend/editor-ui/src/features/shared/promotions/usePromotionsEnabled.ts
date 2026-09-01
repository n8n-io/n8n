import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Gates all workflow-promotion surfaces. Enabled only when the `git-connections`
 * module is active and the `N8N_ENV_FEAT_PROMOTIONS` rollout flag is on.
 */
export const usePromotionsEnabled = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() => settingsStore.isModuleActive('git-connections') && check.value('PROMOTIONS'),
	);

	return { isEnabled };
};
