<template>
	<Modal
		:title="title"	
		:name="modalName"
		:dialogVisible="dialogVisible"
		:eventBus="modalBus"
		:messageBox="true"
		@enter="save"
	>
		<template slot="content">
				<el-row>
					<el-input
						v-model="name"
						ref="nameInput"
						placeholder="Enter workflow name"
					/>
				</el-row>
				<el-row>
					<TagsDropdown
						:createEnabled="true"
						:currentTagIds="currentTagIds"
						@onUpdate="onTagsUpdate"
						placeholder="Choose or create a tag"
					/>
				</el-row>
		</template>
		<template v-slot:footer="{ close }">
			<el-button size="small" @click="save" :loading="isSaving">Save</el-button>
			<el-button size="small" @click="close" :disabled="isSaving">Cancel</el-button>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from "vue";
import mixins from "vue-typed-mixins";

import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import TagsDropdown from "@/components/TagsDropdown.vue";
import Modal from "./Modal.vue";

export default mixins(showMessage, workflowHelpers).extend({
	components: { TagsDropdown, Modal },
	name: "SaveWorkflow",
	props: ["dialogVisible", "title", "renameOnly", "modalName", "isActive"],
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
			modalBus: new Vue(),
		};
	},
	mounted() {
		this.$nextTick(() => {
			this.focusOnInput();
		});
	},
	updated() {
		this.focusOnInput();
	},
	methods: {
		focusOnInput() {
			if (this.$props.isActive) {
				const input = this.$refs.nameInput as HTMLElement;
				if (input && input.focus) {
					input.focus();
				}
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

					this.closeDialog();
				} catch (error) {
					this.$showError(
						error,
						"Problem renaming the workflow",
						"There was a problem renaming the workflow:",
					);
				}
			}
			else {
				await this.saveAsNewWorkflow(name, this.currentTagIds);

				this.closeDialog();
			}
			this.$data.isSaving = false;
		},
		closeDialog(): void {
			this.modalBus.$emit("close");
		},
	},
});
</script>