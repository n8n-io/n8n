<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubLLMProvider, ChatModelDto } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import { useSpeechRecognition } from '@vueuse/core';
import type { INode } from 'n8n-workflow';
import { computed, ref, useTemplateRef, watch } from 'vue';
import ToolsSelector from './ToolsSelector.vue';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';

const { selectedModel, selectedTools, isMissingCredentials } = defineProps<{
	isResponding: boolean;
	isNewSession: boolean;
	isToolsSelectable: boolean;
	isMissingCredentials: boolean;
	selectedModel: ChatModelDto | null;
	selectedTools: INode[] | null;
}>();

const emit = defineEmits<{
	submit: [message: string, attachments: File[]];
	stop: [];
	selectModel: [];
	selectTools: [INode[]];
	setCredentials: [ChatHubLLMProvider];
}>();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const message = ref('');
const committedSpokenMessage = ref('');
const attachments = ref<File[]>([]);

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
	isLlmProviderModel(selectedModel?.model) ? selectedModel?.model.provider : undefined,
);

function onMic() {
	committedSpokenMessage.value = message.value;

	if (speechInput.isListening.value) {
		speechInput.stop();
	} else {
		speechInput.start();
	}
}

function onStop() {
	emit('stop');
}

function onAttach() {
	fileInputRef.value?.click();
}

function handleFileSelect(e: Event) {
	const target = e.target as HTMLInputElement;
	const files = target.files;

	if (!files || files.length === 0) {
		return;
	}

	// Store File objects directly instead of converting to base64
	for (const file of Array.from(files)) {
		attachments.value.push(file);
	}

	// Reset input
	if (target) {
		target.value = '';
	}

	inputRef.value?.focus();
}

function removeAttachment(removed: File) {
	attachments.value = attachments.value.filter((attachment) => attachment !== removed);
}

function handleSubmitForm() {
	const trimmed = message.value.trim();

	if (trimmed) {
		speechInput.stop();
		emit('submit', trimmed, attachments.value);
		message.value = '';
		committedSpokenMessage.value = '';
		attachments.value = [];
	}
}

function handleKeydownTextarea(e: KeyboardEvent) {
	const trimmed = message.value.trim();

	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && trimmed) {
		e.preventDefault();
		speechInput.stop();
		emit('submit', trimmed, attachments.value);
		message.value = '';
		committedSpokenMessage.value = '';
		attachments.value = [];
	}
}

function handleClickInputWrapper() {
	inputRef.value?.focus();
}

watch(speechInput.result, (spoken) => {
	message.value = committedSpokenMessage.value + ' ' + spoken.trimStart();
});

watch(
	speechInput.isFinal,
	(final) => {
		if (final) {
			committedSpokenMessage.value = message.value;
		}
	},
	{ flush: 'post' },
);

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

function onSelectTools(tools: INode[]) {
	emit('selectTools', tools);
}

defineExpose({
	focus: () => inputRef.value?.focus(),
	setText: (text: string) => {
		message.value = text;
	},
	addAttachments: (files: File[]) => {
		attachments.value.push(...files);
		inputRef.value?.focus();
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
					<a href="" @click.prevent="emit('setCredentials', llmProvider)">set credentials</a>
					for {{ providerDisplayNames[llmProvider] }} to start a conversation
				</template>
				<template v-else>
					Please
					<a href="" @click.prevent="emit('setCredentials', llmProvider)">set credentials</a>
					for {{ providerDisplayNames[llmProvider] }} to continue the conversation
				</template>
			</N8nText>
			<input
				ref="fileInputRef"
				type="file"
				:class="$style.fileInput"
				multiple
				@change="handleFileSelect"
			/>

			<div :class="$style.inputWrapper" @click="handleClickInputWrapper">
				<div v-if="attachments.length > 0" :class="$style.attachments">
					<ChatFile
						v-for="(file, index) in attachments"
						:key="index"
						:file="file"
						:is-previewable="true"
						:is-removable="true"
						@remove="removeAttachment"
					/>
				</div>

				<N8nInput
					ref="inputRef"
					v-model="message"
					type="textarea"
					:placeholder="placeholder"
					autocomplete="off"
					:autosize="{ minRows: 1, maxRows: 6 }"
					autofocus
					:disabled="isMissingCredentials || !selectedModel"
					@keydown="handleKeydownTextarea"
				/>

				<div :class="$style.footer">
					<div v-if="isToolsSelectable" :class="$style.tools">
						<ToolsSelector
							:class="$style.toolsButton"
							:selected="selectedTools ?? []"
							:disabled="isMissingCredentials || !selectedModel || isResponding"
							transparent-bg
							@select="onSelectTools"
						/>
					</div>
					<div :class="$style.actions">
						<N8nIconButton
							v-if="selectedModel?.allowFileUploads"
							native-type="button"
							type="secondary"
							title="Attach"
							:disabled="isMissingCredentials || isResponding"
							icon="paperclip"
							icon-size="large"
							text
							@click.stop="onAttach"
						/>
						<N8nIconButton
							v-if="speechInput.isSupported"
							native-type="button"
							:title="speechInput.isListening.value ? 'Stop recording' : 'Voice input'"
							type="secondary"
							:disabled="isMissingCredentials || !selectedModel || isResponding"
							:icon="speechInput.isListening.value ? 'square' : 'mic'"
							:class="{ [$style.recording]: speechInput.isListening.value }"
							icon-size="large"
							@click.stop="onMic"
						/>
						<N8nIconButton
							v-if="!isResponding"
							native-type="submit"
							:disabled="isMissingCredentials || !selectedModel || !message.trim()"
							title="Send"
							icon="arrow-up"
							icon-size="large"
							@click.stop
						/>
						<N8nIconButton
							v-else
							native-type="button"
							title="Stop generating"
							icon="square"
							icon-size="large"
							@click.stop="onStop"
						/>
					</div>
				</div>
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

.fileInput {
	display: none;
}

.inputWrapper {
	width: 100%;
	border-radius: 16px !important;
	padding: 16px;
	box-shadow: 0 10px 24px 0 #00000010;
	background-color: var(--color--background--light-3);
	border: var(--border);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);

	&:focus-within,
	&:hover {
		border-color: var(--color--secondary);
	}

	& textarea {
		font: inherit;
		line-height: 1.5em;
		resize: none;
		background-color: transparent !important;
		border: none !important;
		padding: 0 !important;
	}
}

.footer {
	display: flex;
	align-items: flex-end;
	justify-content: flex-end;
	gap: var(--spacing--sm);
}

.tools {
	flex-grow: 1;
}

.toolsButton {
	/* maintain the same height with other buttons regardless of selected tools */
	height: 30px;
}

.iconStack {
	display: flex;
	align-items: center;
	position: relative;
}

.icon {
	padding: var(--spacing--4xs);
	background-color: var(--button--color--background--secondary);
	border-radius: 50%;
	outline: 2px var(--color--background--light-3) solid;
}

.iconOverlap {
	margin-left: -6px;
}

.iconFallback {
	display: flex;
	align-items: center;
	justify-content: center;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	& button path {
		stroke-width: 2.5;
	}
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
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
