<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { WORKFLOW_DESCRIPTION_MODAL_KEY } from '@/app/constants';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from '@/app/components/Modal.vue';
import WorkflowTagsDropdown from '@/features/shared/tags/components/WorkflowTagsDropdown.vue';
import { onMounted } from 'vue';

const props = defineProps<{
	modalName: string;
	data: {
		workflowId: string;
		workflowName?: string;
		workflowDescription?: string | null;
		/** When provided (and tags are enabled), the modal also edits the workflow's tags. */
		workflowTags?: string[];
		/** New workflows are not persisted yet: edits are staged on the document and saved with the workflow. */
		isNewWorkflow?: boolean;
		onSave?: (description: string | null) => void;
	};
}>();

const modalBus = createEventBus();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();

const descriptionValue = ref(props.data.workflowDescription ?? '');
const descriptionInput = useTemplateRef<HTMLInputElement>('descriptionInput');
const isSaving = ref(false);

const tagIds = ref<string[]>([...(props.data.workflowTags ?? [])]);
const showTags = computed(
	() => props.data.workflowTags !== undefined && settingsStore.areTagsEnabled,
);

const modalTitle = computed(() => props.data.workflowName || i18n.baseText('generic.description'));

const normalizedCurrentValue = computed(() => (descriptionValue.value ?? '').trim());
const normalizedLastSaved = computed(() => (props.data.workflowDescription ?? '').trim());

const tagsChanged = computed(() => {
	if (!showTags.value) return false;
	const initial = props.data.workflowTags ?? [];
	return tagIds.value.length !== initial.length || tagIds.value.some((id) => !initial.includes(id));
});

const canSave = computed(
	() => normalizedCurrentValue.value !== normalizedLastSaved.value || tagsChanged.value,
);

const isMcpEnabled = computed(
	() => settingsStore.isModuleActive('mcp') && settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);

// Descriptive message that educates the user that the description is relevant for MCP
// Updated based on MCP presence
const textareaTip = computed(() =>
	isMcpEnabled.value
		? i18n.baseText('workflow.description.mcp')
		: i18n.baseText('workflow.description.nomcp'),
);

async function saveWorkflowDescription(id: string, description: string | null) {
	// A workflow that is not persisted yet cannot be updated through the API:
	// stage the edits on the document instead, so its first save carries them.
	// Re-checked live because an autosave may have persisted it mid-edit.
	if (props.data.isNewWorkflow && !workflowsStore.isWorkflowSaved[id]) {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
		workflowDocumentStore.setDescription(description ?? '');
		if (showTags.value) {
			workflowDocumentStore.setTags(tagIds.value);
		}
		uiStore.markStateDirty('metadata');
		return;
	}

	let currentVersionId = '';
	let currentChecksum = '';
	const isCurrentWorkflow = id === workflowsStore.workflowId;

	if (isCurrentWorkflow) {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
		currentVersionId = workflowDocumentStore.versionId;
		currentChecksum = workflowDocumentStore.checksum;
	} else {
		const cached = workflowsListStore.getWorkflowById(id);
		if (cached?.versionId) {
			currentVersionId = cached.versionId;
		} else {
			const fetched = await workflowsListStore.fetchWorkflow(id);
			currentVersionId = fetched.versionId;
		}
	}

	const updated = await workflowsStore.updateWorkflow(id, {
		versionId: currentVersionId,
		description,
		...(showTags.value ? { tags: tagIds.value } : {}),
		...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
	});

	if (workflowsListStore.getWorkflowById(id)) {
		workflowsListStore.updateWorkflowInCache(id, {
			description: updated.description,
			versionId: updated.versionId,
			...(showTags.value ? { tags: updated.tags } : {}),
		});
	}

	if (isCurrentWorkflow) {
		const workflowDocStore = useWorkflowDocumentStore(createWorkflowDocumentId(id));
		workflowDocStore.setDescription(updated.description ?? '');
		if (showTags.value) {
			workflowDocStore.setTags(tagIds.value);
		}
	}
}

const saveDescription = async () => {
	isSaving.value = true;

	try {
		const id = props.data.workflowId;
		const description = normalizedCurrentValue.value ?? null;

		const tagsWereChanged = tagsChanged.value;

		await saveWorkflowDescription(id, description);

		props.data.onSave?.(description);

		telemetry.track('User set workflow description', {
			workflow_id: id,
			description,
		});

		if (tagsWereChanged) {
			telemetry.track('User edited workflow tags', {
				workflow_id: id,
				new_tag_count: tagIds.value.length,
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('workflow.description.error.title'));
	} finally {
		isSaving.value = false;
	}
};

const cancel = () => {
	modalBus.emit('close');
};

const save = async () => {
	await saveDescription();
	modalBus.emit('close');
};

const handleKeyDown = async (event: KeyboardEvent) => {
	// Escape - cancel editing
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		cancel();
	}

	// Enter (without Shift) - save and close
	if (event.key === 'Enter' && !event.shiftKey) {
		if (!canSave.value) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		await save();
	}
};

onMounted(() => {
	setTimeout(() => {
		descriptionInput.value?.focus();
	}, 150);
});
</script>

<template>
	<Modal
		:name="WORKFLOW_DESCRIPTION_MODAL_KEY"
		:title="modalTitle"
		width="500"
		:class="$style.container"
		:event-bus="modalBus"
		:close-on-click-modal="false"
	>
		<template #content>
			<div
				:class="$style['description-edit-content']"
				data-test-id="workflow-description-edit-content"
			>
				<div :class="$style.field">
					<N8nText tag="label" :bold="true">{{ i18n.baseText('generic.description') }}</N8nText>
					<N8nInput
						ref="descriptionInput"
						v-model="descriptionValue"
						:rows="6"
						data-test-id="workflow-description-input"
						type="textarea"
						@keydown="handleKeyDown"
					/>
					<N8nText size="small" color="text-base" data-test-id="descriptionTooltip">
						{{ textareaTip }}
					</N8nText>
				</div>
				<div v-if="showTags" :class="$style.field">
					<N8nText tag="label" :bold="true">{{ i18n.baseText('generic.tag_plural') }}</N8nText>
					<WorkflowTagsDropdown
						v-model="tagIds"
						:placeholder="i18n.baseText('workflowDetails.chooseOrCreateATag')"
						data-test-id="workflow-tags-dropdown"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style['popover-footer']">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					:size="'small'"
					:disabled="isSaving"
					data-test-id="workflow-description-cancel-button"
					@click="cancel"
				/>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					data-test-id="workflow-description-save-button"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.description-edit-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--s);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.popover-footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
