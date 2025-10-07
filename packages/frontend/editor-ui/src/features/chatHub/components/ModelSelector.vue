<script setup lang="ts">
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';
import type { ChatHubConversationModel } from '../chat.types';

const props = defineProps<{
	disabled?: boolean;
	models: ChatHubConversationModel[];
	selectedModel?: ChatHubConversationModel;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
}>();

const providers = computed(() => {
	const uniqueProviders = new Set(props.models.map((m) => m.provider));
	return Array.from(uniqueProviders);
});

const selectedProvider = computed(() => {
	return props.selectedModel?.provider ?? props.models[0]?.provider ?? '';
});

const filteredModels = computed(() => {
	return props.models.filter((m) => m.provider === selectedProvider.value);
});

const selectedModelKey = computed(() => {
	if (!props.selectedModel) return '';
	return `${props.selectedModel.provider}-${props.selectedModel.model}`;
});

function onProviderChange(provider: string) {
	const firstModel = props.models.find((m) => m.provider === provider);
	if (firstModel) {
		emit('change', firstModel);
	}
}

function onModelChange(modelKey: string) {
	const [provider, model] = modelKey.split('-');
	const selectedModel = props.models.find((m) => m.provider === provider && m.model === model);
	if (selectedModel) {
		emit('change', selectedModel);
	}
}
</script>

<template>
	<div :class="$style.modelSelectorFixed">
		<label :class="$style.modelLabel">
			<N8nText size="small" color="text-base">Model:</N8nText>
		</label>
		<select
			:model-value="selectedProvider"
			:class="$style.modelSelect"
			:disabled="disabled || models.length === 0"
			@change="onProviderChange(($event.target as HTMLSelectElement).value)"
		>
			<option v-for="provider in providers" :key="provider" :value="provider">
				{{
					models.find((m) => m.provider === provider)?.providerDisplayName ||
					provider.charAt(0).toUpperCase() + provider.slice(1)
				}}
			</option>
		</select>
		<select
			:model-value="selectedModelKey"
			:class="$style.modelSelect"
			:disabled="disabled || models.length === 0"
			@change="onModelChange(($event.target as HTMLSelectElement).value)"
		>
			<option
				v-for="model in filteredModels"
				:key="`${model.provider}-${model.model}`"
				:value="`${model.provider}-${model.model}`"
			>
				{{ model.displayName || model.model }}
			</option>
		</select>
	</div>
</template>

<style lang="scss" module>
.modelSelectorFixed {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 100;
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	padding: var(--spacing-xs) var(--spacing-s);
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
