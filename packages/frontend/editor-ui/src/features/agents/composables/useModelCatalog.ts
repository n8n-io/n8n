import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getModelCatalog, type ProviderCatalog, type ModelInfo } from './useAgentApi';

const catalog = ref<ProviderCatalog>({});
let fetched = false;
let fetchPromise: Promise<void> | null = null;

export function useModelCatalog() {
	const rootStore = useRootStore();

	async function ensureLoaded(projectId: string) {
		if (fetched) return;
		fetchPromise ??= getModelCatalog(rootStore.restApiContext, projectId)
			.then((result) => {
				catalog.value = result;
				fetched = true;
			})
			.catch(() => {
				fetchPromise = null;
			});
		await fetchPromise;
	}

	function getModelsForProvider(provider: string): ModelInfo[] {
		const p = catalog.value[provider];
		if (!p) return [];
		return Object.values(p.models).sort((a, b) => a.name.localeCompare(b.name));
	}

	return { catalog, ensureLoaded, getModelsForProvider };
}
