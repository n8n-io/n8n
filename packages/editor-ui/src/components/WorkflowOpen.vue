<template>
	<span>
		<el-dialog :visible="dialogVisible" append-to-body width="80%" :before-close="closeDialog" top="5vh">
			<el-row class="workflows-header">
				<el-col :span="9">
					<h1>Open Workflow</h1>
				</el-col>
				<el-col :span="6" :offset="5" class="tags-filter">
					<TagsDropdown 
						placeholder="Filter by tags..."
						:currentTagIds="filterTagIds"
						:createEnabled="false"
						@onUpdate="updateTagsFilter"
					/>
				</el-col>
				<el-col class="ignore-key-press" :span="4">
					<el-input placeholder="Workflow filter..." ref="inputFieldFilter" v-model="filterText">
						<i slot="prefix" class="el-input__icon el-icon-search"></i>
					</el-input>
				</el-col>
			</el-row>

			<el-table class="search-table" :data="filteredWorkflows" stripe @cell-click="openWorkflow" :default-sort = "{prop: 'updatedAt', order: 'descending'}" v-loading="isDataLoading">
				<el-table-column property="name" label="Name" class-name="clickable" sortable>
					<template slot-scope="scope">
						<div class="name" :key="scope.row.id">
							<span>{{scope.row.name}}</span> <TagContainer :tags="scope.row.tags"/>
						</div>
					</template>
				</el-table-column>
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
import { ITag, IWorkflowShortResponse } from '@/Interface';

import mixins from 'vue-typed-mixins';
import TagContainer from './TagContainer.vue';
import TagsDropdown from './TagsDropdown.vue';

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
		TagContainer,
TagsDropdown,
	},
	created() {
		this.$store.dispatch("tags/getAll");
	},
	data () {
		return {
			filterText: '',
			isDataLoading: false,
			workflows: [] as IWorkflowShortResponse[],
			filterTagIds: [] as string[],
		};
	},
	computed: {
		filteredWorkflows (): IWorkflowShortResponse[] {
			const tags = this.$store.getters['tags/allTags'];

			return this.workflows
				.filter((workflow: IWorkflowShortResponse) => {
					if (this.filterText && workflow.name.toLowerCase().indexOf(this.filterText.toLowerCase()) === -1) {
						return false;
					}

					if (this.filterTagIds.length === 0) {
						return true;
					}

					if (!workflow.tags || workflow.tags.length === 0) {
						return false;
					}

					return workflow.tags.reduce((accu: boolean, tag: ITag) => {
						return accu && this.filterTagIds.indexOf(tag.id) > -1;
					}, true);
				})
				.map((workflow): IWorkflowShortResponse => {
					workflow.tags = (workflow.tags || []).map((tag) => {
						return tags.find(({id}: ITag) => id === tag.id);
					})
					.filter((tag) => !!tag);

					return workflow;
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
		updateTagsFilter(tags: string[]) {
			this.filterTagIds = tags;
		},
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
						duration: 1500,
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
/deep/ .el-dialog  {
	.el-dialog__header {
		padding: 0;
	}
	.el-dialog__body {
		padding-top: 20px;
	}
}

.workflows-header {
	h1 {
		margin-top: 0;
		font-weight: 600;
		line-height: 24px;
		font-size: 18px;
	}

	.tags-filter {
		padding-right: 10px;
	}
}

.search-table {
	margin-top: 2em;

	.name span {
		margin-right: 10px;
	}
}
</style>
