<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { WORKFLOW_VERSION_RENAME_MODAL_KEY } from '@/app/constants';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nButton } from '@n8n/design-system';
import WorkflowPublishForm from '@/app/components/WorkflowPublishForm.vue';
import { useToast } from '@/app/composables/useToast';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowHistoryStore = useWorkflowHistoryStore();
const { showMessage } = useToast();
const saving = ref(false);

const publishForm = useTemplateRef<InstanceType<typeof WorkflowPublishForm>>('publishForm');

const description = ref('');
const versionName = ref('');

export type WorkflowVersionRenameModalEventBusEvents = {
	renamed: { version: WorkflowHistory };
};

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		versionId: string;
		version: WorkflowHistory;
		eventBus?: EventBus<WorkflowVersionRenameModalEventBusEvents>;
	};
}>();

const data = ref<{
	workflowId: string;
	versionId: string;
	version: WorkflowHistory;
	eventBus?: EventBus<WorkflowVersionRenameModalEventBusEvents>;
}>({
	workflowId: '',
	versionId: '',
	version: {} as WorkflowHistory,
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
	if (props.data) {
		data.value = props.data;
		versionName.value = props.data.version.name || '';
		description.value = props.data.version.description || '';
	}
	modalBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalBus.off('opened', onModalOpened);
});

async function handleRename() {
	if (isSaveDisabled.value) {
		return;
	}

	saving.value = true;

	try {
		const updatedVersion = await workflowHistoryStore.renameVersion(
			data.value.workflowId,
			data.value.versionId,
			{
				name: versionName.value,
				description: description.value,
			}
		);

		showMessage({
			title: i18n.baseText('workflows.renameVersion.success.title'),
			message: i18n.baseText('workflows.renameVersion.success.message'),
			type: 'success',
		});

		if (data.value.eventBus) {
			data.value.eventBus.emit('renamed', {
				version: updatedVersion,
			});
		}

		modalBus.emit('close');
	} catch (error) {
		showMessage({
			title: i18n.baseText('workflows.renameVersion.error.title'),
			message: error instanceof Error ? error.message : i18n.baseText('workflows.renameVersion.error.message'),
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
		:name="WORKFLOW_VERSION_RENAME_MODAL_KEY"
		:center="true"
		:show-close="true"
		:close-on-click-modal="false"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.renameVersion.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<WorkflowPublishForm
					ref="publishForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="saving"
					version-name-test-id="workflow-rename-version-name-input"
					description-test-id="workflow-rename-version-description-input"
					@submit="handleRename"
				/>
				<div :class="$style.actions">
					<N8nButton
						:disabled="saving"
						type="secondary"
						label="Cancel"
						data-test-id="workflow-rename-version-cancel-button"
						@click="modalBus.emit('close')"
					/>
					<N8nButton
						:disabled="isSaveDisabled"
						:loading="saving"
						label="Save"
						data-test-id="workflow-rename-version-save-button"
						@click="handleRename"
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