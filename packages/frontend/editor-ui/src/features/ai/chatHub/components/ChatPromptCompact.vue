<script setup lang="ts">
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIconButton, N8nInput, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';
import type { MessagingState } from '@/features/ai/chatHub/chat.types';

const props = defineProps<{
	message: string;
	attachments: File[];
	placeholder: string;
	messagingState: MessagingState;
	acceptedMimeTypes: string;
	canUploadFiles: boolean;
	calloutVisible: boolean;
	isSpeechSupported: boolean;
	isListening: boolean;
}>();

const emit = defineEmits<{
	submit: [];
	'update:message': [value: string];
	keydown: [e: KeyboardEvent];
	fileSelect: [e: Event];
	attach: [];
	mic: [];
	stop: [];
	removeAttachment: [file: File];
}>();

const i18n = useI18n();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

function handleClickInputWrapper() {
	inputRef.value?.focus();
}

defineExpose({
	inputRef,
	fileInputRef,
});
</script>

<template>
	<form :class="$style.prompt" @submit.prevent="emit('submit')">
		<div :class="$style.inputWrap">
			<slot name="callouts" />

			<input
				ref="fileInputRef"
				type="file"
				:class="$style.fileInput"
				:accept="acceptedMimeTypes"
				multiple
				@change="emit('fileSelect', $event)"
			/>

			<div
				:class="[
					$style.inputWrapper,
					{
						[$style.calloutVisible]: calloutVisible,
					},
				]"
				@click="handleClickInputWrapper"
			>
				<div v-if="attachments.length > 0" :class="$style.compactAttachments">
					<ChatFile
						v-for="(file, index) in attachments"
						:key="index"
						:file="file"
						:is-previewable="true"
						:is-removable="messagingState === 'idle'"
						@remove="emit('removeAttachment', $event)"
					/>
				</div>

				<div :class="$style.compactRow">
					<N8nInput
						ref="inputRef"
						:model-value="props.message"
						type="textarea"
						:placeholder="placeholder"
						autocomplete="off"
						:autosize="{ minRows: 1, maxRows: 3 }"
						autofocus
						:disabled="messagingState !== 'idle'"
						@update:model-value="emit('update:message', $event)"
						@keydown="emit('keydown', $event)"
					/>
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
								@click.stop="emit('attach')"
							/>
						</N8nTooltip>
						<N8nIconButton
							v-if="isSpeechSupported"
							variant="ghost"
							:title="
								isListening
									? i18n.baseText('chatHub.chat.prompt.button.stopRecording')
									: i18n.baseText('chatHub.chat.prompt.button.voiceInput')
							"
							:disabled="messagingState !== 'idle'"
							:icon="isListening ? 'square' : 'mic'"
							:class="{ [$style.recording]: isListening }"
							icon-size="large"
							@click.stop="emit('mic')"
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
							@click.stop="emit('stop')"
						/>
					</div>
				</div>
			</div>
		</div>
	</form>
</template>

<style lang="scss" module>
.prompt {
	position: static;
	display: grid;
	place-items: center;
	gap: 0;
	width: 100%;

	& textarea {
		padding: 0;
		padding-top: 0;
		padding-bottom: 0;
		box-shadow: none;
		border-radius: 0;
	}

	:global(.n8n-input__wrapper) {
		--input--radius: 0;
	}
}

.fileInput {
	display: none;
}

.inputWrap {
	position: relative;
	display: flex;
	align-items: center;
	flex-direction: column;
	width: 100%;
}

.inputWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs);
	border-radius: var(--radius--xl);
	background-color: transparent;

	--compact--border-color: light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	--compact--border-color--hover: light-dark(
		var(--color--black-alpha-200),
		var(--color--white-alpha-200)
	);
	--compact--border-color--focus: light-dark(
		var(--color--black-alpha-300),
		var(--color--white-alpha-300)
	);

	box-shadow:
		0 10px 24px 0 #00000010,
		inset 0 0 0 1px var(--compact--border-color);

	&:hover:not(:focus-within) {
		box-shadow:
			0 10px 24px 0 #00000010,
			inset 0 0 0 1px var(--compact--border-color--hover);
	}

	&:focus-within {
		box-shadow:
			0 10px 24px 0 #00000010,
			inset 0 0 0 1px var(--compact--border-color--focus);
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: 2px;
		transition: outline 0.15s ease-out;
	}

	& textarea {
		font-size: var(--font-size--md);
		line-height: 1.5em;
		color: var(--color--text--shade-1);
		border: none;
		box-shadow: none;
		padding: 0;
		border-radius: 0;

		&::placeholder {
			color: var(--color--text--tint-1);
		}
	}

	:global(.n8n-input__wrapper) {
		--input--border--shadow: 0 0 0 0 transparent;
		--input--border--shadow--hover: 0 0 0 0 transparent;
		--input--border--shadow--focus: 0 0 0 0 transparent;
		--input--shadow: 0 0 0 0 transparent;
		--input--shadow--hover: 0 0 0 0 transparent;
		--input--shadow--focus: 0 0 0 0 transparent;
		--input--radius: 0;
		--input--color--background: transparent;
		outline: none;

		&:focus-within {
			outline: none;
		}
	}

	&.calloutVisible {
		border-radius: 0 0 var(--radius--xl) var(--radius--xl);
	}
}

.compactAttachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.compactRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;

	:global(.n8n-input) {
		flex: 1;
		min-width: 0;
	}
}

.actions {
	display: flex;
	align-items: center;
	align-self: flex-end;
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
