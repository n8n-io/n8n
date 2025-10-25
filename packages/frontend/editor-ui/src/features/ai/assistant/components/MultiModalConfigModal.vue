<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { N8nModal, N8nSelect, N8nInput, N8nFormInput, N8nText, N8nSpinner } from '@n8n/design-system';
import type { MultiModalConfig } from '@/api/ai';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@/stores/root.store';
import { fetchProviderModelsApi, type ProviderModel } from '../providerModels.api';

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	save: [config: MultiModalConfig | undefined];
}>();

const props = defineProps<{
	modelValue: boolean;
	currentConfig?: MultiModalConfig;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

// Provider options (static)
const PROVIDERS = [
	{ label: 'OpenRouter', value: 'openrouter', defaultModel: 'anthropic/claude-3.5-sonnet' },
	{ label: 'OpenAI', value: 'openai', defaultModel: 'gpt-4o' },
	{ label: 'Anthropic', value: 'anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
	{ label: 'Google Gemini', value: 'google', defaultModel: 'gemini-1.5-pro' },
	{ label: 'Groq', value: 'groq', defaultModel: 'llama-3.1-70b-versatile' },
	{ label: 'Cohere', value: 'cohere', defaultModel: 'command-r-plus' },
];

// Dynamic models
const dynamicModels = ref<Record<string, ProviderModel[]>>({});
const loadingModels = ref<boolean>(false);
const modelsError = ref<string | null>(null);

// Form state
const provider = ref<string>(props.currentConfig?.provider || 'anthropic');
const model = ref<string | undefined>(props.currentConfig?.model);
const apiKey = ref<string>(props.currentConfig?.apiKey || '');
const temperature = ref<number>(props.currentConfig?.temperature ?? 0.7);
const maxTokens = ref<number>(props.currentConfig?.maxTokens ?? 4000);

// Computed
const selectedProvider = computed(() => PROVIDERS.find((p) => p.value === provider.value));
const availableModels = computed(() => {
	const providerValue = provider.value;
	const models = dynamicModels.value[providerValue] || [];
	return models.map((m) => ({
		label: m.description ? `${m.name} - ${m.description}` : m.name,
		value: m.id,
	}));
});

// Fetch models for a provider
async function fetchModelsForProvider(providerValue: string, key?: string) {
	// Skip if already loaded
	if (dynamicModels.value[providerValue]?.length > 0) {
		return;
	}

	loadingModels.value = true;
	modelsError.value = null;

	try {
		const context = rootStore.restApiContext;
		const response = await fetchProviderModelsApi(context, providerValue, key);
		dynamicModels.value[providerValue] = response.models;
	} catch (error) {
		console.error(`Failed to fetch models for ${providerValue}:`, error);
		modelsError.value = `Failed to load models for ${providerValue}`;
	} finally {
		loadingModels.value = false;
	}
}

// Watch provider changes to update model and fetch new models
watch(provider, async (newProvider) => {
	const providerInfo = PROVIDERS.find((p) => p.value === newProvider);
	if (providerInfo) {
		// Fetch models for new provider
		await fetchModelsForProvider(newProvider, apiKey.value);
		
		// Set default model
		if (!model.value || !dynamicModels.value[newProvider]?.find(m => m.id === model.value)) {
			model.value = providerInfo.defaultModel;
		}
	}
});

// Watch API key changes to refetch models (useful for providers that need auth)
watch(apiKey, async (newKey) => {
	if (newKey && provider.value) {
		// Clear cached models and refetch
		delete dynamicModels.value[provider.value];
		await fetchModelsForProvider(provider.value, newKey);
	}
});

// Initialize model if not set
onMounted(async () => {
	if (selectedProvider.value) {
		await fetchModelsForProvider(provider.value, apiKey.value);
		
		if (!model.value) {
			model.value = selectedProvider.value.defaultModel;
		}
	}
});

function onClose() {
	emit('update:modelValue', false);
}

function onSave() {
	const config: MultiModalConfig = {
		provider: provider.value as MultiModalConfig['provider'],
		model: model.value,
		apiKey: apiKey.value || undefined,
		temperature: temperature.value,
		maxTokens: maxTokens.value,
	};
	
	emit('save', config);
	emit('update:modelValue', false);
}

function onReset() {
	provider.value = 'anthropic';
	model.value = 'claude-3-5-sonnet-20241022';
	apiKey.value = '';
	temperature.value = 0.7;
	maxTokens.value = 4000;
	emit('save', undefined);
	emit('update:modelValue', false);
}
</script>

<template>
        <N8nModal
                :model-value="modelValue"
                :title="i18n.baseText('aiAssistant.builder.multiModalConfig.title')"
                :subtitle="i18n.baseText('aiAssistant.builder.multiModalConfig.subtitle')"
                width="540px"
                @update:model-value="onClose"
        >
                <template #content>
                        <div :class="$style.content">
                                <div :class="$style.section">
                                        <N8nFormInput
                                                :label="i18n.baseText('aiAssistant.builder.multiModalConfig.provider')"
                                                :tooltip-text="i18n.baseText('aiAssistant.builder.multiModalConfig.providerTooltip')"
                                        >
                                                <N8nSelect
                                                        v-model="provider"
                                                        :placeholder="i18n.baseText('aiAssistant.builder.multiModalConfig.selectProvider')"
                                                        data-test-id="multimodal-provider-select"
                                                >
                                                        <template v-for="providerOption in PROVIDERS" :key="providerOption.value">
                                                                <n8n-option :value="providerOption.value" :label="providerOption.label" />
                                                        </template>
                                                </N8nSelect>
                                        </N8nFormInput>
                                </div>

                                <div :class="$style.section">
                                        <N8nFormInput
                                                :label="i18n.baseText('aiAssistant.builder.multiModalConfig.model')"
                                                :tooltip-text="i18n.baseText('aiAssistant.builder.multiModalConfig.modelTooltip')"
                                        >
                                                <N8nSelect
                                                        v-model="model"
                                                        :placeholder="loadingModels ? 'Loading models...' : i18n.baseText('aiAssistant.builder.multiModalConfig.selectModel')"
                                                        :disabled="loadingModels"
                                                        data-test-id="multimodal-model-select"
                                                >
                                                        <template v-if="loadingModels">
                                                                <n8n-option value="" label="Loading..." disabled />
                                                        </template>
                                                        <template v-else>
                                                                <template v-for="modelOption in availableModels" :key="modelOption.value">
                                                                        <n8n-option :value="modelOption.value" :label="modelOption.label" />
                                                                </template>
                                                        </template>
                                                </N8nSelect>
                                                <N8nText v-if="modelsError" size="small" color="danger" tag="p" :class="$style.hint">
                                                        {{ modelsError }}
                                                </N8nText>
                                        </N8nFormInput>
                                </div>

                                <div :class="$style.section">
                                        <N8nFormInput
                                                :label="i18n.baseText('aiAssistant.builder.multiModalConfig.apiKey')"
                                                :tooltip-text="i18n.baseText('aiAssistant.builder.multiModalConfig.apiKeyTooltip')"
                                        >
                                                <N8nInput
                                                        v-model="apiKey"
                                                        type="password"
                                                        :placeholder="i18n.baseText('aiAssistant.builder.multiModalConfig.apiKeyPlaceholder')"
                                                        data-test-id="multimodal-api-key-input"
                                                />
                                        </N8nFormInput>
                                </div>

                                <div :class="$style.section">
                                        <N8nFormInput
                                                :label="i18n.baseText('aiAssistant.builder.multiModalConfig.temperature')"
                                                :tooltip-text="i18n.baseText('aiAssistant.builder.multiModalConfig.temperatureTooltip')"
                                        >
                                                <N8nInput
                                                        v-model.number="temperature"
                                                        type="number"
                                                        :min="0"
                                                        :max="2"
                                                        :step="0.1"
                                                        data-test-id="multimodal-temperature-input"
                                                />
                                        </N8nFormInput>
                                        <N8nText size="small" color="text-light" tag="p" :class="$style.hint">
                                                {{ i18n.baseText('aiAssistant.builder.multiModalConfig.temperatureHint') }}
                                        </N8nText>
                                </div>

                                <div :class="$style.section">
                                        <N8nFormInput
                                                :label="i18n.baseText('aiAssistant.builder.multiModalConfig.maxTokens')"
                                                :tooltip-text="i18n.baseText('aiAssistant.builder.multiModalConfig.maxTokensTooltip')"
                                        >
                                                <N8nInput
                                                        v-model.number="maxTokens"
                                                        type="number"
                                                        :min="1"
                                                        :max="32000"
                                                        data-test-id="multimodal-max-tokens-input"
                                                />
                                        </N8nFormInput>
                                        <N8nText size="small" color="text-light" tag="p" :class="$style.hint">
                                                {{ i18n.baseText('aiAssistant.builder.multiModalConfig.maxTokensHint') }}
                                        </N8nText>
                                </div>
                        </div>
                </template>

                <template #footer>
                        <div :class="$style.footer">
                                <n8n-button type="tertiary" @click="onReset" data-test-id="multimodal-reset-button">
                                        {{ i18n.baseText('aiAssistant.builder.multiModalConfig.resetToDefault') }}
                                </n8n-button>
                                <div :class="$style.footerRight">
                                        <n8n-button type="secondary" @click="onClose" data-test-id="multimodal-cancel-button">
                                                {{ i18n.baseText('generic.cancel') }}
                                        </n8n-button>
                                        <n8n-button type="primary" @click="onSave" data-test-id="multimodal-save-button">
                                                {{ i18n.baseText('generic.save') }}
                                        </n8n-button>
                                </div>
                        </div>
                </template>
        </N8nModal>
</template>

<style lang="scss" module>
.content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-l);
        padding: var(--spacing-s) 0;
}

.section {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-4xs);
}

.hint {
        margin-top: var(--spacing-4xs);
}

.footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
}

.footerRight {
        display: flex;
        gap: var(--spacing-xs);
}
</style>
