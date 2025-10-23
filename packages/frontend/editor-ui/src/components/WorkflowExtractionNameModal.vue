<script setup lang="ts">
import Modal from '@/components/Modal.vue';
import { useI18n } from '@n8n/i18n';
import { useWorkflowExtraction } from '@/composables/useWorkflowExtraction';
import { WORKFLOW_EXTRACTION_NAME_MODAL_KEY } from '@/constants';
import type { INodeUi } from '@/Interface';
import { createEventBus } from '@n8n/utils/event-bus';
import type { ExtractableSubgraphData } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/composables/useToast';

import { N8nButton, N8nFormInput } from '@n8n/design-system';
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
const modalBus = createEventBus();

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
	const { selection, subGraph } = props.data;
	try {
		await workflowExtraction.extractNodesIntoSubworkflow(
			selection,
			subGraph,
			workflowNameOrDefault.value,
		);
	} catch (e) {
		toast.showError(e, i18n.baseText('workflowExtraction.error.failure'));
	} finally {
		modalBus.emit('close');
	}
};

const inputRef = ref<InstanceType<typeof N8nFormInput> | null>(null);

onMounted(() => {
	// With modals normal focusing via `props.focus-initially` on N8nFormInput does not work
	setTimeout(() => {
		inputRef.value?.inputRef?.select();
		inputRef.value?.inputRef?.focus();
	});
});
</script>

<template>
	<Modal
		max-width="540px"
		:title="
			i18n.baseText('workflowExtraction.modal.description', {
				adjustToNumber: props.data.subGraph.length,
			})
		"
		:event-bus="modalBus"
		:name="WORKFLOW_EXTRACTION_NAME_MODAL_KEY"
		:center="true"
		:close-on-click-modal="false"
	>
		<template #content>
			<N8nFormInput
				ref="inputRef"
				v-model="workflowName"
				name="key"
				label=""
				max-length="128"
				focus-initially
				@enter="onSubmit"
			/>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					:label="i18n.baseText('generic.cancel')"
					float="right"
					data-test-id="cancel-button"
					@click="close"
				/>
				<N8nButton
					:label="i18n.baseText('generic.confirm')"
					float="right"
					:disabled="!workflowName"
					data-test-id="submit-button"
					@click="onSubmit"
				/>
			</div>
		</template>
	</Modal>
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
