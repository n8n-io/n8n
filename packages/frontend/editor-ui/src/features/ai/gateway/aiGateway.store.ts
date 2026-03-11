import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { AI_GATEWAY_STORE } from './aiGateway.constants';

export type AIGatewayCategory =
	| 'balanced'
	| 'cheapest'
	| 'fastest'
	| 'bestQuality'
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

/**
 * Maps model-id prefixes to the n8n LLM node type and credential name
 * used for auto-creating nodes on the canvas.
 */
export interface ProviderNodeMapping {
	nodeType: string;
	credentialType: string;
}

const PROVIDER_NODE_MAP: Record<string, ProviderNodeMapping> = {
	openai: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		credentialType: 'openAiApi',
	},
	anthropic: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		credentialType: 'anthropicApi',
	},
	google: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
		credentialType: 'googlePalmApi',
	},
	deepseek: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
		credentialType: 'deepSeekApi',
	},
	mistral: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		credentialType: 'mistralCloudApi',
	},
	xai: {
		nodeType: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
		credentialType: 'xAiApi',
	},
};

/**
 * Resolve which provider a model belongs to based on its id prefix.
 * Falls back to OpenRouter for unknown providers.
 */
function resolveProviderKey(modelId: string): string {
	const id = modelId.toLowerCase();
	if (id.startsWith('gpt-') || id.startsWith('o1-') || id.startsWith('o3-') || id.startsWith('o4-'))
		return 'openai';
	if (id.startsWith('claude-')) return 'anthropic';
	if (id.startsWith('gemini-')) return 'google';
	if (id.startsWith('deepseek-')) return 'deepseek';
	if (id.startsWith('mistral-')) return 'mistral';
	if (id.startsWith('grok-')) return 'xai';
	return 'openrouter';
}

// ──────────────────────────────────────────────
// Mock data — will be replaced by OpenRouter API
// ──────────────────────────────────────────────

const MOCK_MODELS: AIGatewayModel[] = [
	{ id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai' },
	{ id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai' },
	{ id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
	{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
	{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
	{ id: 'o4-mini', name: 'o4-mini', provider: 'openai' },
	{ id: 'claude-4-sonnet', name: 'Claude 4 Sonnet', provider: 'anthropic' },
	{ id: 'claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
	{ id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
	{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
	{ id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', provider: 'google' },
	{ id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'deepseek' },
	{ id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'deepseek' },
];

const MOCK_CATEGORIES: CategoryDefinition[] = [
	{ id: 'balanced', label: 'Balanced', defaultModelId: 'gpt-4.1-mini' },
	{ id: 'cheapest', label: 'Cheapest', defaultModelId: 'gpt-4.1-nano' },
	{ id: 'fastest', label: 'Fastest', defaultModelId: 'gemini-2.0-flash' },
	{ id: 'bestQuality', label: 'Best Quality', defaultModelId: 'claude-4-sonnet' },
	{ id: 'reasoning', label: 'Reasoning', defaultModelId: 'o4-mini' },
	{ id: 'manual', label: 'Manual', defaultModelId: '' },
];

export const useAIGatewayStore = defineStore(AI_GATEWAY_STORE, () => {
	const initialized = ref(false);
	const selectedCategory = ref<AIGatewayCategory>('balanced');
	const selectedModel = ref<string>('gpt-4.1-mini');
	const availableModels = ref<AIGatewayModel[]>([]);
	const categories = ref<CategoryDefinition[]>([]);

	const selectedProvider = computed(() => {
		const model = availableModels.value.find((m) => m.id === selectedModel.value);
		return model?.provider ?? resolveProviderKey(selectedModel.value);
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

	function initialize() {
		if (initialized.value) return;
		availableModels.value = MOCK_MODELS;
		categories.value = MOCK_CATEGORIES;
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

	/**
	 * Resolve the model ID for an arbitrary category without mutating global state.
	 * For non-manual categories returns the category's default model.
	 * For 'manual' or unknown categories falls back to the global selectedModel.
	 */
	function resolveModelForCategory(categoryId: string): string {
		const cat = categories.value.find((c) => c.id === categoryId);
		if (cat && cat.id !== 'manual' && cat.defaultModelId) {
			return cat.defaultModelId;
		}
		return selectedModel.value;
	}

	function getProviderNodeMappingForModel(modelId: string): ProviderNodeMapping {
		const key = resolveProviderKey(modelId);
		return (
			PROVIDER_NODE_MAP[key] ?? {
				nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				credentialType: 'openRouterApi',
			}
		);
	}

	/**
	 * Returns the n8n node type and credential type to use for the
	 * currently selected model. Used by canvas operations to auto-create
	 * LLM nodes with the correct provider.
	 */
	function getProviderNodeMapping(): ProviderNodeMapping {
		return getProviderNodeMappingForModel(selectedModel.value);
	}

	return {
		initialized,
		selectedCategory,
		selectedModel,
		selectedProvider,
		availableModels,
		categories,
		modelsForCurrentCategory,
		initialize,
		setCategory,
		setModel,
		getProviderNodeMapping,
		getProviderNodeMappingForModel,
		resolveModelForCategory,
	};
});
