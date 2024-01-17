<template>
	<div :class="$style.execListWrapper">
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
				<tbody>
					<tr
						v-for="execution in executionsStore.filteredExecutions"
						:key="execution.id"
						:class="getRowClass(execution)"
					>
						<td>
							<el-checkbox
								v-if="execution.stoppedAt !== undefined && execution.id"
								:model-value="selectedItems[execution.id] || allExistingSelected"
								label=""
								data-test-id="select-execution-checkbox"
								@update:model-value="handleCheckboxChanged(execution.id)"
							/>
						</td>
						<td>
							<span @click.stop="displayExecution(execution)"
								><a href="#" :class="$style.link">{{
									execution.workflowName || getExecutionWorkflowName(execution)
								}}</a></span
							>
						</td>
						<td>
							<span>{{ formatDate(execution.startedAt) }}</span>
						</td>
						<td>
							<div :class="$style.statusColumn">
								<span v-if="isRunning(execution)" :class="$style.spinner">
									<font-awesome-icon icon="spinner" spin />
								</span>
								<i18n-t
									v-if="!isWaitTillIndefinite(execution)"
									tag="span"
									:keypath="getStatusTextTranslationPath(execution)"
								>
									<template #status>
										<span :class="$style.status">{{ getStatusText(execution) }}</span>
									</template>
									<template #time>
										<span v-if="execution.waitTill">{{ formatDate(execution.waitTill) }}</span>
										<span
											v-else-if="execution.stoppedAt !== null && execution.stoppedAt !== undefined"
										>
											{{
												i18n.displayTimer(
													new Date(execution.stoppedAt).getTime() -
														new Date(execution.startedAt).getTime(),
													true,
												)
											}}
										</span>
										<ExecutionTime v-else :start-time="execution.startedAt" />
									</template>
								</i18n-t>
								<n8n-tooltip v-else placement="top">
									<template #content>
										<span>{{ getStatusTooltipText(execution) }}</span>
									</template>
									<span :class="$style.status">{{ getStatusText(execution) }}</span>
								</n8n-tooltip>
							</div>
						</td>
						<td>
							<span v-if="execution.id">#{{ execution.id }}</span>
							<span v-if="execution.retryOf">
								<br />
								<small>
									({{ i18n.baseText('executionsList.retryOf') }} #{{ execution.retryOf }})
								</small>
							</span>
							<span v-else-if="execution.retrySuccessId">
								<br />
								<small>
									({{ i18n.baseText('executionsList.successRetry') }} #{{
										execution.retrySuccessId
									}})
								</small>
							</span>
						</td>
						<td>
							<n8n-tooltip v-if="execution.mode === 'manual'" placement="top">
								<template #content>
									<span>{{ i18n.baseText('executionsList.test') }}</span>
								</template>
								<font-awesome-icon icon="flask" />
							</n8n-tooltip>
						</td>
						<td>
							<div :class="$style.buttonCell">
								<n8n-button
									v-if="execution.stoppedAt !== undefined && execution.id"
									size="small"
									outline
									:label="i18n.baseText('executionsList.view')"
									@click.stop="displayExecution(execution)"
								/>
							</div>
						</td>
						<td>
							<div :class="$style.buttonCell">
								<n8n-button
									v-if="execution.stoppedAt === undefined || execution.waitTill"
									size="small"
									outline
									:label="i18n.baseText('executionsList.stop')"
									:loading="stoppingExecutions.includes(execution.id)"
									@click.stop="stopExecution(execution.id)"
								/>
							</div>
						</td>
						<td>
							<el-dropdown
								v-if="!isRunning(execution)"
								trigger="click"
								@command="handleActionItemClick"
							>
								<span class="retry-button">
									<n8n-icon-button
										text
										type="tertiary"
										size="mini"
										:title="i18n.baseText('executionsList.retryExecution')"
										icon="ellipsis-v"
									/>
								</span>
								<template #dropdown>
									<el-dropdown-menu
										:class="{
											[$style.actions]: true,
											[$style.deleteOnly]: !isExecutionRetriable(execution),
										}"
									>
										<el-dropdown-item
											v-if="isExecutionRetriable(execution)"
											:class="$style.retryAction"
											:command="{ command: 'currentlySaved', execution }"
										>
											{{ i18n.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
										</el-dropdown-item>
										<el-dropdown-item
											v-if="isExecutionRetriable(execution)"
											:class="$style.retryAction"
											:command="{ command: 'original', execution }"
										>
											{{ i18n.baseText('executionsList.retryWithOriginalWorkflow') }}
										</el-dropdown-item>
										<el-dropdown-item
											:class="$style.deleteAction"
											:command="{ command: 'delete', execution }"
										>
											{{ i18n.baseText('generic.delete') }}
										</el-dropdown-item>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
						</td>
					</tr>
				</tbody>
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
import ExecutionTime from '@/components/ExecutionTime.vue';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import { MODAL_CONFIRM, VIEWS, WAIT_TIME_UNLIMITED } from '@/constants';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type {
	IExecutionDeleteFilter,
	IWorkflowShortResponse,
	ExecutionFilterType,
} from '@/Interface';
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
		ExecutionTime,
		ExecutionFilter,
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

			stoppingExecutions: [] as string[],
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
		displayExecution(execution: IExecutionsSummary) {
			const route = this.$router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: { name: execution.workflowId, executionId: execution.id },
			});
			window.open(route.href, '_blank');
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
		handleCheckboxChanged(executionId: string) {
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

			const sendData: IExecutionDeleteFilter = {};
			if (this.allExistingSelected) {
				sendData.deleteBefore = this.executionsStore.executions[0].startedAt as Date;
			} else {
				sendData.ids = Object.keys(this.selectedItems);
			}

			sendData.filters = this.executionsStore.pastExecutionsFilters;

			try {
				await this.workflowsStore.deleteExecutions(sendData);
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
			await this.refreshData();
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
		async handleActionItemClick(commandData: { command: string; execution: IExecutionsSummary }) {
			if (['currentlySaved', 'original'].includes(commandData.command)) {
				let loadWorkflow = false;
				if (commandData.command === 'currentlySaved') {
					loadWorkflow = true;
				}

				await this.retryExecution(commandData.execution, loadWorkflow);

				this.telemetry.track('User clicked retry execution button', {
					workflow_id: this.workflowsStore.workflowId,
					execution_id: commandData.execution.id,
					retry_type: loadWorkflow ? 'current' : 'original',
				});
			}
			if (commandData.command === 'delete') {
				await this.deleteExecution(commandData.execution);
			}
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
		// @TODO
		async loadActiveExecutions(): Promise<void> {
			if (isEmpty(this.executionsStore.currentExecutionsFilters.metadata)) {
				await this.executionsStore.fetchCurrentExecutions();
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
					this.executionsStore.pastExecutionsFilters,
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
		async retryExecution(execution: IExecutionsSummary, loadWorkflow?: boolean) {
			try {
				const retrySuccessful = await this.workflowsStore.retryExecution(
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
		},
		async refreshData() {
			try {
				await Promise.all([this.loadActiveExecutions(), this.loadFinishedExecutions()]);
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.refreshData.title'));
			}
		},
		getRowClass(execution: IExecutionsSummary): string {
			return [this.$style.execRow, this.$style[execution.status ?? '']].join(' ');
		},
		getStatusText(entry: IExecutionsSummary): string {
			const status = entry.status;
			let text = '';

			if (status === 'waiting') {
				text = this.i18n.baseText('executionsList.waiting');
			} else if (status === 'canceled') {
				text = this.i18n.baseText('executionsList.canceled');
			} else if (status === 'crashed') {
				text = this.i18n.baseText('executionsList.error');
			} else if (status === 'new') {
				text = this.i18n.baseText('executionsList.running');
			} else if (status === 'running') {
				text = this.i18n.baseText('executionsList.running');
			} else if (status === 'success') {
				text = this.i18n.baseText('executionsList.succeeded');
			} else if (status === 'failed') {
				text = this.i18n.baseText('executionsList.error');
			} else {
				text = this.i18n.baseText('executionsList.unknown');
			}

			return text;
		},
		getStatusTextTranslationPath(entry: IExecutionsSummary): string {
			const status = entry.status;
			let path = '';

			if (status === 'waiting') {
				path = 'executionsList.statusWaiting';
			} else if (status === 'canceled') {
				path = 'executionsList.statusCanceled';
			} else if (['crashed', 'failed', 'success'].includes(status ?? '')) {
				if (!entry.stoppedAt) {
					path = 'executionsList.statusTextWithoutTime';
				} else {
					path = 'executionsList.statusText';
				}
			} else if (status === 'new') {
				path = 'executionsList.statusRunning';
			} else if (status === 'running') {
				path = 'executionsList.statusRunning';
			} else {
				path = 'executionsList.statusUnknown';
			}

			return path;
		},
		getStatusTooltipText(entry: IExecutionsSummary): string {
			const status = entry.status;
			let text = '';

			if (status === 'waiting' && this.isWaitTillIndefinite(entry)) {
				text = this.i18n.baseText(
					'executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely',
				);
			}

			return text;
		},
		async stopExecution(activeExecutionId: string) {
			try {
				// Add it to the list of currently stopping executions that we
				// can show the user in the UI that it is in progress
				this.stoppingExecutions.push(activeExecutionId);

				await this.workflowsStore.stopCurrentExecution(activeExecutionId);

				// Remove it from the list of currently stopping executions
				const index = this.stoppingExecutions.indexOf(activeExecutionId);
				this.stoppingExecutions.splice(index, 1);

				this.showMessage({
					title: this.i18n.baseText('executionsList.showMessage.stopExecution.title'),
					message: this.i18n.baseText('executionsList.showMessage.stopExecution.message', {
						interpolate: { activeExecutionId },
					}),
					type: 'success',
				});

				await this.refreshData();
			} catch (error) {
				this.showError(error, this.i18n.baseText('executionsList.showError.stopExecution.title'));
			}
		},
		isExecutionRetriable(execution: IExecutionsSummary): boolean {
			return (
				execution.stoppedAt !== undefined &&
				!execution.finished &&
				execution.retryOf === undefined &&
				execution.retrySuccessId === undefined &&
				!execution.waitTill
			);
		},
		async deleteExecution(execution: IExecutionsSummary) {
			try {
				await this.workflowsStore.deleteExecutions({ ids: [execution.id] });
				await this.refreshData();

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
		isWaitTillIndefinite(execution: IExecutionsSummary): boolean {
			if (!execution.waitTill) {
				return false;
			}
			return new Date(execution.waitTill).toISOString() === WAIT_TIME_UNLIMITED;
		},
		isRunning(execution: IExecutionsSummary): boolean {
			return execution.status === 'running';
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

.statusColumn {
	display: flex;
	align-items: center;
}

.spinner {
	margin-right: var(--spacing-2xs);
}

.status {
	line-height: 22.6px;
	text-align: center;
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-bold);

	.crashed &,
	.failed & {
		color: var(--color-danger);
	}

	.waiting & {
		color: var(--color-secondary);
	}

	.success & {
		font-weight: var(--font-weight-normal);
	}

	.new &,
	.running & {
		color: var(--color-warning);
	}

	.unknown & {
		color: var(--color-background-dark);
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

	.execRow {
		color: var(--color-text-base);

		td:first-child {
			width: 30px;
			padding: 0 var(--spacing-s) 0 0;

			/*
			  This is needed instead of table cell border because they are overlapping the sticky header
			*/
			&::before {
				content: '';
				display: inline-block;
				width: var(--spacing-4xs);
				height: 100%;
				vertical-align: middle;
				margin-right: var(--spacing-xs);
			}
		}

		&:nth-child(even) td {
			background: var(--color-table-row-even-background);
		}

		&:hover td {
			background: var(--color-table-row-hover-background);
		}

		&.crashed td:first-child::before,
		&.failed td:first-child::before {
			background: var(--execution-card-border-error);
		}

		&.success td:first-child::before {
			background: var(--execution-card-border-success);
		}

		&.new td:first-child::before,
		&.running td:first-child::before {
			background: var(--execution-card-border-running);
		}

		&.waiting td:first-child::before {
			background: var(--execution-card-border-waiting);
		}

		&.unknown td:first-child::before {
			background: var(--execution-card-border-unknown);
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

.link {
	color: var(--color-text-base);
	text-decoration: underline;
}
</style>
