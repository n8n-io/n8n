<script setup lang="ts">
import { computed, watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import WorkflowExecutionsSidebar from '@/components/executions/workflow/WorkflowExecutionsSidebar.vue';
import {
	EnterpriseEditionFeature,
	EXECUTION_ANNOTATION_EXPERIMENT,
	MAIN_HEADER_TABS,
	VIEWS,
} from '@/constants';
import type { ExecutionFilterType, IWorkflowDb } from '@/Interface';
import type { ExecutionSummary } from 'n8n-workflow';
import { getNodeViewTab } from '@/utils/canvasUtils';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { usePostHog } from '@/stores/posthog.store';
import { useSettingsStore } from '@/stores/settings.store';

const props = withDefaults(
	defineProps<{
		loading: boolean;
		workflow: IWorkflowDb;
		executions: ExecutionSummary[];
		execution?: ExecutionSummary;
		loadingMore: boolean;
	}>(),
	{
		loading: false,
		executions: () => [] as ExecutionSummary[],
		loadingMore: false,
	},
);

const emit = defineEmits<{
	'execution:delete': [value: string];
	'execution:stop': [value: string];
	'execution:retry': [value: { id: string; loadWorkflow: boolean }];
	'update:auto-refresh': [value: boolean];
	'update:filters': [value: ExecutionFilterType];
	'load-more': [];
	reload: [];
}>();

const workflowHelpers = useWorkflowHelpers({ router: useRouter() });
const router = useRouter();

const posthogStore = usePostHog();
const settingsStore = useSettingsStore();

const isAdvancedExecutionFilterEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);
const isAnnotationEnabled = computed(
	() =>
		isAdvancedExecutionFilterEnabled.value &&
		posthogStore.isFeatureEnabled(EXECUTION_ANNOTATION_EXPERIMENT),
);

const temporaryExecution = computed<ExecutionSummary | undefined>(() =>
	props.executions.find((execution) => execution.id === props.execution?.id)
		? undefined
		: props.execution ?? undefined,
);

const hidePreview = computed(() => {
	return props.loading || (!props.execution && props.executions.length);
});

const onDeleteCurrentExecution = () => {
	if (!props.execution?.id) return;

	emit('execution:delete', props.execution.id);
};

const onStopExecution = () => {
	if (!props.execution?.id) return;

	emit('execution:stop', props.execution.id);
};

const onRetryExecution = (payload: { execution: ExecutionSummary; command: string }) => {
	const loadWorkflow = payload.command === 'current-workflow';

	emit('execution:retry', {
		id: payload.execution.id,
		loadWorkflow,
	});
};

watch(
	() => props.execution,
	(value: ExecutionSummary | undefined) => {
		if (!value) {
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

	await workflowHelpers.promptSaveUnsavedWorkflowChanges(next);
});
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
		<WorkflowExecutionAnnotationSidebar
			v-if="isAnnotationEnabled && execution"
			:execution="execution"
		/>
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
