<template>
	<div :class="$style.container">
		<WorkflowExecutionsSidebar
			:executions="filteredExecutions"
			:loading="loading && !filteredExecutions.length"
			:loading-more="loadingMore"
			:temporary-execution="temporaryExecution"
			:auto-refresh="uiStore.executionSidebarAutoRefresh"
			@update:auto-refresh="$emit('update:auto-refresh', $event)"
			@reload-executions="$emit('reload')"
			@filter-updated="$emit('update:filters', $event)"
			@load-more="$emit('load-more')"
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

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';

import WorkflowExecutionsSidebar from '@/components/executions/workflow/WorkflowExecutionsSidebar.vue';
import {
	MAIN_HEADER_TABS,
	MODAL_CANCEL,
	MODAL_CONFIRM,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	VIEWS,
} from '@/constants';
import type { ExecutionFilterType, IWorkflowDb } from '@/Interface';
import type { ExecutionSummary, IDataObject } from 'n8n-workflow';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { getNodeViewTab } from '@/utils/canvasUtils';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useTagsStore } from '@/stores/tags.store';
import { executionFilterToQueryFilter } from '@/utils/executionUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useDebounce } from '@/composables/useDebounce';

export default defineComponent({
	name: 'ExecutionsList',
	components: {
		WorkflowExecutionsSidebar,
	},
	mixins: [workflowHelpers],
	async beforeRouteLeave(to, _, next) {
		if (getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW) {
			next();
			return;
		}
		if (this.uiStore.stateIsDirty) {
			const confirmModal = await this.confirm(
				this.$locale.baseText('generic.unsavedWork.confirmMessage.message'),
				{
					title: this.$locale.baseText('generic.unsavedWork.confirmMessage.headline'),
					type: 'warning',
					confirmButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.confirmButtonText',
					),
					cancelButtonText: this.$locale.baseText(
						'generic.unsavedWork.confirmMessage.cancelButtonText',
					),
					showClose: true,
				},
			);

			if (confirmModal === MODAL_CONFIRM) {
				const saved = await this.saveCurrentWorkflow({}, false);
				if (saved) {
					await this.settingsStore.fetchPromptsData();
				}
				this.uiStore.stateIsDirty = false;
				next();
			} else if (confirmModal === MODAL_CANCEL) {
				this.uiStore.stateIsDirty = false;
				next();
			}
		} else {
			next();
		}
	},
	props: {
		loading: {
			type: Boolean,
			default: false,
		},
		workflow: {
			type: Object as PropType<IWorkflowDb>,
			required: true,
		},
		executions: {
			type: Array as PropType<ExecutionSummary[]>,
			default: () => [],
		},
		filteredExecutions: {
			type: Array as PropType<ExecutionSummary[]>,
			default: () => [],
		},
		filters: {
			type: Object as PropType<ExecutionFilterType>,
			default: () => ({}),
		},
		execution: {
			type: Object as PropType<ExecutionSummary>,
			default: null,
		},
		loadingMore: {
			type: Boolean,
			default: false,
		},
	},
	emits: [
		'execution:delete',
		'execution:stop',
		'execution:retry',
		'update:auto-refresh',
		'update:filters',
		'load-more',
		'reload',
	],
	setup() {
		const externalHooks = useExternalHooks();
		const { callDebounced } = useDebounce();

		return {
			externalHooks,
			callDebounced,
			...useToast(),
			...useMessage(),
		};
	},
	computed: {
		...mapStores(useTagsStore, useNodeTypesStore, useSettingsStore, useUIStore),
		temporaryExecution(): ExecutionSummary | undefined {
			const isTemporary = !this.executions.find((execution) => execution.id === this.execution?.id);
			return isTemporary ? this.execution : undefined;
		},
		hidePreview(): boolean {
			return this.loading || !this.execution;
		},
		filterApplied(): boolean {
			return this.filters.status !== 'all';
		},
		workflowDataNotLoaded(): boolean {
			return this.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID && this.workflow.name === '';
		},
		requestFilter(): IDataObject {
			return executionFilterToQueryFilter({
				...this.filters,
				workflowId: this.workflow.id,
			});
		},
	},
	watch: {
		execution(value: ExecutionSummary) {
			if (!value) {
				return;
			}

			this.$router
				.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: { name: this.workflow.id, executionId: value.id },
				})
				.catch(() => {});
		},
	},
	methods: {
		async onDeleteCurrentExecution(): Promise<void> {
			this.$emit('execution:delete', this.execution.id);
		},
		async onStopExecution(): Promise<void> {
			this.$emit('execution:stop', this.execution.id);
		},
		async onRetryExecution(payload: { execution: ExecutionSummary; command: string }) {
			const loadWorkflow = payload.command === 'current-workflow';

			this.$emit('execution:retry', {
				id: payload.execution.id,
				loadWorkflow,
			});
		},
	},
});
</script>

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
