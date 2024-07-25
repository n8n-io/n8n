<script setup lang="ts">
import { computed, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import WorkflowExecutionsSidebar from '@/components/executions/workflow/WorkflowExecutionsSidebar.vue';
import { MAIN_HEADER_TABS, MODAL_CANCEL, MODAL_CONFIRM, VIEWS } from '@/constants';
import type { ExecutionFilterType, IWorkflowDb } from '@/Interface';
import type { ExecutionSummary } from 'n8n-workflow';
import { useMessage } from '@/composables/useMessage';
import { getNodeViewTab } from '@/utils/canvasUtils';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useUIStore } from '@/stores/ui.store';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
	loading: boolean;
	workflow?: IWorkflowDb;
	executions: ExecutionSummary[];
	filters: ExecutionFilterType;
	execution: ExecutionSummary | null;
	loadingMore: boolean;
}>();

const emit = defineEmits<{
	'execution:delete': [string | undefined];
	'execution:stop': [string | undefined];
	'execution:retry': [{ id: string; loadWorkflow: boolean }];
	'update:auto-refresh': [boolean];
	'update:filters': [ExecutionFilterType];
	'load-more': [];
	reload: [];
}>();

const router = useRouter();
const locale = useI18n();
const workflowHelpers = useWorkflowHelpers({ router });
const message = useMessage();
const uiStore = useUIStore();
const npsSurveyStore = useNpsSurveyStore();

const temporaryExecution = computed<ExecutionSummary | undefined>(() =>
	props.executions.find((execution) => execution.id === props.execution?.id)
		? undefined
		: props.execution,
);
const hidePreview = computed<boolean>(
	() => props.loading || (!props.execution && props.executions.length > 0),
);

watch(
	() => props.execution,
	(value: ExecutionSummary | null) => {
		if (!value || !props.workflow) {
			return;
		}

		router
			.push({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: props.workflow.id, executionId: value.id },
			})
			.catch(() => {});
	},
);

onBeforeRouteLeave(async (to, _, next) => {
	if (getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW) {
		next();
		return;
	}
	if (uiStore.stateIsDirty) {
		const confirmModal = await message.confirm(
			locale.baseText('generic.unsavedWork.confirmMessage.message'),
			{
				title: locale.baseText('generic.unsavedWork.confirmMessage.headline'),
				type: 'warning',
				confirmButtonText: locale.baseText('generic.unsavedWork.confirmMessage.confirmButtonText'),
				cancelButtonText: locale.baseText('generic.unsavedWork.confirmMessage.cancelButtonText'),
				showClose: true,
			},
		);

		if (confirmModal === MODAL_CONFIRM) {
			const saved = await workflowHelpers.saveCurrentWorkflow({}, false);
			if (saved) {
				await npsSurveyStore.fetchPromptsData();
			}
			uiStore.stateIsDirty = false;
			next();
		} else if (confirmModal === MODAL_CANCEL) {
			uiStore.stateIsDirty = false;
			next();
		}
	} else {
		next();
	}
});

function onDeleteCurrentExecution() {
	emit('execution:delete', props.execution?.id);
}

function onStopExecution() {
	emit('execution:stop', props.execution?.id);
}

function onRetryExecution(payload: { execution: ExecutionSummary; command: string }) {
	const loadWorkflow = payload.command === 'current-workflow';

	emit('execution:retry', {
		id: payload.execution.id,
		loadWorkflow,
	});
}
</script>

<template>
	<div :class="$style.container">
		<WorkflowExecutionsSidebar
			:executions="executions"
			:loading="loading && !executions.length"
			:loading-more="loadingMore"
			:temporary-execution="temporaryExecution"
			:workflow="workflow"
			@update:auto-refresh="emit('update:auto-refresh', $event)"
			@reload-executions="emit('reload')"
			@filter-updated="emit('update:filters', $event)"
			@load-more="emit('load-more')"
			@retry-execution="onRetryExecution"
		/>
		<div v-if="!hidePreview" :class="$style.content">
			<router-view
				name="executionPreview"
				:execution="execution"
				@delete-current-execution="onDeleteCurrentExecution"
				@retry-execution="onRetryExecution"
				@stop-execution="onStopExecution"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: 100%;
	width: 100%;
}

.content {
	flex: 1;
}
</style>
