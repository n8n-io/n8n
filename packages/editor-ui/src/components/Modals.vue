<template>
	<div>
		<ModalRoot :name="SAVE_AS_MODAL_KEY">
			<template v-slot:default="{modalName, active}">
				<SaveWorkflowDialog
					:isActive="active"
					:modalName="modalName"
					title="Save new workflow"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="RENAME_MODAL_KEY">
			<template v-slot:default="{modalName, active}">
				<SaveWorkflowDialog
					:isActive="active"
					:modalName="modalName"
					:renameOnly="true"
					title="Rename workflow"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="TAGS_MANAGER_MODAL_KEY">
			<template v-slot="{modalName}">
				<TagsManager
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKLOW_OPEN_MODAL_KEY">
			<template v-slot="{modalName}">
				<WorkflowOpen
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { RENAME_MODAL_KEY, SAVE_AS_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY } from '@/constants';

import TagsManager from "@/components/TagsManager.vue";
import SaveWorkflowDialog from "@/components/SaveWorkflowDialog.vue";
import WorkflowOpen from "@/components/WorkflowOpen.vue";
import ModalRoot from "./ModalRoot.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		SaveWorkflowDialog,
		WorkflowOpen,
		ModalRoot,
	},
	data: () => ({
		RENAME_MODAL_KEY,
		SAVE_AS_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		WORKLOW_OPEN_MODAL_KEY,
	}),
});
</script>
