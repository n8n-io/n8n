<script lang="ts" setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import { MAX_WORKFLOW_NAME_LENGTH, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useToast } from '@/composables/useToast';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import Modal from '@/components/Modal.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowSaving } from '@/composables/useWorkflowSaving';

const props = defineProps<{
	modalName: string;
	isActive: boolean;
	data: {
		tags: string[];
		id: string;
		name: string;
		externalEventBus?: EventBus;
		parentFolderId?: string;
	};
}>();

const router = useRouter();
const workflowSaving = useWorkflowSaving({ router });
const workflowHelpers = useWorkflowHelpers();
const { showMessage, showError } = useToast();
const i18n = useI18n();
const telemetry = useTelemetry();

const credentialsStore = useCredentialsStore();
const settingsStore = useSettingsStore();
const workflowsStore = useWorkflowsStore();

const name = ref('');
const currentTagIds = ref(props.data.tags);
const isSaving = ref(false);
const prevTagIds = ref(currentTagIds.value);
const modalBus = createEventBus();
const dropdownBus = createEventBus();

const nameInputRef = ref<HTMLElement>();

const focusOnSelect = () => {
	dropdownBus.emit('focus');
};

const focusOnNameInput = () => {
	if (nameInputRef.value?.focus) {
		nameInputRef.value.focus();
	}
};

const onTagsBlur = () => {
	prevTagIds.value = currentTagIds.value;
};

const onTagsEsc = () => {
	currentTagIds.value = prevTagIds.value;
};

const closeDialog = () => {
	modalBus.emit('close');
};

const save = async (): Promise<void> => {
	const workflowName = name.value.trim();
	if (!workflowName) {
		showMessage({
			title: i18n.baseText('duplicateWorkflowDialog.errors.missingName.title'),
			message: i18n.baseText('duplicateWorkflowDialog.errors.missingName.message'),
			type: 'error',
		});
		return;
	}

	const parentFolderId = props.data.parentFolderId;

	const currentWorkflowId = props.data.id;
	isSaving.value = true;

	try {
		let workflowToUpdate: WorkflowDataUpdate | undefined;
		if (currentWorkflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			const {
				createdAt,
				updatedAt,
				usedCredentials,
				id,
				homeProject,
				sharedWithProjects,
				...workflow
			} = await workflowsStore.fetchWorkflow(props.data.id);
			workflowToUpdate = workflow;

			workflowHelpers.removeForeignCredentialsFromWorkflow(
				workflowToUpdate,
				credentialsStore.allCredentials,
			);
		}

		const workflowId = await workflowSaving.saveAsNewWorkflow({
			name: workflowName,
			data: workflowToUpdate,
			tags: currentTagIds.value,
			resetWebhookUrls: true,
			openInNewWindow: true,
			resetNodeIds: true,
			parentFolderId,
		});

		if (!!workflowId) {
			closeDialog();
			telemetry.track('User duplicated workflow', {
				old_workflow_id: currentWorkflowId,
				workflow_id: props.data.id,
				sharing_role: workflowHelpers.getWorkflowProjectRole(props.data.id),
			});
			props.data.externalEventBus?.emit('workflow-duplicated', { id: props.data.id });
		}
	} catch (error) {
		if (error.httpStatusCode === 403) {
			error.message = i18n.baseText('duplicateWorkflowDialog.errors.forbidden.message');
			showError(error, i18n.baseText('duplicateWorkflowDialog.errors.forbidden.title'));
		} else {
			showError(error, i18n.baseText('duplicateWorkflowDialog.errors.generic.title'));
		}
	} finally {
		isSaving.value = false;
	}
};

watch(
	() => props.isActive,
	(active) => {
		if (active) {
			focusOnSelect();
		}
	},
);

onMounted(async () => {
	name.value = await workflowsStore.getDuplicateCurrentWorkflowName(props.data.name);
	await nextTick();
	focusOnNameInput();
});
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		:title="i18n.baseText('duplicateWorkflowDialog.duplicateWorkflow')"
		:center="true"
		width="420px"
		@enter="save"
	>
		<template #content>
			<div :class="$style.content">
				<n8n-input
					ref="nameInputRef"
					v-model="name"
					:placeholder="i18n.baseText('duplicateWorkflowDialog.enterWorkflowName')"
					:maxlength="MAX_WORKFLOW_NAME_LENGTH"
				/>
				<WorkflowTagsDropdown
					v-if="settingsStore.areTagsEnabled"
					ref="dropdown"
					v-model="currentTagIds"
					:create-enabled="true"
					:event-bus="dropdownBus"
					:placeholder="i18n.baseText('duplicateWorkflowDialog.chooseOrCreateATag')"
					@blur="onTagsBlur"
					@esc="onTagsEsc"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<n8n-button
					:loading="isSaving"
					:label="i18n.baseText('duplicateWorkflowDialog.save')"
					float="right"
					@click="save"
				/>
				<n8n-button
					type="secondary"
					:disabled="isSaving"
					:label="i18n.baseText('duplicateWorkflowDialog.cancel')"
					float="right"
					@click="close"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	> *:not(:last-child) {
		margin-bottom: var(--spacing-m);
	}
}

.footer {
	> * {
		margin-left: var(--spacing-3xs);
	}
}
</style>
