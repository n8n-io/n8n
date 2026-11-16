<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import AgentChannelRemoveConfirmation from '../AgentChannelRemoveConfirmation.vue';

defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	// The shared removal flow passes this on. The API channel has no external resource to delete.
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<AgentChannelRemoveConfirmation
		:open="open"
		:loading="loading"
		:title="i18n.baseText('agents.channels.webhook.remove.title')"
		:description="i18n.baseText('agents.channels.webhook.remove.description')"
		:confirm-label="i18n.baseText('agents.channels.webhook.remove.confirm')"
		confirm-test-id="webhook-remove-confirm"
		@cancel="emit('cancel')"
		@confirm="emit('confirm', false)"
	/>
</template>
