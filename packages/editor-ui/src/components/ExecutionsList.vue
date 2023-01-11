<template>
	<div :class="$style.execListWrapper">
		<div :class="$style.execList">
			<n8n-heading tag="h1" size="2xlarge">
				{{
					`${$locale.baseText('executionsList.workflowExecutions')} ${combinedExecutions.length}/${
						finishedExecutionsCountEstimated === true ? '~' : ''
					}${combinedExecutionsCount}`
				}}
			</n8n-heading>
			<div :class="$style.filters">
				<span :class="$style.filterItem">{{ $locale.baseText('executionsList.filters') }}:</span>
				<n8n-select
					:class="$style.filterItem"
					v-model="filter.workflowId"
					:placeholder="$locale.baseText('executionsList.selectWorkflow')"
					size="medium"
					filterable
					@change="handleFilterChanged"
				>
					<div class="ph-no-capture">
						<n8n-option
							v-for="item in workflows"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</div>
				</n8n-select>
				<n8n-select
					:class="$style.filterItem"
					v-model="filter.status"
					:placeholder="$locale.baseText('executionsList.selectStatus')"
					size="medium"
					filterable
					@change="handleFilterChanged"
				>
					<n8n-option v-for="item in statuses" :key="item.id" :label="item.name" :value="item.id" />
				</n8n-select>
				<el-checkbox v-model="autoRefresh" @change="handleAutoRefreshToggle">
					{{ $locale.baseText('executionsList.autoRefresh') }}
				</el-checkbox>
			</div>

			<table :class="$style.execTable">
				<thead>
					<tr>
						<th>
							<el-checkbox
								:indeterminate="isIndeterminate"
								v-model="checkAll"
								@change="handleCheckAllChange"
								label=""
							/>
						</th>
						<th>{{ $locale.baseText('executionsList.name') }}</th>
						<th>{{ $locale.baseText('executionsList.startedAt') }}</th>
						<th>{{ $locale.baseText('executionsList.status') }}</th>
						<th>{{ $locale.baseText('executionsList.id') }}</th>
						<th></th>
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="execution in combinedExecutions"
						:key="execution.id"
						:class="getRowClass(execution)"
					>
						<td>
							<el-checkbox
								v-if="execution.stoppedAt !== undefined && execution.id"
								:value="selectedItems[execution.id.toString()] || checkAll"
								@change="handleCheckboxChanged(execution.id)"
								label=""
							/>
						</td>
						<td>
							<span>{{
								execution.workflowName || $locale.baseText('executionsList.unsavedWorkflow')
							}}</span>
						</td>
						<td>
							<span>{{ formatDate(execution.startedAt) }}</span>
						</td>
						<td>
							<div :class="$style.statusColumn">
								<span v-if="execution.stoppedAt === undefined" :class="$style.spinner">
									<font-awesome-icon icon="spinner" spin />
								</span>
								<i18n :path="getStatusTextTranslationPath(execution)">
									<template #status>
										<span :class="$style.status">{{ getStatusText(execution) }}</span>
									</template>
									<template #time>
										<span v-if="execution.waitTill">{{ formatDate(execution.waitTill) }}</span>
										<span
											v-else-if="execution.stoppedAt !== null && execution.stoppedAt !== undefined"
										>
											{{
												displayTimer(
													new Date(execution.stoppedAt).getTime() -
														new Date(execution.startedAt).getTime(),
													true,
												)
											}}
										</span>
										<execution-time v-else :start-time="execution.startedAt" />
									</template>
								</i18n>
							</div>
						</td>
						<td>
							<span v-if="execution.id">#{{ execution.id }}</span>
							<span v-if="execution.retryOf !== undefined">
								<br />
								<small>
									({{ $locale.baseText('executionsList.retryOf') }} #{{ execution.retryOf }})
								</small>
							</span>
							<span v-else-if="execution.retrySuccessId !== undefined">
								<br />
								<small>
									({{ $locale.baseText('executionsList.successRetry') }} #{{
										execution.retrySuccessId
									}})
								</small>
							</span>
						</td>
						<td>
							<font-awesome-icon v-if="execution.mode === 'manual'" icon="flask" />
						</td>
						<td>
							<div :class="$style.actionsContainer">
								<n8n-button
									v-if="execution.stoppedAt === undefined || execution.waitTill"
									size="small"
									outline
									:label="$locale.baseText('executionsList.stop')"
									@click.stop="stopExecution(execution.id)"
									:loading="stoppingExecutions.includes(execution.id)"
								/>
								<n8n-button
									v-if="execution.stoppedAt !== undefined && execution.id"
									size="small"
									outline
									:label="$locale.baseText('executionsList.view')"
									@click.stop="displayExecution(execution)"
								/>
							</div>
						</td>
						<td>
							<el-dropdown trigger="click" @command="handleActionItemClick">
								<span class="retry-button">
									<n8n-icon-button
										text
										type="tertiary"
										size="mini"
										:title="$locale.baseText('executionsList.retryExecution')"
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
											{{ $locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
										</el-dropdown-item>
										<el-dropdown-item
											v-if="isExecutionRetriable(execution)"
											:class="$style.retryAction"
											:command="{ command: 'original', execution }"
										>
											{{ $locale.baseText('executionsList.retryWithOriginalWorkflow') }}
										</el-dropdown-item>
										<el-dropdown-item
											:class="$style.deleteAction"
											:command="{ command: 'delete', execution }"
										>
											{{ $locale.baseText('generic.delete') }}
										</el-dropdown-item>
									</el-dropdown-menu>
								</template>
							</el-dropdown>
						</td>
					</tr>
				</tbody>
			</table>

			<div
				:class="$style.loadMore"
				v-if="
					finishedExecutionsCount > finishedExecutions.length || finishedExecutionsCountEstimated
				"
			>
				<n8n-button
					icon="sync"
					:title="$locale.baseText('executionsList.loadMore')"
					:label="$locale.baseText('executionsList.loadMore')"
					@click="loadMore()"
					:loading="isDataLoading"
				/>
			</div>
			<div v-else :class="$style.loadedAll">{{ $locale.baseText('executionsList.loadedAll') }}</div>
		</div>
		<div v-if="checkAll === true || isIndeterminate === true" :class="$style.selectionOptions">
			<span>
				{{ $locale.baseText('executionsList.selected', { interpolate: { numSelected } }) }}
			</span>
			<n8n-button
				:label="$locale.baseText('generic.delete')"
				type="tertiary"
				@click="handleDeleteSelected"
			/>
			<n8n-button
				:label="$locale.baseText('executionsList.clearSelection')"
				type="tertiary"
				@click="handleClearSelection"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import ExecutionTime from '@/components/ExecutionTime.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import { externalHooks } from '@/mixins/externalHooks';
import { VIEWS } from '@/constants';
import { restApi } from '@/mixins/restApi';
import { genericHelpers } from '@/mixins/genericHelpers';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { showMessage } from '@/mixins/showMessage';
import {
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionsListResponse,
	IExecutionsSummary,
	IWorkflowShortResponse,
} from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import { range as _range } from 'lodash';
import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';

export default mixins(externalHooks, genericHelpers, executionHelpers, restApi, showMessage).extend(
	{
		name: 'ExecutionsList',
		components: {
			ExecutionTime,
			WorkflowActivator,
		},
		data() {
			return {
				finishedExecutions: [] as IExecutionsSummary[],
				finishedExecutionsCount: 0,
				finishedExecutionsCountEstimated: false,

				checkAll: false,
				autoRefresh: true,
				autoRefreshInterval: undefined as undefined | NodeJS.Timer,

				filter: {
					status: 'ALL',
					workflowId: 'ALL',
				},

				isDataLoading: false,

				requestItemsPerRequest: 10,

				selectedItems: {} as { [key: string]: boolean },

				stoppingExecutions: [] as string[],
				workflows: [] as IWorkflowShortResponse[],
			};
		},
		async created() {
			await this.loadWorkflows();
			await this.refreshData();
			this.handleAutoRefreshToggle();

			this.$externalHooks().run('executionsList.openDialog');
			this.$telemetry.track('User opened Executions log', {
				workflow_id: this.workflowsStore.workflowId,
			});
		},
		beforeDestroy() {
			if (this.autoRefreshInterval) {
				clearInterval(this.autoRefreshInterval);
				this.autoRefreshInterval = undefined;
			}
		},
		computed: {
			...mapStores(useUIStore, useWorkflowsStore),
			statuses() {
				return [
					{
						id: 'ALL',
						name: this.$locale.baseText('executionsList.anyStatus'),
					},
					{
						id: 'error',
						name: this.$locale.baseText('executionsList.error'),
					},
					{
						id: 'running',
						name: this.$locale.baseText('executionsList.running'),
					},
					{
						id: 'success',
						name: this.$locale.baseText('executionsList.success'),
					},
					{
						id: 'waiting',
						name: this.$locale.baseText('executionsList.waiting'),
					},
				];
			},
			activeExecutions(): IExecutionsCurrentSummaryExtended[] {
				return this.workflowsStore.activeExecutions;
			},
			combinedExecutions(): IExecutionsSummary[] {
				const returnData: IExecutionsSummary[] = [];

				if (['ALL', 'running'].includes(this.filter.status)) {
					returnData.push(...this.activeExecutions);
				}
				if (['ALL', 'error', 'success', 'waiting'].includes(this.filter.status)) {
					returnData.push(...this.finishedExecutions);
				}

				return returnData;
			},
			combinedExecutionsCount(): number {
				return 0 + this.activeExecutions.length + this.finishedExecutionsCount;
			},
			numSelected(): number {
				if (this.checkAll) {
					return this.finishedExecutionsCount;
				}

				return Object.keys(this.selectedItems).length;
			},
			isIndeterminate(): boolean {
				if (this.checkAll) {
					return false;
				}

				return this.numSelected > 0;
			},
			workflowFilterCurrent(): IDataObject {
				const filter: IDataObject = {};
				if (this.filter.workflowId !== 'ALL') {
					filter.workflowId = this.filter.workflowId;
				}
				return filter;
			},
			workflowFilterPast(): IDataObject {
				const filter: IDataObject = {};
				if (this.filter.workflowId !== 'ALL') {
					filter.workflowId = this.filter.workflowId;
				}
				if (this.filter.status === 'waiting') {
					filter.waitTill = true;
				} else if (['error', 'success'].includes(this.filter.status)) {
					filter.finished = this.filter.status === 'success';
				}
				return filter;
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
			handleAutoRefreshToggle() {
				if (this.autoRefreshInterval) {
					// Clear any previously existing intervals (if any - there shouldn't)
					clearInterval(this.autoRefreshInterval);
					this.autoRefreshInterval = undefined;
				}

				if (this.autoRefresh) {
					this.autoRefreshInterval = setInterval(() => this.loadAutoRefresh(), 4 * 1000); // refresh data every 4 secs
				}
			},
			handleCheckAllChange() {
				if (!this.checkAll) {
					Vue.set(this, 'selectedItems', {});
				}
			},
			handleCheckboxChanged(executionId: string) {
				if (this.selectedItems[executionId]) {
					Vue.delete(this.selectedItems, executionId);
				} else {
					Vue.set(this.selectedItems, executionId, true);
				}
			},
			async handleDeleteSelected() {
				const deleteExecutions = await this.confirmMessage(
					this.$locale.baseText('executionsList.confirmMessage.message', {
						interpolate: { numSelected: this.numSelected.toString() },
					}),
					this.$locale.baseText('executionsList.confirmMessage.headline'),
					'warning',
					this.$locale.baseText('executionsList.confirmMessage.confirmButtonText'),
					this.$locale.baseText('executionsList.confirmMessage.cancelButtonText'),
				);

				if (!deleteExecutions) {
					return;
				}

				this.isDataLoading = true;

				const sendData: IExecutionDeleteFilter = {};
				if (this.checkAll) {
					sendData.deleteBefore = this.finishedExecutions[0].startedAt as Date;
				} else {
					sendData.ids = Object.keys(this.selectedItems);
				}

				sendData.filters = this.workflowFilterPast;

				try {
					await this.restApi().deleteExecutions(sendData);
					let removedCurrentlyLoadedExecution = false;
					let removedActiveExecution = false;
					const currentWorkflow: string = this.workflowsStore.workflowId;
					const activeExecution: IExecutionsSummary | null =
						this.workflowsStore.activeWorkflowExecution;
					// Also update current workflow executions view if needed
					for (const selectedId of Object.keys(this.selectedItems)) {
						const execution: IExecutionsSummary | undefined =
							this.workflowsStore.getExecutionDataById(selectedId);
						if (execution && execution.workflowId === currentWorkflow) {
							this.workflowsStore.deleteExecution(execution);
							removedCurrentlyLoadedExecution = true;
						}
						if (
							execution !== undefined &&
							activeExecution !== null &&
							execution.id === activeExecution.id
						) {
							removedActiveExecution = true;
						}
					}
					// Also update route if needed
					if (removedCurrentlyLoadedExecution) {
						const currentWorkflowExecutions: IExecutionsSummary[] =
							this.workflowsStore.currentWorkflowExecutions;
						if (currentWorkflowExecutions.length === 0) {
							this.workflowsStore.activeWorkflowExecution = null;

							this.$router.push({ name: VIEWS.EXECUTION_HOME, params: { name: currentWorkflow } });
						} else if (removedActiveExecution) {
							this.workflowsStore.activeWorkflowExecution = currentWorkflowExecutions[0];
							this.$router
								.push({
									name: VIEWS.EXECUTION_PREVIEW,
									params: { name: currentWorkflow, executionId: currentWorkflowExecutions[0].id },
								})
								.catch(() => {});
						}
					}
				} catch (error) {
					this.isDataLoading = false;
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.handleDeleteSelected.title'),
					);

					return;
				}
				this.isDataLoading = false;

				this.$showMessage({
					title: this.$locale.baseText('executionsList.showMessage.handleDeleteSelected.title'),
					type: 'success',
				});

				Vue.set(this, 'selectedItems', {});
				this.checkAll = false;

				this.refreshData();
			},
			handleClearSelection() {
				this.checkAll = false;
				this.handleCheckAllChange();
			},
			handleFilterChanged() {
				this.refreshData();
			},
			handleActionItemClick(commandData: { command: string; execution: IExecutionsSummary }) {
				if (['currentlySaved', 'original'].includes(commandData.command)) {
					let loadWorkflow = false;
					if (commandData.command === 'currentlySaved') {
						loadWorkflow = true;
					}

					this.retryExecution(commandData.execution, loadWorkflow);

					this.$telemetry.track('User clicked retry execution button', {
						workflow_id: this.workflowsStore.workflowId,
						execution_id: commandData.execution.id,
						retry_type: loadWorkflow ? 'current' : 'original',
					});
				}
				if (commandData.command === 'delete') {
					this.deleteExecution(commandData.execution);
				}
			},
			getRowClass(execution: IExecutionsSummary): string {
				const classes: string[] = [this.$style.execRow];
				if (execution.waitTill) {
					classes.push(this.$style.waiting);
				} else if (execution.stoppedAt === undefined) {
					classes.push(this.$style.running);
				} else if (execution.finished) {
					classes.push(this.$style.success);
				} else if (execution.stoppedAt !== null) {
					classes.push(this.$style.failed);
				} else {
					classes.push(this.$style.unknown);
				}

				return classes.join(' ');
			},
			getWorkflowName(workflowId: string): string | undefined {
				const workflow = this.workflows.find((data) => data.id === workflowId);
				if (workflow === undefined) {
					return undefined;
				}

				return workflow.name;
			},
			async loadActiveExecutions(): Promise<void> {
				const activeExecutions = await this.restApi().getCurrentExecutions(
					this.workflowFilterCurrent,
				);
				for (const activeExecution of activeExecutions) {
					if (
						activeExecution.workflowId !== undefined &&
						activeExecution.workflowName === undefined
					) {
						activeExecution.workflowName = this.getWorkflowName(activeExecution.workflowId);
					}
				}

				this.workflowsStore.activeExecutions = activeExecutions;
				this.workflowsStore.addToCurrentExecutions(activeExecutions);
			},
			async loadAutoRefresh(): Promise<void> {
				const filter = this.workflowFilterPast;
				// We cannot use firstId here as some executions finish out of order. Let's say
				// You have execution ids 500 to 505 running.
				// Suppose 504 finishes before 500, 501, 502 and 503.
				// iF you use firstId, filtering id >= 504 you won't
				// ever get ids 500, 501, 502 and 503 when they finish
				const pastExecutionsPromise: Promise<IExecutionsListResponse> =
					this.restApi().getPastExecutions(filter, 30);
				const currentExecutionsPromise: Promise<IExecutionsCurrentSummaryExtended[]> =
					this.restApi().getCurrentExecutions({});

				const results = await Promise.all([pastExecutionsPromise, currentExecutionsPromise]);

				for (const activeExecution of results[1]) {
					if (
						activeExecution.workflowId !== undefined &&
						activeExecution.workflowName === undefined
					) {
						activeExecution.workflowName = this.getWorkflowName(activeExecution.workflowId);
					}
				}

				this.workflowsStore.activeExecutions = results[1];

				// execution IDs are typed as string, int conversion is necessary so we can order.
				const alreadyPresentExecutionIds = this.finishedExecutions.map((exec) =>
					parseInt(exec.id, 10),
				);
				let lastId = 0;
				const gaps = [] as number[];
				for (let i = results[0].results.length - 1; i >= 0; i--) {
					const currentItem = results[0].results[i];
					const currentId = parseInt(currentItem.id, 10);
					if (lastId !== 0 && isNaN(currentId) === false) {
						// We are doing this iteration to detect possible gaps.
						// The gaps are used to remove executions that finished
						// and were deleted from database but were displaying
						// in this list while running.
						if (currentId - lastId > 1) {
							// We have some gaps.
							const range = _range(lastId + 1, currentId);
							gaps.push(...range);
						}
					}
					lastId = parseInt(currentItem.id, 10) || 0;

					// Check new results from end to start
					// Add new items accordingly.
					const executionIndex = alreadyPresentExecutionIds.indexOf(currentId);
					if (executionIndex !== -1) {
						// Execution that we received is already present.

						if (
							this.finishedExecutions[executionIndex].finished === false &&
							currentItem.finished === true
						) {
							// Concurrency stuff. This might happen if the execution finishes
							// prior to saving all information to database. Somewhat rare but
							// With auto refresh and several executions, it happens sometimes.
							// So we replace the execution data so it displays correctly.
							this.finishedExecutions[executionIndex] = currentItem;
						}

						continue;
					}

					// Find the correct position to place this newcomer
					let j;
					for (j = this.finishedExecutions.length - 1; j >= 0; j--) {
						if (currentId < parseInt(this.finishedExecutions[j].id, 10)) {
							this.finishedExecutions.splice(j + 1, 0, currentItem);
							break;
						}
					}
					if (j === -1) {
						this.finishedExecutions.unshift(currentItem);
					}
				}
				this.finishedExecutions = this.finishedExecutions.filter(
					(execution) =>
						!gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10),
				);
				this.finishedExecutionsCount = results[0].count;
				this.finishedExecutionsCountEstimated = results[0].estimated;
				this.workflowsStore.addToCurrentExecutions(this.finishedExecutions);
			},
			async loadFinishedExecutions(): Promise<void> {
				if (this.filter.status === 'running') {
					this.finishedExecutions = [];
					this.finishedExecutionsCount = 0;
					this.finishedExecutionsCountEstimated = false;
					return;
				}
				const data = await this.restApi().getPastExecutions(
					this.workflowFilterPast,
					this.requestItemsPerRequest,
				);
				this.finishedExecutions = data.results;
				this.finishedExecutionsCount = data.count;
				this.finishedExecutionsCountEstimated = data.estimated;

				this.workflowsStore.addToCurrentExecutions(data.results);
			},
			async loadMore() {
				if (this.filter.status === 'running') {
					return;
				}

				this.isDataLoading = true;

				const filter = this.workflowFilterPast;
				let lastId: string | undefined;

				if (this.finishedExecutions.length !== 0) {
					const lastItem = this.finishedExecutions.slice(-1)[0];
					lastId = lastItem.id;
				}

				let data: IExecutionsListResponse;
				try {
					data = await this.restApi().getPastExecutions(
						filter,
						this.requestItemsPerRequest,
						lastId,
					);
				} catch (error) {
					this.isDataLoading = false;
					this.$showError(error, this.$locale.baseText('executionsList.showError.loadMore.title'));
					return;
				}

				data.results = data.results.map((execution) => {
					// @ts-ignore
					return { ...execution, mode: execution.mode };
				});

				this.finishedExecutions.push(...data.results);
				this.finishedExecutionsCount = data.count;
				this.finishedExecutionsCountEstimated = data.estimated;

				this.isDataLoading = false;

				this.workflowsStore.addToCurrentExecutions(data.results);
			},
			async loadWorkflows() {
				try {
					const workflows = await this.restApi().getWorkflows();
					workflows.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) {
							return -1;
						}
						if (a.name.toLowerCase() > b.name.toLowerCase()) {
							return 1;
						}
						return 0;
					});

					// @ts-ignore
					workflows.unshift({
						id: 'ALL',
						name: this.$locale.baseText('executionsList.allWorkflows'),
					});

					Vue.set(this, 'workflows', workflows);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.loadWorkflows.title'),
					);
				}
			},
			async retryExecution(execution: IExecutionsSummary, loadWorkflow?: boolean) {
				this.isDataLoading = true;

				try {
					const retrySuccessful = await this.restApi().retryExecution(execution.id, loadWorkflow);

					if (retrySuccessful) {
						this.$showMessage({
							title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulTrue.title'),
							type: 'success',
						});
					} else {
						this.$showMessage({
							title: this.$locale.baseText('executionsList.showMessage.retrySuccessfulFalse.title'),
							type: 'error',
						});
					}

					this.isDataLoading = false;
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.retryExecution.title'),
					);

					this.isDataLoading = false;
				}
			},
			async refreshData() {
				this.isDataLoading = true;

				try {
					const activeExecutionsPromise = this.loadActiveExecutions();
					const finishedExecutionsPromise = this.loadFinishedExecutions();
					await Promise.all([activeExecutionsPromise, finishedExecutionsPromise]);
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.refreshData.title'),
					);
				}

				this.isDataLoading = false;
			},
			getStatusText(entry: IExecutionsSummary): string {
				let text = '';

				if (entry.waitTill) {
					text = this.$locale.baseText('executionsList.waiting');
				} else if (entry.stoppedAt === undefined) {
					text = this.$locale.baseText('executionsList.running');
				} else if (entry.finished) {
					text = this.$locale.baseText('executionsList.succeeded');
				} else if (entry.stoppedAt !== null) {
					text = this.$locale.baseText('executionsList.error');
				} else {
					text = this.$locale.baseText('executionsList.unknown');
				}

				return text;
			},
			getStatusTextTranslationPath(entry: IExecutionsSummary): string {
				let path = '';

				if (entry.waitTill) {
					path = 'executionsList.statusWaiting';
				} else if (entry.stoppedAt === undefined) {
					path = 'executionsList.statusRunning';
				} else if (entry.finished) {
					path = 'executionsList.statusText';
				} else if (entry.stoppedAt !== null) {
					path = 'executionsList.statusText';
				} else {
					path = 'executionsList.statusUnknown';
				}

				return path;
			},
			async stopExecution(activeExecutionId: string) {
				try {
					// Add it to the list of currently stopping executions that we
					// can show the user in the UI that it is in progress
					this.stoppingExecutions.push(activeExecutionId);

					await this.restApi().stopCurrentExecution(activeExecutionId);

					// Remove it from the list of currently stopping executions
					const index = this.stoppingExecutions.indexOf(activeExecutionId);
					this.stoppingExecutions.splice(index, 1);

					this.$showMessage({
						title: this.$locale.baseText('executionsList.showMessage.stopExecution.title'),
						message: this.$locale.baseText('executionsList.showMessage.stopExecution.message', {
							interpolate: { activeExecutionId },
						}),
						type: 'success',
					});

					this.refreshData();
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.stopExecution.title'),
					);
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
				this.isDataLoading = true;
				try {
					await this.restApi().deleteExecutions({ ids: [execution.id] });
					await this.refreshData();
				} catch (error) {
					this.$showError(
						error,
						this.$locale.baseText('executionsList.showError.handleDeleteSelected.title'),
					);
				}
				this.isDataLoading = true;
			},
		},
	},
);
</script>

<style module lang="scss">
.execListWrapper {
	display: grid;
	grid-template-rows: 1fr 0;
	position: relative;
	height: 100%;
}

.execList {
	position: relative;
	height: 100%;
	overflow: auto;
	padding: var(--spacing-3xl) var(--spacing-xl) var(--spacing-3xl) var(--spacing-xl);
}

.selectionOptions {
	display: flex;
	align-items: center;
	position: absolute;
	padding: var(--spacing-2xs);
	z-index: 2;
	left: 50%;
	transform: translateX(-50%);
	bottom: var(--spacing-xl);
	background: var(--color-background-dark);
	border-radius: var(--border-radius-base);
	color: var(--color-text-xlight);
	font-size: var(--font-size-2xs);

	button {
		margin-left: var(--spacing-2xs);
	}
}

.filters {
	display: flex;
	line-height: 2em;
	margin: var(--spacing-l) 0;
}

.filterItem {
	margin: 0 var(--spacing-3xl) 0 0;
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

	.failed & {
		color: var(--color-danger);
	}

	.success & {
		font-weight: var(--font-weight-normal);
	}

	.running & {
		color: var(--color-warning);
	}

	.unknown & {
		color: var(--color-background-dark);
	}
}

.actionsContainer {
	overflow: hidden;

	button {
		transform: translateX(1000%);
		transition: transform 0s;

		&:focus-visible,
		.execRow:hover & {
			transform: translateX(0);
		}

		&:not(:first-child) {
			margin-left: 5px;
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
		background: var(--color-background-base);

		&:first-child {
			padding-left: var(--spacing-s);
		}
	}

	th,
	td {
		height: 100%;
		padding: var(--spacing-s) var(--spacing-s) var(--spacing-s) 0;
		background: var(--color-background-xlight);

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
			background: var(--color-background-light);
		}

		&:hover td {
			background: var(--color-primary-tint-3);
		}

		&.failed td:first-child::before {
			background: var(--color-danger);
		}

		&.success td:first-child::before {
			background: var(--color-success);
		}

		&.running td:first-child::before {
			background: var(--color-warning);
		}

		&.waiting td:first-child::before {
			background: var(--color-secondary);
		}

		&.unknown td:first-child::before {
			background: var(--color-background-dark);
		}
	}
}

.loadMore {
	margin: var(--spacing-l) 0;
	width: 100%;
	text-align: center;
}

.loadedAll {
	text-align: center;
	font-size: var(--font-size-s);
	margin: var(--spacing-l) 0;
}

.actions.deleteOnly {
	padding: 0;
}

.retryAction + .deleteAction {
	border-top: 1px solid var(--color-foreground-light);
}
</style>
