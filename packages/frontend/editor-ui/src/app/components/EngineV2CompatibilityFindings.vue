<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	EngineV2CompatibilityDialog,
	useEngineV2FindingsDialog,
} from '@n8n/frontend-module-engine-v2';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useWorkflowEngineV2Compatibility } from '@/app/composables/useWorkflowEngineV2Compatibility';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

const { readOnly } = defineProps<{
	/** True when the user can't edit the workflow, so the switch to engine v1 is off. */
	readOnly: boolean;
}>();

const i18n = useI18n();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const findingsDialog = useEngineV2FindingsDialog();
const { groups } = useWorkflowEngineV2Compatibility();

const isSwitching = ref(false);

// The open state can be set before the canvas loads the workflow, for example after a route
// change. The dialog shows once the findings are there.
const isDialogVisible = computed(() => findingsDialog.isOpen.value && groups.value.length > 0);

function onUpdateOpen(value: boolean) {
	if (value) findingsDialog.open();
	else findingsDialog.close();
}

// When the last finding goes, close the dialog, so that a later finding doesn't open it again.
watch(
	() => groups.value.length,
	(count) => {
		if (count === 0) findingsDialog.close();
	},
);

// The open state outlives the canvas. Leaving the canvas closes the dialog, so that it doesn't
// open again on the next workflow.
onBeforeUnmount(() => findingsDialog.close());

function onOpenNode(nodeId: string) {
	findingsDialog.close();
	canvasEventBus.emit('nodes:select', { ids: [nodeId], panIntoView: true });
}

async function onSwitchToV1() {
	// The injected document follows the open workflow. The user can open another workflow during
	// the save, so read this workflow's values before it.
	const { workflowId, activeVersion } = workflowDocumentStore.value;
	isSwitching.value = true;
	try {
		await workflowsStore.updateWorkflowSetting(workflowId, 'engineType', 'v1');
	} catch (error) {
		toast.showError(error, i18n.baseText('engineV2Compatibility.dialog.switchToV1.error'));
		return;
	} finally {
		isSwitching.value = false;
	}

	// The open state is shared, so don't close the findings of another workflow.
	if (workflowDocumentStore.value.workflowId === workflowId) findingsDialog.close();
	toast.showMessage({
		title: i18n.baseText('engineV2Compatibility.dialog.switchToV1.success'),
		message: activeVersion
			? i18n.baseText('engineV2Compatibility.confirm.publishedVersion')
			: undefined,
		type: 'success',
	});
}
</script>

<template>
	<EngineV2CompatibilityDialog
		:open="isDialogVisible"
		@update:open="onUpdateOpen"
		:groups="groups"
		:can-switch-to-v1="!readOnly"
		:switching="isSwitching"
		@open-node="onOpenNode"
		@switch-to-v1="onSwitchToV1"
	/>
</template>
