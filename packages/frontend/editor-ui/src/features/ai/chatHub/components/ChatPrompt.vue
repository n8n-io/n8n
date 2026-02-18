<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import type { ChatHubLLMProvider, ChatModelDto, ChatSessionId } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import {
	N8nIconButton,
	N8nIcon,
	N8nInput,
	N8nText,
	N8nTooltip,
	N8nCallout,
} from '@n8n/design-system';
import { useSpeechRecognition } from '@vueuse/core';
import { computed, ref, useTemplateRef, watch } from 'vue';
import ToolsSelector from './ToolsSelector.vue';
import { isLlmProviderModel, createMimeTypes } from '@/features/ai/chatHub/chat.utils';
import { useI18n } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';
import type { MessagingState } from '@/features/ai/chatHub/chat.types';
import { useChatStore } from '@/features/ai/chatHub/chat.store';

const props = defineProps<{
	messagingState: MessagingState;
	isNewSession: boolean;
	isToolsSelectable: boolean;
	selectedModel: ChatModelDto | null;
	checkedToolIds: string[];
	sessionId?: ChatSessionId;
	customAgentId?: string;
	showCreditsClaimedCallout: boolean;
	aiCreditsQuota: string;
}>();

const chatStore = useChatStore();

const emit = defineEmits<{
	submit: [message: string, attachments: File[]];
	stop: [];
	selectModel: [];
	setCredentials: [ChatHubLLMProvider];
	editAgent: [agentId: string];
	dismissCreditsCallout: [];
}>();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const message = ref('');
const committedSpokenMessage = ref('');
const attachments = ref<File[]>([]);

const toast = useToast();
const i18n = useI18n();

const speechInput = useSpeechRecognition({
	continuous: true,
	interimResults: true,
	lang: navigator.language,
});

const placeholder = computed(() => {
	if (props.selectedModel) {
		return i18n.baseText('chatHub.chat.prompt.placeholder.withModel', {
			interpolate: { model: props.selectedModel.name ?? 'a model' },
		});
	}
	return i18n.baseText('chatHub.chat.prompt.placeholder.selectModel');
});

const llmProvider = computed<ChatHubLLMProvider | undefined>(() =>
	isLlmProviderModel(props.selectedModel?.model) ? props.selectedModel?.model.provider : undefined,
);

const acceptedMimeTypes = computed(() =>
	createMimeTypes(props.selectedModel?.metadata.inputModalities ?? []),
);

const canUploadFiles = computed(() => !!acceptedMimeTypes.value);

const showMisisngAgentCallout = computed(() => props.messagingState === 'missingAgent');
const showMissingCredentialsCallout = computed(
	() => props.messagingState === 'missingCredentials' && !!llmProvider.value,
);
const calloutVisible = computed(() => {
	return (
		showMisisngAgentCallout.value ||
		showMissingCredentialsCallout.value ||
		props.showCreditsClaimedCallout
	);
});

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
	}
}

function handleKeydownTextarea(e: KeyboardEvent) {
	const trimmed = message.value.trim();

	speechInput.stop();

	if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && trimmed) {
		e.preventDefault();
		speechInput.stop();
		emit('submit', trimmed, attachments.value);
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
			new Error(i18n.baseText('chatHub.chat.prompt.microphone.accessDenied')),
			i18n.baseText('chatHub.chat.prompt.microphone.allowAccess'),
		);
		return;
	}

	if (event?.error === 'no-speech') {
		toast.showMessage({
			title: i18n.baseText('chatHub.chat.prompt.microphone.noSpeech'),
			type: 'warning',
		});
	}
});

async function handleToolToggle(toolId: string) {
	if (props.customAgentId) {
		await chatStore.toggleCustomAgentTool(props.customAgentId, toolId);
		return;
	}
	if (props.sessionId) {
		// Existing session: toggle per-session tool
		await chatStore.toggleSessionTool(props.sessionId, toolId);
		return;
	}
	// New session: toggle global enabled state
	const tool = chatStore.configuredTools.find((t) => t.definition.id === toolId);
	if (tool) {
		await chatStore.toggleToolEnabled(toolId, !tool.enabled);
	}
}

defineExpose({
	focus: () => inputRef.value?.focus(),
	reset: () => {
		message.value = '';
		committedSpokenMessage.value = '';
		attachments.value = [];
	},
	appendText: (text: string) => {
		message.value += text;
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
			<N8nCallout
				v-if="showMisisngAgentCallout"
				icon="info"
				theme="secondary"
				:class="$style.callout"
			>
				<I18nT
					:keypath="
						isNewSession
							? 'chatHub.chat.prompt.callout.selectModel.new'
							: 'chatHub.chat.prompt.callout.selectModel.existing'
					"
					tag="span"
					scope="global"
				>
					<template #link>
						<a href="" @click.prevent="emit('selectModel')">{{
							i18n.baseText(
								isNewSession
									? 'chatHub.chat.prompt.callout.selectModel.new.link'
									: 'chatHub.chat.prompt.callout.selectModel.existing.link',
							)
						}}</a>
					</template>
				</I18nT>
			</N8nCallout>

			<N8nCallout
				v-else-if="showMissingCredentialsCallout"
				icon="info"
				theme="secondary"
				:class="$style.callout"
			>
				<I18nT
					:keypath="
						isNewSession
							? 'chatHub.chat.prompt.callout.setCredentials.new'
							: 'chatHub.chat.prompt.callout.setCredentials.existing'
					"
					tag="span"
					scope="global"
				>
					<template #link>
						<a href="" @click.prevent="emit('setCredentials', llmProvider!)">{{
							i18n.baseText(
								isNewSession
									? 'chatHub.chat.prompt.callout.setCredentials.new.link'
									: 'chatHub.chat.prompt.callout.setCredentials.existing.link',
							)
						}}</a>
					</template>
					<template #provider>
						{{ providerDisplayNames[llmProvider!] }}
					</template>
				</I18nT>
			</N8nCallout>

			<N8nCallout
				v-else-if="showCreditsClaimedCallout"
				icon="info"
				theme="secondary"
				:class="$style.callout"
			>
				<N8nText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.beginning') }}</N8nText>
				<N8nText bold>{{
					i18n.baseText('freeAi.credits.callout.success.chatHub.credits', {
						interpolate: { amount: aiCreditsQuota },
					})
				}}</N8nText>
				<N8nText>{{ i18n.baseText('freeAi.credits.callout.success.chatHub.end') }}</N8nText>

				<template #trailingContent>
					<N8nIcon
						icon="x"
						title="Dismiss"
						size="medium"
						type="secondary"
						@click="emit('dismissCreditsCallout')"
					/>
				</template>
			</N8nCallout>

			<input
				ref="fileInputRef"
				type="file"
				:class="$style.fileInput"
				:accept="acceptedMimeTypes"
				multiple
				@change="handleFileSelect"
			/>

			<div
				:class="[{ [$style.calloutVisible]: calloutVisible }, $style.inputWrapper]"
				@click="handleClickInputWrapper"
			>
				<div v-if="attachments.length > 0" :class="$style.attachments">
					<ChatFile
						v-for="(file, index) in attachments"
						:key="index"
						:file="file"
						:is-previewable="true"
						:is-removable="messagingState === 'idle'"
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
					:disabled="messagingState !== 'idle'"
					@keydown="handleKeydownTextarea"
				/>

				<div :class="$style.footer">
					<div :class="$style.tools">
						<ToolsSelector
							:class="$style.toolsButton"
							:checked-tool-ids="checkedToolIds"
							:custom-agent-id="customAgentId"
							:disabled="messagingState !== 'idle' || !isToolsSelectable"
							:disabled-tooltip="
								isToolsSelectable
									? undefined
									: i18n.baseText('chatHub.tools.selector.disabled.tooltip')
							"
							@toggle="handleToolToggle"
						/>
					</div>
					<div :class="$style.actions">
						<N8nTooltip
							:content="
								!canUploadFiles
									? i18n.baseText('chatHub.chat.prompt.button.attach.disabled')
									: i18n.baseText('chatHub.chat.prompt.button.attach')
							"
							:disabled="canUploadFiles && messagingState === 'idle'"
							placement="top"
						>
							<N8nIconButton
								variant="ghost"
								:disabled="messagingState !== 'idle' || !canUploadFiles"
								icon="paperclip"
								icon-size="large"
								@click.stop="onAttach"
							/>
						</N8nTooltip>
						<N8nIconButton
							v-if="speechInput.isSupported"
							variant="outline"
							:title="
								speechInput.isListening.value
									? i18n.baseText('chatHub.chat.prompt.button.stopRecording')
									: i18n.baseText('chatHub.chat.prompt.button.voiceInput')
							"
							:disabled="messagingState !== 'idle'"
							:icon="speechInput.isListening.value ? 'square' : 'mic'"
							:class="{ [$style.recording]: speechInput.isListening.value }"
							icon-size="large"
							@click.stop="onMic"
						/>
						<N8nIconButton
							v-if="messagingState !== 'receiving'"
							type="submit"
							:disabled="messagingState !== 'idle' || !message.trim()"
							:title="i18n.baseText('chatHub.chat.prompt.button.send')"
							:loading="messagingState === 'waitingFirstChunk'"
							icon="arrow-up"
							icon-size="large"
							@click.stop
						/>
						<N8nIconButton
							v-else
							native-type="button"
							:title="i18n.baseText('chatHub.chat.prompt.button.stopGenerating')"
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
	width: 100%;
	padding: var(--spacing--sm);
	border-radius: 16px 16px 0 0;
	box-shadow: 0 10px 24px 0 #00000010;
}

.closeButton {
	margin-left: var(--spacing--sm);
}

.fileInput {
	display: none;
}

.inputWrapper {
	width: 100%;
	border-radius: 16px;
	padding: 16px;
	box-shadow: 0 10px 24px 0 #00000010;
	background-color: var(--color--background--light-3);
	border: var(--border);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
	--input--border-color: transparent;
	--input--border-color--hover: transparent;
	--input--border-color--focus: transparent;
	--input--color--background: transparent;

	&:focus-within,
	&:hover:has(textarea:not(:disabled)) {
		border-color: var(--color--secondary);
	}

	& textarea {
		font-size: var(--font-size--md);
		line-height: 1.5em;
		resize: none;
		padding: 0 !important;
	}

	:global(.n8n-input) > div {
		padding: 0;
	}

	&.calloutVisible {
		border-radius: 0 0 16px 16px;
		border-top: 0;
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
