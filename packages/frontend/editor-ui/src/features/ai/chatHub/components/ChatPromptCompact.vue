<script setup lang="ts">
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIconButton, N8nChatInput, N8nTooltip } from '@n8n/design-system';
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
	isSpeechSupported: boolean;
	isListening: boolean;
}>();

const emit = defineEmits<{
	submit: [];
	'update:message': [value: string];
	fileSelect: [e: Event];
	attach: [];
	mic: [];
	stop: [];
	removeAttachment: [file: File];
}>();

const i18n = useI18n();

const inputRef = useTemplateRef<InstanceType<typeof N8nChatInput>>('inputRef');
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef');

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

			<N8nChatInput
				ref="inputRef"
				:model-value="props.message"
				:placeholder="placeholder"
				:streaming="messagingState === 'receiving'"
				:disabled="messagingState !== 'idle'"
				:submit-disabled="messagingState !== 'idle' || !message.trim()"
				:autosize="{ minRows: 1, maxRows: 3 }"
				send-button-test-id="chat-hub-send-message-button"
				stop-button-test-id="chat-hub-send-message-button"
				autofocus
				@update:model-value="emit('update:message', $event)"
				@submit="emit('submit')"
				@stop="emit('stop')"
			>
				<template #leading>
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
				</template>
				<template #right-actions>
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
					<N8nTooltip
						v-if="isSpeechSupported"
						:content="i18n.baseText('chatHub.chat.prompt.button.voiceInput')"
						placement="top"
					>
						<N8nIconButton
							variant="ghost"
							:disabled="messagingState !== 'idle'"
							:icon="isListening ? 'square' : 'mic'"
							:class="{ [$style.recording]: isListening }"
							icon-size="large"
							@click.stop="emit('mic')"
						/>
					</N8nTooltip>
				</template>
			</N8nChatInput>
		</div>
	</form>
</template>

<style lang="scss" module>
.prompt,
.inputWrap {
	width: 100%;
}

.fileInput {
	display: none;
}

.compactAttachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.recording {
	color: var(--color--danger);
}
</style>
