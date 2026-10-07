<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useWorkflowExtraction } from '@/app/composables/useWorkflowExtraction';
import { WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/app/constants';
import type { INodeUi } from '@/Interface';
import { useUIStore } from '@/app/stores/ui.store';
import type { ExtractableSubgraphData } from 'n8n-workflow';
import { computed, ref } from 'vue';
import { useToast } from '@n8n/composables/useToast';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInput,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		subGraph: INodeUi[];
		selection: ExtractableSubgraphData;
	};
}>();

const DEFAULT_WORKFLOW_NAME = 'My Sub-workflow';

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const modalOpen = computed(
	() => uiStore.modalsById[WORKFLOW_EXTRACTION_NAME_MODAL_KEY]?.open === true,
);

function closeDialog() {
	if (uiStore.modalsById[WORKFLOW_EXTRACTION_NAME_MODAL_KEY]?.open !== true) return;
	uiStore.closeModal(WORKFLOW_EXTRACTION_NAME_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const workflowExtraction = useWorkflowExtraction();
const workflowName = ref(DEFAULT_WORKFLOW_NAME);
const initiatedExtraction = ref(false);

const workflowNameOrDefault = computed(() => {
	if (workflowName.value) return workflowName.value;

	return DEFAULT_WORKFLOW_NAME;
});

const onSubmit = async () => {
	if (initiatedExtraction.value) return;

	initiatedExtraction.value = true;
	const { selection: extractionBoundary, subGraph } = props.data;
	try {
		await workflowExtraction.extractNodesIntoSubworkflow(
			extractionBoundary,
			subGraph,
			workflowNameOrDefault.value,
		);
	} catch (e) {
		toast.showError(e, i18n.baseText('workflowExtraction.error.failure'));
	} finally {
		closeDialog();
	}
};
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="large"
		:header="
			i18n.baseText('workflowExtraction.modal.description', {
				adjustToNumber: props.data.subGraph.length,
			})
		"
		:close-on-overlay-click="false"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div data-test-id="workflowExtractionName-modal">
				<N8nFormInput
					v-model="workflowName"
					name="key"
					label=""
					max-length="128"
					focus-initially
					@enter="onSubmit"
				/>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton
					variant="subtle"
					:label="i18n.baseText('generic.cancel')"
					float="right"
					data-test-id="cancel-button"
					@click="closeDialog"
				/>
				<N8nButton
					:label="i18n.baseText('generic.confirm')"
					float="right"
					:disabled="!workflowName"
					data-test-id="submit-button"
					@click="onSubmit"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.row {
	margin-bottom: 10px;
}
.container {
	h1 {
		max-width: 90%;
	}
}

.description {
	font-size: var(--font-size--sm);
	margin: var(--spacing--sm) 0;
}

.footer {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: flex-end;
}
</style>
