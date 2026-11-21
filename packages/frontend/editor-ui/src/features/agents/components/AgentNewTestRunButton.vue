<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import AgentNewTestRunModal from './AgentNewTestRunModal.vue';

const props = withDefaults(
	defineProps<{
		/** False when the chat has nothing to reset, so the action starts at once. */
		requireConfirmation?: boolean;
		disabled?: boolean;
		/** Set true on confirm, then false when reset settles, including on failure. */
		busy: boolean;
	}>(),
	{ requireConfirmation: true, disabled: false },
);

const emit = defineEmits<{
	confirm: [];
	cancel: [];
}>();

const i18n = useI18n();
const confirmationOpen = ref(false);
const submitted = ref(false);
const isBusy = computed(() => props.busy || submitted.value);

watch(
	() => props.busy,
	(busy, wasBusy) => {
		if (wasBusy && !busy) {
			submitted.value = false;
			confirmationOpen.value = false;
		}
	},
);

function onClick() {
	if (props.disabled || isBusy.value) return;
	if (!props.requireConfirmation) {
		submitted.value = true;
		emit('confirm');
		return;
	}
	confirmationOpen.value = true;
}

// A run can start while the confirmation is open; close it so it can't reset mid-run.
watch(
	() => props.disabled,
	(disabled) => {
		if (disabled && confirmationOpen.value && !isBusy.value) {
			confirmationOpen.value = false;
			emit('cancel');
		}
	},
);

function onConfirm() {
	if (props.disabled || isBusy.value) return;
	// Lock before emitting, so the caller can update busy on the next render.
	submitted.value = true;
	emit('confirm');
}
</script>

<template>
	<span :class="$style.root">
		<N8nButton
			variant="outline"
			size="medium"
			icon="message-circle-plus"
			:disabled="props.disabled || isBusy"
			:label="i18n.baseText('agents.testRun.reset.action')"
			data-testid="agent-new-test-run-button"
			@click="onClick"
		/>
		<AgentNewTestRunModal
			v-model:open="confirmationOpen"
			:busy="isBusy"
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
