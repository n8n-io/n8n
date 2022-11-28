<template>
	<Modal
		:name="EXECUTIONS_MODAL_KEY"
		width="80%"
		:title="`${$locale.baseText('executionsList.workflowExecutions')} ${combinedExecutions.length}/${finishedExecutionsCountEstimated === true ? '~' : ''}${combinedExecutionsCount}`"
		:eventBus="modalBus"
	>
		<template #content>

			<div class="filters">
				<el-row>
					<el-col :span="2" class="filter-headline">
						{{ $locale.baseText('executionsList.filters') }}:
					</el-col>
					<el-col :span="7">
						<n8n-select v-model="filter.workflowId" :placeholder="$locale.baseText('executionsList.selectWorkflow')" size="medium" filterable @change="handleFilterChanged">
							<div class="ph-no-capture">
								<n8n-option
									v-for="item in workflows"
									:key="item.id"
									:label="item.name"
									:value="item.id">
								</n8n-option>
							</div>
						</n8n-select>
					</el-col>
					<el-col :span="5" :offset="1">
						<n8n-select v-model="filter.status" :placeholder="$locale.baseText('executionsList.selectStatus')" size="medium" filterable @change="handleFilterChanged">
							<n8n-option
								v-for="item in statuses"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</n8n-option>
						</n8n-select>
					</el-col>
					<el-col :span="4" :offset="5" class="autorefresh">
						<el-checkbox v-model="autoRefresh" @change="handleAutoRefreshToggle">{{ $locale.baseText('executionsList.autoRefresh') }}</el-checkbox>
					</el-col>
				</el-row>
			</div>

			<div class="selection-options">
				<span v-if="checkAll === true || isIndeterminate === true">
					{{ $locale.baseText('executionsList.selected') }}: {{numSelected}} / <span v-if="finishedExecutionsCountEstimated === true">~</span>{{finishedExecutionsCount}}
					<n8n-icon-button :title="$locale.baseText('executionsList.deleteSelected')" icon="trash" size="mini" @click="handleDeleteSelected" />
				</span>
			</div>

			<el-table :data="combinedExecutions" stripe v-loading="isDataLoading" :row-class-name="getRowClass">
				<el-table-column label="" width="30">
					<!-- eslint-disable-next-line vue/no-unused-vars -->
					<template #header="scope" >
						<el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAllChange" label=" "></el-checkbox>
					</template>
					<template #default="scope">
						<el-checkbox v-if="scope.row.stoppedAt !== undefined && scope.row.id" :value="selectedItems[scope.row.id.toString()] || checkAll" @change="handleCheckboxChanged(scope.row.id)" label=" "></el-checkbox>
					</template>
				</el-table-column>
				<el-table-column property="startedAt" :label="$locale.baseText('executionsList.startedAtId')" width="205">
					<template #default="scope">
						{{convertToDisplayDate(scope.row.startedAt)}}<br />
						<small v-if="scope.row.id">ID: {{scope.row.id}}</small>
					</template>
				</el-table-column>
				<el-table-column property="workflowName" :label="$locale.baseText('executionsList.name')">
					<template #default="scope">
						<div class="ph-no-capture">
							<span class="workflow-name">
								{{ scope.row.workflowName || $locale.baseText('executionsList.unsavedWorkflow') }}
							</span>
						</div>

						<span v-if="scope.row.stoppedAt === undefined">
							({{ $locale.baseText('executionsList.running') }})
						</span>
						<span v-if="scope.row.retryOf !== undefined">
							<br /><small>{{ $locale.baseText('executionsList.retryOf') }} "{{scope.row.retryOf}}"</small>
						</span>
						<span v-else-if="scope.row.retrySuccessId !== undefined">
							<br /><small>{{ $locale.baseText('executionsList.successRetry') }} "{{scope.row.retrySuccessId}}"</small>
						</span>
					</template>
				</el-table-column>
				<el-table-column :label="$locale.baseText('executionsList.status')" width="122" align="center">
					<template #default="scope" align="center">
						<n8n-tooltip placement="top" >
							<template #content>
								<div v-html="statusTooltipText(scope.row)"></div>
							</template>
							<span class="status-badge running" v-if="scope.row.waitTill">
								{{ $locale.baseText('executionsList.waiting') }}
							</span>
							<span class="status-badge running" v-else-if="scope.row.stoppedAt === undefined">
								{{ $locale.baseText('executionsList.running') }}
							</span>
							<span class="status-badge success" v-else-if="scope.row.finished">
								{{ $locale.baseText('executionsList.success') }}
							</span>
							<span class="status-badge error" v-else-if="scope.row.stoppedAt !== null">
								{{ $locale.baseText('executionsList.error') }}
							</span>
							<span class="status-badge warning" v-else>
								{{ $locale.baseText('executionsList.unknown') }}
							</span>
						</n8n-tooltip>

						<el-dropdown trigger="click" @command="handleRetryClick">
							<span class="retry-button">
								<n8n-icon-button
									v-if="scope.row.stoppedAt !== undefined && !scope.row.finished && scope.row.retryOf === undefined && scope.row.retrySuccessId === undefined && !scope.row.waitTill"
									:type="scope.row.stoppedAt === null ? 'warning': 'danger'"
									class="ml-3xs"
									size="mini"
									:title="$locale.baseText('executionsList.retryExecution')"
									icon="redo"
								/>
							</span>
							<template #dropdown>
								<el-dropdown-menu>
									<el-dropdown-item :command="{command: 'currentlySaved', row: scope.row}">
										{{ $locale.baseText('executionsList.retryWithCurrentlySavedWorkflow') }}
									</el-dropdown-item>
									<el-dropdown-item :command="{command: 'original', row: scope.row}">
										{{ $locale.baseText('executionsList.retryWithOriginalworkflow') }}
									</el-dropdown-item>
								</el-dropdown-menu>
							</template>
						</el-dropdown>

					</template>
				</el-table-column>
				<el-table-column property="mode" :label="$locale.baseText('executionsList.mode')" width="100" align="center">
					<template #default="scope">
						{{ $locale.baseText(`executionsList.modes.${scope.row.mode}`) }}
					</template>
				</el-table-column>
				<el-table-column :label="$locale.baseText('executionsList.runningTime')" width="150" align="center">
					<template #default="scope">
						<span v-if="scope.row.stoppedAt === undefined">
							<font-awesome-icon icon="spinner" spin />
							<execution-time :start-time="scope.row.startedAt"/>
						</span>
						<!-- stoppedAt will be null if process crashed -->
						<span v-else-if="scope.row.stoppedAt === null">
							--
						</span>
						<span v-else>
							{{ displayTimer(new Date(scope.row.stoppedAt).getTime() - new Date(scope.row.startedAt).getTime(), true) }}
						</span>
					</template>
				</el-table-column>
				<el-table-column label="" width="100" align="center">
					<template #default="scope">
						<div class="actions-container">
							<span v-if="scope.row.stoppedAt === undefined || scope.row.waitTill">
								<n8n-icon-button icon="stop" size="small" :title="$locale.baseText('executionsList.stopExecution')" @click.stop="stopExecution(scope.row.id)" :loading="stoppingExecutions.includes(scope.row.id)" />
							</span>
							<span v-if="scope.row.stoppedAt !== undefined && scope.row.id" >
								<n8n-icon-button icon="folder-open" size="small" :title="$locale.baseText('executionsList.openPastExecution')" @click.stop="(e) => displayExecution(scope.row, e)" />
							</span>
						</div>
					</template>
				</el-table-column>
			</el-table>

			<div class="load-more" v-if="finishedExecutionsCount > finishedExecutions.length || finishedExecutionsCountEstimated === true">
				<n8n-button icon="sync" :title="$locale.baseText('executionsList.loadMore')" :label="$locale.baseText('executionsList.loadMore')" @click="loadMore()" :loading="isDataLoading" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
/* eslint-disable prefer-spread */
import Vue from 'vue';

import ExecutionTime from '@/components/ExecutionTime.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import Modal from '@/components/Modal.vue';

import { externalHooks } from '@/mixins/externalHooks';
import { WAIT_TIME_UNLIMITED, EXECUTIONS_MODAL_KEY, VIEWS } from '@/constants';

import { restApi } from '@/mixins/restApi';
import { genericHelpers } from '@/mixins/genericHelpers';
import { showMessage } from '@/mixins/showMessage';
import {
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionsListResponse,
	IExecutionShortResponse,
	IExecutionsSummary,
	IWorkflowShortResponse,
} from '@/Interface';

import {
	convertToDisplayDate,
} from '@/utils';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	range as _range,
} from 'lodash';

import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';

export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
).extend({
	name: 'ExecutionsList',
	components: {
		ExecutionTime,
		WorkflowActivator,
		Modal,
	},
	data () {
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

			selectedItems: {} as { [key: string]: boolean; },

			stoppingExecutions: [] as string[],
			workflows: [] as IWorkflowShortResponse[],
			modalBus: new Vue(),
			EXECUTIONS_MODAL_KEY,
		};
	},
	async created() {
		await this.loadWorkflows();
		await this.refreshData();
		this.handleAutoRefreshToggle();

		this.$externalHooks().run('executionsList.openDialog');
		this.$telemetry.track('User opened Executions log', { workflow_id: this.workflowsStore.workflowId });
	},
	beforeDestroy() {
		if (this.autoRefreshInterval) {
			clearInterval(this.autoRefreshInterval);
			this.autoRefreshInterval = undefined;
		}
	},
	computed: {
		...mapStores(
			useUIStore,
			useWorkflowsStore,
		),
		statuses () {
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
		activeExecutions (): IExecutionsCurrentSummaryExtended[] {
			return this.workflowsStore.activeExecutions;
		},
		combinedExecutions (): IExecutionsSummary[] {
			const returnData: IExecutionsSummary[] = [];

			if (['ALL', 'running'].includes(this.filter.status)) {
				returnData.push.apply(returnData, this.activeExecutions);
			}
			if (['ALL', 'error', 'success', 'waiting'].includes(this.filter.status)) {
				returnData.push.apply(returnData, this.finishedExecutions);
			}

			return returnData;
		},
		combinedExecutionsCount (): number {
			return 0 + this.activeExecutions.length + this.finishedExecutionsCount;
		},
		numSelected (): number {
			if (this.checkAll === true) {
				return this.finishedExecutionsCount;
			}

			return Object.keys(this.selectedItems).length;
		},
		isIndeterminate (): boolean {
			if (this.checkAll === true) {
				return false;
			}

			if (this.numSelected > 0) {
				return true;
			}
			return false;
		},
		workflowFilterCurrent (): IDataObject {
			const filter: IDataObject = {};
			if (this.filter.workflowId !== 'ALL') {
				filter.workflowId = this.filter.workflowId;
			}
			return filter;
		},
		workflowFilterPast (): IDataObject {
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
			this.modalBus.$emit('close');
		},
		convertToDisplayDate,
		displayExecution (execution: IExecutionShortResponse, e: PointerEvent) {
			if (e.metaKey || e.ctrlKey) {
				const route = this.$router.resolve({ name: VIEWS.EXECUTION_PREVIEW, params: { name: execution.workflowId, executionId: execution.id } });
				window.open(route.href, '_blank');

				return;
			}

			this.$router.push({ name: VIEWS.EXECUTION_PREVIEW, params: { name: execution.workflowId, executionId: execution.id } }).catch(()=>{});;
			this.modalBus.$emit('closeAll');
		},
		handleAutoRefreshToggle () {
			if (this.autoRefreshInterval) {
				// Clear any previously existing intervals (if any - there shouldn't)
				clearInterval(this.autoRefreshInterval);
				this.autoRefreshInterval = undefined;
			}


			if (this.autoRefresh) {
				this.autoRefreshInterval = setInterval(() => this.loadAutoRefresh(), 4 * 1000); // refresh data every 4 secs
			}
		},
		handleCheckAllChange () {
			if (this.checkAll === false) {
				Vue.set(this, 'selectedItems', {});
			}
		},
		handleCheckboxChanged (executionId: string) {
			if (this.selectedItems[executionId]) {
				Vue.delete(this.selectedItems, executionId);
			} else {
				Vue.set(this.selectedItems, executionId, true);
			}
		},
		async handleDeleteSelected () {
			const deleteExecutions = await this.confirmMessage(
				this.$locale.baseText(
					'executionsList.confirmMessage.message',
					{ interpolate: { numSelected: this.numSelected.toString() }},
				),
				this.$locale.baseText('executionsList.confirmMessage.headline'),
				'warning',
				this.$locale.baseText('executionsList.confirmMessage.confirmButtonText'),
				this.$locale.baseText('executionsList.confirmMessage.cancelButtonText'),
			);

			if (deleteExecutions === false) {
				return;
			}

			this.isDataLoading = true;

			const sendData: IExecutionDeleteFilter = {};
			if (this.checkAll === true) {
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
				const activeExecution: IExecutionsSummary | null = this.workflowsStore.activeWorkflowExecution;
				// Also update current workflow executions view if needed
				for (const selectedId of Object.keys(this.selectedItems)) {
					const execution: IExecutionsSummary | undefined = this.workflowsStore.getExecutionDataById(selectedId);
					if (execution && execution.workflowId === currentWorkflow) {
						this.workflowsStore.deleteExecution(execution);
						removedCurrentlyLoadedExecution = true;
					}
					if ((execution !== undefined && activeExecution !== null) && execution.id === activeExecution.id) {
						removedActiveExecution = true;
					}
				}
				// Also update route if needed
				if (removedCurrentlyLoadedExecution) {
					const currentWorkflowExecutions: IExecutionsSummary[] = this.workflowsStore.currentWorkflowExecutions;
					if (currentWorkflowExecutions.length === 0) {
						this.workflowsStore.activeWorkflowExecution = null;

						this.$router.push({ name: VIEWS.EXECUTION_HOME, params: { name: currentWorkflow } });
					} else if (removedActiveExecution) {
						this.workflowsStore.activeWorkflowExecution = currentWorkflowExecutions[0];
						this.$router.push({
							name: VIEWS.EXECUTION_PREVIEW,
							params: { name: currentWorkflow, executionId: currentWorkflowExecutions[0].id },
						}).catch(()=>{});;
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
		handleFilterChanged () {
			this.refreshData();
		},
		handleRetryClick (commandData: { command: string, row: IExecutionShortResponse }) {
			let loadWorkflow = false;
			if (commandData.command === 'currentlySaved') {
				loadWorkflow = true;
			}

			this.retryExecution(commandData.row, loadWorkflow);

			this.$telemetry.track('User clicked retry execution button', {
				workflow_id: this.workflowsStore.workflowId,
				execution_id: commandData.row.id,
				retry_type: loadWorkflow ? 'current' : 'original',
			});
		},
		getRowClass (data: IDataObject): string {
			const classes: string[] = [];
			if ((data.row as IExecutionsSummary).stoppedAt === undefined) {
				classes.push('currently-running');
			}

			return classes.join(' ');
		},
		getWorkflowName (workflowId: string): string | undefined {
			const workflow = this.workflows.find((data) => data.id === workflowId);
			if (workflow === undefined) {
				return undefined;
			}

			return workflow.name;
		},
		async loadActiveExecutions (): Promise<void> {
			const activeExecutions = await this.restApi().getCurrentExecutions(this.workflowFilterCurrent);
			for (const activeExecution of activeExecutions) {
				if (activeExecution.workflowId !== undefined && activeExecution.workflowName === undefined) {
					activeExecution.workflowName = this.getWorkflowName(activeExecution.workflowId);
				}
			}

			this.workflowsStore.activeExecutions = activeExecutions;
		},
		async loadAutoRefresh () : Promise<void> {
			const filter = this.workflowFilterPast;
			// We cannot use firstId here as some executions finish out of order. Let's say
			// You have execution ids 500 to 505 running.
			// Suppose 504 finishes before 500, 501, 502 and 503.
			// iF you use firstId, filtering id >= 504 you won't
			// ever get ids 500, 501, 502 and 503 when they finish
			const pastExecutionsPromise: Promise<IExecutionsListResponse> = this.restApi().getPastExecutions(filter, 30);
			const currentExecutionsPromise: Promise<IExecutionsCurrentSummaryExtended[]> = this.restApi().getCurrentExecutions({});

			const results = await Promise.all([pastExecutionsPromise, currentExecutionsPromise]);

			for (const activeExecution of results[1]) {
				if (activeExecution.workflowId !== undefined && activeExecution.workflowName === undefined) {
					activeExecution.workflowName = this.getWorkflowName(activeExecution.workflowId);
				}
			}

			this.workflowsStore.activeExecutions = results[1];

			// execution IDs are typed as string, int conversion is necessary so we can order.
			const alreadyPresentExecutionIds = this.finishedExecutions.map(exec => parseInt(exec.id, 10));
			let lastId = 0;
			const gaps = [] as number[];
			for(let i = results[0].results.length - 1; i >= 0; i--) {
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

					if (this.finishedExecutions[executionIndex].finished === false && currentItem.finished === true) {
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
			this.finishedExecutions = this.finishedExecutions.filter(execution => !gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10));
			this.finishedExecutionsCount = results[0].count;
			this.finishedExecutionsCountEstimated = results[0].estimated;
		},
		async loadFinishedExecutions (): Promise<void> {
			if (this.filter.status === 'running') {
				this.finishedExecutions = [];
				this.finishedExecutionsCount = 0;
				this.finishedExecutionsCountEstimated = false;
				return;
			}
			const data = await this.restApi().getPastExecutions(this.workflowFilterPast, this.requestItemsPerRequest);
			this.finishedExecutions = data.results;
			this.finishedExecutionsCount = data.count;
			this.finishedExecutionsCountEstimated = data.estimated;
		},
		async loadMore () {
			if (this.filter.status === 'running') {
				return;
			}

			this.isDataLoading = true;

			const filter = this.workflowFilterPast;
			let lastId: string | number | undefined;

			if (this.finishedExecutions.length !== 0) {
				const lastItem = this.finishedExecutions.slice(-1)[0];
				lastId = lastItem.id;
			}

			let data: IExecutionsListResponse;
			try {
				data = await this.restApi().getPastExecutions(filter, this.requestItemsPerRequest, lastId);
			} catch (error) {
				this.isDataLoading = false;
				this.$showError(
					error,
					this.$locale.baseText('executionsList.showError.loadMore.title'),
				);
				return;
			}

			data.results = data.results.map((execution) => {
				// @ts-ignore
				return { ...execution, mode: execution.mode };
			});

			this.finishedExecutions.push.apply(this.finishedExecutions, data.results);
			this.finishedExecutionsCount = data.count;
			this.finishedExecutionsCountEstimated = data.estimated;

			this.isDataLoading = false;
		},
		async loadWorkflows () {
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
		async retryExecution (execution: IExecutionShortResponse, loadWorkflow?: boolean) {
			this.isDataLoading = true;

			try {
				const retrySuccessful = await this.restApi().retryExecution(execution.id, loadWorkflow);

				if (retrySuccessful === true) {
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
		async refreshData () {
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
		statusTooltipText (entry: IExecutionsSummary): string {
			if (entry.waitTill) {
				const waitDate = new Date(entry.waitTill);
				if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
					return this.$locale.baseText('executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely');
				}

				return this.$locale.baseText(
					'executionsList.statusTooltipText.theWorkflowIsWaitingTill',
					{
						interpolate: {
							waitDateDate: waitDate.toLocaleDateString(),
							waitDateTime: waitDate.toLocaleTimeString(),
						},
					},
				);
			} else if (entry.stoppedAt === undefined) {
				return this.$locale.baseText('executionsList.statusTooltipText.theWorkflowIsCurrentlyExecuting');
			} else if (entry.finished === true && entry.retryOf !== undefined) {
				return this.$locale.baseText(
					'executionsList.statusTooltipText.theWorkflowExecutionWasARetryOfAndItWasSuccessful',
					{ interpolate: { entryRetryOf: entry.retryOf }},
				);
			} else if (entry.finished === true) {
				return this.$locale.baseText('executionsList.statusTooltipText.theWorkflowExecutionWasSuccessful');
			} else if (entry.retryOf !== undefined) {
				return this.$locale.baseText(
					'executionsList.statusTooltipText.theWorkflowExecutionWasARetryOfAndFailed',
					{ interpolate: { entryRetryOf: entry.retryOf }},
				);
			} else if (entry.retrySuccessId !== undefined) {
				return this.$locale.baseText(
					'executionsList.statusTooltipText.theWorkflowExecutionFailedButTheRetryWasSuccessful',
					{ interpolate: { entryRetrySuccessId: entry.retrySuccessId }},
				);
			} else if (entry.stoppedAt === null) {
				return this.$locale.baseText('executionsList.statusTooltipText.theWorkflowExecutionIsProbablyStillRunning');
			} else {
				return this.$locale.baseText('executionsList.statusTooltipText.theWorkflowExecutionFailed');
			}
		},
		async stopExecution (activeExecutionId: string) {
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
					message: this.$locale.baseText(
						'executionsList.showMessage.stopExecution.message',
						{ interpolate: { activeExecutionId } },
					),
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
	},
});
</script>

<style scoped lang="scss">

.autorefresh {
	padding-right: 0.5em;
	text-align: right;
}

.execution-actions {
	button {
		margin: 0 0.25em;
	}
}

.filters {
	line-height: 2em;
	.refresh-button {
		position: absolute;
		right: 0;
	}
}

.load-more {
	margin: 2em 0 0 0;
	width: 100%;
	text-align: center;
}

.selection-options {
	height: 2em;
}

.status-badge {
	position: relative;
	display: inline-block;
	padding: 0 10px;
	line-height: 22.6px;
	border-radius: 15px;
	text-align: center;
	font-size: var(--font-size-s);

	&.error {
		background-color: var(--color-danger-tint-1);
		color: var(--color-danger);
	}

	&.success {
		background-color: var(--color-success-tint-1);
		color: var(--color-success);
	}

	&.running, &.warning {
		background-color: var(--color-warning-tint-2);
		color: var(--color-warning);
	}
}

.workflow-name {
	font-weight: bold;
}

.actions-container > * {
	margin-left: 5px;
}

</style>

<style lang="scss">

.currently-running {
	background-color: var(--color-primary-tint-3) !important;
}

.el-table tr:hover.currently-running td {
	background-color: var(--color-primary-tint-2) !important;
}

</style>
