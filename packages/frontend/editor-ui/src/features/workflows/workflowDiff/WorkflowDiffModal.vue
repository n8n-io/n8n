<script setup lang="ts">
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { useToast } from '@n8n/composables/useToast';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import type { IWorkflowDb } from '@/Interface';
import type { SourceControlledFileStatus } from '@n8n/api-types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { useAsyncState } from '@vueuse/core';
import { computed, onMounted, onUnmounted, ref, useCssModule } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { telemetry } from '@/app/plugins/telemetry';
import { useRootStore } from '@n8n/stores/useRootStore';

import { N8nDialog, N8nDialogBody, N8nIcon, N8nText } from '@n8n/design-system';

const props = defineProps<{
	data: {
		eventBus: EventBus;
		workflowId: string;
		direction: 'push' | 'pull';
		workflowStatus?: SourceControlledFileStatus;
	};
}>();

const toast = useToast();
const uiStore = useUIStore();
const $style = useCssModule();
const modalOpen = computed(() => uiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY]?.open === true);
const nodeTypesStore = useNodeTypesStore();
const sourceControlStore = useSourceControlStore();
const i18n = useI18n();
const router = useRouter();
const route = useRoute();

const workflowsListStore = useWorkflowsListStore();

const manualAsyncConfiguration = {
	resetOnExecute: true,
	shallow: false,
	immediate: false,
} as const;

const isClosed = ref(false);

const handleBeforeClose = (): boolean | void => {
	if (isClosed.value) return;
	isClosed.value = true;

	if (window.history.length > 1) {
		router.back();
	} else {
		const newQuery = { ...route.query };
		delete newQuery.diff;
		delete newQuery.direction;
		void router.replace({ query: newQuery });
	}
};

async function closeDialog() {
	if (uiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY]?.open !== true) return;
	const shouldClose = await handleBeforeClose();
	if (shouldClose === false) return;
	uiStore.closeModal(WORKFLOW_DIFF_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}

function preventEscapeDismiss(event: KeyboardEvent) {
	event.preventDefault();
}

const handleEscapeKey = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		handleBeforeClose();
	}
};

const remote = useAsyncState<{ workflow?: IWorkflowDb; remote: boolean } | undefined, [], false>(
	async () => {
		if (props.data.direction === 'push' && props.data.workflowStatus === 'created') {
			return { workflow: undefined, remote: true };
		}

		try {
			const { workflowId } = props.data;
			const { content: workflow } = await sourceControlStore.getRemoteWorkflow(workflowId);
			return { workflow, remote: true };
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			handleBeforeClose();
			return { workflow: undefined, remote: true };
		}
	},
	undefined,
	manualAsyncConfiguration,
);

const local = useAsyncState<{ workflow?: IWorkflowDb; remote: boolean } | undefined, [], false>(
	async () => {
		try {
			const { workflowId } = props.data;
			const workflow = await workflowsListStore.fetchWorkflow(workflowId);
			return { workflow, remote: false };
		} catch (error) {
			toast.showError(error, i18n.baseText('generic.error'));
			handleBeforeClose();
			return { workflow: undefined, remote: false };
		}
	},
	undefined,
	manualAsyncConfiguration,
);

const sourceWorkFlow = computed(() => (props.data.direction === 'push' ? remote : local));
const targetWorkFlow = computed(() => (props.data.direction === 'push' ? local : remote));
const sourceWorkflow = computed(() => sourceWorkFlow.value.state.value?.workflow);
const targetWorkflow = computed(() => targetWorkFlow.value.state.value?.workflow);
const isSourceWorkflowNew = computed(() => !sourceWorkflow.value && !!targetWorkflow.value);

function getWorkflowLabel(isRemote: boolean): string {
	return isRemote
		? i18n.baseText('workflowDiff.remote', {
				interpolate: { branchName: sourceControlStore.preferences.branchName },
			})
		: i18n.baseText('workflowDiff.local');
}

const sourceLabel = computed(() =>
	getWorkflowLabel(sourceWorkFlow.value.state.value?.remote ?? false),
);
const targetLabel = computed(() =>
	getWorkflowLabel(targetWorkFlow.value.state.value?.remote ?? false),
);

onMounted(async () => {
	props.data.eventBus.on('close', closeDialog);
	document.addEventListener('keydown', handleEscapeKey, true);
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	void remote.execute();
	void local.execute();
	telemetry.track('user_clicks_compare_workflows', {
		instance_id: useRootStore().instanceId,
		workflow_id: props.data.workflowId,
		source: 'push_pull_modal',
	});
});

onUnmounted(() => {
	props.data.eventBus.off('close', closeDialog);
	document.removeEventListener('keydown', handleEscapeKey, true);
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="cover"
		:show-close-button="false"
		:container-class="$style.workflowDiffModal"
		@update:open="onDialogOpenUpdate"
		@escape-key-down="preventEscapeDismiss"
	>
		<N8nDialogBody>
			<div :class="$style.diffBody" data-test-id="workflowDiff-modal">
				<WorkflowDiffView
					:source-workflow="sourceWorkflow"
					:target-workflow="targetWorkflow"
					:source-label="sourceLabel"
					:target-label="targetLabel"
					:show-back-button="true"
					source="push_pull_modal"
					@back="handleBeforeClose"
				>
					<template #sourceLabel>
						<N8nText
							v-if="sourceWorkFlow.state.value"
							color="text-dark"
							size="small"
							:class="$style.sourceBadge"
						>
							<N8nIcon v-if="sourceWorkFlow.state.value.remote" icon="git-branch" />
							{{ sourceLabel }}
						</N8nText>
					</template>
					<template #sourceEmptyText>
						<N8nText v-if="sourceWorkFlow.state.value?.remote" color="text-base">{{
							isSourceWorkflowNew
								? i18n.baseText('workflowDiff.newWorkflow.remote')
								: i18n.baseText('workflowDiff.deletedWorkflow.remote')
						}}</N8nText>
						<N8nText v-else color="text-base">{{
							isSourceWorkflowNew
								? i18n.baseText('workflowDiff.newWorkflow.database')
								: i18n.baseText('workflowDiff.deletedWorkflow.database')
						}}</N8nText>
					</template>
					<template #targetLabel>
						<N8nText
							v-if="targetWorkFlow.state.value"
							color="text-dark"
							size="small"
							:class="$style.sourceBadge"
						>
							<N8nIcon v-if="targetWorkFlow.state.value.remote" icon="git-branch" />
							{{ targetLabel }}
						</N8nText>
					</template>
					<template #targetEmptyText>
						<N8nText v-if="targetWorkFlow.state.value?.remote" color="text-base">{{
							i18n.baseText('workflowDiff.deletedWorkflow.remote')
						}}</N8nText>
						<N8nText v-else color="text-base">{{
							i18n.baseText('workflowDiff.deletedWorkflow.database')
						}}</N8nText>
					</template>
				</WorkflowDiffView>
			</div>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style module lang="scss">
.workflowDiffModal.workflowDiffModal {
	display: flex;
	flex-direction: column;
	margin-bottom: 0;
	padding: 0;
	--n8n-dialog-content--padding: 0;
	border-radius: 0;
	overflow: hidden;
}

.diffBody {
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.sourceBadge {
	composes: sourceBadge from './workflowDiff.module.scss';
}
</style>
