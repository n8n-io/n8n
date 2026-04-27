<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { computed, ref } from 'vue';

const props = defineProps<{ disabled?: boolean }>();
const emit = defineEmits<{ send: [prompt: string] }>();

const value = ref('');
const trimmed = computed(() => value.value.trim());
const canSend = computed(() => !props.disabled && trimmed.value.length > 0);

function onSubmit() {
	if (!canSend.value) return;
	emit('send', trimmed.value);
	value.value = '';
}
</script>

<template>
	<form :class="$style.wrap" @submit.prevent="onSubmit">
		<textarea
			v-model="value"
			:class="$style.input"
			:disabled="disabled"
			placeholder="Describe the frontend you want..."
			rows="2"
			data-testid="frontend-builder-prompt"
		/>
		<N8nButton
			type="primary"
			native-type="submit"
			:disabled="!canSend"
			data-testid="frontend-builder-send"
		>
			Send
		</N8nButton>
	</form>
</template>

<style module>
.wrap {
	display: flex;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
	align-items: stretch;
}
.input {
	flex: 1;
	resize: vertical;
	font: inherit;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background);
	color: var(--color--text);
}
</style>
