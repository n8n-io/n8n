<script lang="ts" setup>
import { ref, onBeforeUnmount } from 'vue';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import type { EventBus } from '@n8n/utils/event-bus';

import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';

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
const unpublishing = ref(false);

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const onUnpublish = () => {
	unpublishing.value = true;
	props.data.eventBus.emit('unpublish');
	// Modal will be closed by parent after API call completes
};

onBeforeUnmount(() => {
	unpublishing.value = false;
});
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
			<div :class="$style.content">
				<N8nIcon :class="$style.icon" icon="triangle-alert" color="warning" size="xlarge" />
				<N8nText size="medium">
					{{
						i18n.baseText('workflowHistory.action.unpublish.modal.description', {
							interpolate: { versionName: props.data.versionName || '' },
						})
					}}
				</N8nText>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton size="medium" type="tertiary" :disabled="unpublishing" @click="onCancel">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton size="medium" type="primary" :loading="unpublishing" @click="onUnpublish">
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

.content {
	display: flex;
	flex-direction: row;
	align-items: start;
	gap: var(--spacing--xs);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
}
</style>
