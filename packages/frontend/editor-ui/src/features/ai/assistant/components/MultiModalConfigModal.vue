<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nModal, N8nSelect, N8nInput, N8nFormInput, N8nText } from '@n8n/design-system';
import type { MultiModalConfig } from '@/api/ai';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{
        'update:modelValue': [value: boolean];
        save: [config: MultiModalConfig | undefined];
}>();

const props = defineProps<{
        modelValue: boolean;
        currentConfig?: MultiModalConfig;
}>();

const i18n = useI18n();

// Provider options with models
const PROVIDERS = [
        {
                label: 'OpenAI',
                value: 'openai',
                models: [
                        { label: 'GPT-4o (Most capable)', value: 'gpt-4o' },
                        { label: 'GPT-4o Mini (Fast and efficient)', value: 'gpt-4o-mini' },
                        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
                        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
                ],
                defaultModel: 'gpt-4o',
        },
        {
                label: 'Anthropic',
                value: 'anthropic',
                models: [
                        { label: 'Claude 3.5 Sonnet (Best for complex tasks)', value: 'claude-3-5-sonnet-20241022' },
                        { label: 'Claude 3.5 Haiku (Fast and efficient)', value: 'claude-3-5-haiku-20241022' },
                        { label: 'Claude 3 Opus (Most capable)', value: 'claude-3-opus-20240229' },
                ],
                defaultModel: 'claude-3-5-sonnet-20241022',
        },
        {
                label: 'Google Gemini',
                value: 'google',
                models: [
                        { label: 'Gemini 1.5 Pro (Most capable)', value: 'gemini-1.5-pro' },
                        { label: 'Gemini 1.5 Flash (Fast and efficient)', value: 'gemini-1.5-flash' },
                        { label: 'Gemini Pro', value: 'gemini-pro' },
                ],
                defaultModel: 'gemini-1.5-pro',
        },
        {
                label: 'Groq',
                value: 'groq',
                models: [
                        { label: 'Llama 3.1 70B (Most capable)', value: 'llama-3.1-70b-versatile' },
                        { label: 'Llama 3.1 8B (Fast inference)', value: 'llama-3.1-8b-instant' },
                        { label: 'Mixtral 8x7B (Large context)', value: 'mixtral-8x7b-32768' },
                ],
                defaultModel: 'llama-3.1-70b-versatile',
        },
        {
                label: 'Cohere',
                value: 'cohere',
                models: [
                        { label: 'Command R+ (Most capable)', value: 'command-r-plus' },
                        { label: 'Command R (Balanced)', value: 'command-r' },
                        { label: 'Command (General purpose)', value: 'command' },
                ],
                defaultModel: 'command-r-plus',
        },
];

// Form state
const provider = ref<string>(props.currentConfig?.provider || 'anthropic');
const model = ref<string | undefined>(props.currentConfig?.model);
const apiKey = ref<string>(props.currentConfig?.apiKey || '');
const temperature = ref<number>(props.currentConfig?.temperature ?? 0.7);
const maxTokens = ref<number>(props.currentConfig?.maxTokens ?? 4000);

// Computed
const selectedProvider = computed(() => PROVIDERS.find((p) => p.value === provider.value));
const availableModels = computed(() => selectedProvider.value?.models || []);

// Watch provider changes to update model
watch(provider, (newProvider) => {
        const providerInfo = PROVIDERS.find((p) => p.value === newProvider);
        if (providerInfo) {
                model.value = providerInfo.defaultModel;
        }
});

// Initialize model if not set
if (!model.value && selectedProvider.value) {
        model.value = selectedProvider.value.defaultModel;
}

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
                                                        :placeholder="i18n.baseText('aiAssistant.builder.multiModalConfig.selectModel')"
                                                        data-test-id="multimodal-model-select"
                                                >
                                                        <template v-for="modelOption in availableModels" :key="modelOption.value">
                                                                <n8n-option :value="modelOption.value" :label="modelOption.label" />
                                                        </template>
                                                </N8nSelect>
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
