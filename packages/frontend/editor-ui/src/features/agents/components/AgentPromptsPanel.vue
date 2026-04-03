<script setup lang="ts">
import { ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { N8nText } from '@n8n/design-system';
import type { AgentSchema } from '../types';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import AgentMiniEditor from './AgentMiniEditor.vue';

const props = defineProps<{ schema: AgentSchema | null }>();
const emit = defineEmits<{ 'update:schema': [changes: Partial<AgentSchema>] }>();

const promptText = ref(props.schema?.instructions ?? '');

watch(
	() => props.schema?.instructions,
	(newInstructions) => {
		promptText.value = newInstructions ?? '';
	},
	{ immediate: true },
);

const emitUpdate = useDebounceFn(() => {
	emit('update:schema', { instructions: promptText.value });
}, getDebounceTime(DEBOUNCE_TIME.API.HEAVY_OPERATION));

function onInput(value: string) {
	promptText.value = value;
	void emitUpdate();
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nText tag="h3" size="large" :bold="true">System Prompt</N8nText>
			<N8nText size="small" color="text-light">
				Define how your agent behaves, its persona, and what it should focus on.
			</N8nText>
		</div>
		<AgentMiniEditor
			:model-value="promptText"
			language="markdown"
			:readonly="false"
			@update:model-value="onInput"
		/>
		<N8nText size="xsmall" color="text-light">{{ promptText.length }} characters</N8nText>
	</div>
</template>

<style module>
.container {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg);
	gap: var(--spacing--xs);
	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}
</style>
