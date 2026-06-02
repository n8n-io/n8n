import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getModelCatalog, type ProviderCatalog, type ModelInfo } from './useAgentApi';
import {
	AGENT_MODEL_PROVIDERS,
	type AgentCredentialsByProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelsByProvider,
} from '../model-providers';

// The catalog is project-scoped (the API call is keyed by project), so cache and
// de-duplicate in-flight requests per project rather than globally.
const catalogByProject = ref<Record<string, ProviderCatalog>>({});
const fetchPromises = new Map<string, Promise<void>>();

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
	const activeProjectId = ref<string | null>(null);
	const isLoading = ref(false);

	const catalog = computed<ProviderCatalog>(() =>
		activeProjectId.value ? (catalogByProject.value[activeProjectId.value] ?? {}) : {},
	);

	async function ensureLoaded(projectId: string) {
		activeProjectId.value = projectId;
		if (catalogByProject.value[projectId]) return;

		let fetchPromise = fetchPromises.get(projectId);
		if (!fetchPromise) {
			fetchPromise = getModelCatalog(rootStore.restApiContext, projectId)
				.then((result) => {
					catalogByProject.value = { ...catalogByProject.value, [projectId]: result };
				})
				.catch(() => {
					fetchPromises.delete(projectId);
				});
			fetchPromises.set(projectId, fetchPromise);
		}

		isLoading.value = true;
		try {
			await fetchPromise;
		} finally {
			isLoading.value = false;
		}
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
