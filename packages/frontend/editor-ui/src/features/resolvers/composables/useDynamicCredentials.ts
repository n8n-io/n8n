import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export const useDynamicCredentials = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() => settingsStore.isModuleActive('dynamic-credentials') && check.value('DYNAMIC_CREDENTIALS'),
	);

	return { isEnabled };
};
