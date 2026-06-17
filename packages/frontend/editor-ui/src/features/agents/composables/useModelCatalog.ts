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

// The catalog is project-scoped (the API call is keyed by project), so cache,
// de-duplicate in-flight requests, and track loading state per project rather
// than globally. A single loading flag would be flipped off by whichever
// concurrent fetch finishes first, even if the active project is still loading.
const catalogByProject = ref<Record<string, ProviderCatalog>>({});
const fetchPromises = new Map<string, Promise<void>>();
const loadingProjects = ref(new Set<string>());

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

	const catalog = computed<ProviderCatalog>(() =>
		activeProjectId.value ? (catalogByProject.value[activeProjectId.value] ?? {}) : {},
	);

	// Loading reflects the project this instance last requested, so a concurrent
	// fetch for a different project can't clear it prematurely.
	const isLoading = computed(() =>
		activeProjectId.value ? loadingProjects.value.has(activeProjectId.value) : false,
	);

	async function ensureLoaded(projectId: string) {
		activeProjectId.value = projectId;
		if (catalogByProject.value[projectId]) return;

		let fetchPromise = fetchPromises.get(projectId);
		if (!fetchPromise) {
			loadingProjects.value.add(projectId);
			fetchPromise = getModelCatalog(rootStore.restApiContext, projectId)
				.then((result) => {
					catalogByProject.value = { ...catalogByProject.value, [projectId]: result };
				})
				.catch(() => {
					fetchPromises.delete(projectId);
				})
				.finally(() => {
					loadingProjects.value.delete(projectId);
				});
			fetchPromises.set(projectId, fetchPromise);
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
