<template>
	<div :class="['executions-list', $style.execListWrapper]">
		<div :class="$style.execList">
			<div :class="$style.execListHeader">
				<n8n-heading tag="h1" size="2xlarge">{{ pageTitle }}</n8n-heading>
				<div :class="$style.execListHeaderControls">
					<n8n-loading v-if="isMounting" :class="$style.filterLoader" variant="custom" />
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
						v-show="!isMounting"
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

			<div v-if="isMounting">
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
				<TransitionGroup tag="tbody" name="fade">
					<ExecutionsGlobalListItem
						v-for="execution in executionsStore.filteredExecutions"
						:key="execution.id"
						:execution="execution"
						:workflow-name="getExecutionWorkflowName(execution)"
						:selected="selectedItems[execution.id] || allExistingSelected"
						@stop="stopExecution"
						@delete="deleteExecution"
						@select="selectExecution"
						@retry-saved="retrySavedExecution"
						@retry-original="retryOriginalExecution"
					/>
				</TransitionGroup>
			</table>

			<div
				v-if="!executionsStore.filteredExecutions.length && !isMounting && !executionsStore.loading"
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
				v-else-if="!isMounting && !executionsStore.loading"
				:class="$style.loadedAll"
				data-test-id="execution-all-loaded"
			>
				{{ i18n.baseText('executionsList.loadedAll') }}
			</div>
		</div>
		<div
			v-if="numSelected > 0"
			:class="$style.selectionOptions"
			data-test-id="selected-executions-info"
		>
			<span>
				{{
					i18n.baseText('executionsList.selected', {
						adjustToNumber: numSelected,
						interpolate: { numSelected: `${numSelected}` },
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

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import ExecutionsGlobalListItem from '@/components/executions/global/ListItem.vue';
import { MODAL_CONFIRM } from '@/constants';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { IWorkflowShortResponse, ExecutionFilterType } from '@/Interface';
import type { IExecutionsSummary } from 'n8n-workflow';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { isEmpty } from '@/utils/typesUtils';
import { setPageTitle } from '@/utils/htmlUtils';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { useRoute } from 'vue-router';
import { useExecutionsStore } from '@/stores/executions.store';

export default defineComponent({
	name: 'ExecutionsList',
	components: {
		ExecutionFilter,
		ExecutionsGlobalListItem,
	},
	mixins: [executionHelpers],
	setup() {
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const externalHooks = useExternalHooks();
		const route = useRoute();

		return {
			i18n,
			telemetry,
			externalHooks,
			route,
			...useToast(),
			...useMessage(),
		};
	},
	data() {
		return {
			isMounting: true,
			finishedExecutions: [] as IExecutionsSummary[],
			finishedExecutionsCount: 0,
			finishedExecutionsCountEstimated: false,

			allVisibleSelected: false,
			allExistingSelected: false,
			autoRefreshTimeout: undefined as undefined | NodeJS.Timer,

			filter: {} as ExecutionFilterType,

			selectedItems: {} as { [key: string]: boolean },

			workflows: [] as IWorkflowShortResponse[],
		};
	},
	mounted() {
		setPageTitle(`n8n - ${this.pageTitle}`);

		void this.executionsStore.initialize();
		document.addEventListener('visibilitychange', this.onDocumentVisibilityChange);
	},
	async created() {
		await this.loadWorkflows();

		void this.externalHooks.run('executionsList.openDialog');
		this.telemetry.track('User opened Executions log', {
			workflow_id: this.workflowsStore.workflowId,
		});
	},
	beforeUnmount() {
		this.executionsStore.terminate();
		document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange);
	},
	computed: {
		...mapStores(useUIStore, useWorkflowsStore, useExecutionsStore),
		numSelected(): number {
			if (this.allExistingSelected) {
				return this.executionsStore.executionsCount;
			}

			return Object.keys(this.selectedItems).length;
		},
		pageTitle() {
			return this.i18n.baseText('executionsList.workflowExecutions');
		},
	},
	methods: {
		closeDialog() {
			this.$emit('closeModal');
		},
		async handleAutoRefreshToggle(value: boolean) {
			if (value) {
				await this.executionsStore.startAutoRefreshInterval();
			} else {
				this.executionsStore.stopAutoRefreshInterval();
			}
		},
		handleCheckAllExistingChange() {
			this.allExistingSelected = !this.allExistingSelected;
			this.allVisibleSelected = !this.allExistingSelected;
			this.handleCheckAllVisibleChange();
		},
		handleCheckAllVisibleChange() {
			this.allVisibleSelected = !this.allVisibleSelected;
			if (!this.allVisibleSelected) {
				this.allExistingSelected = false;
				this.selectedItems = {};
			} else {
				this.selectAllVisibleExecutions();
			}
		},
		selectExecution(execution: IExecutionsSummary) {
			const executionId = execution.id;
			if (this.selectedItems[executionId]) {
				const { [executionId]: removedSelectedItem, ...remainingSelectedItems } =
					this.selectedItems;
				this.selectedItems = remainingSelectedItems;
			} else {
				this.selectedItems = {
					...this.selectedItems,
					[executionId]: true,
				};
			}
			this.allVisibleSelected =
				Object.keys(this.selectedItems).length === this.executionsStore.filteredExecutions.length;
			this.allExistingSelected =
				Object.keys(this.selectedItems).length === this.executionsStore.executionsCount;
		},
		// @TODO
		async handleDeleteSelected() {
			const deleteExecutions = await this.confirm(
				this.i18n.baseText('executionsList.confirmMessage.message', {
					interpolate: { numSelected: this.numSelected.toString() },
				}),
				this.i18n.baseText('executionsList.confirmMessage.headline'),
				{
					type: 'warning',
					confirmButtonText: this.i18n.baseText('executionsList.confirmMessage.confirmButtonText'),
					cancelButtonText: this.i18n.baseText('executionsList.confirmMessage.cancelButtonText'),
				},
			);

			if (deleteExecutions !== MODAL_CONFIRM) {
				return;
			}

			try {
				await this.executionsStore.deleteExecutions({
					filters: this.executionsStore.executionsFilters,
					...(this.allExistingSelected
						? { deleteBefore: this.executionsStore.executions[0].startedAt as Date }
						: {
								ids: Object.keys(this.selectedItems),
						  }),
				});
			} catch (error) {
				this.showError(
					error,
					this.i18n.baseText('executionsList.showError.handleDeleteSelected.title'),
				);
				return;
			}

			this.showMessage({
				title: this.i18n.baseText('executionsList.showMessage.handleDeleteSelected.title'),
				type: 'success',
			});

			this.handleClearSelection();
		},
		handleClearSelection(): void {
			this.allVisibleSelected = false;
			this.allExistingSelected = false;
			this.selectedItems = {};
		},
		async onFilterChanged(filters: ExecutionFilterType) {
			this.executionsStore.setFilters(filters);
			await this.refreshData();
			this.handleClearSelection();
			this.isMounting = false;
		},
		getExecutionWorkflowName(execution: IExecutionsSummary): string {
			return (
				this.getWorkflowName(execution.workflowId ?? '') ||
				this.i18n.baseText('executionsList.unsavedWorkflow')
			);
		},
		getWorkflowName(workflowId: string): string | undefined {
			return this.workflows.find((data) => data.id === workflowId)?.name;
		},
		async loadActiveExecutions(): Promise<void> {
			if (isEmpty(this.executionsStore.runningExecutionsFilters.metadata)) {
				await this.executionsStore.fetchRunningExecutions();
			}
		},
		async loadFinishedExecutions(): Promise<void> {
			if (this.executionsStore.filters.status === 'running') {
				return;
			}

			await this.executionsStore.fetchPastExecutions();

			if (this.executionsStore.executions.length === 0) {
				this.handleClearSelection();
			}
		},
		async loadMore() {
			if (this.executionsStore.filters.status === 'running') {
				return;
			}

			let lastId: string | undefined;
			if (this.executionsStore.executions.length !== 0) {
				const lastItem = this.executionsStore.executions.slice(-1)[0];
				lastId = lastItem.id;
			}

			try {
				await this.executionsStore.fetchPastExecutions(
					this.executionsStore.executionsFilters,
					lastId,
				);
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.loadMore.title'));
				return;
			}

			this.adjustSelectionAfterMoreItemsLoaded();
		},
		async loadWorkflows() {
			try {
				const workflows =
					(await this.workflowsStore.fetchAllWorkflows()) as IWorkflowShortResponse[];
				workflows.sort((a, b) => {
					if (a.name.toLowerCase() < b.name.toLowerCase()) {
						return -1;
					}
					if (a.name.toLowerCase() > b.name.toLowerCase()) {
						return 1;
					}
					return 0;
				});

				workflows.unshift({
					id: 'all',
					name: this.i18n.baseText('executionsList.allWorkflows'),
				} as IWorkflowShortResponse);

				this.workflows = workflows;
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.loadWorkflows.title'));
			}
		},
		async retrySavedExecution(execution: IExecutionsSummary) {
			await this.retryExecution(execution, true);
		},
		async retryOriginalExecution(execution: IExecutionsSummary) {
			await this.retryExecution(execution, false);
		},
		async retryExecution(execution: IExecutionsSummary, loadWorkflow?: boolean) {
			try {
				const retrySuccessful = await this.executionsStore.retryExecution(
					execution.id,
					loadWorkflow,
				);

				if (retrySuccessful) {
					this.showMessage({
						title: this.i18n.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
						type: 'success',
					});
				} else {
					this.showMessage({
						title: this.i18n.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
						type: 'error',
					});
				}
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.retryExecution.title'));
			}

			this.telemetry.track('User clicked retry execution button', {
				workflow_id: this.workflowsStore.workflowId,
				execution_id: execution.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		},
		async refreshData() {
			try {
				await Promise.all([this.loadActiveExecutions(), this.loadFinishedExecutions()]);
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.refreshData.title'));
			}
		},
		async stopExecution(execution: IExecutionsSummary) {
			try {
				await this.executionsStore.stopCurrentExecution(execution.id);

				this.showMessage({
					title: this.i18n.baseText('executionsList.showMessage.stopExecution.title'),
					message: this.i18n.baseText('executionsList.showMessage.stopExecution.message', {
						interpolate: { activeExecutionId: execution.id },
					}),
					type: 'success',
				});

				await this.refreshData();
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.stopExecution.title'));
			}
		},
		async deleteExecution(execution: IExecutionsSummary) {
			try {
				await this.executionsStore.deleteExecutions({ ids: [execution.id] });

				if (this.allVisibleSelected) {
					this.selectedItems = {};
					this.selectAllVisibleExecutions();
				}
			} catch (error) {
				this.showError(
					error,
					this.i18n.baseText('executionsList.showError.handleDeleteSelected.title'),
				);
			}
		},
		selectAllVisibleExecutions() {
			this.executionsStore.filteredExecutions.forEach((execution: IExecutionsSummary) => {
				this.selectedItems = { ...this.selectedItems, [execution.id]: true };
			});
		},
		adjustSelectionAfterMoreItemsLoaded() {
			if (this.allExistingSelected) {
				this.allVisibleSelected = true;
				this.selectAllVisibleExecutions();
			}
		},
		onDocumentVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				this.executionsStore.stopAutoRefreshInterval();
			} else {
				void this.executionsStore.startAutoRefreshInterval();
			}
		},
	},
});
</script>

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
		background: var(--color-table-row-background);

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
