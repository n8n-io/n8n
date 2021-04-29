<template>
	<div>
		<SaveWorkflowDialog
			v-if="isOpen('saveAs')"
			modalName="saveAs"
			title="Save new workflow"
		/>
		<SaveWorkflowDialog
			v-if="isOpen('rename')"
			:renameOnly="true"
			modalName="rename"
			title="Rename workflow"
		/>
		<TagsManager
			v-if="isOpen('tagsManager')"	
		/>
		<WorkflowOpen
			v-if="isOpen('workflowOpen')"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

import TagsManager from "@/components/TagsManager.vue";
import SaveWorkflowDialog from "@/components/SaveWorkflowDialog.vue";
import WorkflowOpen from "./WorkflowOpen.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		SaveWorkflowDialog,
		WorkflowOpen,
	},
	methods: {
		isOpen(name: string) {
			return this.$store.getters['ui/isModalOpen'](name);
		},
	},
});
</script>
