<template>
	<div v-if="dialogVisible">
		<el-dialog :visible="dialogVisible" append-to-body :before-close="closeDialog" :title="title">
			<div class="content" @keydown.stop>
				<el-input placeholder="Enter workflow name" v-model="name" />
			</div>
			<el-row class="footer">
				<el-button size="small" @click="save">Save</el-button>
				<el-button size="small" @click="closeDialog">Cancel</el-button>
			</el-row>
    	</el-dialog>
	</div>
</template>

<script lang="ts">
import { showMessage } from '@/components/mixins/showMessage';

import mixins from 'vue-typed-mixins';
import { workflowHelpers } from './mixins/workflowHelpers';

export default mixins(
	showMessage,
	workflowHelpers,
).extend({
	name: 'SaveWorkflow',
	props: [
		'dialogVisible',
        'title',
		'saveWorkflow',
	],
	data() {
		return {
			name: '',
		};
	},
    methods: {
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
				await this.saveCurrentWorkflow(true, this.name);
				
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

.footer {
	padding-top: 15px;

	.el-button {
		float: right;
		margin-left: 5px;
	}
}
</style>