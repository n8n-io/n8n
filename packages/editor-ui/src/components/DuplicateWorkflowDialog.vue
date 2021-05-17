<template>
	<Modal
		:name="modalName"
		:eventBus="modalBus"
		@enter="save"
		size="sm"
		title="Duplicate Workflow"	
	>
		<template slot="content">
			<el-row>
				<el-input
					v-model="name"
					ref="nameInput"
					placeholder="Enter workflow name"
					:maxlength="MAX_WORKFLOW_NAME_LENGTH"
				/>
			</el-row>
			<el-row>
				<TagsDropdown
					:createEnabled="true"
					:currentTagIds="currentTagIds"
					:eventBus="dropdownBus"
					@blur="onTagsBlur"
					@esc="onTagsEsc"
					@update="onTagsUpdate"
					placeholder="Choose or create a tag"
					ref="dropdown"
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

import { DUPLICATE_POSTFFIX, MAX_WORKFLOW_NAME_LENGTH } from "@/constants";
import { workflowHelpers } from "@/components/mixins/workflowHelpers";
import { showMessage } from "@/components/mixins/showMessage";
import TagsDropdown from "@/components/TagsDropdown.vue";
import Modal from "./Modal.vue";

export default mixins(showMessage, workflowHelpers).extend({
	components: { TagsDropdown, Modal },
	name: "DuplicateWorkflow",
	props: ["dialogVisible", "modalName", "isActive"],
	data() {
		const currentTagIds = this.$store.getters[
			"workflowTags"
		] as string[];

		const currentWorkflowName  = this.$store.getters["workflowName"];
		let name = currentWorkflowName;
		if (currentWorkflowName && currentWorkflowName.length <= (MAX_WORKFLOW_NAME_LENGTH - DUPLICATE_POSTFFIX.length)) {
			name = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;
		}

		return {
			name,
			currentTagIds,
			isSaving: false,
			modalBus: new Vue(),
			dropdownBus: new Vue(),
			MAX_WORKFLOW_NAME_LENGTH,
			prevTagIds: currentTagIds,
		};
	},
	mounted() {
		this.$nextTick(() => this.focusOnNameInput());
	},
	watch: {
		isActive(active) {
			if (active) {
				this.focusOnSelect();
			}
		},
	},
	methods: {
		focusOnSelect() {
			this.dropdownBus.$emit('focus');
		},
		focusOnNameInput() {
			const input = this.$refs.nameInput as HTMLElement;
			if (input && input.focus) {
				input.focus();
			}
		},
		onTagsBlur() {
			this.prevTagIds = this.currentTagIds;
		},
		onTagsEsc() {
			// revert last changes
			this.currentTagIds = this.prevTagIds;
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

			const saved = await this.saveAsNewWorkflow({name, tags: this.currentTagIds});

			if (saved) {
				this.closeDialog();
				this.$data.isSaving = false;
			}
		},
		closeDialog(): void {
			this.modalBus.$emit("close");
		},
	},
});
</script>