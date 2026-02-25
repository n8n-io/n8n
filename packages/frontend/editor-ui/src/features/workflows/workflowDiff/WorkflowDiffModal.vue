<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { useToast } from '@/app/composables/useToast';
import { WORKFLOW_DIFF_MODAL_KEY } from '@/app/constants';
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

import { N8nIcon, N8nText } from '@n8n/design-system';

const props = defineProps<{
	data: {
		eventBus: EventBus;
		workflowId: string;
		direction: 'push' | 'pull';
		workflowStatus?: SourceControlledFileStatus;
	};
}>();

const toast = useToast();
const $style = useCssModule();
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

const handleBeforeClose = () => {
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
	document.addEventListener('keydown', handleEscapeKey, true);
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
	void remote.execute();
	void local.execute();
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleEscapeKey, true);
});
</script>

<template>
	<Modal
		:event-bus="data.eventBus"
		:name="WORKFLOW_DIFF_MODAL_KEY"
		:custom-class="$style.workflowDiffModal"
		height="100%"
		width="100%"
		max-width="100%"
		max-height="100%"
		:close-on-press-escape="false"
		:show-close="false"
		@before-close="handleBeforeClose"
	>
		<template #content>
			<WorkflowDiffView
				:source-workflow="sourceWorkflow"
				:target-workflow="targetWorkflow"
				:source-label="sourceLabel"
				:target-label="targetLabel"
				:show-back-button="true"
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
		</template>
	</Modal>
</template>

<style module lang="scss">
.workflowDiffModal {
	margin-bottom: 0;
	border-radius: 0;

	:global(.el-dialog__header) {
		display: none;
		padding: 0;
		margin: 0;
	}

	:global(.el-dialog__body) {
		padding: 0;
	}
	:global(.el-dialog__headerbtn) {
		display: none;
	}
}

.sourceBadge {
	composes: sourceBadge from './workflowDiff.module.scss';
}
</style>
