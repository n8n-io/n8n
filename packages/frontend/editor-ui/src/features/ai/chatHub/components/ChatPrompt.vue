<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubLLMProvider, ChatModelDto } from '@n8n/api-types';
import { N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useSpeechRecognition } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';

const { selectedModel, isMissingCredentials } = defineProps<{
	isResponding: boolean;
	isNewSession: boolean;
	selectedModel: ChatModelDto | null;
	isMissingCredentials: boolean;
}>();

const emit = defineEmits<{
	submit: [string];
	stop: [];
	selectModel: [];
	setCredentials: [ChatHubLLMProvider];
}>();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const message = ref('');

const toast = useToast();

const speechInput = useSpeechRecognition({
	continuous: true,
	interimResults: true,
	lang: navigator.language,
});

const placeholder = computed(() =>
	selectedModel ? `Message ${selectedModel.name ?? 'a model'}...` : 'Select a model',
);

const llmProvider = computed<ChatHubLLMProvider | undefined>(() =>
	selectedModel?.model.provider === 'n8n' || selectedModel?.model.provider === 'custom-agent'
		? undefined
		: selectedModel?.model.provider,
);

function onMic() {
	if (speechInput.isListening.value) {
		speechInput.stop();
	} else {
		speechInput.start();
	}
}

function onStop() {
	emit('stop');
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
			<N8nText v-if="!selectedModel" :class="$style.callout">
				<template v-if="isNewSession">
					Please <a href="" @click.prevent="emit('selectModel')">select a model</a> to start a
					conversation
				</template>
				<template v-else>
					Please <a href="" @click.prevent="emit('selectModel')">reselect a model</a> to continue
					the conversation
				</template>
			</N8nText>
			<N8nText v-else-if="isMissingCredentials && llmProvider" :class="$style.callout">
				<template v-if="isNewSession">
					Please
					<a href="" @click.prevent="emit('setCredentials', llmProvider)"> set credentials </a>
					for {{ providerDisplayNames[llmProvider] }} to start a conversation
				</template>
				<template v-else>
					Please
					<a href="" @click.prevent="emit('setCredentials', llmProvider)"> set credentials </a>
					for {{ providerDisplayNames[llmProvider] }} to continue the conversation
				</template>
			</N8nText>
			<N8nInput
				ref="inputRef"
				v-model="message"
				:class="$style.input"
				type="textarea"
				:placeholder="placeholder"
				autocomplete="off"
				:autosize="{ minRows: 1, maxRows: 6 }"
				autofocus
				:disabled="isMissingCredentials || !selectedModel"
				@keydown="handleKeydownTextarea"
			/>

			<div :class="$style.actions">
				<!-- TODO: Implement attachments
				<N8nIconButton
					native-type="button"
					type="secondary"
					title="Attach"
					:disabled="isMissingCredentials || !selectedModel || isResponding"
					icon="paperclip"
					icon-size="large"
					text
					@click="onAttach"
				/> -->
				<N8nIconButton
					v-if="speechInput.isSupported"
					native-type="button"
					:title="speechInput.isListening.value ? 'Stop recording' : 'Voice input'"
					type="secondary"
					:disabled="isMissingCredentials || !selectedModel || isResponding"
					:icon="speechInput.isListening.value ? 'square' : 'mic'"
					:class="{ [$style.recording]: speechInput.isListening.value }"
					icon-size="large"
					@click="onMic"
				/>
				<N8nIconButton
					v-if="!isResponding"
					native-type="submit"
					:disabled="isMissingCredentials || !selectedModel || !message.trim()"
					title="Send"
					icon="arrow-up"
					icon-size="large"
				/>
				<N8nIconButton
					v-else
					native-type="button"
					title="Stop generating"
					icon="square"
					icon-size="large"
					@click="onStop"
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
	flex-direction: column;
	width: 100%;
}

.callout {
	color: var(--color--secondary);
	background-color: hsla(247, 49%, 53%, 0.1);
	padding: 12px 16px 24px;
	border-top-left-radius: 16px;
	border-top-right-radius: 16px;
	width: 100%;
	border: var(--border);
	border-color: var(--color--secondary);
	text-align: center;
	margin-bottom: -16px;

	& a {
		text-decoration: underline;
		color: inherit;
	}
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
