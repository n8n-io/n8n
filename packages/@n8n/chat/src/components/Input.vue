<script setup lang="ts">
import IconSend from 'virtual:icons/mdi/send';
import IconFilePlus from 'virtual:icons/mdi/filePlus';
import { computed, onMounted, onUnmounted, ref, unref } from 'vue';
import { useFileDialog } from '@vueuse/core';
import ChatFile from './ChatFile.vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

export interface ArrowKeyDownPayload {
	key: 'ArrowUp' | 'ArrowDown';
	currentInputValue: string;
}
const emit = defineEmits<{
	(event: 'arrowKeyDown', value: ArrowKeyDownPayload): void;
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

const {
	open: openFileDialog,
	reset,
	onChange,
} = useFileDialog({
	accept: unref(allowedFileTypes),
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
	reset();
	files.value = null;
}

async function onSubmitKeydown(event: KeyboardEvent) {
	if (event.shiftKey) {
		return;
	}

	await onSubmit(event);
}

function onFileRemove(file: File) {
	const dt = new DataTransfer();
	if (!files.value) return;

	for (let i = 0; i < files.value.length; i++) {
		const currentFile = files.value[i];
		if (file.name !== currentFile.name) dt.items.add(currentFile);
	}

	reset();
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
</script>

<template>
	<div class="chat-input" @keydown.stop="onKeyDown">
		<div v-if="files?.length && !isSubmitting" class="chat-files">
			<ChatFile v-for="file in files" :key="file.name" :file="file" @remove="onFileRemove" />
		</div>
		<div class="chat-inputs">
			<textarea
				ref="chatTextArea"
				v-model="input"
				:disabled="isInputDisabled"
				:placeholder="t('inputPlaceholder')"
				@keydown.enter="onSubmitKeydown"
			/>
			<button
				v-if="isFileUploadAllowed"
				:disabled="isFileUploadDisabled"
				class="chat-input-send-button"
				@click="() => openFileDialog()"
			>
				<IconFilePlus height="32" width="32" />
			</button>
			<button :disabled="isSubmitDisabled" class="chat-input-send-button" @click="onSubmit">
				<IconSend height="32" width="32" />
			</button>
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
	gap: 0.5rem;

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
		padding: 0.9rem;
		min-height: var(--chat--textarea--height);
		max-height: var(--chat--textarea--max-height, var(--chat--textarea--height));
		height: 100%;
		background: var(--chat--input--background, white);
		resize: var(--chat--textarea--resize, none);
		color: var(--chat--input--text-color, initial);
		outline: none;

		&:focus,
		&:hover {
			border-color: var(--chat--input--border-active, 0);
		}
	}
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
	max-width: calc(100% - (2 * (var(--chat--spacing))));
	overflow-x: hidden;
	overflow-y: auto;
	width: 100%;
	flex-direction: column;
	max-height: 100px;
	// margin-bottom: 0.5rem;
}
</style>
