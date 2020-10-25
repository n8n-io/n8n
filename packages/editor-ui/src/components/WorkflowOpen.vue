<template>
	<span>
		<el-dialog :visible="dialogVisible" append-to-body width="80%" title="Open Workflow" :before-close="closeDialog" top="5vh">

			<div class="text-very-light">
				Select a workflow to open:
			</div>

			<div class="search-wrapper ignore-key-press">
				<el-input placeholder="Workflow filter..." ref="inputFieldFilter" v-model="filterText">
					<i slot="prefix" class="el-input__icon el-icon-search"></i>
				</el-input>
			</div>

			<el-table class="search-table" :data="filteredWorkflows" stripe @cell-click="openWorkflow" :default-sort = "{prop: 'updatedAt', order: 'descending'}" v-loading="isDataLoading">
				<el-table-column property="name" label="Name" class-name="clickable" sortable></el-table-column>
				<el-table-column property="createdAt" label="Created" class-name="clickable" width="225" sortable></el-table-column>
				<el-table-column property="updatedAt" label="Updated" class-name="clickable" width="225" sortable></el-table-column>
				<el-table-column label="Active" width="90">
					<template slot-scope="scope">
						<workflow-activator :workflow-active="scope.row.active" :workflow-id="scope.row.id" @workflowActiveChanged="workflowActiveChanged" />
					</template>
				</el-table-column>
			</el-table>
		</el-dialog>
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

import WorkflowActivator from '@/components/WorkflowActivator.vue';

import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { titleChange } from '@/components/mixins/titleChange';
import { IWorkflowShortResponse } from '@/Interface';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
	workflowHelpers,
).extend({
	name: 'WorkflowOpen',
	props: [
		'dialogVisible',
	],
	components: {
		WorkflowActivator,
	},
	data () {
		return {
			filterText: '',
			isDataLoading: false,
			workflows: [] as IWorkflowShortResponse[],
		};
	},
	computed: {
		filteredWorkflows (): IWorkflowShortResponse[] {
			return this.workflows.filter((workflow: IWorkflowShortResponse) => {
				if (this.filterText === '' || workflow.name.toLowerCase().indexOf(this.filterText.toLowerCase()) !== -1) {
					return true;
				}
				return false;
			});
		},
	},
	watch: {
		dialogVisible (newValue, oldValue) {
			if (newValue) {
				this.filterText = '';
				this.openDialog();

				Vue.nextTick(() => {
					// Make sure that users can directly type in the filter
					(this.$refs.inputFieldFilter as HTMLInputElement).focus();
				});
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
		async openWorkflow (data: IWorkflowShortResponse, column: any) { // tslint:disable-line:no-any
			if (column.label !== 'Active') {

				const currentWorkflowId = this.$store.getters.workflowId;

				if (data.id === currentWorkflowId) {
					this.$showMessage({
						title: 'Already open',
						message: 'This is the current workflow',
						type: 'error',
						duration: 800,
					});
					// Do nothing if current workflow is the one user chose to open
					return;
				}

				const result = this.$store.getters.getStateIsDirty;
				if(result) {
					const importConfirm = await this.confirmMessage(`When you switch workflows your current workflow changes will be lost.`, 'Save your Changes?', 'warning', 'Yes, switch workflows and forget changes');
					if (importConfirm === false) {
						return;
					} else {
						// This is used to avoid duplicating the message
						this.$store.commit('setStateDirty', false);
						this.$emit('openWorkflow', data.id);
					}
				} else {
					this.$emit('openWorkflow', data.id);
				}
			}
		},
		openDialog () {
			this.isDataLoading = true;
			this.restApi().getWorkflows()
				.then(
					(data) => {
						this.workflows = data;

						this.workflows.forEach((workflowData: IWorkflowShortResponse) => {
							workflowData.createdAt = this.convertToDisplayDate(workflowData.createdAt as number);
							workflowData.updatedAt = this.convertToDisplayDate(workflowData.updatedAt as number);
						});
						this.isDataLoading = false;
					},
				)
				.catch(
					(error: Error) => {
						this.$showError(error, 'Problem loading workflows', 'There was a problem loading the workflows:');
						this.isDataLoading = false;
					},
				);
		},
		workflowActiveChanged (data: { id: string, active: boolean }) {
			for (const workflow of this.workflows) {
				if (workflow.id === data.id) {
					workflow.active = data.active;
				}
			}
		},
	},
});
</script>

<style scoped lang="scss">

.search-wrapper {
	position: absolute;
	right: 20px;
	top: 20px;
	width: 200px;
}

.search-table {
	margin-top: 2em;
}

</style>
