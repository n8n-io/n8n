<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref, watch } from 'vue';

import AgentNewTestRunModal from './AgentNewTestRunModal.vue';

const props = withDefaults(
	defineProps<{
		/** False when the chat has nothing to reset, so the action starts at once. */
		requireConfirmation?: boolean;
		disabled?: boolean;
		/**
		 * Set true in the `confirm` handler, before any `await`, then false when the reset
		 * settles, including on failure. The button can't tell a failed reset from a successful
		 * one and closes the dialog either way, so the caller shows any error (a toast).
		 */
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

function release() {
	submitted.value = false;
	confirmationOpen.value = false;
}

watch(
	() => props.busy,
	(busy, wasBusy) => {
		if (wasBusy && !busy) release();
	},
);

/**
 * Locks before emitting, so a second click can't start another reset before the caller's
 * `busy` arrives. A caller that returns early, or resets in the same tick, never changes
 * `busy` as this component sees it, so the button releases itself after one tick.
 */
async function submit() {
	submitted.value = true;
	emit('confirm');
	await nextTick();
	if (!props.busy) release();
}

function onClick() {
	if (props.disabled || isBusy.value) return;
	if (!props.requireConfirmation) {
		void submit();
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
	void submit();
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
