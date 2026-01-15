<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { WORKFLOW_SAVE_DRAFT_MODAL_KEY } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nButton } from '@n8n/design-system';
import WorkflowPublishForm from '@/app/components/WorkflowPublishForm.vue';
import { useToast } from '@/app/composables/useToast';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';
import { telemetry } from '@/app/plugins/telemetry';

export type WorkflowSaveDraftModalEventBusEvents = {
	saved: { versionId: string; name: string; description?: string };
	cancel: undefined;
};

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const { showMessage } = useToast();
const saving = ref(false);

const publishForm = useTemplateRef<InstanceType<typeof WorkflowPublishForm>>('publishForm');

const description = ref('');
const versionName = ref('');

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		versionId: string;
	};
}>();

const data = ref<{
	workflowId: string;
	versionId: string;
}>({
	workflowId: '',
	versionId: '',
});

const isSaveDisabled = computed(() => {
	return saving.value || versionName.value.trim().length === 0;
});

function onModalOpened() {
	if (publishForm.value) {
		publishForm.value.focusInput();
	}
}

onMounted(() => {
	// Initialize data from props when modal is mounted
	if (props.data) {
		data.value = props.data;
		versionName.value = generateVersionName(props.data.versionId);
		description.value = '';
	} else if (!versionName.value) {
		versionName.value = generateVersionName(workflowsStore.workflow.versionId);
	}
	modalBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalBus.off('opened', onModalOpened);
});

async function handleSaveDraft() {
	if (isSaveDisabled.value) {
		return;
	}

	saving.value = true;

	try {
		// Save the named version without publishing
		await workflowsStore.saveNamedVersion(data.value.workflowId, {
			name: versionName.value,
			description: description.value,
			versionId: data.value.versionId,
		});

		showMessage({
			title: i18n.baseText('workflows.saveDraft.success.title'),
			message: i18n.baseText('workflows.saveDraft.success.message'),
			type: 'success',
		});

		telemetry.track('User saved draft version from canvas', {
			workflow_id: data.value.workflowId,
		});

		// Close the modal after successful save
		modalBus.emit('close');
	} catch (error) {
		showMessage({
			title: i18n.baseText('workflows.saveDraft.error.title'),
			message:
				error instanceof Error ? error.message : i18n.baseText('workflows.saveDraft.error.message'),
			type: 'error',
		});
	}

	saving.value = false;
}
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_SAVE_DRAFT_MODAL_KEY"
		:center="true"
		:show-close="true"
		:close-on-click-modal="false"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.saveDraft.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<WorkflowPublishForm
					ref="publishForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="saving"
					version-name-test-id="workflow-save-draft-version-name-input"
					description-test-id="workflow-save-draft-description-input"
					@submit="handleSaveDraft"
				/>
				<div :class="$style.actions">
					<N8nButton
						:disabled="saving"
						type="secondary"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="workflow-save-draft-cancel-button"
						@click="modalBus.emit('close')"
					/>
					<N8nButton
						:disabled="isSaveDisabled"
						:loading="saving"
						:label="i18n.baseText('workflows.saveDraft')"
						data-test-id="workflow-save-draft-button"
						@click="handleSaveDraft"
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
