<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nModal, N8nSelect, N8nOption, N8nInput, N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

// Types
interface ProviderModel {
	name: string;
	value: string;
	description?: string;
}

interface ProviderInfo {
	name: string;
	value: string;
	models: ProviderModel[];
	requiresApiKey: boolean;
	supportsCustomUrl: boolean;
	defaultModel: string;
}

export interface MultiModalConfig {
	provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere' | 'openrouter';
	model?: string;
	apiKey?: string;
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
}

// Provider configurations
const PROVIDERS: ProviderInfo[] = [
	{
		name: 'OpenRouter',
		value: 'openrouter',
		models: [
			{ name: 'Claude 3.5 Sonnet (via OpenRouter)', value: 'anthropic/claude-3.5-sonnet', description: 'Best for complex tasks' },
			{ name: 'GPT-4o (via OpenRouter)', value: 'openai/gpt-4o', description: 'Most capable OpenAI model' },
			{ name: 'GPT-4o Mini (via OpenRouter)', value: 'openai/gpt-4o-mini', description: 'Fast and efficient' },
			{ name: 'Gemini Pro 1.5 (via OpenRouter)', value: 'google/gemini-pro-1.5', description: 'Google\'s best' },
			{ name: 'Llama 3.1 405B (via OpenRouter)', value: 'meta-llama/llama-3.1-405b-instruct', description: 'Most capable open model' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'anthropic/claude-3.5-sonnet',
	},
	{
		name: 'OpenAI',
		value: 'openai',
		models: [
			{ name: 'GPT-4o', value: 'gpt-4o', description: 'Most capable model' },
			{ name: 'GPT-4o Mini', value: 'gpt-4o-mini', description: 'Fast and efficient' },
			{ name: 'GPT-4 Turbo', value: 'gpt-4-turbo', description: 'Previous generation' },
		],
		requiresApiKey: true,
		supportsCustomUrl: true,
		defaultModel: 'gpt-4o',
	},
	{
		name: 'Anthropic',
		value: 'anthropic',
		models: [
			{ name: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', description: 'Best for complex tasks' },
			{ name: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022', description: 'Fast and efficient' },
			{ name: 'Claude 3 Opus', value: 'claude-3-opus-20240229', description: 'Most capable' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'claude-3-5-sonnet-20241022',
	},
	{
		name: 'Google Gemini',
		value: 'google',
		models: [
			{ name: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', description: 'Most capable' },
			{ name: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', description: 'Fast and efficient' },
			{ name: 'Gemini Pro', value: 'gemini-pro', description: 'Previous generation' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'gemini-1.5-pro',
	},
	{
		name: 'Groq',
		value: 'groq',
		models: [
			{ name: 'Llama 3.1 70B', value: 'llama-3.1-70b-versatile', description: 'Most capable' },
			{ name: 'Llama 3.1 8B', value: 'llama-3.1-8b-instant', description: 'Fast inference' },
			{ name: 'Mixtral 8x7B', value: 'mixtral-8x7b-32768', description: 'Large context' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'llama-3.1-70b-versatile',
	},
	{
		name: 'Cohere',
		value: 'cohere',
		models: [
			{ name: 'Command R+', value: 'command-r-plus', description: 'Most capable' },
			{ name: 'Command R', value: 'command-r', description: 'Balanced performance' },
			{ name: 'Command', value: 'command', description: 'General purpose' },
		],
		requiresApiKey: true,
		supportsCustomUrl: false,
		defaultModel: 'command-r-plus',
	},
];

// Props and Emits
const props = defineProps<{
	modelValue: boolean;
	currentConfig?: MultiModalConfig;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	save: [config: MultiModalConfig];
}>();

// State
const i18n = useI18n();
const showAdvanced = ref(false);
const config = ref<MultiModalConfig>({
	provider: 'openrouter',
	model: 'anthropic/claude-3.5-sonnet',
	apiKey: '',
	baseUrl: '',
	temperature: 0.7,
	maxTokens: 4000,
});

// Computed
const selectedProvider = computed(() => {
	return PROVIDERS.find((p) => p.value === config.value.provider);
});

const isValid = computed(() => {
	// If API key is required and not provided
	if (selectedProvider.value?.requiresApiKey && !config.value.apiKey) {
		return false;
	}
	return true;
});

// Watchers
watch(() => props.modelValue, (newValue) => {
	if (newValue && props.currentConfig) {
		config.value = { ...props.currentConfig };
	}
});

watch(() => config.value.provider, (newProvider) => {
	const provider = PROVIDERS.find((p) => p.value === newProvider);
	if (provider) {
		config.value.model = provider.defaultModel;
	}
});

// Methods
function handleClose() {
	emit('update:modelValue', false);
}

function handleSave() {
	if (!isValid.value) return;
	emit('save', { ...config.value });
	handleClose();
}

function handleReset() {
	config.value = {
		provider: 'openrouter',
		model: 'anthropic/claude-3.5-sonnet',
		apiKey: '',
		baseUrl: '',
		temperature: 0.7,
		maxTokens: 4000,
	};
}
</script>

<template>
	<N8nModal
		:model-value="modelValue"
		title="Configure AI Provider"
		width="600px"
		data-testid="multi-modal-config-modal"
		@update:model-value="handleClose"
	>
		<template #content>
			<div :class="$style.content">
				<!-- Provider Selection -->
				<div :class="$style.field">
					<N8nText tag="label" size="small" :class="$style.label">
						AI Provider
					</N8nText>
					<N8nSelect
						v-model="config.provider"
						data-testid="provider-select"
					>
						<N8nOption
							v-for="provider in PROVIDERS"
							:key="provider.value"
							:value="provider.value"
							:label="provider.name"
						/>
					</N8nSelect>
					<N8nText v-if="selectedProvider" size="xsmall" color="text-light" :class="$style.hint">
						{{ selectedProvider.name }}
					</N8nText>
				</div>

				<!-- Model Selection -->
				<div :class="$style.field">
					<N8nText tag="label" size="small" :class="$style.label">
						Model
					</N8nText>
					<N8nSelect
						v-model="config.model"
						data-testid="model-select"
					>
						<N8nOption
							v-for="model in selectedProvider?.models"
							:key="model.value"
							:value="model.value"
							:label="model.name"
						/>
					</N8nSelect>
					<N8nText
						v-if="config.model && selectedProvider"
						size="xsmall"
						color="text-light"
						:class="$style.hint"
					>
						{{ selectedProvider.models.find((m) => m.value === config.model)?.description }}
					</N8nText>
				</div>

				<!-- API Key -->
				<div v-if="selectedProvider?.requiresApiKey" :class="$style.field">
					<N8nText tag="label" size="small" :class="$style.label">
						API Key
						<span :class="$style.required">*</span>
					</N8nText>
					<N8nInput
						v-model="config.apiKey"
						type="password"
						placeholder="Enter your API key"
						data-testid="api-key-input"
					/>
					<N8nText size="xsmall" color="text-light" :class="$style.hint">
						Your API key will be used for this session only
					</N8nText>
				</div>

				<!-- Custom URL (OpenAI and OpenRouter) -->
				<div v-if="selectedProvider?.supportsCustomUrl || config.provider === 'openrouter'" :class="$style.field">
					<N8nText tag="label" size="small" :class="$style.label">
						Custom Base URL (Optional)
					</N8nText>
					<N8nInput
						v-model="config.baseUrl"
						:placeholder="config.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1'"
						data-testid="base-url-input"
					/>
				</div>

				<!-- Advanced Settings Toggle -->
				<div :class="$style.advancedToggle">
					<N8nButton
						type="tertiary"
						size="small"
						@click="showAdvanced = !showAdvanced"
						data-testid="advanced-toggle"
					>
						{{ showAdvanced ? '▼' : '▶' }}
						Advanced Settings
					</N8nButton>
				</div>

				<!-- Advanced Settings -->
				<div v-if="showAdvanced" :class="$style.advanced">
					<!-- Temperature -->
					<div :class="$style.field">
						<N8nText tag="label" size="small" :class="$style.label">
							Temperature
						</N8nText>
						<N8nInput
							v-model.number="config.temperature"
							type="number"
							min="0"
							max="2"
							step="0.1"
							data-testid="temperature-input"
						/>
						<N8nText size="xsmall" color="text-light" :class="$style.hint">
							Controls randomness. Lower = more focused, Higher = more creative (0-2)
						</N8nText>
					</div>

					<!-- Max Tokens -->
					<div :class="$style.field">
						<N8nText tag="label" size="small" :class="$style.label">
							Max Tokens
						</N8nText>
						<N8nInput
							v-model.number="config.maxTokens"
							type="number"
							min="100"
							max="32000"
							step="100"
							data-testid="max-tokens-input"
						/>
						<N8nText size="xsmall" color="text-light" :class="$style.hint">
							Maximum response length
						</N8nText>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="tertiary"
					@click="handleReset"
					data-testid="reset-button"
				>
					Reset to Default
				</N8nButton>
				<div :class="$style.actions">
					<N8nButton
						type="secondary"
						@click="handleClose"
						data-testid="cancel-button"
					>
						Cancel
					</N8nButton>
					<N8nButton
						type="primary"
						:disabled="!isValid"
						@click="handleSave"
						data-testid="save-button"
					>
						Save Configuration
					</N8nButton>
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

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.label {
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
}

.required {
	color: var(--color-danger);
}

.hint {
	margin-top: var(--spacing-4xs);
	font-style: italic;
}

.advancedToggle {
	margin-top: var(--spacing-xs);
}

.advanced {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	padding: var(--spacing-s);
	background-color: var(--color-background-light);
	border-radius: var(--border-radius-base);
}

.footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.actions {
	display: flex;
	gap: var(--spacing-xs);
}
</style>
