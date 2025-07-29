<script setup lang="ts">
import { useFileDialog } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import IconPaperclip from 'virtual:icons/mdi/paperclip';
import IconSend from 'virtual:icons/mdi/send';
import { computed, onMounted, onUnmounted, ref, unref } from 'vue';

import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';
import { constructChatWebsocketUrl } from '@n8n/chat/utils';

import ChatFile from './ChatFile.vue';
import type { ChatMessage } from '../types';

export interface ChatInputProps {
	placeholder?: string;
}

const props = withDefaults(defineProps<ChatInputProps>(), {
	placeholder: 'inputPlaceholder',
});

export interface ArrowKeyDownPayload {
	key: 'ArrowUp' | 'ArrowDown';
	currentInputValue: string;
}

const { t } = useI18n();
const emit = defineEmits<{
	arrowKeyDown: [value: ArrowKeyDownPayload];
}>();

const { options } = useOptions();
const chatStore = useChat();
const { waitingForResponse } = chatStore;

const files = ref<FileList | null>(null);
const chatTextArea = ref<HTMLTextAreaElement | null>(null);
const input = ref('');
const isSubmitting = ref(false);
const resizeObserver = ref<ResizeObserver | null>(null);
const waitingForChatResponse = ref(false);

const isSubmitDisabled = computed(() => {
	if (waitingForChatResponse.value) return false;
	return input.value === '' || unref(waitingForResponse) || options.disabled?.value === true;
});

const isInputDisabled = computed(() => options.disabled?.value === true);
const isFileUploadDisabled = computed(
	() => isFileUploadAllowed.value && unref(waitingForResponse) && !options.disabled?.value,
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
		resizeObserver.value = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === chatTextArea.value) {
					adjustTextAreaHeight();
				}
			}
		});

		// Start observing the textarea
		resizeObserver.value.observe(chatTextArea.value);
	}
});

onUnmounted(() => {
	chatEventBus.off('focusInput', focusChatInput);
	chatEventBus.off('blurInput', blurChatInput);
	chatEventBus.off('setInputValue', setInputValue);

	if (resizeObserver.value) {
		resizeObserver.value.disconnect();
		resizeObserver.value = null;
	}
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

function attachFiles() {
	if (files.value) {
		const filesToAttach = Array.from(files.value);
		resetFileDialog();
		files.value = null;
		return filesToAttach;
	}

	return [];
}

function setupWebsocketConnection(executionId: string) {
	// if webhookUrl is not defined onSubmit is called from integrated chat
	// do not setup websocket as it would be handled by the integrated chat
	if (options.webhookUrl && chatStore.currentSessionId.value) {
		try {
			const wsUrl = constructChatWebsocketUrl(
				options.webhookUrl,
				executionId,
				chatStore.currentSessionId.value,
				true,
			);
			chatStore.ws = new WebSocket(wsUrl);
			chatStore.ws.onmessage = (e) => {
				if (e.data === 'n8n|heartbeat') {
					chatStore.ws?.send('n8n|heartbeat-ack');
					return;
				}

				if (e.data === 'n8n|continue') {
					waitingForChatResponse.value = false;
					chatStore.waitingForResponse.value = true;
					return;
				}
				const newMessage: ChatMessage = {
					id: uuidv4(),
					text: e.data,
					sender: 'bot',
				};

				chatStore.messages.value.push(newMessage);
				waitingForChatResponse.value = true;
				chatStore.waitingForResponse.value = false;
			};

			chatStore.ws.onclose = () => {
				chatStore.ws = null;
				waitingForChatResponse.value = false;
				chatStore.waitingForResponse.value = false;
			};
		} catch (error) {
			// do not throw error here as it should work with n8n versions that do not support websockets
			console.error('Error setting up websocket connection', error);
		}
	}
}

async function processFiles(data: File[] | undefined) {
	if (!data || data.length === 0) return [];

	const filePromises = data.map(async (file) => {
		// We do not need to await here as it will be awaited on the return by Promise.all
		// eslint-disable-next-line @typescript-eslint/return-await
		return new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () =>
				resolve({
					name: file.name,
					type: file.type,
					data: reader.result as string,
				});

			reader.onerror = () =>
				reject(new Error(`Error reading file: ${reader.error?.message ?? 'Unknown error'}`));

			reader.readAsDataURL(file);
		});
	});

	return await Promise.all(filePromises);
}

async function respondToChatNode(ws: WebSocket, messageText: string) {
	const sentMessage: ChatMessage = {
		id: uuidv4(),
		text: messageText,
		sender: 'user',
		files: files.value ? attachFiles() : undefined,
	};

	chatStore.messages.value.push(sentMessage);
	ws.send(
		JSON.stringify({
			sessionId: chatStore.currentSessionId.value,
			action: 'sendMessage',
			chatInput: messageText,
			files: await processFiles(sentMessage.files),
		}),
	);
	chatStore.waitingForResponse.value = true;
	waitingForChatResponse.value = false;
}

async function onSubmit(event: MouseEvent | KeyboardEvent) {
	event.preventDefault();

	if (isSubmitDisabled.value) {
		return;
	}

	const messageText = input.value;
	input.value = '';
	isSubmitting.value = true;

	if (chatStore.ws && waitingForChatResponse.value) {
		await respondToChatNode(chatStore.ws, messageText);
		return;
	}

	const response = await chatStore.sendMessage(messageText, attachFiles());

	if (response?.executionId) {
		setupWebsocketConnection(response.executionId);
	}

	isSubmitting.value = false;
}

async function onSubmitKeydown(event: KeyboardEvent) {
	if (event.shiftKey || event.isComposing) {
		return;
	}

	await onSubmit(event);
	adjustTextAreaHeight();
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

function adjustTextAreaHeight() {
	const textarea = chatTextArea.value;
	if (!textarea) return;
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
			<div v-if="$slots.leftPanel" class="chat-input-left-panel">
				<slot name="leftPanel" />
			</div>
			<textarea
				ref="chatTextArea"
				v-model="input"
				data-test-id="chat-input"
				:disabled="isInputDisabled"
				:placeholder="t(props.placeholder)"
				@keydown.enter="onSubmitKeydown"
				@input="adjustTextAreaHeight"
				@mousedown="adjustTextAreaHeight"
				@focus="adjustTextAreaHeight"
			/>

			<div class="chat-inputs-controls">
				<button
					v-if="isFileUploadAllowed"
					:disabled="isFileUploadDisabled"
					class="chat-input-file-button"
					data-test-id="chat-attach-file-button"
					@click="onOpenFileDialog"
				>
					<IconPaperclip height="24" width="24" />
				</button>
				<button :disabled="isSubmitDisabled" class="chat-input-send-button" @click="onSubmit">
					<IconSend height="24" width="24" />
				</button>
			</div>
		</div>
		<div v-if="files?.length && (!isSubmitting || waitingForChatResponse)" class="chat-files">
			<ChatFile
				v-for="file in files"
				:key="file.name"
				:file="file"
				:is-removable="true"
				:is-previewable="true"
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
	align-items: flex-end;

	textarea {
		font-family: inherit;
		font-size: var(--chat--input--font-size);
		width: 100%;
		border: var(--chat--input--border, 0);
		border-radius: var(--chat--input--border-radius);
		padding: var(--chat--input--padding);
		min-height: var(--chat--textarea--height, 2.5rem); // Set a smaller initial height
		max-height: var(--chat--textarea--max-height);
		height: var(--chat--textarea--height, 2.5rem); // Set initial height same as min-height
		resize: none;
		overflow-y: auto;
		background: var(--chat--input--background, white);
		color: var(--chat--input--text-color, initial);
		outline: none;
		line-height: var(--chat--input--line-height, 1.5);

		&::placeholder {
			font-size: var(--chat--input--placeholder--font-size, var(--chat--input--font-size));
		}
		&:focus,
		&:hover {
			border-color: var(--chat--input--border-active, 0);
		}
	}
}
.chat-inputs-controls {
	display: flex;
}
.chat-input-send-button,
.chat-input-file-button {
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

	&[disabled] {
		cursor: no-drop;
		color: var(--chat--color-disabled);
	}

	.chat-input-send-button {
		&:hover,
		&:focus {
			background: var(
				--chat--input--send--button--background-hover,
				var(--chat--input--send--button--background)
			);
			color: var(--chat--input--send--button--color-hover);
		}
	}
}
.chat-input-file-button {
	background: var(--chat--input--file--button--background, white);
	color: var(--chat--input--file--button--color);

	&:hover {
		background: var(--chat--input--file--button--background-hover);
		color: var(--chat--input--file--button--color-hover);
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
	padding: var(--chat--files-spacing);
}

.chat-input-left-panel {
	width: var(--chat--input--left--panel--width);
	margin-left: 0.4rem;
}
</style>
