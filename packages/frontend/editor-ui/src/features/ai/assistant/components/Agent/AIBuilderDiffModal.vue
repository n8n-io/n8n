<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nDialog, N8nDialogBody } from '@n8n/design-system';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { AI_BUILDER_DIFF_MODAL_KEY } from '@/app/constants';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { IWorkflowDb } from '@/Interface';
import type { EventBus } from '@n8n/utils/event-bus';
import { useBuilderStore } from '../../builder.store';
import { useUIStore } from '@/app/stores/ui.store';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data: {
		eventBus: EventBus;
		sourceWorkflow: IWorkflowDb;
		targetWorkflow: IWorkflowDb;
		sourceLabel: string;
		targetLabel: string;
	};
}>();

const telemetry = useTelemetry();
const builderStore = useBuilderStore();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[AI_BUILDER_DIFF_MODAL_KEY]?.open === true);

onMounted(() => {
	telemetry.track('Workflow diff view opened', { source: 'ai-builder-review' });
	builderStore.trackWorkflowBuilderJourney('user_opened_review_changes');
});

function handleBeforeClose(): boolean {
	telemetry.track('Workflow diff view closed', { source: 'ai-builder-review' });
	builderStore.trackWorkflowBuilderJourney('user_closed_review_changes');
	return true;
}

function closeModal() {
	uiStore.closeModal(AI_BUILDER_DIFF_MODAL_KEY);
}

async function closeDialog() {
	if (uiStore.modalsById[AI_BUILDER_DIFF_MODAL_KEY]?.open !== true) {
		return;
	}

	const shouldClose = await handleBeforeClose();
	if (shouldClose === false) {
		return;
	}

	closeModal();
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="cover"
		stacked
		:show-close-button="false"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<WorkflowDiffView
				:source-workflow="props.data.sourceWorkflow"
				:target-workflow="props.data.targetWorkflow"
				:source-label="props.data.sourceLabel"
				:target-label="props.data.targetLabel"
				:show-back-button="true"
				@back="closeModal"
			/>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style module lang="scss">
.backButton {
	border: none;
}
</style>
