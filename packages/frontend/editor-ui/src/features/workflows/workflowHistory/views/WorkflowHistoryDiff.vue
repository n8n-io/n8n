<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { IWorkflowDb } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import omit from 'lodash/omit';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';
import { useUsersStore } from '@/features/settings/users/users.store';
import WorkflowHistoryVersionSelect from '../components/WorkflowHistoryVersionSelect.vue';
import { useWorkflowHistoryVersionOptions } from '../useWorkflowHistoryVersionOptions';
import { telemetry } from '@/app/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

const props = defineProps<{
	workflowId: string;
	sourceWorkflowVersionId: string;
	targetWorkflowVersionId: string;
	availableVersions: WorkflowHistory[];
}>();
const emit = defineEmits<{
	close: [];
}>();

const i18n = useI18n();
const toast = useToast();
const workflowHistoryStore = useWorkflowHistoryStore();
const rootStore = useRootStore();
const workflowsListStore = useWorkflowsListStore();
const usersStore = useUsersStore();

const isLoading = ref(true);
const sourceWorkflow = ref<IWorkflowDb>();
const targetWorkflow = ref<IWorkflowDb>();
const sourceLabel = ref('');
const targetLabel = ref('');
const selectedSourceVersionId = ref(props.sourceWorkflowVersionId);
const selectedTargetVersionId = ref(props.targetWorkflowVersionId);
const currentWorkflowVersionId = ref<string>();
const publishedWorkflowVersionId = ref<string | undefined>();

// Stale response guard: only apply results from the most recent load request.
const loadRequestId = ref(0);

const { getVersionLabelById, versionOptions } = useWorkflowHistoryVersionOptions({
	availableVersions: computed(() => props.availableVersions),
	currentWorkflowVersionId,
	publishedWorkflowVersionId,
	selectedVersionIds: computed(() => [
		selectedSourceVersionId.value,
		selectedTargetVersionId.value,
	]),
	resolveUserDisplayName: (userId) => {
		if (!userId) {
			return null;
		}

		const user = usersStore.usersById[userId];
		return user?.fullName ?? user?.email ?? null;
	},
});

const loadComparedVersions = async (sourceVersionId: string, targetVersionId: string) => {
	const requestId = ++loadRequestId.value;
	isLoading.value = true;

	try {
		const [workflow, sourceWorkflowVersion, targetWorkflowVersion] = await Promise.all([
			workflowsListStore.fetchWorkflow(props.workflowId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, sourceVersionId),
			workflowHistoryStore.getWorkflowVersion(props.workflowId, targetVersionId),
		]);

		if (requestId !== loadRequestId.value) {
			// Ignore stale response: A new load request has been made since this one started.
			return;
		}

		if (
			sourceWorkflowVersion.workflowId !== props.workflowId ||
			targetWorkflowVersion.workflowId !== props.workflowId
		) {
			throw new Error(i18n.baseText('workflowDiff.versionMismatchError'));
		}

		currentWorkflowVersionId.value = workflow.versionId;
		publishedWorkflowVersionId.value = workflow.activeVersionId ?? undefined;

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

		sourceLabel.value = getVersionLabelById(sourceWorkflowVersion.versionId);
		targetLabel.value = getVersionLabelById(targetWorkflowVersion.versionId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowDiff.compareVersionsLoadError'));
		emit('close');
	} finally {
		if (requestId === loadRequestId.value) {
			isLoading.value = false;
		}
	}
};

const swapSelectedVersions = () => {
	const previousSourceVersionId = selectedSourceVersionId.value;
	selectedSourceVersionId.value = selectedTargetVersionId.value;
	selectedTargetVersionId.value = previousSourceVersionId;
};

const trackVersionSelectionInDiff = (side: 'source' | 'target', versionId: string) => {
	telemetry.track('user_selects_version_in_diff', {
		instance_id: rootStore.instanceId,
		workflow_id: props.workflowId,
		version_id: versionId,
		side,
		source: 'version_history',
	});
};

const onSourceVersionChange = (nextSourceVersionId: string) => {
	trackVersionSelectionInDiff('source', nextSourceVersionId);
	if (nextSourceVersionId === selectedTargetVersionId.value) {
		swapSelectedVersions();
		return;
	}

	selectedSourceVersionId.value = nextSourceVersionId;
};

const onTargetVersionChange = (nextTargetVersionId: string) => {
	trackVersionSelectionInDiff('target', nextTargetVersionId);
	if (nextTargetVersionId === selectedSourceVersionId.value) {
		swapSelectedVersions();
		return;
	}

	selectedTargetVersionId.value = nextTargetVersionId;
};

watch(
	() => [props.sourceWorkflowVersionId, props.targetWorkflowVersionId],
	([sourceVersionId, targetVersionId]) => {
		selectedSourceVersionId.value = sourceVersionId;
		selectedTargetVersionId.value = targetVersionId;
	},
);

watch(
	[selectedSourceVersionId, selectedTargetVersionId],
	([sourceVersionId, targetVersionId]) => {
		void loadComparedVersions(sourceVersionId, targetVersionId);
	},
	{ immediate: true },
);
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
			source="version_history"
			@back="emit('close')"
		>
			<template #sourceLabel>
				<div :class="$style.sourceBadge">
					<WorkflowHistoryVersionSelect
						:model-value="selectedSourceVersionId"
						:options="versionOptions"
						data-test-id="workflow-history-diff-source-version"
						@update:model-value="onSourceVersionChange"
					/>
				</div>
			</template>
			<template #targetLabel>
				<div :class="$style.sourceBadge">
					<WorkflowHistoryVersionSelect
						:model-value="selectedTargetVersionId"
						:options="versionOptions"
						data-test-id="workflow-history-diff-target-version"
						@update:model-value="onTargetVersionChange"
					/>
				</div>
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
	position: absolute;
	top: var(--spacing--md);
	left: var(--spacing--md);
	z-index: 1;
}
</style>
