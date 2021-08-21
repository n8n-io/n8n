<template>
	<span>
		<el-dialog :visible="dialogVisible" append-to-body width="80%" :title="`Workflow Executions ${combinedExecutions.length}/${finishedExecutionsCountEstimated === true ? '~' : ''}${combinedExecutionsCount}`" :before-close="closeDialog">
			<div class="filters">
				<el-row>
					<el-col :span="4" class="filter-headline">
						Filters:
					</el-col>
					<el-col :span="6">
						<el-select v-model="filter.workflowId" placeholder="Select Workflow" size="small" filterable @change="handleFilterChanged">
							<el-option
								v-for="item in workflows"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</el-option>
						</el-select>
					</el-col>
					<el-col :span="2">&nbsp;
					</el-col>
					<el-col :span="4">
						<el-select v-model="filter.status" placeholder="Select Status" size="small" filterable @change="handleFilterChanged">
							<el-option
								v-for="item in statuses"
								:key="item.id"
								:label="item.name"
								:value="item.id">
							</el-option>
						</el-select>
					</el-col>
					<el-col :span="4">&nbsp;
					</el-col>
					<el-col :span="4" class="autorefresh">
						<el-checkbox v-model="autoRefresh" @change="handleAutoRefreshToggle">Auto refresh</el-checkbox>
					</el-col>
				</el-row>
			</div>

			<div class="selection-options">
				<span v-if="checkAll === true || isIndeterminate === true">
					Selected: {{numSelected}} / <span v-if="finishedExecutionsCountEstimated === true">~</span>{{finishedExecutionsCount}}
					<el-button type="danger" title="Delete Selected" icon="el-icon-delete" size="mini" @click="handleDeleteSelected" circle></el-button>
				</span>
			</div>

			<el-table :data="combinedExecutions" stripe v-loading="isDataLoading" :row-class-name="getRowClass">
				<el-table-column label="" width="30">
					<!-- eslint-disable-next-line vue/no-unused-vars -->
					<template slot="header" slot-scope="scope">
						<el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAllChange">Check all</el-checkbox>
					</template>
					<template slot-scope="scope">
						<el-checkbox v-if="scope.row.stoppedAt !== undefined && scope.row.id" :value="selectedItems[scope.row.id.toString()] || checkAll" @change="handleCheckboxChanged(scope.row.id)" >Check all</el-checkbox>
					</template>
				</el-table-column>
				<el-table-column property="startedAt" label="Started At / ID" width="205">
					<template slot-scope="scope">
						{{convertToDisplayDate(scope.row.startedAt)}}<br />
						<small v-if="scope.row.id">ID: {{scope.row.id}}</small>
					</template>
				</el-table-column>
				<el-table-column property="workflowName" label="Name">
					<template slot-scope="scope">
						<span class="workflow-name">
							{{scope.row.workflowName || '[UNSAVED WORKFLOW]'}}
						</span>

						<span v-if="scope.row.stoppedAt === undefined">
							(running)
						</span>
						<span v-if="scope.row.retryOf !== undefined">
							<br /><small>Retry of "{{scope.row.retryOf}}"</small>
						</span>
						<span v-else-if="scope.row.retrySuccessId !== undefined">
							<br /><small>Success retry "{{scope.row.retrySuccessId}}"</small>
						</span>
					</template>
				</el-table-column>
				<el-table-column label="Status" width="120" align="center">
					<template slot-scope="scope" align="center">

						<el-tooltip placement="top" effect="light">
							<div slot="content" v-html="statusTooltipText(scope.row)"></div>

							<span class="status-badge running" v-if="scope.row.waitTill">
								Waiting
							</span>
							<span class="status-badge running" v-else-if="scope.row.stoppedAt === undefined">
								Running
							</span>
							<span class="status-badge success" v-else-if="scope.row.finished">
								Success
							</span>
							<span class="status-badge error" v-else-if="scope.row.stoppedAt !== null">
								Error
							</span>
							<span class="status-badge warning" v-else>
								Unknown
							</span>
						</el-tooltip>

						<el-dropdown trigger="click" @command="handleRetryClick">
							<span class="el-dropdown-link">
								<el-button class="retry-button" v-bind:class="{ warning: scope.row.stoppedAt === null }" circle v-if="scope.row.stoppedAt !== undefined && !scope.row.finished && scope.row.retryOf === undefined && scope.row.retrySuccessId === undefined && scope.row.waitTill === undefined" type="text" size="small" title="Retry execution">
									<font-awesome-icon icon="redo" />
								</el-button>
							</span>
							<el-dropdown-menu slot="dropdown">
								<el-dropdown-item :command="{command: 'currentlySaved', row: scope.row}">Retry with currently saved workflow</el-dropdown-item>
								<el-dropdown-item :command="{command: 'original', row: scope.row}">Retry with original workflow</el-dropdown-item>
							</el-dropdown-menu>
						</el-dropdown>

					</template>
				</el-table-column>
				<el-table-column property="mode" label="Mode" width="100" align="center"></el-table-column>
				<el-table-column label="Running Time" width="150" align="center">
					<template slot-scope="scope">
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
					<template slot-scope="scope">
						<span v-if="scope.row.stoppedAt === undefined || scope.row.waitTill" class="execution-actions">
							<el-button circle title="Stop Execution" @click.stop="stopExecution(scope.row.id)" :loading="stoppingExecutions.includes(scope.row.id)" size="mini">
								<font-awesome-icon icon="stop" />
							</el-button>
						</span>
						<span v-if="scope.row.stoppedAt !== undefined && scope.row.id" class="execution-actions">
							<el-button circle title="Open Past Execution" @click.stop="displayExecution(scope.row)" size="mini">
								<font-awesome-icon icon="folder-open" />
							</el-button>
						</span>
					</template>
				</el-table-column>
			</el-table>

			<div class="load-more" v-if="finishedExecutionsCount > finishedExecutions.length || finishedExecutionsCountEstimated === true">
				<el-button title="Load More" @click="loadMore()" size="small" :disabled="isDataLoading">
					<font-awesome-icon icon="sync" /> Load More
				</el-button>
			</div>

		</el-dialog>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

import ExecutionTime from '@/components/ExecutionTime.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';

import { externalHooks } from '@/components/mixins/externalHooks';
import { WAIT_TIME_UNLIMITED } from '@/constants';

import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import {
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionsListResponse,
	IExecutionShortResponse,
	IExecutionsSummary,
	IWorkflowShortResponse,
} from '@/Interface';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	range as _range,
} from 'lodash';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
).extend({
	name: 'ExecutionsList',
	props: [
		'dialogVisible',
	],
	components: {
		ExecutionTime,
		WorkflowActivator,
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
			statuses: [
				{
					id: 'ALL',
					name: 'Any Status',
				},
				{
					id: 'error',
					name: 'Error',
				},
				{
					id: 'running',
					name: 'Running',
				},
				{
					id: 'success',
					name: 'Success',
				},
				{
					id: 'waiting',
					name: 'Waiting',
				},
			],

		};
	},
	computed: {
		activeExecutions (): IExecutionsCurrentSummaryExtended[] {
			return this.$store.getters.getActiveExecutions;
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
	watch: {
		dialogVisible (newValue, oldValue) {
			if (newValue) {
				this.openDialog();
			}
		},
	},
	methods: {
		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			if (this.autoRefreshInterval) {
				clearInterval(this.autoRefreshInterval);
				this.autoRefreshInterval = undefined;
			}
			return false;
		},
		displayExecution (execution: IExecutionShortResponse) {
			this.$router.push({
				name: 'ExecutionById',
				params: { id: execution.id },
			});
			this.closeDialog();
		},
		handleAutoRefreshToggle () {
			if (this.autoRefreshInterval) {
				// Clear any previously existing intervals (if any - there shouldn't)
				clearInterval(this.autoRefreshInterval);
				this.autoRefreshInterval = undefined;
			}


			if (this.autoRefresh) {
				this.autoRefreshInterval = setInterval(this.loadAutoRefresh, 4 * 1000); // refresh data every 4 secs
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
			const deleteExecutions = await this.confirmMessage(`Are you sure that you want to delete the ${this.numSelected} selected executions?`, 'Delete Executions?', 'warning', 'Yes, delete!');

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
			} catch (error) {
				this.isDataLoading = false;
				this.$showError(error, 'Problem deleting executions', 'There was a problem deleting the executions:');

				return;
			}
			this.isDataLoading = false;

			this.$showMessage({
				title: 'Execution deleted',
				message: 'The executions got deleted!',
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

			this.$store.commit('setActiveExecutions', activeExecutions);
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

			this.$store.commit('setActiveExecutions', results[1]);

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
				this.$showError(error, 'Problem loading workflows', 'There was a problem loading the workflows:');
				return;
			}

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
					name: 'All Workflows',
				});

				Vue.set(this, 'workflows', workflows);
			} catch (error) {
				this.$showError(error, 'Problem loading workflows', 'There was a problem loading the workflows:');
			}
		},
		async openDialog () {
			Vue.set(this, 'selectedItems', {});
			this.filter.workflowId = 'ALL';
			this.checkAll = false;

			await this.loadWorkflows();
			await this.refreshData();
			this.handleAutoRefreshToggle();

			this.$externalHooks().run('executionsList.openDialog');
		},
		async retryExecution (execution: IExecutionShortResponse, loadWorkflow?: boolean) {
			this.isDataLoading = true;

			try {
				const retrySuccessful = await this.restApi().retryExecution(execution.id, loadWorkflow);

				if (retrySuccessful === true) {
					this.$showMessage({
						title: 'Retry successful',
						message: 'The retry was successful!',
						type: 'success',
					});
				} else {
					this.$showMessage({
						title: 'Retry unsuccessful',
						message: 'The retry was not successful!',
						type: 'error',
					});
				}

				this.isDataLoading = false;
			} catch (error) {
				this.$showError(error, 'Problem with retry', 'There was a problem with the retry:');

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
				this.$showError(error, 'Problem loading', 'There was a problem loading the data:');
			}

			this.isDataLoading = false;
		},
		statusTooltipText (entry: IExecutionsSummary): string {
			if (entry.waitTill) {
				const waitDate = new Date(entry.waitTill);
				if (waitDate.toISOString() === WAIT_TIME_UNLIMITED) {
					return 'The workflow is waiting indefinitely for an incoming webhook call.';
				}
				return `The worklow is waiting till ${waitDate.toLocaleDateString()} ${waitDate.toLocaleTimeString()}.`;
			} else if (entry.stoppedAt === undefined) {
				return 'The worklow is currently executing.';
			} else if (entry.finished === true && entry.retryOf !== undefined) {
				return `The workflow execution was a retry of "${entry.retryOf}" and it was successful.`;
			} else if (entry.finished === true) {
				return 'The worklow execution was successful.';
			} else if (entry.retryOf !== undefined) {
				return `The workflow execution was a retry of "${entry.retryOf}" and failed.<br />New retries have to be started from the original execution.`;
			} else if (entry.retrySuccessId !== undefined) {
				return `The workflow execution failed but the retry "${entry.retrySuccessId}" was successful.`;
			} else if (entry.stoppedAt === null) {
				return 'The workflow execution is probably still running but it may have crashed and n8n cannot safely tell. ';
			} else {
				return 'The workflow execution failed.';
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
					title: 'Execution stopped',
					message: `The execution with the id "${activeExecutionId}" got stopped!`,
					type: 'success',
				});

				this.refreshData();
			} catch (error) {
				this.$showError(error, 'Problem stopping execution', 'There was a problem stopping the execuction:');
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

.retry-button {
	color: $--custom-error-text;
	background-color: $--custom-error-background;
	margin-left: 5px;
	&.warning {
		background-color: $--custom-warning-background;
		color: $--custom-warning-text;
	}
}

.selection-options {
	height: 2em;
}

.status-badge {
	position: relative;
	display: inline-block;
	padding: 0 10px;
	height: 30px;
	line-height: 30px;
	border-radius: 15px;
	text-align: center;
	font-weight: 400;

	&.error {
		background-color: $--custom-error-background;
		color: $--custom-error-text;
	}

	&.running {
		background-color: $--custom-running-background;
		color: $--custom-running-text;
	}

	&.success {
		background-color: $--custom-success-background;
		color: $--custom-success-text;
	}

	&.warning {
		background-color: $--custom-warning-background;
		color: $--custom-warning-text;
	}
}

.workflow-name {
	font-weight: bold;
}

</style>

<style lang="scss">

.currently-running {
	background-color: $--color-primary-light !important;
}

.el-table tr:hover.currently-running td {
	background-color: darken($--color-primary-light, 3% ) !important;
}

</style>
