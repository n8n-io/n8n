import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Gates the external/custom credential resolver surfaces (resolver management
 * page, workflow-level resolver dropdown, custom resolver create/edit). This is
 * the superset capability.
 *
 * For the base "private credentials" surfaces (per-user self-connect via the
 * system resolver) use `usePrivateCredentials`.
 */
export const useDynamicCredentials = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() => settingsStore.isModuleActive('dynamic-credentials') && check.value('DYNAMIC_CREDENTIALS'),
	);

	return { isEnabled };
};
