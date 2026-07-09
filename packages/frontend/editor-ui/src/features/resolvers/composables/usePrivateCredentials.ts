import { computed } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * Gates the "private credentials" surfaces (per-user self-connect via the seeded
 * system resolver). This is the base capability, generally available once the
 * `dynamic-credentials` module is active.
 *
 * For the external/custom resolver surfaces (resolver management, workflow
 * resolver dropdown, custom resolver create/edit) use `useDynamicCredentials`.
 */
export const usePrivateCredentials = () => {
	const settingsStore = useSettingsStore();

	const isEnabled = computed(() => settingsStore.isModuleActive('dynamic-credentials'));

	return { isEnabled };
};
