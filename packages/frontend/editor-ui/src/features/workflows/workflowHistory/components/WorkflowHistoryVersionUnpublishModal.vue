<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { EventBus } from '@n8n/utils/event-bus';

import { N8nButton, N8nCallout, N8nHeading } from '@n8n/design-system';

export type WorkflowHistoryVersionUnpublishModalEventBusEvents = {
	unpublish: undefined;
	cancel: undefined;
};

const props = defineProps<{
	modalName: string;
	data: {
		versionName?: string;
		eventBus: EventBus<WorkflowHistoryVersionUnpublishModalEventBusEvents>;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const onUnpublish = () => {
	props.data.eventBus.emit('unpublish');
	// Modal will be closed by parent after API call completes
};
</script>

<template>
	<Modal width="500px" :name="props.modalName" :before-close="onCancel">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{
					i18n.baseText('workflowHistory.action.unpublish.modal.title', {
						interpolate: { versionName: props.data.versionName || '' },
					})
				}}
			</N8nHeading>
		</template>
		<template #content>
			<N8nCallout theme="warning" icon="triangle-alert">
				{{ i18n.baseText('workflowHistory.action.unpublish.modal.description') }}
			</N8nCallout>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton size="medium" type="tertiary" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton size="medium" type="primary" @click="onUnpublish">
					{{ i18n.baseText('workflowHistory.action.unpublish.modal.button.unpublish') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;

	button {
		margin-left: var(--spacing--2xs);
	}
}
</style>
