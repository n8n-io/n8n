<script lang="ts" setup>
import { N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useWorkflowChatPanelStore } from './workflowChatPanel.store';

const panelStore = useWorkflowChatPanelStore();
const i18n = useI18n();

function onToggle() {
	panelStore.toggle();
}
</script>

<template>
	<N8nIconButton
		icon="sparkles"
		type="tertiary"
		size="medium"
		:title="i18n.baseText('workflowChat.toggle.tooltip')"
		data-test-id="workflow-chat-toggle"
		@click="onToggle"
	/>
</template>
