<script setup lang="ts">
import { N8nButton, N8nInput } from '@n8n/design-system';
import { ref } from 'vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

const store = useWorkflowGenerativeUiStore();
const instruction = ref('');

async function submit() {
	const value = instruction.value.trim();
	if (!value || store.isGenerating) return;
	instruction.value = '';
	await store.followUp(value);
}
</script>

<template>
	<form
		v-if="store.view !== 'canvas'"
		:class="$style.bar"
		data-testid="generative-ui-follow-up"
		@submit.prevent="submit"
	>
		<N8nInput
			v-model="instruction"
			placeholder="Change how this is shown…"
			aria-label="Follow-up instruction"
			:disabled="store.isGenerating"
		/>
		<N8nButton
			type="submit"
			:loading="store.isGenerating"
			:disabled="store.isGenerating || !instruction.trim()"
		>
			Submit
		</N8nButton>
	</form>
</template>

<style lang="scss" module>
.bar {
	position: absolute;
	right: var(--spacing--sm);
	bottom: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 2;
	display: flex;
	gap: var(--spacing--2xs);
	max-width: calc(var(--spacing--5xl) * 2);
	padding: var(--spacing--2xs);
	margin: 0 auto;
	border: var(--border);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
}
</style>
