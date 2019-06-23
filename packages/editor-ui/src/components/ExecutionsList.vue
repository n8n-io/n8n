<template>
	<span>
		<el-dialog :visible="dialogVisible" append-to-body width="80%" :title="`Workflow Executions (${combinedExecutions.length}/${combinedExecutionsCount})`" :before-close="closeDialog">
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
					<el-col :span="3">&nbsp;
					</el-col>
					<el-col :span="3" class="filter-headline">
						Auto-Refresh:
					</el-col>
					<el-col :span="4">
						<el-select v-model="autoRefresh.time" placeholder="Select Refresh Time" size="small" filterable @change="handleRefreshTimeChanged">
							<el-option
								v-for="item in autoRefresh.options"
								:key="item.value"
								:label="item.name"
								:value="item.value">
							</el-option>
						</el-select>
					</el-col>
					<el-col :span="4">
						<el-button title="Refresh" @click="refreshData()" :disabled="isDataLoading" size="small" type="success" class="refresh-button">
							<font-awesome-icon icon="sync" /> Manual Refresh
						</el-button>
					</el-col>
				</el-row>
			</div>

			<div class="selection-options">
				<span v-if="checkAll === true || isIndeterminate === true">
					Selected: {{numSelected}}/{{finishedExecutionsCount}}
					<el-button type="danger" title="Delete Selected" icon="el-icon-delete" size="mini" @click="handleDeleteSelected" circle></el-button>
				</span>
			</div>

			<el-table :data="combinedExecutions" stripe v-loading="isDataLoading" :row-class-name="getRowClass" @row-click="handleRowClick">
				<el-table-column label="" width="30">
					<!-- eslint-disable-next-line vue/no-unused-vars -->
					<template slot="header" slot-scope="scope">
						<el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAllChange">Check all</el-checkbox>
					</template>
					<template slot-scope="scope">
						<el-checkbox v-if="scope.row.stoppedAt !== undefined" :value="selectedItems[scope.row.id.toString()] || checkAll" @change="handleCheckboxChanged(scope.row.id)" >Check all</el-checkbox>
					</template>
				</el-table-column>
				<el-table-column property="startedAt" label="Started At / ID" width="205">
					<template slot-scope="scope">
						{{convertToDisplayDate(scope.row.startedAt)}}<br />
						<small>ID: {{scope.row.id}}</small>
					</template>
				</el-table-column>
				<el-table-column property="workflowName" label="Name">
					<template slot-scope="scope">
						<span class="workflow-name">
							{{scope.row.workflowName}}
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
				<el-table-column label="Status" width="120">
					<template slot-scope="scope">

						<el-tooltip placement="top" effect="light">
							<div slot="content" v-html="statusTooltipText(scope.row)"></div>

							<span class="status-badge running" v-if="scope.row.stoppedAt === undefined">
								Running
							</span>
							<span class="status-badge success" v-else-if="scope.row.finished">
								Success
							</span>
							<span class="status-badge error" v-else>
								Error
							</span>
						</el-tooltip>

						<el-button class="retry-button" circle v-if="scope.row.stoppedAt !== undefined && !scope.row.finished && scope.row.retryOf === undefined && scope.row.retrySuccessId === undefined" @click.stop="retryExecution(scope.row)" type="text" size="small" title="Retry execution">
							<font-awesome-icon icon="redo" />
						</el-button>

					</template>
				</el-table-column>
				<el-table-column property="mode" label="Mode" width="100" align="center"></el-table-column>
				<el-table-column label="Running Time" width="150" align="center">
					<template slot-scope="scope">
						<span v-if="scope.row.stoppedAt === undefined">
							<font-awesome-icon icon="spinner" spin />
							{{(new Date().getTime() - new Date(scope.row.startedAt).getTime())/1000}} sec.
						</span>
						<span v-else>
							{{(scope.row.stoppedAt - scope.row.startedAt) / 1000}} sec.
						</span>
					</template>
				</el-table-column>
				<el-table-column label="" width="100" align="center">
					<template slot-scope="scope">
						<span v-if="scope.row.stoppedAt === undefined">
							<el-button circle title="Stop Execution" @click.stop="stopExecution(scope.row.id)" :loading="stoppingExecutions.includes(scope.row.id)" size="mini">
								<font-awesome-icon icon="stop" />
							</el-button>
						</span>
						<span v-else>
							<el-button circle title="Open Past Execution" @click.stop="displayExecution(scope.row)" size="mini">
								<font-awesome-icon icon="folder-open" />
							</el-button>
						</span>
					</template>
				</el-table-column>
			</el-table>

			<div class="load-more" v-if="finishedExecutionsCount > finishedExecutions.length">
				<el-button title="Load More" @click="loadMore()" size="small" :disabled="isDataLoading">
					<font-awesome-icon icon="sync" /> Load More
				</el-button>
			</div>

		</el-dialog>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

import WorkflowActivator from '@/components/WorkflowActivator.vue';

import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import {
	IExecutionsCurrentSummaryExtended,
	IExecutionDeleteFilter,
	IExecutionsListResponse,
	IExecutionShortResponse,
	IExecutionsStopData,
	IExecutionsSummary,
	IWorkflowShortResponse,
} from '@/Interface';

import {
	IDataObject,
} from 'n8n-workflow';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
).extend({
	name: 'ExecutionsList',
	props: [
		'dialogVisible',
	],
	components: {
		WorkflowActivator,
	},
	data () {
		return {
			activeExecutions: [] as IExecutionsCurrentSummaryExtended[],

			finishedExecutions: [] as IExecutionsSummary[],
			finishedExecutionsCount: 0,

			checkAll: false,

			autoRefresh: {
				timer: undefined as NodeJS.Timeout | undefined,
				time: -1,
				options: [
					{
						name: 'Deactivated',
						value: -1,
					},
					{
						name: '5 Seconds',
						value: 5,
					},
					{
						name: '10 Seconds',
						value: 10,
					},
					{
						name: '15 Seconds',
						value: 15,
					},
					{
						name: '30 Seconds',
						value: 30,
					},
					{
						name: '1 Minute',
						value: 60,
					},
					{
						name: '5 Minutes',
						value: 300,
					},
				],
			},

			filter: {
				workflowId: 'ALL',
			},

			isDataLoading: false,

			requestItemsPerRequest: 10,

			selectedItems: {} as { [key: string]: boolean; },

			stoppingExecutions: [] as string[],
			workflows: [] as IWorkflowShortResponse[],

		};
	},
	computed: {
		combinedExecutions (): IExecutionsSummary[] {
			const returnData: IExecutionsSummary[] = [];

			// The active executions do not have the workflow-names yet so add them
			for (const executionData of this.activeExecutions) {
				executionData.workflowName = this.getWorkflowName(executionData.workflowId);
				returnData.push(executionData);
			}

			returnData.push.apply(returnData, this.finishedExecutions);

			return returnData;
		},
		combinedExecutionsCount (): number {
			return this.activeExecutions.length + this.finishedExecutionsCount;
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
		workflowFilter (): IDataObject {
			const filter: IDataObject = {};
			if (this.filter.workflowId !== 'ALL') {
				filter.workflowId = this.filter.workflowId;
			}
			return filter;
		},
	},
	watch: {
		dialogVisible (newValue, oldValue) {
			if (newValue) {
				this.openDialog();
			} else {
				this.handleRefreshTimeChanged(-1);
			}
		},
	},
	methods: {
		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},
		displayExecution (execution: IExecutionShortResponse) {
			this.$router.push({
				name: 'ExecutionById',
				params: { id: execution.id },
			});
			this.closeDialog();
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
				sendData.deleteBefore = this.finishedExecutions[0].startedAt as number;
			} else {
				sendData.ids = Object.keys(this.selectedItems);
			}

			sendData.filters = this.workflowFilter;

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
		getRowClass (data: IDataObject): string {
			const classes: string[] = ['clickable'];
			if ((data.row as IExecutionsSummary).stoppedAt === undefined) {
				classes.push('currently-running');
			}

			return classes.join(' ');
		},
		getWorkflowName (workflowId: string): string {
			const workflow = this.workflows.find((data) => data.id === workflowId);
			if (workflow === undefined) {
				return '<UNSAVED WORKFLOW>';
			}

			return workflow.name;
		},
		async loadActiveExecutions (): Promise<void> {
			this.activeExecutions = await this.restApi().getCurrentExecutions(this.workflowFilter);
		},
		async loadFinishedExecutions (): Promise<void> {
			const data = await this.restApi().getPastExecutions(this.workflowFilter, this.requestItemsPerRequest);
			this.finishedExecutions = data.results;
			this.finishedExecutionsCount = data.count;
		},
		async loadMore () {
			// Deactivate the auto-refresh because else the newly displayed
			// data would be lost with the next automatic refresh
			this.autoRefresh.time = -1;
			this.handleRefreshTimeChanged();

			this.isDataLoading = true;

			const filter = this.workflowFilter;
			let lastStartedAt: number | undefined;

			if (this.finishedExecutions.length !== 0) {
				const lastItem = this.finishedExecutions.slice(-1)[0];
				lastStartedAt = lastItem.startedAt as number;
			}

			let data: IExecutionsListResponse;
			try {
				data = await this.restApi().getPastExecutions(filter, this.requestItemsPerRequest, lastStartedAt);
			} catch (error) {
				this.isDataLoading = false;
				this.$showError(error, 'Problem loading workflows', 'There was a problem loading the workflows:');
				return;
			}

			this.finishedExecutions.push.apply(this.finishedExecutions, data.results);
			this.finishedExecutionsCount = data.count;

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
					name: 'All',
				});

				Vue.set(this, 'workflows', workflows);
			} catch (error) {
				this.$showError(error, 'Problem loading workflows', 'There was a problem loading the workflows:');
			}
		},
		openDialog () {
			Vue.set(this, 'selectedItems', {});
			this.filter.workflowId = 'ALL';
			this.checkAll = false;

			this.loadWorkflows();
			this.refreshData();
			this.handleRefreshTimeChanged();
		},
		handleRefreshTimeChanged (manualOverwrite?: number) {
			if (this.autoRefresh.timer !== undefined) {
				// Make sure the old timer gets removed
				clearInterval(this.autoRefresh.timer);
				this.autoRefresh.timer = undefined;
			}

			const timerValue = manualOverwrite !== undefined ? manualOverwrite : this.autoRefresh.time;
			if (timerValue === -1) {
				// No timer should be set
				return;
			}

			// Create the new interval timer
			this.autoRefresh.timer = setInterval(() => {
				this.refreshData();
			}, timerValue * 1000);
		},
		async retryExecution (execution: IExecutionShortResponse) {
			this.isDataLoading = true;

			try {
				const data = await this.restApi().retryExecution(execution.id);

				if (data.finished === true) {
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

				this.refreshData();
				this.isDataLoading = false;
			} catch (error) {
				this.$showError(error, 'Problem with retry', 'There was a problem with the retry:');

				this.isDataLoading = false;
				this.refreshData();
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
		handleRowClick (entry: IExecutionsSummary, event: Event, column: any) { // tslint:disable-line:no-any
			if (column.label === '') {
				// Ignore all clicks in the first and last row
				return;
			}

			if (this.selectedItems[entry.id]) {
				Vue.delete(this.selectedItems, entry.id);
			} else {
				Vue.set(this.selectedItems, entry.id, true);
			}
		},
		statusTooltipText (entry: IExecutionsSummary): string {
			if (entry.stoppedAt === undefined) {
				return 'The worklow is currently executing.';
			} else if (entry.finished === true) {
				return 'The worklow execution was successful.';
			} else if (entry.retryOf !== undefined) {
				return `The workflow execution was a retry of "${entry.retryOf}" and did fail.<br />New retries have to be started from the original execution.`;
			} else if (entry.retrySuccessId !== undefined) {
				return `The workflow execution did fail but the retry "${entry.retrySuccessId}" was successful.`;
			} else {
				return 'The workflow execution did fail.';
			}
		},
		async stopExecution (executionId: string) {
			try {
				// Add it to the list of currently stopping executions that we
				// can show the user in the UI that it is in progress
				this.stoppingExecutions.push(executionId);

				const stopData: IExecutionsStopData = await this.restApi().stopCurrentExecution(executionId);

				// Remove it from the list of currently stopping executions
				const index = this.stoppingExecutions.indexOf(executionId);
				this.stoppingExecutions.splice(index, 1);

				this.$showMessage({
					title: 'Execution stopped',
					message: `The execution with the id "${executionId}" got stopped!`,
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
	background-color: #907070 !important;
}

</style>
