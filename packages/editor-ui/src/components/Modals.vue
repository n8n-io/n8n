<template>
	<div>
		<SaveWorkflowDialog
			v-if="isOpen(SAVE_AS_MODAL_KEY)"
			:isActive="isActive(SAVE_AS_MODAL_KEY)"
			:modalName="SAVE_AS_MODAL_KEY"
			title="Save new workflow"
		/>
		<SaveWorkflowDialog
			v-if="isOpen(RENAME_MODAL_KEY)"
			:isActive="isActive(RENAME_MODAL_KEY)"
			:modalName="RENAME_MODAL_KEY"
			:renameOnly="true"
			title="Rename workflow"
		/>
		<TagsManager
			v-if="isOpen(TAGS_MANAGER_MODAL_KEY)"	
			:modalName="TAGS_MANAGER_MODAL_KEY"
		/>
		<WorkflowOpen
			v-if="isOpen(WORKLOW_OPEN_MODAL_KEY)"
			:modalName="WORKLOW_OPEN_MODAL_KEY"
		/>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { RENAME_MODAL_KEY, SAVE_AS_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY } from '@/constants';

import TagsManager from "@/components/TagsManager.vue";
import SaveWorkflowDialog from "@/components/SaveWorkflowDialog.vue";
import WorkflowOpen from "@/components/WorkflowOpen.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		SaveWorkflowDialog,
		WorkflowOpen,
	},
	data: () => ({
		RENAME_MODAL_KEY,
		SAVE_AS_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		WORKLOW_OPEN_MODAL_KEY,
	}),
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
