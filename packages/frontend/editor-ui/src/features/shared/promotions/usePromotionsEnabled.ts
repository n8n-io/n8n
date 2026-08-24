import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Gates every workflow-promotion surface: the git-connections settings page today,
 * Promote actions later. True only when the `git-connections` backend module is
 * active — it is skipped without the `feat:gitConnections` license — *and* the
 * `N8N_ENV_FEAT_PROMOTIONS` rollout flag is on.
 */
export const usePromotionsEnabled = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() => settingsStore.isModuleActive('git-connections') && check.value('PROMOTIONS'),
	);

	return { isEnabled };
};
