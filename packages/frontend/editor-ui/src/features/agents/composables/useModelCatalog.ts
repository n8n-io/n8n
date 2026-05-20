import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getModelCatalog, type ProviderCatalog, type ModelInfo } from './useAgentApi';
import {
	AGENT_MODEL_PROVIDERS,
	type AgentCredentialsByProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';

const catalog = ref<ProviderCatalog>({});
let fetched = false;
let fetchPromise: Promise<void> | null = null;
const isLoading = ref(false);

function createEmptyModelsResponse(): AgentModelsByProvider {
	const response: AgentModelsByProvider = {};
	for (const provider of AGENT_MODEL_PROVIDERS) {
		response[provider] = { models: [] };
	}
	return response;
}

function toAgentModel(provider: AgentModelProvider, model: ModelInfo): AgentModelOption {
	return {
		provider,
		model: model.id,
		name: model.name,
		description: null,
		createdAt: model.releaseDate ?? null,
		metadata: {
			functionCalling: model.toolCall,
			available: true,
		},
	};
}

export function useModelCatalog() {
	const rootStore = useRootStore();

	async function ensureLoaded(projectId: string) {
		if (fetched) return;
		if (!fetchPromise) {
			isLoading.value = true;
			fetchPromise = getModelCatalog(rootStore.restApiContext, projectId)
				.then((result) => {
					catalog.value = result;
					fetched = true;
				})
				.catch(() => {
					fetchPromise = null;
				})
				.finally(() => {
					isLoading.value = false;
				});
		}
		await fetchPromise;
	}

	function getModelsForProvider(provider: string): ModelInfo[] {
		const p = catalog.value[provider];
		if (!p) return [];
		return Object.values(p.models).sort((a, b) => a.name.localeCompare(b.name));
	}

	function getModelsForPicker(
		credentials: AgentCredentialsByProvider | null,
	): AgentModelsByProvider {
		const response = createEmptyModelsResponse();

		for (const provider of AGENT_MODEL_PROVIDERS) {
			if (!credentials?.[provider]) continue;

			const providerInfo = catalog.value[provider];
			if (!providerInfo) continue;

			response[provider] = {
				models: Object.values(providerInfo.models)
					.map((model) => toAgentModel(provider, model))
					.sort((a, b) => a.name.localeCompare(b.name)),
			};
		}

		return response;
	}

	return { catalog, isLoading, ensureLoaded, getModelsForProvider, getModelsForPicker };
}
