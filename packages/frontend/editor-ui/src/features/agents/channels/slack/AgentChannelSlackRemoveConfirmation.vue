<script setup lang="ts">
import { N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

import AgentChannelRemoveConfirmation from '../AgentChannelRemoveConfirmation.vue';

const props = defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
const deleteExternalResource = ref(true);

watch(
	() => props.open,
	(open) => {
		if (open) deleteExternalResource.value = true;
	},
);
</script>

<template>
	<AgentChannelRemoveConfirmation
		:open="open"
		:loading="loading"
		:title="i18n.baseText('agents.channels.slack.managed.remove.title')"
		:description="i18n.baseText('agents.channels.slack.managed.remove.description')"
		:confirm-label="i18n.baseText('agents.channels.slack.managed.remove.confirm')"
		confirm-test-id="slack-managed-remove-confirm"
		@cancel="emit('cancel')"
		@confirm="emit('confirm', deleteExternalResource)"
	>
		<N8nCheckbox
			v-model="deleteExternalResource"
			:disabled="loading"
			data-testid="slack-managed-remove-delete-app"
		>
			<template #label>
				<N8nText size="medium">
					{{ i18n.baseText('agents.channels.slack.managed.remove.deleteApp') }}
					<N8nText size="medium" :bold="true">
						{{ i18n.baseText('agents.channels.slack.managed.remove.messagesUnaffected') }}
					</N8nText>
				</N8nText>
			</template>
		</N8nCheckbox>
	</AgentChannelRemoveConfirmation>
</template>
