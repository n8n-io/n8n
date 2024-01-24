<script lang="ts" setup>
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import ExecutionsGlobalListItem from '@/components/executions/global/ListItem.vue';
import { MODAL_CONFIRM } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { ExecutionFilterType, IWorkflowDb } from '@/Interface';
import type { ExecutionSummary } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isEmpty } from '@/utils/typesUtils';
import { setPageTitle } from '@/utils/htmlUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useExecutionsStore } from '@/stores/executions.store';

const emit = defineEmits(['closeModal']);

const i18n = useI18n();
const telemetry = useTelemetry();
const externalHooks = useExternalHooks();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();

const isMounted = ref(false);
const allVisibleSelected = ref(false);
const allExistingSelected = ref(false);
const selectedItems = ref<Record<string, boolean>>({});

const message = useMessage();
const toast = useToast();

const selectedCount = computed(() => {
	if (allExistingSelected.value) {
		return executionsStore.executionsCount;
	}

	return Object.keys(selectedItems.value).length;
});

const pageTitle = computed(() => {
	return i18n.baseText('executionsList.workflowExecutions');
});

const workflows = computed<IWorkflowDb[]>(() => {
	return [
		{
			id: 'all',
			name: i18n.baseText('executionsList.allWorkflows'),
		} as IWorkflowDb,
		...workflowsStore.allWorkflows,
	];
});

onBeforeMount(async () => {
	await loadWorkflows();

	void externalHooks.run('executionsList.openDialog');
	telemetry.track('User opened Executions log', {
		workflow_id: workflowsStore.workflowId,
	});
});

onMounted(() => {
	setPageTitle(`n8n - ${pageTitle.value}`);

	void executionsStore.initialize();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	executionsStore.terminate();
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});

async function handleAutoRefreshToggle(value: boolean) {
	if (value) {
		await executionsStore.startAutoRefreshInterval();
	} else {
		executionsStore.stopAutoRefreshInterval();
	}
}

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
	allVisibleSelected.value =
		Object.keys(selectedItems.value).length === executionsStore.filteredExecutions.length;
	allExistingSelected.value =
		Object.keys(selectedItems.value).length === executionsStore.executionsCount;
}

async function handleDeleteSelected() {
	const deleteExecutions = await message.confirm(
		i18n.baseText('executionsList.confirmMessage.message', {
			interpolate: { count: selectedCount.value.toString() },
		}),
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
				? { deleteBefore: executionsStore.executions[0].startedAt as Date }
				: {
						ids: Object.keys(selectedItems.value),
				  }),
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

async function onFilterChanged(filters: ExecutionFilterType) {
	executionsStore.setFilters(filters);
	await refreshData();
	handleClearSelection();
	isMounted.value = true;
}

function getExecutionWorkflowName(execution: ExecutionSummary): string {
	return (
		getWorkflowName(execution.workflowId ?? '') || i18n.baseText('executionsList.unsavedWorkflow')
	);
}

function getWorkflowName(workflowId: string): string | undefined {
	return workflows.value.find((data: IWorkflowDb) => data.id === workflowId)?.name;
}

async function loadCurrentExecutions(): Promise<void> {
	if (isEmpty(executionsStore.currentExecutionsFilters.metadata)) {
		await executionsStore.fetchCurrentExecutions();
	}
}

async function loadFinishedExecutions(): Promise<void> {
	if (executionsStore.filters.status === 'running') {
		return;
	}

	await executionsStore.fetchPastExecutions();

	if (executionsStore.executions.length === 0) {
		handleClearSelection();
	}
}

async function loadMore() {
	if (executionsStore.filters.status === 'running') {
		return;
	}

	let lastId: string | undefined;
	if (executionsStore.executions.length !== 0) {
		const lastItem = executionsStore.executions.slice(-1)[0];
		lastId = lastItem.id;
	}

	try {
		await executionsStore.fetchPastExecutions(executionsStore.executionsFilters, lastId);
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.loadMore.title'));
		return;
	}

	adjustSelectionAfterMoreItemsLoaded();
}

function selectAllVisibleExecutions() {
	executionsStore.filteredExecutions.forEach((execution: ExecutionSummary) => {
		selectedItems.value[execution.id] = true;
	});
}

function adjustSelectionAfterMoreItemsLoaded() {
	if (allExistingSelected.value) {
		allVisibleSelected.value = true;
		selectAllVisibleExecutions();
	}
}

async function loadWorkflows() {
	try {
		await workflowsStore.fetchAllWorkflows();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.loadWorkflows.title'));
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
		const retrySuccessful = await executionsStore.retryExecution(execution.id, loadWorkflow);

		if (retrySuccessful) {
			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
				type: 'success',
			});
		} else {
			toast.showMessage({
				title: i18n.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
				type: 'error',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.retryExecution.title'));
	}

	telemetry.track('User clicked retry execution button', {
		workflow_id: workflowsStore.workflowId,
		execution_id: execution.id,
		retry_type: loadWorkflow ? 'current' : 'original',
	});
}

async function refreshData() {
	try {
		await Promise.all([loadCurrentExecutions(), loadFinishedExecutions()]);
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.refreshData.title'));
	}
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

		await refreshData();
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
	}
}

async function deleteExecution(execution: ExecutionSummary) {
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

function onDocumentVisibilityChange() {
	if (document.visibilityState === 'hidden') {
		executionsStore.stopAutoRefreshInterval();
	} else {
		void executionsStore.startAutoRefreshInterval();
	}
}
</script>

<template>
	<div :class="['executions-list', $style.execListWrapper]">
		<div :class="$style.execList">
			<div :class="$style.execListHeader">
				<n8n-heading tag="h1" size="2xlarge">{{ pageTitle }}</n8n-heading>
				<div :class="$style.execListHeaderControls">
					<n8n-loading v-if="!isMounted" :class="$style.filterLoader" variant="custom" />
					<el-checkbox
						v-else
						:model-value="executionsStore.autoRefresh"
						class="mr-xl"
						data-test-id="execution-auto-refresh-checkbox"
						@update:model-value="handleAutoRefreshToggle"
					>
						{{ i18n.baseText('executionsList.autoRefresh') }}
					</el-checkbox>
					<ExecutionFilter
						v-show="isMounted"
						:workflows="workflows"
						@filter-changed="onFilterChanged"
					/>
				</div>
			</div>

			<el-checkbox
				v-if="allVisibleSelected && executionsStore.executionsCount > 0"
				:class="$style.selectAll"
				:label="
					i18n.baseText('executionsList.selectAll', {
						adjustToNumber: executionsStore.executionsCount,
						interpolate: { executionNum: `${executionsStore.executionsCount}` },
					})
				"
				:model-value="allExistingSelected"
				data-test-id="select-all-executions-checkbox"
				@update:model-value="handleCheckAllExistingChange"
			/>

			<div v-if="!isMounted">
				<n8n-loading :class="$style.tableLoader" variant="custom" />
				<n8n-loading :class="$style.tableLoader" variant="custom" />
				<n8n-loading :class="$style.tableLoader" variant="custom" />
			</div>
			<table v-else :class="$style.execTable">
				<thead>
					<tr>
						<th>
							<el-checkbox
								:model-value="allVisibleSelected"
								:disabled="executionsStore.executionsCount < 1"
								label=""
								data-test-id="select-visible-executions-checkbox"
								@update:model-value="handleCheckAllVisibleChange"
							/>
						</th>
						<th>{{ i18n.baseText('executionsList.name') }}</th>
						<th>{{ i18n.baseText('executionsList.startedAt') }}</th>
						<th>{{ i18n.baseText('executionsList.status') }}</th>
						<th>{{ i18n.baseText('executionsList.id') }}</th>
						<th></th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<TransitionGroup tag="tbody" name="executions-list">
					<ExecutionsGlobalListItem
						v-for="execution in executionsStore.filteredExecutions"
						:key="execution.id"
						:execution="execution"
						:workflow-name="getExecutionWorkflowName(execution)"
						:selected="selectedItems[execution.id] || allExistingSelected"
						@stop="stopExecution"
						@delete="deleteExecution"
						@select="toggleSelectExecution"
						@retry-saved="retrySavedExecution"
						@retry-original="retryOriginalExecution"
					/>
				</TransitionGroup>
			</table>

			<div
				v-if="!executionsStore.filteredExecutions.length && isMounted && !executionsStore.loading"
				:class="$style.loadedAll"
				data-test-id="execution-list-empty"
			>
				{{ i18n.baseText('executionsList.empty') }}
			</div>
			<div
				v-else-if="
					executionsStore.executionsCount > executionsStore.executions.length ||
					executionsStore.executionsCountEstimated
				"
				:class="$style.loadMore"
			>
				<n8n-button
					icon="sync"
					:title="i18n.baseText('executionsList.loadMore')"
					:label="i18n.baseText('executionsList.loadMore')"
					:loading="executionsStore.loading"
					data-test-id="load-more-button"
					@click="loadMore()"
				/>
			</div>
			<div
				v-else-if="isMounted && !executionsStore.loading"
				:class="$style.loadedAll"
				data-test-id="execution-all-loaded"
			>
				{{ i18n.baseText('executionsList.loadedAll') }}
			</div>
		</div>
		<div
			v-if="selectedCount > 0"
			:class="$style.selectionOptions"
			data-test-id="selected-executions-info"
		>
			<span>
				{{
					i18n.baseText('executionsList.selected', {
						adjustToNumber: selectedCount,
						interpolate: { count: `${selectedCount}` },
					})
				}}
			</span>
			<n8n-button
				:label="i18n.baseText('generic.delete')"
				type="tertiary"
				data-test-id="delete-selected-button"
				@click="handleDeleteSelected"
			/>
			<n8n-button
				:label="i18n.baseText('executionsList.clearSelection')"
				type="tertiary"
				data-test-id="clear-selection-button"
				@click="handleClearSelection"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.execListWrapper {
	display: grid;
	grid-template-rows: 1fr 0;
	position: relative;
	height: 100%;
	width: 100%;
	max-width: 1280px;
}

.execList {
	position: relative;
	height: 100%;
	overflow: auto;
	padding: var(--spacing-l) var(--spacing-l) 0;
	@media (min-width: 1200px) {
		padding: var(--spacing-2xl) var(--spacing-2xl) 0;
	}
}

.execListHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-s);
}

.execListHeaderControls {
	display: flex;
	align-items: center;
	justify-content: flex-end;
}

.selectionOptions {
	display: flex;
	align-items: center;
	position: absolute;
	padding: var(--spacing-2xs);
	z-index: 2;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-3xl);
	background: var(--color-background-dark);
	border-radius: var(--border-radius-base);
	color: var(--color-text-xlight);
	font-size: var(--font-size-2xs);

	button {
		margin-left: var(--spacing-2xs);
	}
}

.buttonCell {
	overflow: hidden;

	button {
		transform: translateX(1000%);
		transition: transform 0s;

		&:focus-visible,
		.execRow:hover & {
			transform: translateX(0);
		}
	}
}

.execTable {
	/*
	  Table height needs to be set to 0 in order to use height 100% for elements in table cells
	*/
	height: 0;
	width: 100%;
	text-align: left;
	font-size: var(--font-size-s);

	thead th {
		position: sticky;
		top: calc(var(--spacing-3xl) * -1);
		z-index: 2;
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) 0;
		background: var(--color-table-header-background);

		&:first-child {
			padding-left: var(--spacing-s);
		}
	}

	th,
	td {
		height: 100%;
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) 0;

		&:not(:first-child, :nth-last-child(-n + 3)) {
			width: 100%;
		}

		&:nth-last-child(-n + 2) {
			padding-left: 0;
		}

		@media (min-width: $breakpoint-sm) {
			&:not(:nth-child(2)) {
				&,
				div,
				span {
					white-space: nowrap;
				}
			}
		}
	}
}

.loadMore {
	margin: var(--spacing-m) 0;
	width: 100%;
	text-align: center;
}

.loadedAll {
	text-align: center;
	font-size: var(--font-size-s);
	color: var(--color-text-light);
	margin: var(--spacing-l) 0;
}

.actions.deleteOnly {
	padding: 0;
}

.retryAction + .deleteAction {
	border-top: 1px solid var(--color-foreground-light);
}

.selectAll {
	display: inline-block;
	margin: 0 0 var(--spacing-s) var(--spacing-s);
	color: var(--color-danger);
}

.filterLoader {
	width: 220px;
	height: 32px;
}

.tableLoader {
	width: 100%;
	height: 48px;
	margin-bottom: var(--spacing-2xs);
}
</style>
