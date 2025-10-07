<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nText } from '@n8n/design-system';
import type { Model } from '../chat.types';

defineProps<{
	disabled?: boolean;
}>();

const emit = defineEmits<{
	change: [Model];
}>();

const selectedModel = ref<string>('gpt-4');
const selectedProvider = ref<string>('openai');

watch(selectedProvider, (newProvider) => {
	if (newProvider === 'openai') {
		selectedModel.value = 'gpt-4';
	} else if (newProvider === 'anthropic') {
		selectedModel.value = 'claude-3-5-sonnet-20241022';
	}
	emit('change', { provider: newProvider, model: selectedModel.value });
});

watch(selectedModel, (newModel) => {
	emit('change', { provider: selectedProvider.value, model: newModel });
});
</script>

<template>
	<div :class="$style.modelSelectorFixed">
		<label :class="$style.modelLabel">
			<N8nText size="small" color="text-base">Model:</N8nText>
		</label>
		<select v-model="selectedProvider" :class="$style.modelSelect" :disabled="disabled">
			<option value="openai">OpenAI</option>
			<option value="anthropic">Claude</option>
		</select>
		<select v-model="selectedModel" :class="$style.modelSelect" :disabled="disabled">
			<option v-if="selectedProvider === 'openai'" value="gpt-4">GPT-4</option>
			<option v-if="selectedProvider === 'openai'" value="gpt-4-turbo">GPT-4 Turbo</option>
			<option v-if="selectedProvider === 'openai'" value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
			<option v-if="selectedProvider === 'anthropic'" value="claude-3-5-sonnet-20241022">
				Claude 3.5 Sonnet
			</option>
			<option v-if="selectedProvider === 'anthropic'" value="claude-3-opus-20240229">
				Claude 3 Opus
			</option>
			<option v-if="selectedProvider === 'anthropic'" value="claude-3-haiku-20240307">
				Claude 3 Haiku
			</option>
		</select>
	</div>
</template>

<style lang="scss" module>
.modelSelectorFixed {
	position: absolute;
	top: var(--spacing-m);
	left: var(--spacing-m);
	z-index: 100;
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	padding: var(--spacing-xs) var(--spacing-s);
	background: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.modelLabel {
	display: flex;
	align-items: center;
}

.modelSelect {
	font: inherit;
	padding: var(--spacing-2xs) var(--spacing-xs);
	border: var(--border-base);
	background: var(--color-background-xlight);
	color: var(--color-text-dark);
	border-radius: var(--border-radius-base);
	outline: none;
	cursor: pointer;
}

.modelSelect:focus {
	border-color: var(--color-primary);
	box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

.modelSelect:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
