<script setup lang="ts">
import { N8nIconButton, N8nInput } from '@n8n/design-system';
import { ref, useTemplateRef } from 'vue';

const { disabled } = defineProps<{
	placeholder: string;
	disabled: boolean;
}>();

const emit = defineEmits<{
	submit: [string];
}>();

const inputRef = useTemplateRef('inputRef');
const message = ref('');

function onAttach() {}

function onMic() {}

function handleSubmitForm() {
	const trimmed = message.value.trim();

	if (trimmed) {
		emit('submit', trimmed);
	}
}

function handleKeydownTextarea(e: KeyboardEvent) {
	const trimmed = message.value.trim();

	if (e.key === 'Enter' && !e.shiftKey && trimmed) {
		e.preventDefault();
		emit('submit', trimmed);
	}
}

defineExpose({
	focus: () => inputRef.value?.focus(),
	setText: (text: string) => {
		message.value = text;
	},
});
</script>

<template>
	<form :class="$style.prompt" @submit.prevent="handleSubmitForm">
		<div :class="$style.inputWrap">
			<N8nInput
				ref="inputRef"
				v-model="message"
				:class="$style.input"
				type="textarea"
				:placeholder="placeholder"
				autocomplete="off"
				:autosize="{ minRows: 3, maxRows: 6 }"
				autofocus
				@keydown="handleKeydownTextarea"
			/>

			<div :class="$style.actions">
				<N8nIconButton
					native-type="button"
					type="secondary"
					title="Attach"
					:disabled="disabled"
					icon="paperclip"
					icon-size="large"
					text
					@click="onAttach"
				/>
				<N8nIconButton
					native-type="button"
					title="Voice"
					type="secondary"
					:disabled="disabled"
					icon="mic"
					icon-size="large"
					@click="onMic"
				/>
				<N8nIconButton
					native-type="submit"
					:disabled="disabled || !message.trim()"
					title="Send"
					icon="arrow-up"
					icon-size="large"
				/>
			</div>
		</div>
	</form>
</template>

<style lang="scss" module>
.prompt {
	display: grid;
	place-items: center;
}

.inputWrap {
	position: relative;
	display: flex;
	align-items: center;
	width: 100%;
}

.input {
	& textarea {
		font: inherit;
		line-height: 1.5em;
		border-radius: 16px !important;
		resize: none;
		padding: 16px;
		box-shadow: 0 10px 24px 0 #0000002e;
	}
}

/* Right-side actions */
.actions {
	position: absolute;
	right: 0;
	bottom: 0;
	padding: var(--spacing--sm);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	& button path {
		stroke-width: 2.5;
	}
}
</style>
