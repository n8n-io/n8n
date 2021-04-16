<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body :before-close="closeDialog" :title="title">
			<div class="content" @keydown.stop>
				<el-row>
					<el-input placeholder="Enter workflow name" v-model="name" :autofocus="true" />
				</el-row>
				<el-row>
					<tags-dropdown 
						:currentTagIds="currentTagIds"
						placeholder="Choose or create a tag"
						@onUpdate="onUpdate"
					/>
				</el-row>
			</div>
			<el-row class="footer">
				<el-button size="small" @click="save">Save</el-button>
				<el-button size="small" @click="closeDialog">Cancel</el-button>
			</el-row>
    	</el-dialog>
	</div>
</template>

<script lang="ts">
import { ITag } from '@/Interface';

import mixins from 'vue-typed-mixins';
import { mapState } from 'vuex';
import { workflowHelpers } from './mixins/workflowHelpers';
import { showMessage } from './mixins/showMessage';
import TagsDropdown from './TagsDropdown.vue';

export default mixins(
	showMessage,
	workflowHelpers,
).extend({
  components: { TagsDropdown },
	name: 'SaveWorkflow',
	props: [
		'dialogVisible',
        'title',
		'saveWorkflow',
	],
	data() {
		const currentTags = this.$store.getters['tags/currentWorkflowTags'] as ITag[];
		return {
			name: '',
			currentTagIds: currentTags.map(({id}) => id),
		};
	},
	created() {
		this.$store.dispatch('tags/getAll');
	},
	computed: mapState('tags', [
		'isLoading',
	]),
    methods: {
		onUpdate(tagIds: string[]) {
			this.currentTagIds = tagIds;
		},
		async save(): Promise<void> {
			if (!this.name) {
				this.$showMessage({
					title: 'Name missing',
					message: `No name for the workflow got entered and could so not be saved!`,
					type: 'error',
				});

				return;
			}

			if (this.$props.saveWorkflow) {
				// save entire workflow
				await this.saveCurrentWorkflow(true, this.name, this.currentTagIds);
				
				this.$emit('closeDialog');
			}
			else {
				//  just rename
				try {
					await this.$store.dispatch('workflows/renameCurrent', this.name);

					this.$showMessage({
						title: 'Workflow renamed',
						message: `The workflow got renamed to "${this.name}"!`,
						type: 'success',
					});

					this.$emit('closeDialog');
				} catch (error) {
					this.$showError(error, 'Problem renaming the workflow', 'There was a problem renaming the workflow:');
				}
			}
		},
        closeDialog(): void {
			this.$emit('closeDialog');
        }
    }
});
</script>


<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

/deep/ .el-dialog {
	max-width: 600px;
}

.content > .el-row {
	margin-bottom: 15px;
}

.footer {
	.el-button {
		float: right;
		margin-left: 5px;
	}
}
</style>