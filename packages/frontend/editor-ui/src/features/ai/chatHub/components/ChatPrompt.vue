<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { N8nIconButton, N8nInput } from '@n8n/design-system';
import { useSpeechRecognition } from '@vueuse/core';
import { ref, useTemplateRef, watch } from 'vue';

const { disabled } = defineProps<{
	placeholder: string;
	disabled: boolean;
}>();

const emit = defineEmits<{
	submit: [string];
}>();

const inputRef = useTemplateRef('inputRef');
const message = ref('');

const toast = useToast();

const speechInput = useSpeechRecognition({
	continuous: true,
	interimResults: true,
	lang: navigator.language,
});

function onAttach() {}

function onMic() {
	speechInput.isListening.value ? speechInput.stop() : speechInput.start();
}

function handleSubmitForm() {
	const trimmed = message.value.trim();

	if (trimmed) {
		speechInput.stop();
		emit('submit', trimmed);
	}
}

function handleKeydownTextarea(e: KeyboardEvent) {
	const trimmed = message.value.trim();

	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && trimmed) {
		e.preventDefault();
		speechInput.stop();
		emit('submit', trimmed);
	}
}

watch(speechInput.result, (spoken) => {
	if (spoken) {
		message.value = spoken;
	}
});

watch(speechInput.error, (event) => {
	if (event?.error === 'not-allowed') {
		toast.showError(
			new Error('Microphone access denied'),
			'Please allow microphone access to use voice input',
		);
		return;
	}

	if (event?.error === 'no-speech') {
		toast.showMessage({
			title: 'No speech detected. Please try again',
			type: 'warning',
		});
	}
});

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
				:autosize="{ minRows: 1, maxRows: 6 }"
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
					v-if="speechInput.isSupported"
					native-type="button"
					:title="speechInput.isListening.value ? 'Stop recording' : 'Voice input'"
					type="secondary"
					:disabled="disabled"
					:icon="speechInput.isListening.value ? 'square' : 'mic'"
					:class="{ [$style.recording]: speechInput.isListening.value }"
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
		padding: 16px 16px 48px;
		box-shadow: 0 10px 24px 0 #00000010;
		background-color: var(--color--background--light-3);
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

.recording {
	animation: chatHubPromptRecordingPulse 1.5s ease-in-out infinite;
}

@keyframes chatHubPromptRecordingPulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.6;
	}
}
</style>
