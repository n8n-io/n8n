<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { generateVersionName } from '../utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';

const props = defineProps<{
	workflowId: string;
	baseVersionId: string;
	compareWithVersionId: string;
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

function getVersionLabel(versionId: string, name: string | null): string {
	if (name?.trim()) {
		return name;
	}

	return generateVersionName(versionId);
}

onMounted(async () => {
	try {
		const [workflow, leftVersion, rightVersion] = await Promise.all([
			workflowsListStore.fetchWorkflow(props.workflowId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, props.baseVersionId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, props.compareWithVersionId),
		]);

		// Hard guard in case a malformed URL mixes workflow and version IDs.
		if (
			leftVersion.workflowId !== props.workflowId ||
			rightVersion.workflowId !== props.workflowId
		) {
			throw new Error(i18n.baseText('workflowDiff.versionMismatchError'));
		}

		const workflowWithoutPinData = { ...workflow, pinData: undefined };

		sourceWorkflow.value = {
			...workflowWithoutPinData,
			versionId: leftVersion.versionId,
			nodes: leftVersion.nodes,
			connections: leftVersion.connections,
		};
		targetWorkflow.value = {
			...workflowWithoutPinData,
			versionId: rightVersion.versionId,
			nodes: rightVersion.nodes,
			connections: rightVersion.connections,
		};

		sourceLabel.value = getVersionLabel(leftVersion.versionId, leftVersion.name);
		targetLabel.value = getVersionLabel(rightVersion.versionId, rightVersion.name);
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
