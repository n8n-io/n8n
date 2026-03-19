<script setup lang="ts">
import WorkflowExecutionsTable from './WorkflowExecutionsTable.vue';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { MAIN_HEADER_TABS, VIEWS } from '@/app/constants';
import type { IWorkflowDb } from '@/Interface';
import type { ExecutionFilterType } from '../../executions.types';
import { getNodeViewTab } from '@/app/utils/nodeViewUtils';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';

import { N8nIconButton, N8nTooltip } from '@n8n/design-system';

const i18n = useI18n();

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

const router = useRouter();
const route = useRoute();
const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });

const showPanel = computed(() => {
	if (props.loading) return false;
	return !!props.execution || props.executions.length === 0;
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
	emit('execution:retry', {
		id: payload.execution.id,
		loadWorkflow: payload.command === 'current-workflow',
	});
};

function closePanel() {
	const workflowId = route.params.name;
	if (typeof workflowId === 'string') {
		void router.replace({
			name: VIEWS.EXECUTION_HOME,
			params: { name: workflowId },
			query: route.query,
		});
	}
}

onBeforeRouteLeave(async (to, _, next) => {
	if (getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW) {
		next();
		return;
	}
	await promptSaveUnsavedWorkflowChanges(next);
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.tableSection">
			<WorkflowExecutionsTable
				:executions="executions"
				:workflow="workflow"
				:loading="loading"
				:loading-more="loadingMore"
				:panel-open="!!execution"
				:selected-execution-id="execution?.id"
				@update:auto-refresh="emit('update:auto-refresh', $event)"
				@filter-updated="emit('update:filters', $event)"
				@load-more="emit('load-more')"
				@execution:stop-many="emit('reload')"
			/>
		</div>
		<div
			:class="[$style.sidePanel, !showPanel && $style.sidePanelClosed]"
			:data-test-id="showPanel ? 'execution-preview-panel' : undefined"
		>
			<div v-if="execution" :class="$style.panelHeader">
				<N8nTooltip :content="i18n.baseText('generic.close')">
					<N8nIconButton
						icon="x"
						type="tertiary"
						size="small"
						data-test-id="execution-preview-close-button"
						@click="closePanel"
					/>
				</N8nTooltip>
			</div>
			<div :class="$style.panelContent">
				<RouterView
					name="executionPreview"
					:execution="execution"
					@delete-current-execution="onDeleteCurrentExecution"
					@retry-execution="onRetryExecution"
					@stop-execution="onStopExecution"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.tableSection {
	flex: 1;
	min-width: 0;
	transition:
		flex var(--animation--duration) var(--animation--easing),
		min-width var(--animation--duration) var(--animation--easing);
}

.sidePanel {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	width: min(65%, 900px);
	min-width: 480px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground--shade-1);
	background: var(--color--background);
	overflow: hidden;
	transition:
		width var(--animation--duration) var(--animation--easing),
		min-width var(--animation--duration) var(--animation--easing);
}

.sidePanelClosed {
	width: 0;
	min-width: 0;
	border-left-width: 0;
}

.panelHeader {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	padding: var(--spacing--xs);
	flex-shrink: 0;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--shade-1);
}

.panelContent {
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

@include mixins.breakpoint('sm-and-down') {
	.sidePanel {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		min-width: unset;
		z-index: 1;
	}
}
</style>
