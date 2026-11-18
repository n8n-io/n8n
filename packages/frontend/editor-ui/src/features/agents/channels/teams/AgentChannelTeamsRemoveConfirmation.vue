<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

import AgentChannelRemoveConfirmation from '../AgentChannelRemoveConfirmation.vue';

defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	// The shared removal flow passes this on. Teams has no external resource to delete.
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
</script>

<template>
	<AgentChannelRemoveConfirmation
		:open="open"
		:loading="loading"
		:title="i18n.baseText('agents.channels.teams.remove.title')"
		:description="i18n.baseText('agents.channels.teams.remove.description')"
		:confirm-label="i18n.baseText('agents.channels.teams.remove.confirm')"
		confirm-test-id="teams-remove-confirm"
		@cancel="emit('cancel')"
		@confirm="emit('confirm', false)"
	/>
</template>
