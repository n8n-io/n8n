import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getModelCatalog,
	getProviderModels,
	type ProviderCatalog,
	type ModelInfo,
} from './useAgentApi';
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

// Provider-verified model lists, keyed by project|provider|credential. The
// static catalog can offer models the provider has retired (which then fail at
// call time), so when a credential is selected the provider's own model API is
// asked which models actually work. `null` marks a failed or unverified
// lookup — the static catalog is used for that key.
const verifiedModelsByKey = ref<Record<string, ModelInfo[] | null>>({});
const verifiedFetchesInFlight = new Set<string>();

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

	/**
	 * Kick off (once per project+provider+credential) the fetch of the
	 * provider-verified model list. Idempotent and guarded, so it is safe to
	 * trigger from `getModelsForPicker` — when the response lands, the reactive
	 * map updates and computeds re-evaluate with the verified list.
	 */
	function ensureVerifiedModels(
		projectId: string,
		provider: AgentModelProvider,
		providerCredentialId: string,
	): void {
		const key = `${projectId}|${provider}|${providerCredentialId}`;
		if (key in verifiedModelsByKey.value || verifiedFetchesInFlight.has(key)) return;

		verifiedFetchesInFlight.add(key);
		getProviderModels(rootStore.restApiContext, projectId, provider, providerCredentialId)
			.then((result) => {
				verifiedModelsByKey.value = {
					...verifiedModelsByKey.value,
					[key]: result.verified ? result.models : null,
				};
			})
			.catch(() => {
				verifiedModelsByKey.value = { ...verifiedModelsByKey.value, [key]: null };
			})
			.finally(() => {
				verifiedFetchesInFlight.delete(key);
			});
	}

	function getModelsForPicker(
		credentials: AgentCredentialsByProvider | null,
	): AgentModelsByProvider {
		const response = createEmptyModelsResponse();

		for (const provider of AGENT_MODEL_PROVIDERS) {
			const providerCredentialId = credentials?.[provider];
			if (!providerCredentialId) continue;

			let models: ModelInfo[] | undefined;
			const projectId = activeProjectId.value;
			if (projectId) {
				ensureVerifiedModels(projectId, provider, providerCredentialId);
				models =
					verifiedModelsByKey.value[`${projectId}|${provider}|${providerCredentialId}`] ??
					undefined;
			}

			if (!models) {
				const providerInfo = catalog.value[provider];
				if (!providerInfo) continue;
				models = Object.values(providerInfo.models);
			}

			response[provider] = {
				models: models
					.map((model) => toAgentModel(provider, model))
					.sort((a, b) => a.name.localeCompare(b.name)),
			};
		}

		return response;
	}

	return { catalog, isLoading, ensureLoaded, getModelsForProvider, getModelsForPicker };
}
