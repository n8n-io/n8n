<script setup lang="ts">
import type { ChatModelDto } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIconButton, N8nInput, N8nTooltip } from '@n8n/design-system';
import { useElementSize } from '@vueuse/core';
import { useTemplateRef } from 'vue';
import ToolsSelector from './ToolsSelector.vue';
import { useI18n } from '@n8n/i18n';
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
	checkedToolIds: string[];
	customAgentId?: string;
	isToolsSelectable: boolean;
	selectedModel: ChatModelDto | null;
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
	toolToggle: [toolId: string];
}>();

const i18n = useI18n();

const inputRef = useTemplateRef<HTMLElement>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');
const attachmentsEl = useTemplateRef('attachmentsEl');
const attachmentsElSize = useElementSize(attachmentsEl, undefined, { box: 'border-box' });

defineExpose({
	inputRef,
	fileInputRef,
});
</script>

<template>
	<form
		:class="[$style.prompt, { [$style.hasCallout]: calloutVisible }]"
		:style="{ '--attachments-el--height': `${attachmentsElSize.height.value}px` }"
		@submit.prevent="emit('submit')"
	>
		<input
			ref="fileInputRef"
			type="file"
			:class="$style.fileInput"
			:accept="acceptedMimeTypes"
			multiple
			@change="emit('fileSelect', $event)"
		/>

		<div :class="$style.header">
			<slot name="callouts" />

			<div v-if="attachments.length > 0" ref="attachmentsEl" :class="$style.attachments">
				<ChatFile
					v-for="(file, index) in attachments"
					:key="index"
					:file="file"
					:is-previewable="true"
					:is-removable="messagingState === 'idle'"
					@remove="emit('removeAttachment', $event)"
				/>
			</div>
		</div>

		<N8nInput
			ref="inputRef"
			:model-value="props.message"
			type="textarea"
			:placeholder="placeholder"
			autocomplete="off"
			:autosize="{ minRows: 1, maxRows: 6 }"
			autofocus
			:disabled="messagingState !== 'idle'"
			@update:model-value="emit('update:message', $event)"
			@keydown="emit('keydown', $event)"
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
							: selectedModel
								? i18n.baseText('chatHub.tools.selector.disabled.tooltip')
								: i18n.baseText('chatHub.tools.selector.disabled.noModel.tooltip')
					"
					@toggle="emit('toolToggle', $event)"
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
						@click.stop="emit('attach')"
					/>
				</N8nTooltip>
				<N8nIconButton
					v-if="isSpeechSupported"
					variant="outline"
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
	</form>
</template>

<style lang="scss" module>
.prompt {
	width: 100%;
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);

	& textarea {
		font-size: var(--font-size--md);
		line-height: 1.5em;
		padding: var(--spacing--sm);
		padding-top: calc(var(--spacing--sm) + var(--attachments-el--height));
		padding-bottom: 64px;
		color: var(--color--text--shade-1);
		box-shadow: 0 10px 24px 0 #00000010;
		border-radius: 16px;

		&::placeholder {
			color: var(--color--text--tint-1);
		}
	}

	:global(.n8n-input__wrapper) {
		--input--radius: 16px;
	}

	&.hasCallout textarea {
		padding-top: calc(
			var(--spacing--sm) + var(--attachments-el--height) + 52px /* callout height */
		);
	}
}

.fileInput {
	display: none;
}

.header,
.footer {
	position: absolute;
	left: 1px;
	width: calc(100% - 2px);
	z-index: 10;
	background: var(--color--background--light-2);
	border-radius: 16px;
	pointer-events: none; /* click to focus textarea */

	& > * {
		pointer-events: auto;
	}
}

.header {
	top: 1px;
}

.footer {
	bottom: 1px;
	padding: var(--spacing--sm);
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.tools {
	flex-grow: 1;
}

.toolsButton {
	/* maintain the same height with other buttons regardless of selected tools */
	height: 30px;
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
	padding: var(--spacing--sm);
	padding-bottom: 0;
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
