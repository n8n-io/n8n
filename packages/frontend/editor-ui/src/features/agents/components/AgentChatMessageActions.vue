<script setup lang="ts">
import { N8nChatActions, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useChatMessageCopy } from '@/features/ai/shared/composables/useChatMessageCopy';

const props = defineProps<{
	content: string;
	isSpeechSynthesisAvailable: boolean;
	isSpeaking: boolean;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	readAloud: [];
	sendToAssistant: [];
}>();

const i18n = useI18n();
const { copyMessage } = useChatMessageCopy(function getMessageContent() {
	return props.content;
});
</script>

<template>
	<N8nChatActions
		:class="$style.actions"
		data-test-id="agent-chat-message-actions"
		:copy-label="i18n.baseText('generic.copy')"
		copy-test-id="agent-chat-message-copy"
		:show-read-aloud="isSpeechSynthesisAvailable"
		:read-aloud-label="i18n.baseText('chatHub.message.actions.readAloud')"
		:stop-reading-label="i18n.baseText('chatHub.message.actions.stopReading')"
		read-aloud-test-id="agent-chat-message-read-aloud"
		:is-reading-aloud="isSpeaking"
		@copy="copyMessage"
		@read-aloud="emit('readAloud')"
	>
		<N8nTooltip
			v-if="canSendToAssistant"
			placement="bottom"
			:show-after="300"
			:content="i18n.baseText('agents.builder.preview.sendToAssistant')"
		>
			<N8nIconButton
				variant="ghost"
				icon="square-arrow-out-up-right"
				size="small"
				icon-size="medium"
				data-test-id="agent-chat-message-send-to-assistant"
				:aria-label="i18n.baseText('agents.builder.preview.sendToAssistant')"
				@click="emit('sendToAssistant')"
			/>
		</N8nTooltip>
	</N8nChatActions>
</template>

<style lang="scss" module>
.actions {
	margin-top: var(--spacing--4xs);
	margin-left: calc(var(--spacing--4xs) * -1);

	& g,
	& path {
		color: var(--icon-color);
		stroke-width: 2.5;
	}
}
</style>
