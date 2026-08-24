import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Gates the workflow-promotion surfaces. `isModuleActive` covers the license — the
 * backend module is skipped without `feat:gitConnections` — and the env flag is the
 * rollout switch shared by every promotion surface, not just this settings page.
 */
export const usePromotionsEnabled = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() => settingsStore.isModuleActive('git-connections') && check.value('PROMOTIONS'),
	);

	return { isEnabled };
};
