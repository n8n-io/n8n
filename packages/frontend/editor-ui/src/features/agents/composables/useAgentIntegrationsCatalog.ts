import { ref } from 'vue';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgentIntegrations } from './useAgentApi';

const catalog = ref<ChatIntegrationDescriptor[] | null>(null);
let inFlight: Promise<ChatIntegrationDescriptor[]> | null = null;

export function useAgentIntegrationsCatalog() {
	const rootStore = useRootStore();

	async function ensureLoaded(projectId: string): Promise<ChatIntegrationDescriptor[]> {
		if (catalog.value) return catalog.value;
		if (!inFlight) {
			inFlight = listAgentIntegrations(rootStore.restApiContext, projectId)
				.then((list) => {
					catalog.value = list;
					inFlight = null;
					return list;
				})
				.catch((err: unknown) => {
					inFlight = null;
					throw err;
				});
		}
		return await inFlight;
	}

	return {
		catalog,
		ensureLoaded,
	};
}
