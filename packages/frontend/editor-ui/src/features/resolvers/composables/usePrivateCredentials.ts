import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Gates the "private credentials" surfaces (per-user self-connect via the seeded
 * system resolver). This is the base capability and is enabled by either the
 * `PRIVATE_CREDENTIALS` flag or the superset `DYNAMIC_CREDENTIALS` flag.
 *
 * For the external/custom resolver surfaces (resolver management, workflow
 * resolver dropdown, custom resolver create/edit) use `useDynamicCredentials`.
 */
export const usePrivateCredentials = () => {
	const settingsStore = useSettingsStore();
	const { check } = useEnvFeatureFlag();

	const isEnabled = computed(
		() =>
			settingsStore.isModuleActive('dynamic-credentials') &&
			(check.value('PRIVATE_CREDENTIALS') || check.value('DYNAMIC_CREDENTIALS')),
	);

	return { isEnabled };
};
