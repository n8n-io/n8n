<script lang="ts" setup>
import SelectedItemsInfo from '@/app/components/common/SelectedItemsInfo.vue';
import { useMessage } from '@/app/composables/useMessage';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { IWorkflowDb } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed, ref, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import { useExecutionsStore } from '../../executions.store';
import type { ExecutionFilterType, ExecutionSummaryWithCustomData } from '../../executions.types';
import { executionRetryMessage } from '../../executions.utils';
import { useExecutionColumns } from '../../composables/useExecutionColumns';
import ConcurrentExecutionsHeader from '../ConcurrentExecutionsHeader.vue';
import ExecutionsFilter from '../ExecutionsFilter.vue';
import ExecutionStopAllText from '../ExecutionStopAllText.vue';
import ExecutionColumnPicker from '../global/ExecutionColumnPicker.vue';
import GlobalExecutionsListItem from '../global/GlobalExecutionsListItem.vue';

import { N8nButton, N8nCheckbox, N8nHeading, N8nTableBase } from '@n8n/design-system';
import { ElSkeletonItem } from 'element-plus';

const PANEL_OPEN_COLUMNS: Array<'status' | 'startedAt' | 'runTime'> = [
	'status',
	'startedAt',
	'runTime',
];

const props = withDefaults(
	defineProps<{
		executions: ExecutionSummary[];
		workflow: IWorkflowDb;
		loading: boolean;
		loadingMore: boolean;
		panelOpen?: boolean;
		selectedExecutionId?: string;
	}>(),
	{
		loading: false,
		loadingMore: false,
		panelOpen: false,
	},
);

const emit = defineEmits<{
	'update:autoRefresh': [value: boolean];
	filterUpdated: [value: ExecutionFilterType];
	loadMore: [amount: number];
	'execution:stopMany': [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const executionsStore = useExecutionsStore();
const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const executionsWithCustomData = computed(
	() => props.executions as ExecutionSummaryWithCustomData[],
);

const { visibleColumns, toggleableColumns, isColumnVisible, toggleColumn, getColumnLabel } =
	useExecutionColumns(executionsWithCustomData, { excludeColumns: ['workflow'] });

const displayedColumns = computed(() => {
	if (props.panelOpen) {
		return visibleColumns.value.filter((col) =>
			PANEL_OPEN_COLUMNS.includes(col.id as 'status' | 'startedAt' | 'runTime'),
		);
	}
	return visibleColumns.value;
});

const displayedColumnCount = computed(() => displayedColumns.value.length);

const workflowPermissions = computed(() => getResourcePermissions(props.workflow?.scopes).workflow);

const allVisibleSelected = ref(false);
const allExistingSelected = ref(false);
const selectedItems = ref<Record<string, boolean>>({});

const message = useMessage();
const toast = useToast();

const total = computed(() => executionsStore.executionsCount);

const selectedCount = computed(() => {
	if (allExistingSelected.value) {
		return total.value;
	}
	return Object.keys(selectedItems.value).length;
});

const isAnnotationEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

const showConcurrencyHeader = computed(
	() => settingsStore.isConcurrencyEnabled && !settingsStore.isQueueModeEnabled,
);

watch(
	() => props.executions,
	() => {
		if (props.executions.length === 0) {
			handleClearSelection();
		}
		adjustSelectionAfterMoreItemsLoaded();
	},
);

function handleCheckAllExistingChange() {
	allExistingSelected.value = !allExistingSelected.value;
	allVisibleSelected.value = !allExistingSelected.value;
	handleCheckAllVisibleChange();
}

function handleCheckAllVisibleChange() {
	allVisibleSelected.value = !allVisibleSelected.value;
	if (!allVisibleSelected.value) {
		allExistingSelected.value = false;
		selectedItems.value = {};
	} else {
		selectAllVisibleExecutions();
	}
}

function toggleSelectExecution(execution: ExecutionSummary) {
	const executionId = execution.id;
	if (selectedItems.value[executionId]) {
		const { [executionId]: removedSelectedItem, ...rest } = selectedItems.value;
		selectedItems.value = rest;
	} else {
		selectedItems.value = {
			...selectedItems.value,
			[executionId]: true,
		};
	}
	allVisibleSelected.value = Object.keys(selectedItems.value).length === props.executions.length;
	allExistingSelected.value = Object.keys(selectedItems.value).length === total.value;
}

async function handleDeleteSelected() {
	const confirmationText = [
		isAnnotationEnabled.value && i18n.baseText('executionsList.confirmMessage.annotationsNote'),
		i18n.baseText('executionsList.confirmMessage.message', {
			interpolate: { count: selectedCount.value.toString() },
		}),
	]
		.filter(Boolean)
		.join(' ');

	const deleteExecutions = await message.confirm(
		confirmationText,
		i18n.baseText('executionsList.confirmMessage.headline'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('executionsList.confirmMessage.confirmButtonText'),
			cancelButtonText: i18n.baseText('executionsList.confirmMessage.cancelButtonText'),
		},
	);

	if (deleteExecutions !== MODAL_CONFIRM) {
		return;
	}

	try {
		await executionsStore.deleteExecutions({
			filters: executionsStore.executionsFilters,
			...(allExistingSelected.value
				? { deleteBefore: new Date() }
				: { ids: Object.keys(selectedItems.value) }),
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.handleDeleteSelected.title'));
		return;
	}

	toast.showMessage({
		title: i18n.baseText('executionsList.showMessage.handleDeleteSelected.title'),
		type: 'success',
	});

	handleClearSelection();
}

function handleClearSelection() {
	allVisibleSelected.value = false;
	allExistingSelected.value = false;
	selectedItems.value = {};
}

function onFilterChanged(filters: ExecutionFilterType) {
	emit('filterUpdated', filters);
	handleClearSelection();
}

function selectAllVisibleExecutions() {
	props.executions.forEach((execution: ExecutionSummary) => {
		selectedItems.value[execution.id] = true;
	});
}

function adjustSelectionAfterMoreItemsLoaded() {
	if (allExistingSelected.value) {
		allVisibleSelected.value = true;
		selectAllVisibleExecutions();
	}
}

async function retrySavedExecution(execution: ExecutionSummary) {
	await retryExecution(execution, true);
}

async function retryOriginalExecution(execution: ExecutionSummary) {
	await retryExecution(execution, false);
}

async function retryExecution(execution: ExecutionSummary, loadWorkflow?: boolean) {
	try {
		const retriedExecution = await executionsStore.retryExecution(execution.id, loadWorkflow);
		const retryMessage = executionRetryMessage(retriedExecution.status);

		if (retryMessage) {
			toast.showMessage(retryMessage);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.retryExecution.title'));
	}

	telemetry.track('User clicked retry execution button', {
		workflow_id: props.workflow.id,
		execution_id: execution.id,
		retry_type: loadWorkflow ? 'current' : 'original',
	});
}

async function stopExecution(execution: ExecutionSummary) {
	try {
		await executionsStore.stopCurrentExecution(execution.id);

		toast.showMessage({
			title: i18n.baseText('executionsList.showMessage.stopExecution.title'),
			message: i18n.baseText('executionsList.showMessage.stopExecution.message', {
				interpolate: { activeExecutionId: execution.id },
			}),
			type: 'success',
		});

		emit('execution:stopMany');
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
	}
}

async function deleteExecution(execution: ExecutionSummary) {
	const hasAnnotation =
		!!execution.annotation && (execution.annotation.vote || execution.annotation.tags.length > 0);

	if (hasAnnotation) {
		const deleteConfirmed = await message.confirm(
			i18n.baseText('executionsList.confirmMessage.annotatedExecutionMessage'),
			i18n.baseText('executionDetails.confirmMessage.headline'),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('executionDetails.confirmMessage.confirmButtonText'),
				cancelButtonText: '',
			},
		);

		if (deleteConfirmed !== MODAL_CONFIRM) {
			return;
		}
	}

	try {
		await executionsStore.deleteExecutions({ ids: [execution.id] });

		if (allVisibleSelected.value) {
			const { [execution.id]: _, ...rest } = selectedItems.value;
			selectedItems.value = rest;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.handleDeleteSelected.title'));
	}
}

async function onAutoRefreshToggle(value: boolean) {
	emit('update:autoRefresh', value);
}

const loadMoreRef = useTemplateRef<ComponentPublicInstance>('loadMoreButton');
useIntersectionObserver(loadMoreRef, ([entry]) => {
	if (!entry?.isIntersecting) return;
	emit('loadMore', 20);
});

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('concurrency', 'upgrade-concurrency');
};
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="medium" color="text-dark">
				{{ i18n.baseText('generic.executions') }}
			</N8nHeading>
		</div>
		<div :class="$style.controls">
			<ConcurrentExecutionsHeader
				v-if="showConcurrencyHeader"
				:running-executions-count="executionsStore.concurrentExecutionsCount"
				:concurrency-cap="settingsStore.concurrency"
				:is-cloud-deployment="settingsStore.isCloudDeployment"
				@go-to-upgrade="goToUpgrade"
			/>
			<N8nCheckbox
				v-else
				v-model="executionsStore.autoRefresh"
				data-test-id="execution-auto-refresh-checkbox"
				:label="i18n.baseText('executionsList.autoRefresh')"
				@update:model-value="onAutoRefreshToggle"
			/>
			<div :class="$style.controlsRight">
				<ExecutionStopAllText :executions="props.executions" />
				<ExecutionColumnPicker
					v-if="!panelOpen"
					:columns="toggleableColumns"
					:is-column-visible="isColumnVisible"
					:get-column-label="getColumnLabel"
					@toggle-column="toggleColumn"
				/>
				<ExecutionsFilter
					popover-side="right"
					popover-align="start"
					@filter-changed="onFilterChanged"
				/>
			</div>
		</div>
		<div :class="$style.tableWrapper">
			<div :class="$style.table">
				<N8nTableBase>
					<thead>
						<tr v-if="allVisibleSelected && total > 0">
							<th style="width: 50px">
								<N8nCheckbox
									:model-value="allExistingSelected"
									data-test-id="select-all-executions-checkbox"
									class="mb-0"
									@update:model-value="handleCheckAllExistingChange"
								/>
							</th>
							<th :colspan="displayedColumnCount + (panelOpen ? 1 : 2)">
								{{
									i18n.baseText('executionsList.selectAll', {
										adjustToNumber: total,
										interpolate: { count: `${total}` },
									})
								}}
							</th>
						</tr>
						<tr>
							<th style="width: 50px">
								<N8nCheckbox
									:model-value="allVisibleSelected"
									:disabled="total < 1"
									data-test-id="select-visible-executions-checkbox"
									class="mb-0"
									@update:model-value="handleCheckAllVisibleChange"
								/>
							</th>
							<th
								v-for="col in displayedColumns"
								:key="col.id"
								:style="col.width ? { width: col.width } : {}"
							>
								{{ getColumnLabel(col) }}
							</th>
							<th style="width: 69px"></th>
							<th v-if="!panelOpen" style="width: 50px"></th>
						</tr>
					</thead>
					<tbody>
						<GlobalExecutionsListItem
							v-for="execution in executionsWithCustomData"
							:key="execution.id"
							:execution="execution"
							:visible-columns="displayedColumns"
							:workflow-name="workflow.name"
							:workflow-id="workflow.id"
							:workflow-permissions="workflowPermissions"
							:selected="selectedItems[execution.id] || allExistingSelected"
							:concurrency-cap="settingsStore.concurrency"
							:is-cloud-deployment="settingsStore.isCloudDeployment"
							:hide-actions="panelOpen"
							:selected-execution-id="props.selectedExecutionId"
							data-test-id="workflow-execution-list-item"
							@stop="stopExecution"
							@delete="deleteExecution"
							@select="toggleSelectExecution"
							@retry-saved="retrySavedExecution"
							@retry-original="retryOriginalExecution"
							@go-to-upgrade="goToUpgrade"
						/>
						<template v-if="loading && !executions.length">
							<tr v-for="item in executionsStore.itemsPerPage" :key="item">
								<td v-for="col in displayedColumnCount + (panelOpen ? 2 : 3)" :key="col">
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
						<tr>
							<td :colspan="displayedColumnCount + (panelOpen ? 2 : 3)" style="text-align: center">
								<template v-if="!executions.length && !loading">
									<span data-test-id="execution-list-empty">
										{{ i18n.baseText('executionsList.empty') }}
									</span>
								</template>
								<template v-else-if="total > executions.length">
									<N8nButton
										ref="loadMoreButton"
										icon="refresh-cw"
										:title="i18n.baseText('executionsList.loadMore')"
										:label="i18n.baseText('executionsList.loadMore')"
										:loading="loadingMore"
										data-test-id="load-more-button"
										@click="emit('loadMore', 20)"
									/>
								</template>
								<template v-else-if="executions.length > 0">
									{{ i18n.baseText('executionsList.loadedAll') }}
								</template>
							</td>
						</tr>
					</tbody>
				</N8nTableBase>
			</div>
		</div>
		<SelectedItemsInfo
			:selected-count="selectedCount"
			@delete-selected="handleDeleteSelected"
			@clear-selection="handleClearSelection"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing--lg) var(--spacing--2xl);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: 100%;
	height: 100%;
}

.header {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--sm);
}

.controls {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	margin-bottom: var(--spacing--sm);
}

.controlsRight {
	display: flex;
	align-items: center;
	margin-left: auto;
	gap: var(--spacing--sm);
}

.tableWrapper {
	flex-shrink: 1;
	max-height: 100%;
	overflow: auto;
}

.table {
	height: 100%;
	flex: 0 1 auto;
}
</style>
