import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	AiGatewayModelCategoryResponse,
	AiGatewaySettingsResponse,
	AiGatewayUsageResponse,
} from '@n8n/api-types';
import { AI_GATEWAY_STORE } from './aiGateway.constants';

export type AIGatewayCategory =
	| 'balanced'
	| 'cheapest'
	| 'fastest'
	| 'best-quality'
	| 'reasoning'
	| 'manual';

export interface AIGatewayModel {
	id: string;
	name: string;
	provider: string;
}

export interface CategoryDefinition {
	id: AIGatewayCategory;
	label: string;
	defaultModelId: string;
}

function resolveProviderKey(modelId: string): string {
	const slash = modelId.indexOf('/');
	if (slash > 0) return modelId.slice(0, slash);
	const id = modelId.toLowerCase();
	if (id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-') || id.startsWith('o4-'))
		return 'openai';
	if (id.startsWith('claude-')) return 'anthropic';
	if (id.startsWith('gemini-')) return 'google';
	if (id.startsWith('deepseek-')) return 'deepseek';
	if (id.startsWith('mistral-')) return 'mistral';
	if (id.startsWith('grok-')) return 'xai';
	return 'openai';
}

export const useAIGatewayStore = defineStore(AI_GATEWAY_STORE, () => {
	const initialized = ref(false);
	let initPromise: Promise<void> | null = null;
	const enabled = ref(false);
	const creditsRemaining = ref<number | null>(null);
	const selectedCategory = ref<AIGatewayCategory>('balanced');
	const selectedModel = ref<string>('openai/gpt-4.1-nano');
	const availableModels = ref<AIGatewayModel[]>([]);
	const categories = ref<CategoryDefinition[]>([]);
	const usage = ref<AiGatewayUsageResponse | null>(null);

	const selectedProvider = computed(() => {
		return resolveProviderKey(selectedModel.value);
	});

	const modelsForCurrentCategory = computed(() => {
		if (selectedCategory.value === 'manual') {
			return availableModels.value;
		}
		const cat = categories.value.find((c) => c.id === selectedCategory.value);
		if (!cat?.defaultModelId) return availableModels.value;
		const defaultModel = availableModels.value.find((m) => m.id === cat.defaultModelId);
		return defaultModel ? [defaultModel] : [];
	});

	async function initialize() {
		if (initialized.value) return;
		if (initPromise) return await initPromise;

		initPromise = doInitialize();
		return await initPromise;
	}

	async function doInitialize() {
		try {
			const rootStore = useRootStore();
			const ctx = rootStore.restApiContext;

			const settings = await makeRestApiRequest<AiGatewaySettingsResponse>(
				ctx,
				'GET',
				'/ai-gateway/settings',
			);
			enabled.value = settings.enabled;
			creditsRemaining.value = settings.creditsRemaining ?? null;
			if (settings.defaultCategory) {
				selectedCategory.value = settings.defaultCategory as AIGatewayCategory;
			}

			const backendCategories = await makeRestApiRequest<AiGatewayModelCategoryResponse[]>(
				ctx,
				'GET',
				'/ai-gateway/model-categories',
			);
			categories.value = [
				...backendCategories.map((c) => ({
					id: c.id as AIGatewayCategory,
					label: c.label,
					defaultModelId: c.model,
				})),
				{ id: 'manual' as AIGatewayCategory, label: 'Manual', defaultModelId: '' },
			];

			const cat = categories.value.find((c) => c.id === selectedCategory.value);
			if (cat?.defaultModelId) {
				selectedModel.value = cat.defaultModelId;
			}

			try {
				const modelsResponse = await makeRestApiRequest<{
					data: Array<{ id: string; name: string }>;
				}>(ctx, 'GET', '/ai-gateway/models');
				availableModels.value = modelsResponse.data.map((m) => ({
					id: m.id,
					name: m.name,
					provider: resolveProviderKey(m.id),
				}));
			} catch {
				availableModels.value = backendCategories.map((c) => ({
					id: c.model,
					name: `${c.label} — ${c.model}`,
					provider: resolveProviderKey(c.model),
				}));
			}
		} catch {
			// Fallback: backend might not be running or gateway disabled
			categories.value = [
				{ id: 'balanced', label: 'Balanced', defaultModelId: 'openai/gpt-4.1-nano' },
				{ id: 'cheapest', label: 'Cheapest', defaultModelId: 'openai/gpt-4.1-nano' },
				{ id: 'fastest', label: 'Fastest', defaultModelId: 'google/gemini-2.0-flash-001' },
				{
					id: 'best-quality',
					label: 'Best Quality',
					defaultModelId: 'anthropic/claude-sonnet-4',
				},
				{ id: 'reasoning', label: 'Reasoning', defaultModelId: 'openai/o4-mini' },
				{ id: 'manual', label: 'Manual', defaultModelId: '' },
			];
		}

		initialized.value = true;
	}

	function setCategory(categoryId: string) {
		const cat = categories.value.find((c) => c.id === categoryId);
		if (!cat) return;
		selectedCategory.value = cat.id;
		if (cat.id !== 'manual' && cat.defaultModelId) {
			selectedModel.value = cat.defaultModelId;
		}
	}

	function setModel(modelId: string) {
		selectedModel.value = modelId;
	}

	function resolveModelForCategory(categoryId: string): string {
		const cat = categories.value.find((c) => c.id === categoryId);
		if (cat && cat.id !== 'manual' && cat.defaultModelId) {
			return cat.defaultModelId;
		}
		return selectedModel.value;
	}

	async function fetchUsage() {
		try {
			const rootStore = useRootStore();
			usage.value = await makeRestApiRequest<AiGatewayUsageResponse>(
				rootStore.restApiContext,
				'GET',
				'/ai-gateway/usage',
			);
		} catch {
			// Gateway might not be running
		}
	}

	async function updateDefaultCategory(category: string) {
		try {
			const rootStore = useRootStore();
			await makeRestApiRequest<AiGatewaySettingsResponse>(
				rootStore.restApiContext,
				'PUT',
				'/ai-gateway/settings',
				{ defaultCategory: category },
			);
		} catch {
			// Gateway might not be running
		}
	}

	return {
		initialized,
		enabled,
		creditsRemaining,
		selectedCategory,
		selectedModel,
		selectedProvider,
		availableModels,
		categories,
		modelsForCurrentCategory,
		usage,
		initialize,
		setCategory,
		setModel,
		resolveModelForCategory,
		fetchUsage,
		updateDefaultCategory,
	};
});
