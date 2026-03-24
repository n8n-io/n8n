import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { INodePropertyOptions } from 'n8n-workflow';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	AiGatewayModelCategoryResponse,
	AiGatewaySettingsResponse,
	AiGatewayUsageResponse,
} from '@n8n/api-types';
import { AI_GATEWAY_STORE } from './aiGateway.constants';
import { AI_GATEWAY_INSTANCE_DEFAULT_MODELS } from './aiGatewayInstanceDefaults';
import {
	mapOpenRouterModelsToSelectOptions,
	type OpenRouterModelLike,
} from './aiGatewayModelSelectOptions';

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

	const defaultChatModel = ref<string>(AI_GATEWAY_INSTANCE_DEFAULT_MODELS.chat);
	const defaultTextModel = ref<string>(AI_GATEWAY_INSTANCE_DEFAULT_MODELS.text);
	const defaultImageModel = ref<string>(AI_GATEWAY_INSTANCE_DEFAULT_MODELS.image);
	const defaultFileModel = ref<string>(AI_GATEWAY_INSTANCE_DEFAULT_MODELS.file);
	const defaultAudioModel = ref<string>(AI_GATEWAY_INSTANCE_DEFAULT_MODELS.audio);

	const availableModels = ref<AIGatewayModel[]>([]);
	const rawModels = ref<OpenRouterModelLike[]>([]);
	const modelsLoading = ref(false);
	const categories = ref<CategoryDefinition[]>([]);
	const usage = ref<AiGatewayUsageResponse | null>(null);

	const modelSelectOptions = computed<INodePropertyOptions[]>(() =>
		mapOpenRouterModelsToSelectOptions(rawModels.value),
	);

	async function initialize() {
		if (initialized.value) return;
		if (initPromise) return await initPromise;

		initPromise = doInitialize();
		return await initPromise;
	}

	function applySettingsResponse(settings: AiGatewaySettingsResponse) {
		enabled.value = settings.enabled;
		creditsRemaining.value = settings.creditsRemaining ?? null;
		defaultChatModel.value = settings.defaultChatModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.chat;
		defaultTextModel.value = settings.defaultTextModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.text;
		defaultImageModel.value =
			settings.defaultImageModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.image;
		defaultFileModel.value = settings.defaultFileModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.file;
		defaultAudioModel.value =
			settings.defaultAudioModel ?? AI_GATEWAY_INSTANCE_DEFAULT_MODELS.audio;
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
			applySettingsResponse(settings);

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

			modelsLoading.value = true;
			try {
				const modelsResponse = await makeRestApiRequest<{ data: OpenRouterModelLike[] }>(
					ctx,
					'GET',
					'/ai-gateway/models',
				);
				const rows = modelsResponse.data ?? [];
				rawModels.value = rows;
				availableModels.value = rows.map((m) => ({
					id: m.id,
					name: m.name ?? m.id,
					provider: resolveProviderKey(m.id),
				}));
			} catch {
				rawModels.value = backendCategories.map((c) => ({
					id: c.model,
					name: `${c.label} — ${c.model}`,
				}));
				availableModels.value = backendCategories.map((c) => ({
					id: c.model,
					name: `${c.label} — ${c.model}`,
					provider: resolveProviderKey(c.model),
				}));
			} finally {
				modelsLoading.value = false;
			}
		} catch {
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

	async function updateInstanceModelDefaults(payload: {
		defaultChatModel?: string;
		defaultTextModel?: string;
		defaultImageModel?: string;
		defaultFileModel?: string;
		defaultAudioModel?: string;
	}) {
		try {
			const rootStore = useRootStore();
			const settings = await makeRestApiRequest<AiGatewaySettingsResponse>(
				rootStore.restApiContext,
				'PUT',
				'/ai-gateway/settings',
				payload,
			);
			applySettingsResponse(settings);
		} catch {
			// Gateway might not be running
		}
	}

	return {
		initialized,
		enabled,
		creditsRemaining,
		defaultChatModel,
		defaultTextModel,
		defaultImageModel,
		defaultFileModel,
		defaultAudioModel,
		availableModels,
		rawModels,
		modelsLoading,
		modelSelectOptions,
		categories,
		usage,
		initialize,
		fetchUsage,
		updateInstanceModelDefaults,
	};
});
