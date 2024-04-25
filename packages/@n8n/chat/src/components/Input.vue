<script setup lang="ts">
// eslint-disable-next-line import/no-unresolved
import IconSend from 'virtual:icons/mdi/send';
// eslint-disable-next-line import/no-unresolved
// import IconUpload from 'virtual:icons/mdi/fileUpload';
import { computed, ref } from 'vue';
// import { useFileDialog } from '@vueuse/core';
import { useI18n, useChat } from '@n8n/chat/composables';
// import FileIcon from '@n8n/chat/components/FileIcon.vue';

const chatStore = useChat();
const { waitingForResponse } = chatStore;
const { t } = useI18n();

const input = ref('');
// const { files, open, reset, onChange } = useFileDialog({
// 	accept: 'image/*', // Set to accept only image files
// 	// multiple: true,
// });
const isSubmitDisabled = computed(() => {
	return input.value === '' || waitingForResponse.value;
});

async function onSubmit(event: MouseEvent | KeyboardEvent) {
	event.preventDefault();

	if (isSubmitDisabled.value) {
		return;
	}

	const messageText = input.value;
	input.value = '';
	await chatStore.sendMessage(messageText);
}

// async function onUpload() {
// 	console.log('On upload');
// 	open();
// }
async function onSubmitKeydown(event: KeyboardEvent) {
	if (event.shiftKey) {
		return;
	}

	await onSubmit(event);
}
</script>

<template>
	<div class="chat-input">
		<!-- TODO: File Upload -->
		<!-- <div class="chat-input-files">
			<div v-for="file in files" :key="file.name" class="chat-input-file">
				<FileIcon :fileMime="file.type" :fileSize="file.size" />
			</div>
		</div> -->
		<div class="chat-input-content">
			<textarea
				v-model="input"
				rows="1"
				:placeholder="t('inputPlaceholder') ?? ''"
				@keydown.enter="onSubmitKeydown"
			/>
			<button
				:disabled="isSubmitDisabled"
				class="chat-input-button chat-input-button--send"
				@click="onSubmit"
			>
				<IconSend height="32" width="32" />
			</button>
			<!-- TODO: File Upload -->
			<!-- <button :disabled="false" class="chat-input-button" @click="onUpload">
				<IconUpload height="32" width="32" />
			</button> -->
		</div>
	</div>
</template>

<style lang="scss">
.chat-input {
	display: flex;
	flex-direction: column;

	.chat-input-content {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
	}
	textarea {
		font-family: inherit;
		font-size: inherit;
		width: 100%;
		border: 0;
		padding: var(--chat--spacing);
		max-height: var(--chat--textarea--height);
		resize: none;
	}

	.chat-input-button {
		height: var(--chat--textarea--height);
		width: var(--chat--textarea--height);
		background: white;
		cursor: pointer;
		color: var(--chat--color-secondary);
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

		&--send {
			color: var(--chat--color-secondary);

			&[disabled] {
				cursor: default;
				color: var(--chat--color-disabled);
			}
		}
	}
}
</style>
