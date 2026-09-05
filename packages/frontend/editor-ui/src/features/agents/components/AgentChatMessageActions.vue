<script setup lang="ts">
import { N8nChatActions, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	content: string;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	sendToAssistant: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nChatActions
		:class="$style.actions"
		:content="props.content"
		data-test-id="agent-chat-message-actions"
		copy-test-id="agent-chat-message-copy"
		read-aloud-test-id="agent-chat-message-read-aloud"
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
