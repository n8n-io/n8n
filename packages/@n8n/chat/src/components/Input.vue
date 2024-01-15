<script setup lang="ts">
// eslint-disable-next-line import/no-unresolved
import IconSend from 'virtual:icons/mdi/send';
import { computed, ref } from 'vue';
import { useI18n, useChat } from '@n8n/chat/composables';

const chatStore = useChat();
const { waitingForResponse } = chatStore;
const { t } = useI18n();

const input = ref('');

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

async function onSubmitKeydown(event: KeyboardEvent) {
	if (event.shiftKey) {
		return;
	}

	await onSubmit(event);
}
</script>

<template>
	<div class="chat-input">
		<textarea
			v-model="input"
			rows="1"
			:placeholder="t('inputPlaceholder')"
			@keydown.enter="onSubmitKeydown"
		/>
		<button :disabled="isSubmitDisabled" class="chat-input-send-button" @click="onSubmit">
			<IconSend height="32" width="32" />
		</button>
	</div>
</template>

<style lang="scss">
.chat-input {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;

	textarea {
		font-family: inherit;
		font-size: inherit;
		width: 100%;
		border: 0;
		padding: var(--chat--spacing);
		max-height: var(--chat--textarea--height);
		resize: none;
	}

	.chat-input-send-button {
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
	}
}
</style>
