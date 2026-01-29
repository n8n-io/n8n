<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { N8nHeading, N8nButton } from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/app/stores/ui.store';
import { ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';
import type { EventBus } from '@n8n/utils/event-bus';

export type WorkflowHistoryVersionFormModalEventBusEvents = {
	submit: { versionId: string; name: string; description: string };
	cancel: undefined;
};

const props = defineProps<{
	modalName: string;
	modalTitle: string;
	submitButtonLabel: string;
	data: {
		versionId: string;
		workflowId: string;
		formattedCreatedAt: string;
		versionName?: string;
		description?: string;
		eventBus: EventBus<WorkflowHistoryVersionFormModalEventBusEvents>;
	};
}>();

const i18n = useI18n();
const modalEventBus = createEventBus();
const uiStore = useUIStore();

const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');

const versionName = ref('');
const description = ref('');

function onModalOpened() {
	versionForm.value?.focusInput();
}

onMounted(() => {
	if (props.data.versionName) {
		versionName.value = props.data.versionName;
	} else if (props.data.versionId) {
		versionName.value = generateVersionName(props.data.versionId);
	}

	if (props.data.description) {
		description.value = props.data.description;
	}

	modalEventBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalEventBus.off('opened', onModalOpened);
});

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const submitting = ref(false);

const handleSubmit = () => {
	if (versionName.value.trim().length === 0) {
		return;
	}

	submitting.value = true;

	props.data.eventBus.emit('submit', {
		versionId: props.data.versionId,
		name: versionName.value,
		description: description.value,
	});

	submitting.value = false;
	closeModal();
};
</script>

<template>
	<Modal
		width="500px"
		max-height="85vh"
		:name="modalName"
		:event-bus="modalEventBus"
		:center="true"
		:before-close="onCancel"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ modalTitle }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<WorkflowVersionForm
					ref="versionForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:version-name-test-id="`${modalName}-version-name-input`"
					:description-test-id="`${modalName}-description-input`"
				/>
				<div :class="$style.actions">
					<N8nButton
						:disabled="submitting"
						type="secondary"
						:label="i18n.baseText('generic.cancel')"
						:data-test-id="`${modalName}-cancel-button`"
						@click="onCancel"
					/>
					<N8nButton
						:loading="submitting"
						:disabled="versionName.trim().length === 0"
						:label="submitButtonLabel"
						:data-test-id="`${modalName}-submit-button`"
						@click="handleSubmit"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>
<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
