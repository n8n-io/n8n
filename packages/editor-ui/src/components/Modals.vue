<template>
	<div>
		<SaveWorkflowDialog
			v-if="isOpen('saveAs')"
			modalName="saveAs"
			title="Save new workflow"
			:isActive="isActive('saveAs')"
		/>
		<SaveWorkflowDialog
			v-if="isOpen('rename')"
			:renameOnly="true"
			modalName="rename"
			title="Rename workflow"
			:isActive="isActive('rename')"
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
		isActive(name: string) {
			return this.$store.getters['ui/isModalActive'](name);
		},
		isOpen(name: string) {
			return this.$store.getters['ui/isModalOpen'](name);
		},
	},
});
</script>
