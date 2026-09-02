import { computed } from 'vue';

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { deriveInstanceAiConfiguration } from '../instanceAiConfiguration';

export { deriveInstanceAiConfiguration } from '../instanceAiConfiguration';
export type { InstanceAiSearchState } from '../instanceAiConfiguration';

export function useInstanceAiConfiguration() {
	const store = useInstanceAiSettingsStore();
	const configuration = computed(() =>
		deriveInstanceAiConfiguration(
			store.settings,
			store.instanceModelCredentials,
			store.serviceCredentials,
		),
	);

	return {
		modelCredential: computed(() => configuration.value.modelCredential),
		modelConfigured: computed(() => configuration.value.modelConfigured),
		sandboxCredentialId: computed(() => configuration.value.sandboxCredentialId),
		sandboxConfigured: computed(() => configuration.value.sandboxConfigured),
		searchCredential: computed(() => configuration.value.searchCredential),
		searchState: computed(() => configuration.value.searchState),
		setupCompleted: computed(() => configuration.value.setupCompleted),
		hasSetupProgress: computed(() => configuration.value.hasSetupProgress),
	};
}
