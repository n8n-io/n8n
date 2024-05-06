<script setup lang="ts">
// eslint-disable-next-line import/no-unresolved
import IconSend from 'virtual:icons/mdi/send';
import { computed, onMounted, ref } from 'vue';
import { useI18n, useChat, useOptions } from '@n8n/chat/composables';
import { chatEventBus } from '@n8n/chat/event-buses';

const { options } = useOptions();
const chatStore = useChat();
const { waitingForResponse } = chatStore;
const { t } = useI18n();

const chatTextArea = ref<HTMLTextAreaElement | null>(null);
const input = ref('');

const isSubmitDisabled = computed(() => {
	return input.value === '' || waitingForResponse.value || options.disabled?.value === true;
});

const isInputDisabled = computed(() => options.disabled?.value === true);

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
			ref="chatTextArea"
			v-model="input"
			rows="1"
			:disabled="isInputDisabled"
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
	background: white;

	textarea {
		font-family: inherit;
		font-size: var(--chat--input--font-size, inherit);
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
}
</style>
