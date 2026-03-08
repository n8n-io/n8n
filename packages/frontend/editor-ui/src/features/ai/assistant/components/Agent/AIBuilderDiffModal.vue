<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { AI_BUILDER_DIFF_MODAL_KEY } from '@/app/constants';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import type { IWorkflowDb } from '@/Interface';
import type { EventBus } from '@n8n/utils/event-bus';
import { N8nIconButton } from '@n8n/design-system';
import { onMounted, useCssModule } from 'vue';
import { useBuilderStore } from '../../builder.store';
import { useUIStore } from '@/app/stores/ui.store';

const props = defineProps<{
	data: {
		eventBus: EventBus;
		sourceWorkflow: IWorkflowDb;
		targetWorkflow: IWorkflowDb;
		sourceLabel: string;
		targetLabel: string;
	};
}>();

const $style = useCssModule();
const telemetry = useTelemetry();
const builderStore = useBuilderStore();
const uiStore = useUIStore();

onMounted(() => {
	telemetry.track('Workflow diff view opened', { source: 'ai-builder-review' });
	builderStore.trackWorkflowBuilderJourney('user_opened_review_changes');
});

function handleBeforeClose() {
	telemetry.track('Workflow diff view closed', { source: 'ai-builder-review' });
	builderStore.trackWorkflowBuilderJourney('user_closed_review_changes');
}

function closeModal() {
	uiStore.closeModal(AI_BUILDER_DIFF_MODAL_KEY);
}
</script>

<template>
	<Modal
		:event-bus="data.eventBus"
		:name="AI_BUILDER_DIFF_MODAL_KEY"
		:custom-class="$style.aiBuilderDiffModal"
		height="100%"
		width="100%"
		max-width="100%"
		max-height="100%"
		:close-on-press-escape="true"
		:append-to-body="true"
		:before-close="handleBeforeClose"
	>
		<template #content>
			<WorkflowDiffView
				:source-workflow="props.data.sourceWorkflow"
				:target-workflow="props.data.targetWorkflow"
				:source-label="props.data.sourceLabel"
				:target-label="props.data.targetLabel"
			>
				<template #header-prefix>
					<div :class="[$style.backButtonContainer, 'mr-xs']">
						<N8nIconButton
							icon="arrow-left"
							type="tertiary"
							:class="[$style.backButton, 'mr-xs']"
							icon-size="large"
							data-test-id="ai-builder-diff-back-button"
							@click="closeModal"
						/>
					</div>
				</template>
			</WorkflowDiffView>
		</template>
	</Modal>
</template>

<style module lang="scss">
.aiBuilderDiffModal {
	margin-bottom: 0;
	border-radius: 0;

	:global(.el-dialog__body) {
		padding: 0;
	}
	:global(.el-dialog__header) {
		display: none;
	}
	:global(.el-dialog__headerbtn) {
		display: none;
	}
}

.backButton {
	border: none;
}

.backButtonContainer {
	border-right: 1px solid var(--color--foreground);
}
</style>
