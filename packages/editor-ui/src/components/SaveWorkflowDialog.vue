<template>
	<div v-if="dialogVisible"
	>
		<el-dialog
			append-to-body
			class="dialog-wrapper"
			:visible="dialogVisible"
			:before-close="closeDialog"
			:title="title"
			ref="dialog"
		>
			<div class="content" @keydown.stop @keydown.enter="save" @keydown.esc="closeDialog">
				<el-row>
					<el-input
						ref="nameInput"
						placeholder="Enter workflow name"
						v-model="name"
					/>
				</el-row>
				<el-row>
					<TagsDropdown
						placeholder="Choose or create a tag"
						:currentTagIds="currentTagIds"
						:createEnabled="true"
						@onUpdate="onTagsUpdate"
					/>
				</el-row>
			</div>
			<el-row class="footer">
				<el-button size="small" @click="save" :loading="isSaving">Save</el-button>
				<el-button size="small" @click="closeDialog" :disabled="isSaving">Cancel</el-button>
			</el-row>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import mixins from "vue-typed-mixins";
import { mapState } from "vuex";
import { workflowHelpers } from "./mixins/workflowHelpers";
import { showMessage } from "./mixins/showMessage";
import TagsDropdown from "./TagsDropdown.vue";

export default mixins(showMessage, workflowHelpers).extend({
	components: { TagsDropdown },
	name: "SaveWorkflow",
	props: ["dialogVisible", "title", "renameOnly"],
	data() {
		const currentTagIds = this.$store.getters[
			"workflows/currentWorkflowTagIds"
		] as string[];

		const currentWorkflowName  = this.$store.getters["workflowName"];
		let name = '';
		if (currentWorkflowName) {
			name = this.renameOnly ? currentWorkflowName : `${currentWorkflowName} copy`;
		}

		return {
			name,
			currentTagIds,
			isSaving: false,
		};
	},
	mounted() {
		// console.log(this.$refs.dialog.$refs);
		window.addEventListener('keydown', this.onWindowKeydown);

		this.$nextTick(() => {
			const input = this.$refs.nameInput as any; // tslint:disable-line:no-any
			if (input && input.focus) {
				input.focus();
			}
		});
	},
	beforeDestroy() {
		window.removeEventListener('keydown', this.onWindowKeydown);
	},
	methods: {
		onWindowKeydown(event: KeyboardEvent) {
			if (event && event.keyCode === 13) {
				this.save();
			}
		},
		onTagsUpdate(tagIds: string[]) {
			this.currentTagIds = tagIds;
		},
		async save(): Promise<void> {
			const name = this.name.trim();
			if (!name) {
				this.$showMessage({
					title: "Name missing",
					message: `No name for the workflow got entered and so could not be saved!`,
					type: "error",
				});

				return;
			}

			this.$data.isSaving = true;
			if (this.$props.renameOnly) {
				try {
					await this.$store.dispatch("workflows/renameCurrent", {name, tags: this.currentTagIds});

					this.$showMessage({
						title: "Workflow renamed",
						message: `The workflow got renamed to "${name}"!`,
						type: "success",
					});

					this.$emit("closeDialog");
				} catch (error) {
					this.$showError(
						error,
						"Problem renaming the workflow",
						"There was a problem renaming the workflow:",
					);
				}
			}
			else {
				await this.saveCurrentWorkflow(true, name, this.currentTagIds);

				this.$emit("closeDialog");
			}
			this.$data.isSaving = false;
		},
		closeDialog(): void {
			this.$emit("closeDialog");
		},
	},
});
</script>


<style lang="scss" scoped>
@import "../styles/mixins";

.dialog-wrapper {
	@include flex-center;

	/deep/ .el-dialog {
		max-width: 600px;
	}
}


.content > .el-row {
	margin-bottom: 15px;
}

.footer > .el-button {
	float: right;
	margin-left: 5px;
}
</style>