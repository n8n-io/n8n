<template>
	<div>
		<save-workflow-dialog
			title="Save new workflow"
			:dialogVisible="saveAsDialogOpen"
			:saveWorkflow="true"
			@closeDialog="closeSaveAsDialog"
		/>
		<save-workflow-dialog
			title="Rename workflow"
			:dialogVisible="renameDialogOpen"
			@closeDialog="closeRenameDialog"
		/>
		<tags-manager
			:dialogVisible="tagsManagerOpen"
			@closeDialog="closeTagsManager"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";

import TagsManager from "@/components/TagsManager.vue";
import SaveWorkflowDialog from "@/components/SaveWorkflowDialog.vue";
import { mapMutations, mapState } from "vuex";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		SaveWorkflowDialog,
	},
	computed: mapState("ui", [
		"tagsManagerOpen",
		"saveAsDialogOpen",
		"renameDialogOpen",
	]),
	methods: {
		...mapMutations("ui", [
			"closeSaveAsDialog",
			"closeRenameDialog",
			"closeTagsManager",
		]),
	},
});
</script>
