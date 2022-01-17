<template>
	<Modal
		:name="WORKFLOW_OPEN_MODAL_KEY"
		width="80%"
		minWidth="620px"
		:classic="true"
	>
			<template v-slot:header>
				<div class="workflows-header">
					<n8n-heading tag="h1" size="xlarge" class="title">
						{{ $locale.baseText('workflowOpen.openWorkflow') }}
					</n8n-heading>
					<div class="tags-filter">
						<TagsDropdown
							:placeholder="$locale.baseText('workflowOpen.openWorkflow')"
							:currentTagIds="filterTagIds"
							:createEnabled="false"
							@update="updateTagsFilter"
							@esc="onTagsFilterEsc"
							@blur="onTagsFilterBlur"
						/>
					</div>
					<div class="search-filter">
						<n8n-input :placeholder="$locale.baseText('workflowOpen.searchWorkflows')" ref="inputFieldFilter" v-model="filterText">
							<font-awesome-icon slot="prefix" icon="search"></font-awesome-icon>
						</n8n-input>
					</div>
				</div>
			</template>

			<template v-slot:content>
				<el-table class="search-table" :data="filteredWorkflows" stripe @cell-click="openWorkflow" :default-sort = "{prop: 'updatedAt', order: 'descending'}" v-loading="isDataLoading">
					<el-table-column property="name" :label="$locale.baseText('workflowOpen.name')" class-name="clickable" sortable>
						<template slot-scope="scope">
							<div :key="scope.row.id">
								<span class="name">{{scope.row.name}}</span>
								<TagsContainer class="hidden-sm-and-down" :tagIds="getIds(scope.row.tags)" :limit="3" @click="onTagClick" :clickable="true" :hoverable="true" />
							</div>
						</template>
					</el-table-column>
					<el-table-column property="createdAt" :label="$locale.baseText('workflowOpen.created')" class-name="clickable" width="155" sortable></el-table-column>
					<el-table-column property="updatedAt" :label="$locale.baseText('workflowOpen.updated')" class-name="clickable" width="155" sortable></el-table-column>
					<el-table-column :label="$locale.baseText('workflowOpen.active')" width="75">
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
import { convertToDisplayDate } from './helpers';
import { WORKFLOW_OPEN_MODAL_KEY } from '../constants';

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
			WORKFLOW_OPEN_MODAL_KEY,
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
		onTagClick(tagId: string) {
			if (tagId !== 'count' && !this.filterTagIds.includes(tagId)) {
				this.filterTagIds.push(tagId);
			}
		},
		async openWorkflow (data: IWorkflowShortResponse, column: any, cell: any, e: PointerEvent) { // tslint:disable-line:no-any
			if (column.label !== 'Active') {

				const currentWorkflowId = this.$store.getters.workflowId;

				if (e.metaKey || e.ctrlKey) {
					const route = this.$router.resolve({name: 'NodeViewExisting', params: {name: data.id}});
					window.open(route.href, '_blank');

					return;
				}

				if (data.id === currentWorkflowId) {
					this.$showMessage({
						title: this.$locale.baseText('workflowOpen.showMessage.title'),
						message: this.$locale.baseText('workflowOpen.showMessage.message'),
						type: 'error',
						duration: 1500,
					});
					// Do nothing if current workflow is the one user chose to open
					return;
				}

				const result = this.$store.getters.getStateIsDirty;
				if(result) {
					const importConfirm = await this.confirmMessage(
						this.$locale.baseText('workflowOpen.confirmMessage.message'),
						this.$locale.baseText('workflowOpen.confirmMessage.headline'),
						'warning',
						this.$locale.baseText('workflowOpen.confirmMessage.confirmButtonText'),
						this.$locale.baseText('workflowOpen.confirmMessage.cancelButtonText'),
					);
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
				this.$store.commit('ui/closeAllModals');
			}
		},
		openDialog () {
			this.isDataLoading = true;
			this.restApi().getWorkflows()
				.then(
					(data) => {
						this.workflows = data;

						this.workflows.forEach((workflowData: IWorkflowShortResponse) => {
							workflowData.createdAt = convertToDisplayDate(workflowData.createdAt as number);
							workflowData.updatedAt = convertToDisplayDate(workflowData.updatedAt as number);
						});
						this.isDataLoading = false;
					},
				)
				.catch(
					(error: Error) => {
						this.$showError(
							error,
							this.$locale.baseText('workflowOpen.showError.title'),
							this.$locale.baseText('workflowOpen.showError.message') + ':',
						);
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

	> *:first-child {
		flex-grow: 1;
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
