<script lang="ts" setup>
import ConcurrentExecutionsHeader from '@/components/executions/ConcurrentExecutionsHeader.vue';
import ExecutionsFilter from '@/components/executions/ExecutionsFilter.vue';
import GlobalExecutionsListItem from '@/components/executions/global/GlobalExecutionsListItem.vue';
import SelectedItemsInfo from '@/components/common/SelectedItemsInfo.vue';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/composables/useMessage';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { EnterpriseEditionFeature, MODAL_CONFIRM } from '@/constants';
import type { ExecutionFilterType, ExecutionSummaryWithScopes, IWorkflowDb } from '@/Interface';
import type { PermissionsRecord } from '@n8n/permissions';
import { getResourcePermissions } from '@n8n/permissions';
import { useExecutionsStore } from '@/stores/executions.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { executionRetryMessage } from '@/utils/executionUtils';
import { N8nButton, N8nCheckbox, N8nTableBase } from '@n8n/design-system';
import { useIntersectionObserver } from '@vueuse/core';
import { ElSkeletonItem } from 'element-plus';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed, ref, useTemplateRef, watch, type ComponentPublicInstance } from 'vue';

const props = withDefaults(
	defineProps<{
		executions: ExecutionSummaryWithScopes[];
		filters: ExecutionFilterType;
		total?: number;
		concurrentTotal?: number;
		estimated?: boolean;
	}>(),
	{
		total: 0,
		concurrentTotal: 0,
		estimated: false,
	},
);

const emit = defineEmits<{
	'update:filters': [value: ExecutionFilterType];
	'execution:stop': [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const executionsStore = useExecutionsStore();
const settingsStore = useSettingsStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const allVisibleSelected = ref(false);
const allExistingSelected = ref(false);
const selectedItems = ref<Record<string, boolean>>({});

const message = useMessage();
const toast = useToast();

const selectedCount = computed(() => {
	if (allExistingSelected.value) {
		return props.total;
	}

	return Object.keys(selectedItems.value).length;
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

const isAnnotationEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);

// In 'queue' mode concurrency control is applied per worker and returning a global count
// of concurrent executions would not be meaningful/helpful.
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
	allExistingSelected.value = Object.keys(selectedItems.value).length === props.total;
}

async function handleDeleteSelected() {
	// Prepend the message with a note about annotations if the feature is enabled
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
	emit('update:filters', filters);
	handleClearSelection();
}

function getExecutionWorkflowName(execution: ExecutionSummary): string {
	return (
		getWorkflowName(execution.workflowId ?? '') ?? i18n.baseText('executionsList.unsavedWorkflow')
	);
}

function getExecutionWorkflowPermissions(
	execution: ExecutionSummaryWithScopes,
): PermissionsRecord['workflow'] {
	return getResourcePermissions(execution.scopes).workflow;
}

function getWorkflowName(workflowId: string): string | undefined {
	return workflows.value.find((data: IWorkflowDb) => data.id === workflowId)?.name;
}

const loadMoreRef = useTemplateRef<ComponentPublicInstance>('loadMoreButton');
useIntersectionObserver(loadMoreRef, ([entry]) => {
	if (!entry?.isIntersecting) return;
	void loadMore();
});

async function loadMore() {
	if (executionsStore.filters.status === 'running') {
		return;
	}

	const lastItem = props.executions.at(-1);

	try {
		await executionsStore.fetchExecutions(executionsStore.executionsFilters, lastItem?.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.loadMore.title'));
	}
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
		workflow_id: workflowsStore.workflowId,
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

		emit('execution:stop');
	} catch (error) {
		toast.showError(error, i18n.baseText('executionsList.showError.stopExecution.title'));
	}
}

async function deleteExecution(execution: ExecutionSummary) {
	const hasAnnotation =
		!!execution.annotation && (execution.annotation.vote || execution.annotation.tags.length > 0);

	// Show a confirmation dialog if the execution has an annotation
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
	if (value) {
		await executionsStore.startAutoRefreshInterval();
	} else {
		executionsStore.stopAutoRefreshInterval();
	}
}

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('concurrency', 'upgrade-concurrency');
};
</script>

<template>
	<div :class="$style.execListWrapper">
		<slot />
		<div :class="$style.execListHeaderControls">
			<ExecutionsFilter
				:workflows="workflows"
				class="execFilter"
				@filter-changed="onFilterChanged"
			/>

			<div style="margin-left: auto">
				<ConcurrentExecutionsHeader
					v-if="showConcurrencyHeader"
					:running-executions-count="concurrentTotal"
					:concurrency-cap="settingsStore.concurrency"
					:is-cloud-deployment="settingsStore.isCloudDeployment"
					@go-to-upgrade="goToUpgrade"
				/>
				<ElCheckbox
					v-else
					v-model="executionsStore.autoRefresh"
					data-test-id="execution-auto-refresh-checkbox"
					@update:model-value="onAutoRefreshToggle($event)"
				>
					{{ i18n.baseText('executionsList.autoRefresh') }}
				</ElCheckbox>
			</div>
		</div>
		<div :class="$style.execList">
			<div :class="$style.execTable">
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
							<th colspan="8">
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
							<th>
								{{ i18n.baseText('generic.workflow') }}
							</th>
							<th>{{ i18n.baseText('executionsList.status') }}</th>
							<th>
								{{ i18n.baseText('executionsList.startedAt') }}
							</th>
							<th>
								{{ i18n.baseText('executionsList.runTime') }}
							</th>

							<th>{{ i18n.baseText('executionsList.id') }}</th>

							<th></th>
							<th style="width: 69px"></th>
							<th style="width: 50px"></th>
						</tr>
					</thead>
					<tbody>
						<GlobalExecutionsListItem
							v-for="execution in executions"
							:key="execution.id"
							:execution="execution"
							:workflow-name="getExecutionWorkflowName(execution)"
							:workflow-permissions="getExecutionWorkflowPermissions(execution)"
							:selected="selectedItems[execution.id] || allExistingSelected"
							:concurrency-cap="settingsStore.concurrency"
							:is-cloud-deployment="settingsStore.isCloudDeployment"
							data-test-id="global-execution-list-item"
							@stop="stopExecution"
							@delete="deleteExecution"
							@select="toggleSelectExecution"
							@retry-saved="retrySavedExecution"
							@retry-original="retryOriginalExecution"
							@go-to-upgrade="goToUpgrade"
						/>
						<template v-if="executionsStore.loading && !executions.length">
							<tr v-for="item in executionsStore.itemsPerPage" :key="item">
								<td v-for="col in 9" :key="col">
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
						<tr>
							<td colspan="9" style="text-align: center">
								<template v-if="!executions.length">
									<span data-test-id="execution-list-empty">
										{{ i18n.baseText('executionsList.empty') }}
									</span>
								</template>
								<template v-else-if="total > executions.length || estimated">
									<N8nButton
										ref="loadMoreButton"
										icon="refresh-cw"
										:title="i18n.baseText('executionsList.loadMore')"
										:label="i18n.baseText('executionsList.loadMore')"
										:loading="executionsStore.loading"
										data-test-id="load-more-button"
										@click="loadMore()"
									/>
								</template>
								<template v-else>
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
.execListWrapper {
	padding: var(--spacing-l) var(--spacing-2xl);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	width: 100%;
	max-width: var(--content-container-width);
}

.execList {
	flex-shrink: 1; /* Allows shrinking when needed */
	max-height: 100%; /* Prevents overflowing the parent */
	overflow: auto; /* Scroll only when needed */
}

.execListHeaderControls {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	margin-bottom: var(--spacing-s);
}

.execTable {
	height: 100%;
	flex: 0 1 auto;
}
</style>

<style lang="scss" scoped>
:deep(.el-checkbox) {
	display: inline-flex;
	align-items: center;
	vertical-align: middle;
}
</style>
