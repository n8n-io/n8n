<script setup lang="ts">
import WorkflowHistoryVersionFormModal from './WorkflowHistoryVersionFormModal.vue';
import type { WorkflowHistoryVersionFormModalEventBusEvents } from './WorkflowHistoryVersionFormModal.vue';
import { WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import type { EventBus } from '@n8n/utils/event-bus';

export type WorkflowHistoryNameVersionModalEventBusEvents = {
	save: { versionId: string; name: string; description: string };
	cancel: undefined;
};

const props = defineProps<{
	modalName: string;
	data: {
		versionId: string;
		workflowId: string;
		formattedCreatedAt: string;
		versionName?: string;
		description?: string;
		eventBus: EventBus<WorkflowHistoryNameVersionModalEventBusEvents>;
	};
}>();

const i18n = useI18n();

const formEventBus = createEventBus<WorkflowHistoryVersionFormModalEventBusEvents>();

formEventBus.on(
	'submit',
	(submitData: { versionId: string; name: string; description: string }) => {
		props.data.eventBus.emit('save', submitData);
	},
);

formEventBus.on('cancel', () => {
	props.data.eventBus.emit('cancel');
});
</script>

<template>
	<WorkflowHistoryVersionFormModal
		:modal-name="WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY"
		:modal-title="i18n.baseText('workflowHistory.nameVersionModal.title')"
		:submit-button-label="i18n.baseText('workflowHistory.nameVersionModal.nameVersion')"
		:data="{
			...data,
			eventBus: formEventBus,
		}"
	/>
</template>
