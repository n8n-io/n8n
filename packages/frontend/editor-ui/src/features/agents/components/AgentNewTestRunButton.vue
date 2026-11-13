<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import AgentNewTestRunModal from './AgentNewTestRunModal.vue';

const props = withDefaults(
	defineProps<{
		/** False when the chat has nothing to reset, so the action starts at once. */
		requireConfirmation?: boolean;
		disabled?: boolean;
	}>(),
	{ requireConfirmation: true, disabled: false },
);

const emit = defineEmits<{
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();
const confirmationOpen = ref(false);

function onClick() {
	if (props.disabled) return;
	if (!props.requireConfirmation) {
		emit('confirm');
		return;
	}
	confirmationOpen.value = true;
}

// A run can start while the confirmation is open; close it so it can't reset mid-run.
watch(
	() => props.disabled,
	(disabled) => {
		if (disabled && confirmationOpen.value) {
			confirmationOpen.value = false;
			emit('cancel');
		}
	},
);

function onConfirm() {
	if (props.disabled) return;
	confirmationOpen.value = false;
	emit('confirm');
}
</script>

<template>
	<span :class="$style.root">
		<N8nButton
			variant="outline"
			size="medium"
			icon="message-circle-plus"
			:disabled="props.disabled"
			:label="i18n.baseText('agents.testRun.reset.action')"
			data-testid="agent-new-test-run-button"
			@click="onClick"
		/>
		<AgentNewTestRunModal
			v-model:open="confirmationOpen"
			@confirm="onConfirm"
			@cancel="emit('cancel')"
		/>
	</span>
</template>

<style module lang="scss">
.root {
	display: inline-flex;
}
</style>
