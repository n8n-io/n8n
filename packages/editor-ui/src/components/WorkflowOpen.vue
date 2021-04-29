<template>
	<Modal
		name="workflowOpen"
		size="xl"
	>
			<template slot="header">
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
					<el-col :span="4">
						<el-input placeholder="Workflow filter..." ref="inputFieldFilter" v-model="filterText">
							<i slot="prefix" class="el-input__icon el-icon-search"></i>
						</el-input>
					</el-col>
				</el-row>
			</template>

			<template slot="content">
				<el-table class="search-table" :data="filteredWorkflows" stripe @cell-click="openWorkflow" :default-sort = "{prop: 'updatedAt', order: 'descending'}" v-loading="isDataLoading">
					<el-table-column property="name" label="Name" class-name="clickable" sortable>
						<template slot-scope="scope">
							<div class="name" :key="scope.row.id">
								<span>{{scope.row.name}}</span> <TagsContainer :tagIds="getIds(scope.row.tags)"/>
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
			</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import mixins from 'vue-typed-mixins';

import { ITag, IWorkflowShortResponse } from '@/Interface';

import { restApi } from '@/components/mixins/restApi';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import Modal from '@/components/Modal.vue';
import TagsContainer from '@/components/TagsContainer.vue';
import TagsDropdown from '@/components/TagsDropdown.vue';
import WorkflowActivator from '@/components/WorkflowActivator.vue';

export default mixins(
	genericHelpers,
	restApi,
	showMessage,
	workflowHelpers,
).extend({
	name: 'WorkflowOpen',
	components: {
		WorkflowActivator,
		TagsContainer,
		TagsDropdown,
		Modal,
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

					return this.filterTagIds.reduce((accu: boolean, id: string) => {
						const tagIds = ((workflow.tags || []) as ITag[])
							.map(({id}: ITag): string => id);

						return accu && tagIds.indexOf(id) > -1;
					}, true);
				});
		},
	},
	mounted() {
		this.filterText = '';
		this.filterTagIds = [];
		this.openDialog();

		Vue.nextTick(() => {
			// Make sure that users can directly type in the filter
			(this.$refs.inputFieldFilter as HTMLInputElement).focus();
		});
	},
	methods: {
		getIds(tags: ITag[] | undefined) {
			return (tags || []).map((tag) => tag.id);
		},
		updateTagsFilter(tags: string[]) {
			this.filterTagIds = tags;
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

						this.$router.push({
							name: 'NodeViewExisting',
							params: { name: data.id },
						});
					}
				} else {
					this.$router.push({
						name: 'NodeViewExisting',
						params: { name: data.id },
					});
				}
				this.$store.commit('ui/closeTopModal');
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
.workflows-header {
	h1 {
		font-weight: 600;
		line-height: 24px;
		font-size: 18px;
	}

	.tags-filter {
		padding-right: 10px;
	}
}

.search-table .name span {
	margin-right: 10px;
}
</style>
