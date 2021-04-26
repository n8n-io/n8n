<template>
	<div>
		<SaveWorkflowDialog
			v-if="saveAsDialogOpen"
			:dialogVisible="saveAsDialogOpen"
			@closeDialog="closeSaveAsDialog"
			title="Save new workflow"
		/>
		<SaveWorkflowDialog
			v-if="renameDialogOpen"
			:dialogVisible="renameDialogOpen"
			@closeDialog="closeRenameDialog"
			renameOnly
			title="Rename workflow"
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
