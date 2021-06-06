<template>
	<Modal
		:name="modalName"
		size="xl"
	>
			<template v-slot:header>
				<div class="workflows-header">
					<div class="title">
						<h1>Open Workflow</h1>
					</div>
					<div class="tags-filter">
						<TagsDropdown
							placeholder="Filter by tags..."
							:currentTagIds="filterTagIds"
							:createEnabled="false"
							@update="updateTagsFilter"
							@esc="onTagsFilterEsc"
							@blur="onTagsFilterBlur"
						/>
					</div>
					<div class="search-filter">
						<el-input placeholder="Search workflows..." ref="inputFieldFilter" v-model="filterText">
							<i slot="prefix" class="el-input__icon el-icon-search"></i>
						</el-input>
					</div>
				</div>
			</template>

			<template v-slot:content>
				<el-table class="search-table" :data="filteredWorkflows" stripe @cell-click="openWorkflow" :default-sort = "{prop: 'updatedAt', order: 'descending'}" v-loading="isDataLoading">
					<el-table-column property="name" label="Name" class-name="clickable" sortable>
						<template slot-scope="scope">
							<div :key="scope.row.id">
								<span class="name">{{scope.row.name}}</span>
								<TagsContainer class="hidden-sm-and-down" :tagIds="getIds(scope.row.tags)" :limit="3" />
							</div>
						</template>
					</el-table-column>
					<el-table-column property="createdAt" label="Created" class-name="clickable" width="155" sortable></el-table-column>
					<el-table-column property="updatedAt" label="Updated" class-name="clickable" width="155" sortable></el-table-column>
					<el-table-column label="Active" width="75">
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
	props: ['modalName'],
	data () {
		return {
			filterText: '',
			isDataLoading: false,
			workflows: [] as IWorkflowShortResponse[],
			filterTagIds: [] as string[],
			prevFilterTagIds: [] as string[],
		};
	},
	computed: {
		filteredWorkflows (): IWorkflowShortResponse[] {
			return this.workflows
				.filter((workflow: IWorkflowShortResponse) => {
					if (this.filterText && !workflow.name.toLowerCase().includes(this.filterText.toLowerCase())) {
						return false;
					}

					if (this.filterTagIds.length === 0) {
						return true;
					}

					if (!workflow.tags || workflow.tags.length === 0) {
						return false;
					}

					return this.filterTagIds.reduce((accu: boolean, id: string) =>  accu && !!workflow.tags.find(tag => tag.id === id), true);
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
		onTagsFilterBlur() {
			this.prevFilterTagIds = this.filterTagIds;
		},
		onTagsFilterEsc() {
			// revert last applied tags
			this.filterTagIds = this.prevFilterTagIds;
		},
	},
});
</script>

<style scoped lang="scss">
.workflows-header {
	display: flex;

	.title {
		flex-grow: 1;

		h1 {
			font-weight: 600;
			line-height: 24px;
			font-size: 18px;
		}
	}

	.search-filter {
		margin-left: 10px;
		min-width: 160px;
	}

	.tags-filter {
		flex-grow: 1;
		max-width: 270px;
		min-width: 220px;
	}
}

.search-table .name {
	font-weight: 400;
	margin-right: 10px;
}
</style>
