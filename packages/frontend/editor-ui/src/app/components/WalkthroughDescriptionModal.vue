<script setup lang="ts">
import { computed, ref, useTemplateRef, onMounted } from 'vue';
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import type { WorkflowNodeDescriptions } from '@n8n/rest-api-client';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { WALKTHROUGH_DESCRIPTION_MODAL_KEY } from '../constants';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';

const props = defineProps<{
	modalName: string;
	data: {
		nodeId: string;
	};
}>();

const modalBus = createEventBus();

const i18n = useI18n();
const toast = useToast();

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();

const workflowId = workflowsStore.workflowId;
const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));

const node = workflowDocumentStore.getNodeById(props.data.nodeId);
const existingDescription = workflowDocumentStore.meta?.nodeDescriptions?.[props.data.nodeId];

const summaryValue = ref(existingDescription?.summary ?? '');
const rationaleValue = ref(existingDescription?.rationale ?? '');
const summaryInput = useTemplateRef<HTMLInputElement>('summaryInput');
const isSaving = ref(false);

const modalTitle = computed(() =>
	node
		? i18n.baseText('walkthroughDescription.modal.heading', {
				interpolate: { nodeName: node.name },
			})
		: i18n.baseText('walkthroughDescription.modal.title'),
);

const normalizedSummary = computed(() => summaryValue.value.trim());
const normalizedRationale = computed(() => rationaleValue.value.trim());

const canSave = computed(
	() =>
		normalizedSummary.value !== (existingDescription?.summary ?? '').trim() ||
		normalizedRationale.value !== (existingDescription?.rationale ?? '').trim(),
);

async function saveNodeDescription(nodeDescriptions: WorkflowNodeDescriptions) {
	// A workflow that is not persisted yet cannot be updated through the API:
	// stage the edits on the document instead, so its first save carries them.
	if (!workflowsStore.isWorkflowSaved[workflowId]) {
		workflowDocumentStore.addToMeta({ nodeDescriptions });
		uiStore.markStateDirty('metadata');
		return;
	}

	const currentVersionId = workflowDocumentStore.versionId;
	const currentChecksum = workflowDocumentStore.checksum;

	const updated = await workflowsStore.updateWorkflow(workflowId, {
		versionId: currentVersionId,
		meta: { ...workflowDocumentStore.meta, nodeDescriptions },
		...(currentChecksum ? { expectedChecksum: currentChecksum } : {}),
	});

	if (workflowsListStore.getWorkflowById(workflowId)) {
		workflowsListStore.updateWorkflowInCache(workflowId, { versionId: updated.versionId });
	}

	workflowDocumentStore.setMeta(updated.meta ?? {});
}

const save = async () => {
	isSaving.value = true;

	try {
		const nodeDescriptions = { ...(workflowDocumentStore.meta?.nodeDescriptions ?? {}) };

		if (normalizedSummary.value) {
			nodeDescriptions[props.data.nodeId] = {
				summary: normalizedSummary.value,
				...(normalizedRationale.value ? { rationale: normalizedRationale.value } : {}),
			};
		} else {
			delete nodeDescriptions[props.data.nodeId];
		}

		await saveNodeDescription(nodeDescriptions);
		modalBus.emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('walkthroughDescription.modal.error.title'));
	} finally {
		isSaving.value = false;
	}
};

const cancel = () => {
	modalBus.emit('close');
};

const handleKeyDown = async (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		cancel();
	}
};

onMounted(() => {
	setTimeout(() => {
		summaryInput.value?.focus();
	}, 150);
});
</script>

<template>
	<Modal
		:name="WALKTHROUGH_DESCRIPTION_MODAL_KEY"
		:title="modalTitle"
		width="500"
		:class="$style.container"
		:event-bus="modalBus"
		:close-on-click-modal="false"
	>
		<template #content>
			<div
				:class="$style['description-edit-content']"
				data-test-id="walkthrough-description-edit-content"
			>
				<div :class="$style.field">
					<N8nText tag="label" :bold="true">{{
						i18n.baseText('walkthroughDescription.modal.summary.label')
					}}</N8nText>
					<N8nInput
						ref="summaryInput"
						v-model="summaryValue"
						:rows="3"
						data-test-id="walkthrough-description-summary-input"
						type="textarea"
						:placeholder="i18n.baseText('walkthroughDescription.modal.summary.placeholder')"
						@keydown="handleKeyDown"
					/>
				</div>
				<div :class="$style.field">
					<N8nText tag="label" :bold="true">{{
						i18n.baseText('walkthroughDescription.modal.rationale.label')
					}}</N8nText>
					<N8nInput
						v-model="rationaleValue"
						:rows="3"
						data-test-id="walkthrough-description-rationale-input"
						type="textarea"
						:placeholder="i18n.baseText('walkthroughDescription.modal.rationale.placeholder')"
						@keydown="handleKeyDown"
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
					data-test-id="walkthrough-description-cancel-button"
					@click="cancel"
				/>
				<N8nButton
					variant="solid"
					:label="i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText')"
					:loading="isSaving"
					:disabled="!canSave || isSaving"
					data-test-id="walkthrough-description-save-button"
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
