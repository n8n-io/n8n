<template>
	<span>
		<el-dialog :visible="dialogVisible" append-to-body width="80%" :title="`${this.$translateBase('executionsList.workflowExecutions')} (${combinedExecutions.length}/${combinedExecutionsCount})`" :before-close="closeDialog">
			<div class="filters">
				<el-row>
					<el-col :span="4" class="filter-headline">
						{{ $translateBase('executionsList.filters', { colon: true }) }}
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
						<el-checkbox v-model="autoRefresh" @change="handleAutoRefreshToggle">{{ $translateBase('executionsList.autoRefresh') }}</el-checkbox>
					</el-col>
				</el-row>
			</div>

			<div class="selection-options">
				<span v-if="checkAll === true || isIndeterminate === true">
					{{ $translateBase('executionsList.selected', { colon: true }) }} {{numSelected}}/{{finishedExecutionsCount}}
					<el-button type="danger" title="Delete Selected" icon="el-icon-delete" size="mini" @click="handleDeleteSelected" circle></el-button>
				</span>
			</div>

			<el-table :data="combinedExecutions" stripe v-loading="isDataLoading" :row-class-name="getRowClass">
				<el-table-column label="" width="30">
					<!-- eslint-disable-next-line vue/no-unused-vars -->
					<template slot="header" slot-scope="scope">
						<el-checkbox :indeterminate="isIndeterminate" v-model="checkAll" @change="handleCheckAllChange">{{ $translateBase('executionsList.checkAll') }}</el-checkbox>
					</template>
					<template slot-scope="scope">
						<el-checkbox v-if="scope.row.stoppedAt !== undefined && scope.row.id" :value="selectedItems[scope.row.id.toString()] || checkAll" @change="handleCheckboxChanged(scope.row.id)" >Check all</el-checkbox>
					</template>
				</el-table-column>
				<el-table-column property="startedAt" :label="$translateBase('executionsList.startedAtId')" width="205">
					<template slot-scope="scope">
						{{convertToDisplayDate(scope.row.startedAt)}}<br />
						<small v-if="scope.row.id">ID: {{scope.row.id}}</small>
					</template>
				</el-table-column>
				<el-table-column property="workflowName" :label="$translateBase('executionsList.name')">
					<template slot-scope="scope">
						<span class="workflow-name">
							{{scope.row.workflowName || '[UNSAVED WORKFLOW]'}}
						</span>

						<span v-if="scope.row.stoppedAt === undefined">
							({{ $translateBase('executionsList.runningParens') }})
						</span>
						<span v-if="scope.row.retryOf !== undefined">
							<br /><small>{{ $translateBase('executionsList.retryOf') }} "{{scope.row.retryOf}}"</small>
						</span>
						<span v-else-if="scope.row.retrySuccessId !== undefined">
							<br /><small>{{ $translateBase('executionsList.successRetry') }} "{{scope.row.retrySuccessId}}"</small>
						</span>
					</template>
				</el-table-column>
				<el-table-column :label="$translateBase('executionsList.status')" width="120" align="center">
					<template slot-scope="scope" align="center">

						<el-tooltip placement="top" effect="light">
							<div slot="content" v-html="statusTooltipText(scope.row)"></div>

							<span class="status-badge running" v-if="scope.row.stoppedAt === undefined">
								{{ $translateBase('executionsList.running') }}
							</span>
							<span class="status-badge success" v-else-if="scope.row.finished">
								{{ $translateBase('executionsList.success') }}
							</span>
							<span class="status-badge error" v-else-if="scope.row.stoppedAt !== null">
								{{ $translateBase('executionsList.error') }}
							</span>
							<span class="status-badge warning" v-else>
								{{ $translateBase('executionsList.unknown') }}
							</span>
						</el-tooltip>

						<el-dropdown trigger="click" @command="handleRetryClick">
							<span class="el-dropdown-link">
								<el-button class="retry-button" v-bind:class="{ warning: scope.row.stoppedAt === null }" circle v-if="scope.row.stoppedAt !== undefined && !scope.row.finished && scope.row.retryOf === undefined && scope.row.retrySuccessId === undefined" type="text" size="small" :title="$translateBase('executionsList.retryExecution')">
									<font-awesome-icon icon="redo" />
								</el-button>
							</span>
							<el-dropdown-menu slot="dropdown">
								<el-dropdown-item :command="{command: 'currentlySaved', row: scope.row}">{{ $translateBase('executionsList.retryWithCurrentlySavedWorkflow') }}</el-dropdown-item>
								<el-dropdown-item :command="{command: 'original', row: scope.row}">{{ $translateBase('executionsList.retryWithOriginalworkflow') }}</el-dropdown-item>
							</el-dropdown-menu>
						</el-dropdown>

					</template>
				</el-table-column>
				<el-table-column property="mode" :label="$translateBase('executionsList.mode')" width="100" align="center"></el-table-column>
				<el-table-column :label="$translateBase('executionsList.runningTime')" width="150" align="center">
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
						<span v-if="scope.row.stoppedAt === undefined">
							<el-button circle title="Stop Execution" @click.stop="stopExecution(scope.row.id)" :loading="stoppingExecutions.includes(scope.row.id)" size="mini">
								<font-awesome-icon icon="stop" />
							</el-button>
						</span>
						<span v-else-if="scope.row.id">
							<el-button circle :title="$translateBase('executionsList.openPastExecution')" @click.stop="displayExecution(scope.row)" size="mini">
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

import ExecutionTime from '@/components/ExecutionTime.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';

import { externalHooks } from '@/components/mixins/externalHooks';
import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { translate } from '@/components/mixins/translate';
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

import {
	range as _range,
} from 'lodash';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
	genericHelpers,
	restApi,
	showMessage,
	translate,
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
					name: this.$translateBase('executionsList.anyStatus'),
				},
				{
					id: 'error',
					name: this.$translateBase('executionsList.error'),
				},
				{
					id: 'running',
					name: this.$translateBase('executionsList.running'),
				},
				{
					id: 'success',
					name: this.$translateBase('executionsList.success'),
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
			if (['ALL', 'error', 'success'].includes(this.filter.status)) {
				returnData.push.apply(returnData, this.finishedExecutions);
			}

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
			if (['error', 'success'].includes(this.filter.status)) {
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
			const deleteExecutions = await this.confirmMessage(
				this.$translateBase(
					'executionsList.confirmMessage.message',
					{ interpolate: { numSelected: this.numSelected.toString() }},
				),
				this.$translateBase('executionsList.confirmMessage.headline'),
				'warning',
				this.$translateBase('executionsList.confirmMessage.confirmButtonText'),
				this.$translateBase('executionsList.confirmMessage.cancelButtonText'),
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
			} catch (error) {
				this.isDataLoading = false;
				this.$showError(
					error,
					this.$translateBase('executionsList.showError.handleDeleteSelected.title'),
					this.$translateBase('executionsList.showError.handleDeleteSelected.message', { colon: true }),
				);

				return;
			}
			this.isDataLoading = false;

			this.$showMessage({
				title: this.$translateBase('executionsList.showMessage.handleDeleteSelected.title'),
				message: this.$translateBase('executionsList.showMessage.handleDeleteSelected.message'),
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
		},
		async loadFinishedExecutions (): Promise<void> {
			if (this.filter.status === 'running') {
				this.finishedExecutions = [];
				this.finishedExecutionsCount = 0;
				return;
			}
			const data = await this.restApi().getPastExecutions(this.workflowFilterPast, this.requestItemsPerRequest);
			this.finishedExecutions = data.results;
			this.finishedExecutionsCount = data.count;
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
					this.$translateBase('executionsList.showError.loadMore.title'),
					this.$translateBase('executionsList.showError.loadMore.message', { colon: true }),
				);
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
					name: this.$translateBase('executionsList.allWorkflows'),
				});

				Vue.set(this, 'workflows', workflows);
			} catch (error) {
				this.$showError(
					error,
					this.$translateBase('executionsList.showError.loadWorkflows.title'),
					this.$translateBase('executionsList.showError.loadWorkflows.message', { colon: true }),
				);
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
						title: this.$translateBase('executionsList.showMessage.retrySuccessfulTrue.title'),
						message: this.$translateBase('executionsList.showMessage.retrySuccessfulTrue.message'),
						type: 'success',
					});
				} else {
					this.$showMessage({
						title: this.$translateBase('executionsList.showMessage.retrySuccessfulFalse.title'),
						message: this.$translateBase('executionsList.showMessage.retrySuccessfulFalse.message'),
						type: 'error',
					});
				}

				this.isDataLoading = false;
			} catch (error) {
				this.$showError(
					error,
					this.$translateBase('executionsList.showError.retryExecution.title'),
					this.$translateBase('executionsList.showError.retryExecution.message', { colon: true }),
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
					this.$translateBase('executionsList.showError.refreshData.title'),
					this.$translateBase('executionsList.showError.refreshData.message', { colon: true }),
				);
			}

			this.isDataLoading = false;
		},
		statusTooltipText (entry: IExecutionsSummary): string {
			if (entry.stoppedAt === undefined) {
				return this.$translateBase('executionsList.statusTooltipText.theWorkflowIsCurrentlyExecuting');
			} else if (entry.finished === true && entry.retryOf !== undefined) {
				return this.$translateBase(
					'executionsList.statusTooltipText.theWorkflowExecutionWasARetryOfAndItWasSuccessful',
					{ interpolate: { entryRetryOf: entry.retryOf }},
				);
			} else if (entry.finished === true) {
				return this.$translateBase('executionsList.statusTooltipText.theWorkflowExecutionWasSuccessful');
			} else if (entry.retryOf !== undefined) {
				return this.$translateBase(
					'executionsList.statusTooltipText.theWorkflowExecutionWasARetryOfAndFailed',
					{ interpolate: { entryRetryOf: entry.retryOf }},
				);
			} else if (entry.retrySuccessId !== undefined) {
				return this.$translateBase(
					'executionsList.statusTooltipText.theWorkflowExecutionFailedButTheRetryWasSuccessful',
					{ interpolate: { entryRetrySuccessId: entry.retrySuccessId }},
				);
			} else if (entry.stoppedAt === null) {
				return this.$translateBase('executionsList.statusTooltipText.theWorkflowExecutionIsProbablyStillRunning');
			} else {
				return this.$translateBase('executionsList.statusTooltipText.theWorkflowExecutionFailed');
			}
		},
		async stopExecution (activeExecutionId: string) {
			try {
				// Add it to the list of currently stopping executions that we
				// can show the user in the UI that it is in progress
				this.stoppingExecutions.push(activeExecutionId);

				const stopData: IExecutionsStopData = await this.restApi().stopCurrentExecution(activeExecutionId);

				// Remove it from the list of currently stopping executions
				const index = this.stoppingExecutions.indexOf(activeExecutionId);
				this.stoppingExecutions.splice(index, 1);

				this.$showMessage({
					title: this.$translateBase('executionsList.showMessage.stopExecution.title'),
					message: this.$translateBase('executionsList.showMessage.stopExecution.message'),
					type: 'success',
				});

				this.refreshData();
			} catch (error) {
				this.$showError(
					error,
					this.$translateBase('executionsList.showError.stopExecution.title'),
					this.$translateBase(
						'executionsList.showError.stopExecution.message',
						{ colon: true, interpolate: { activeExecutionId } },
					),
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
