<script setup lang="ts">
import { N8nButton, N8nInput, N8nTooltip } from '@n8n/design-system';
import { ref } from 'vue';
import { useWorkflowGenerativeUiStore } from './workflowGenerativeUi.store';

const store = useWorkflowGenerativeUiStore();
const instruction = ref('');

async function submit() {
	const value = instruction.value.trim();
	if (!value || store.isGenerating) return;
	await store.followUp(value);
	if (!store.error) instruction.value = '';
}
</script>

<template>
	<form
		v-if="store.view !== 'canvas'"
		:class="$style.bar"
		data-test-id="generative-ui-follow-up"
		@submit.prevent="submit"
	>
		<N8nInput
			v-model="instruction"
			:class="$style.input"
			placeholder="Change how this is shown…"
			aria-label="Follow-up instruction"
			:disabled="store.isGenerating"
		/>
		<N8nTooltip content="Send">
			<N8nButton
				type="submit"
				icon="arrow-up"
				icon-only
				size="medium"
				aria-label="Send"
				:loading="store.isGenerating"
				:disabled="store.isGenerating || !instruction.trim()"
			/>
		</N8nTooltip>
	</form>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.bar {
	position: absolute;
	right: var(--spacing--sm);
	bottom: calc(var(--spacing--sm) + env(safe-area-inset-bottom, 0px));
	left: var(--spacing--sm);
	z-index: 2;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: calc(var(--spacing--5xl) * 2);
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs) var(--spacing--xs);
	margin-inline: auto;
	border: var(--border);
	border-radius: var(--radius--full);
	background: color-mix(in srgb, var(--background--surface) 82%, transparent);
	box-shadow: var(--shadow--md);
	backdrop-filter: blur(8px);
	-webkit-backdrop-filter: blur(8px);

	@include focus.focus-within-ring;
}

.input {
	flex: 1;
	min-width: 0;

	:global(.n8n-input__wrapper) {
		--input--color--background: transparent;
		--input--border--shadow: 0 0 0 0 transparent;
		--input--border--shadow--hover: 0 0 0 0 transparent;
		--input--border--shadow--focus: 0 0 0 0 transparent;
	}
}
</style>
