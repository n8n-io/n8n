<template>
	<div>
		<SaveWorkflowDialog
			v-if="saveAsDialogOpen"
			title="Save new workflow"
			:dialogVisible="saveAsDialogOpen"
			@closeDialog="closeSaveAsDialog"
		/>
		<SaveWorkflowDialog
			v-if="renameDialogOpen"
			title="Rename workflow"
			:dialogVisible="renameDialogOpen"
			:renameOnly="true"
			@closeDialog="closeRenameDialog"
		/>
		<TagsManager
			v-if="tagsManagerOpen"
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
	methods: mapMutations("ui", [
		"closeSaveAsDialog",
		"closeRenameDialog",
		"closeTagsManager",
	]),
});
</script>
