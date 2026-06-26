import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import { getAgentBuilderStatus } from './useAgentBuilderSettingsApi';

export function useAgentBuilderStatus() {
	const rootStore = useRootStore();
	const isBuilderConfigured = ref(false);

	async function fetchStatus(): Promise<void> {
		const status = await getAgentBuilderStatus(rootStore.restApiContext);
		isBuilderConfigured.value = status.isConfigured;
	}

	return { isBuilderConfigured, fetchStatus };
}
