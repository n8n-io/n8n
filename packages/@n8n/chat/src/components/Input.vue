<script setup lang="ts">
import IconSend from 'virtual:icons/mdi/send';
import IconFilePlus from 'virtual:icons/mdi/filePlus';
import { computed, onMounted, ref } from 'vue';
import { useFileDialog } from '@vueuse/core';
import ChatFile from './ChatFile.vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

const {
	open: openFileDialog,
	reset,
	onChange,
} = useFileDialog({
	// accept: 'image/*', // Set to accept only image files
	multiple: true,
	reset: false,
});

const { options } = useOptions();
const chatStore = useChat();
const { waitingForResponse } = chatStore;
const { t } = useI18n();

const files = ref<FileList | null>(null);
const chatTextArea = ref<HTMLTextAreaElement | null>(null);
const input = ref('');

const isSubmitDisabled = computed(() => {
	return (
		(input.value === '' && !files.value?.length) ||
		waitingForResponse.value ||
		options.disabled?.value === true
	);
});

const isInputDisabled = computed(() => options.disabled?.value === true);
const isFileUploadDisabled = computed(
	() => isFileUploadAllowed.value && waitingForResponse.value && !options.disabled?.value,
);
const isFileUploadAllowed = computed(() => options.allowFileUploads);
const allowedFileTypes = computed(() => options.allowedFilesMimeTypes);

onChange((newFiles) => {
	if (!newFiles) return;
	files.value = newFiles;
});

onMounted(() => {
	chatEventBus.on('focusInput', () => {
		if (chatTextArea.value) {
			chatTextArea.value.focus();
		}
	});
});

async function onSubmit(event: MouseEvent | KeyboardEvent) {
	event.preventDefault();

	if (isSubmitDisabled.value) {
		return;
	}

	const messageText = input.value;
	input.value = '';
	await chatStore.sendMessage(messageText, Array.from(files.value ?? []));
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
</script>

<template>
	<div class="chat-input">
		<div class="chat-files">
			<ChatFile v-for="file in files" :key="file.name" :file="file" @remove="onFileRemove" />
		</div>
		<div class="chat-inputs">
			<textarea
				ref="chatTextArea"
				v-model="input"
				rows="1"
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
	background: white;
	flex-direction: column;
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
		border: 0;
		padding: var(--chat--spacing);
		max-height: var(--chat--textarea--height);
		resize: none;
	}
}

.chat-input-send-button {
	height: var(--chat--textarea--height);
	width: var(--chat--textarea--height);
	background: white;
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
		color: var(--chat--color-secondary-shade-50);
	}

	&[disabled] {
		cursor: default;
		color: var(--chat--color-disabled);
	}
}

.chat-files {
	display: flex;
	max-width: calc(100% - (2 * (var(--chat--spacing))));
	overflow-x: hidden;
	overflow-y: auto;
	width: 100%;
	padding: 0 var(--chat--spacing);
	flex-direction: column;
	max-height: 100px;
}
</style>
