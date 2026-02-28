<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { getVersionLabel } from '../utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import omit from 'lodash/omit';

const props = defineProps<{
	workflowId: string;
	sourceWorkflowVersionId: string;
	targetWorkflowVersionId: string;
}>();
const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const toast = useToast();
const workflowHistoryStore = useWorkflowHistoryStore();
const workflowsListStore = useWorkflowsListStore();

const isLoading = ref(true);
const sourceWorkflow = ref<IWorkflowDb>();
const targetWorkflow = ref<IWorkflowDb>();
const sourceLabel = ref('');
const targetLabel = ref('');

onMounted(async () => {
	try {
		const [workflow, sourceWorkflowVersion, targetWorkflowVersion] = await Promise.all([
			workflowsListStore.fetchWorkflow(props.workflowId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, props.sourceWorkflowVersionId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, props.targetWorkflowVersionId),
		]);

		// Hard guard in case a malformed URL mixes workflow and version IDs.
		if (
			sourceWorkflowVersion.workflowId !== props.workflowId ||
			targetWorkflowVersion.workflowId !== props.workflowId
		) {
			throw new Error(i18n.baseText('workflowDiff.versionMismatchError'));
		}

		const workflowWithoutPinData: IWorkflowDb = omit(workflow, 'pinData');

		sourceWorkflow.value = {
			...workflowWithoutPinData,
			versionId: sourceWorkflowVersion.versionId,
			nodes: sourceWorkflowVersion.nodes,
			connections: sourceWorkflowVersion.connections,
		};
		targetWorkflow.value = {
			...workflowWithoutPinData,
			versionId: targetWorkflowVersion.versionId,
			nodes: targetWorkflowVersion.nodes,
			connections: targetWorkflowVersion.connections,
		};

		const isSourceVersionLatest = sourceWorkflowVersion.versionId === workflow.versionId;
		const isTargetVersionLatest = targetWorkflowVersion.versionId === workflow.versionId;

		sourceLabel.value = isSourceVersionLatest
			? i18n.baseText('workflowHistory.item.currentChanges')
			: getVersionLabel(sourceWorkflowVersion);
		targetLabel.value = isTargetVersionLatest
			? i18n.baseText('workflowHistory.item.currentChanges')
			: getVersionLabel(targetWorkflowVersion);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowDiff.compareVersionsLoadError'));
		emit('close');
	} finally {
		isLoading.value = false;
	}
});
</script>

<template>
	<div :class="$style.container">
		<div v-if="isLoading" :class="$style.state">
			<N8nText color="text-base">{{ i18n.baseText('generic.loading') }}</N8nText>
		</div>
		<WorkflowDiffView
			v-else-if="sourceWorkflow && targetWorkflow"
			:source-workflow="sourceWorkflow"
			:target-workflow="targetWorkflow"
			:source-label="sourceLabel"
			:target-label="targetLabel"
			:show-back-button="true"
			@back="emit('close')"
		>
			<template #sourceLabel>
				<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
					{{ sourceLabel }}
				</N8nText>
			</template>
			<template #targetLabel>
				<N8nText color="text-dark" size="small" :class="$style.sourceBadge">
					{{ targetLabel }}
				</N8nText>
			</template>
		</WorkflowDiffView>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.sourceBadge {
	composes: sourceBadge from '../../workflowDiff/workflowDiff.module.scss';
}
</style>
