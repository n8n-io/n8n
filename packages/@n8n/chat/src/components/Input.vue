<script setup lang="ts">
import { useFileDialog } from '@vueuse/core';
import IconFilePlus from 'virtual:icons/mdi/filePlus';
import IconSend from 'virtual:icons/mdi/send';
import { computed, onMounted, onUnmounted, ref, unref } from 'vue';

import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

import ChatFile from './ChatFile.vue';

export interface ArrowKeyDownPayload {
	key: 'ArrowUp' | 'ArrowDown';
	currentInputValue: string;
}
const emit = defineEmits<{
	arrowKeyDown: [value: ArrowKeyDownPayload];
}>();

const { options } = useOptions();
const chatStore = useChat();
const { waitingForResponse } = chatStore;
const { t } = useI18n();

const files = ref<FileList | null>(null);
const chatTextArea = ref<HTMLTextAreaElement | null>(null);
const input = ref('');
const isSubmitting = ref(false);

const isSubmitDisabled = computed(() => {
	return input.value === '' || waitingForResponse.value || options.disabled?.value === true;
});

const isInputDisabled = computed(() => options.disabled?.value === true);
const isFileUploadDisabled = computed(
	() => isFileUploadAllowed.value && waitingForResponse.value && !options.disabled?.value,
);
const isFileUploadAllowed = computed(() => unref(options.allowFileUploads) === true);
const allowedFileTypes = computed(() => unref(options.allowedFilesMimeTypes));

const styleVars = computed(() => {
	const controlsCount = isFileUploadAllowed.value ? 2 : 1;
	return {
		'--controls-count': controlsCount,
	};
});

const {
	open: openFileDialog,
	reset: resetFileDialog,
	onChange,
} = useFileDialog({
	multiple: true,
	reset: false,
});

onChange((newFiles) => {
	if (!newFiles) return;
	const newFilesDT = new DataTransfer();
	// Add current files
	if (files.value) {
		for (let i = 0; i < files.value.length; i++) {
			newFilesDT.items.add(files.value[i]);
		}
	}

	for (let i = 0; i < newFiles.length; i++) {
		newFilesDT.items.add(newFiles[i]);
	}
	files.value = newFilesDT.files;
});

onMounted(() => {
	chatEventBus.on('focusInput', focusChatInput);
	chatEventBus.on('blurInput', blurChatInput);
	chatEventBus.on('setInputValue', setInputValue);

	if (chatTextArea.value) {
		adjustHeight({ target: chatTextArea.value } as unknown as Event);
	}
});

onUnmounted(() => {
	chatEventBus.off('focusInput', focusChatInput);
	chatEventBus.off('blurInput', blurChatInput);
	chatEventBus.off('setInputValue', setInputValue);
});

function blurChatInput() {
	if (chatTextArea.value) {
		chatTextArea.value.blur();
	}
}

function focusChatInput() {
	if (chatTextArea.value) {
		chatTextArea.value.focus();
	}
}

function setInputValue(value: string) {
	input.value = value;
	focusChatInput();
}

async function onSubmit(event: MouseEvent | KeyboardEvent) {
	event.preventDefault();

	if (isSubmitDisabled.value) {
		return;
	}

	const messageText = input.value;
	input.value = '';
	isSubmitting.value = true;
	await chatStore.sendMessage(messageText, Array.from(files.value ?? []));
	isSubmitting.value = false;
	resetFileDialog();
	files.value = null;
}

async function onSubmitKeydown(event: KeyboardEvent) {
	if (event.shiftKey) {
		return;
	}

	await onSubmit(event);
	adjustHeight({ target: chatTextArea.value } as unknown as Event);
}

function onFileRemove(file: File) {
	if (!files.value) return;

	const dt = new DataTransfer();
	for (let i = 0; i < files.value.length; i++) {
		const currentFile = files.value[i];
		if (file.name !== currentFile.name) dt.items.add(currentFile);
	}

	resetFileDialog();
	files.value = dt.files;
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
		event.preventDefault();

		emit('arrowKeyDown', {
			key: event.key,
			currentInputValue: input.value,
		});
	}
}

function onOpenFileDialog() {
	if (isFileUploadDisabled.value) return;
	openFileDialog({ accept: unref(allowedFileTypes) });
}

function adjustHeight(event: Event) {
	const textarea = event.target as HTMLTextAreaElement;
	// Set to content minimum to get the right scrollHeight
	textarea.style.height = 'var(--chat--textarea--height)';
	// Get the new height, with a small buffer for padding
	const newHeight = Math.min(textarea.scrollHeight, 480); // 30rem
	textarea.style.height = `${newHeight}px`;
}
</script>

<template>
	<div class="chat-input" :style="styleVars" @keydown.stop="onKeyDown">
		<div class="chat-inputs">
			<textarea
				ref="chatTextArea"
				v-model="input"
				:disabled="isInputDisabled"
				:placeholder="t('inputPlaceholder')"
				@keydown.enter="onSubmitKeydown"
				@input="adjustHeight"
				@mousedown="adjustHeight"
				@focus="adjustHeight"
			/>

			<div class="chat-inputs-controls">
				<button
					v-if="isFileUploadAllowed"
					:disabled="isFileUploadDisabled"
					class="chat-input-send-button"
					@click="onOpenFileDialog"
				>
					<IconFilePlus height="24" width="24" />
				</button>
				<button :disabled="isSubmitDisabled" class="chat-input-send-button" @click="onSubmit">
					<IconSend height="24" width="24" />
				</button>
			</div>
		</div>
		<div v-if="files?.length && !isSubmitting" class="chat-files">
			<ChatFile
				v-for="file in files"
				:key="file.name"
				:file="file"
				:is-removable="true"
				@remove="onFileRemove"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.chat-input {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	flex-direction: column;
	position: relative;

	* {
		box-sizing: border-box;
	}
}
.chat-inputs {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;

	textarea {
		font-family: inherit;
		font-size: var(--chat--input--font-size, inherit);
		width: 100%;
		border: var(--chat--input--border, 0);
		border-radius: var(--chat--input--border-radius, 0);
		padding: 0.8rem;
		padding-right: calc(0.8rem + (var(--controls-count, 1) * var(--chat--textarea--height)));
		min-height: var(--chat--textarea--height, 2.5rem); // Set a smaller initial height
		max-height: var(--chat--textarea--max-height, 30rem);
		height: var(--chat--textarea--height, 2.5rem); // Set initial height same as min-height
		resize: none;
		overflow-y: auto;
		background: var(--chat--input--background, white);
		color: var(--chat--input--text-color, initial);
		outline: none;

		&:focus,
		&:hover {
			border-color: var(--chat--input--border-active, 0);
		}
	}
}
.chat-inputs-controls {
	display: flex;
	position: absolute;
	right: 0.5rem;
	top: 0;
}
.chat-input-send-button {
	height: var(--chat--textarea--height);
	width: var(--chat--textarea--height);
	background: var(--chat--input--send--button--background, white);
	cursor: pointer;
	color: var(--chat--input--send--button--color, var(--chat--color-secondary));
	border: 0;
	font-size: 24px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: color var(--chat--transition-duration) ease;

	svg {
		min-width: fit-content;
	}

	&:hover,
	&:focus {
		background: var(
			--chat--input--send--button--background-hover,
			var(--chat--input--send--button--background)
		);
		color: var(--chat--input--send--button--color-hover, var(--chat--color-secondary-shade-50));
	}

	&[disabled] {
		cursor: no-drop;
		color: var(--chat--color-disabled);
	}
}

.chat-files {
	display: flex;
	overflow-x: hidden;
	overflow-y: auto;
	width: 100%;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 0.5rem;
	padding: var(--chat--files-spacing, 0.25rem);
}
</style>
