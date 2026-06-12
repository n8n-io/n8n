<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { ref } from 'vue';

defineProps<{
	disabled?: boolean;
	/** Swaps the send button for a stop control (input stays visible, dimmed by `disabled`). */
	busy?: boolean;
	placeholder: string;
	inputAriaLabel: string;
	sendAriaLabel: string;
	stopAriaLabel: string;
}>();

const text = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: []; stop: [] }>();

const inputRef = ref<HTMLInputElement | null>(null);

/** Enter that confirms an IME composition (CJK input) must not submit the message. */
function onEnter(event: KeyboardEvent) {
	if (event.isComposing) return;
	emit('submit');
}

defineExpose({ focus: () => inputRef.value?.focus() });
</script>

<template>
	<div :class="$style.field">
		<input
			ref="inputRef"
			v-model="text"
			:class="$style.input"
			:disabled="disabled"
			:aria-label="inputAriaLabel"
			:placeholder="placeholder"
			@keydown.enter="onEnter"
		/>
		<!-- While a run is in flight the button becomes a stop control and stays
		     enabled even though the input is disabled. -->
		<button
			v-if="busy"
			type="button"
			:class="$style.send"
			:aria-label="stopAriaLabel"
			@click="emit('stop')"
		>
			<N8nIcon icon="filled-square" :size="11" aria-hidden="true" />
		</button>
		<button
			v-else
			type="button"
			:class="$style.send"
			:disabled="disabled"
			:aria-label="sendAriaLabel"
			@click="emit('submit')"
		>
			<N8nIcon icon="arrow-up" :size="14" aria-hidden="true" />
		</button>
	</div>
</template>

<style module>
.field {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 9px 10px 9px var(--spacing--xs);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border-strong);
	border-radius: var(--da-radius);
	transition:
		border-color 0.12s,
		box-shadow 0.12s;
}

.field:focus-within {
	border-color: var(--da-accent);
	box-shadow: 0 0 0 3px rgba(255, 109, 90, 0.12);
}

.input {
	flex: 1;
	min-width: 0;
	font: inherit;
	font-size: 13px;
	color: var(--da-text);
	background: transparent;
	border: none;
	outline: none;
}

.input::placeholder {
	color: var(--da-subtlest);
}

/* The in-flight prompt stays visible but reads as inactive. */
.input:disabled {
	color: var(--da-subtler);
}

.send {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	color: #fff;
	cursor: pointer;
	background: var(--da-accent);
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		transform 80ms;
}

.send:hover {
	background: var(--da-accent-press);
}

.send:active {
	transform: scale(0.94);
}

.send:focus-visible {
	outline: none;
	/* Box-shadow ring (white on the coral button) reads better than an outline. */
	box-shadow:
		0 0 0 2px var(--da-surface-2),
		0 0 0 4px #fff;
}

.send:disabled {
	cursor: default;
}
</style>
