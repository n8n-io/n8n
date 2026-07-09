<script setup lang="ts">
import type { ChatModelDto } from '@n8n/api-types';
import ChatFile from '@n8n/chat/components/ChatFile.vue';
import { N8nIconButton, N8nChatInput, N8nTooltip } from '@n8n/design-system';
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
	fileSelect: [e: Event];
	attach: [];
	mic: [];
	stop: [];
	removeAttachment: [file: File];
	toolToggle: [toolId: string];
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
		<input
			ref="fileInputRef"
			type="file"
			:class="$style.fileInput"
			:accept="acceptedMimeTypes"
			multiple
			@change="emit('fileSelect', $event)"
		/>

		<slot name="callouts" />

		<N8nChatInput
			ref="inputRef"
			:model-value="props.message"
			:placeholder="placeholder"
			:streaming="messagingState === 'receiving'"
			:disabled="messagingState !== 'idle'"
			:submit-disabled="messagingState !== 'idle' || !message.trim()"
			:autosize="{ minRows: 1, maxRows: 6 }"
			send-button-test-id="chat-hub-send-message-button"
			stop-button-test-id="chat-hub-send-message-button"
			autofocus
			@update:model-value="emit('update:message', $event)"
			@submit="emit('submit')"
			@stop="emit('stop')"
		>
			<template #leading>
				<div v-if="attachments.length > 0" :class="$style.attachments">
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
			<template #left-actions>
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
	</form>
</template>

<style lang="scss" module>
.prompt {
	width: 100%;
}

.fileInput {
	display: none;
}

.toolsButton {
	/* maintain the same height with other buttons regardless of selected tools */
	height: 30px;
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.recording {
	color: var(--color--danger);
}
</style>
