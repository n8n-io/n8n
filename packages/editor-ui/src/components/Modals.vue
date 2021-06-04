<template>
	<div>
		<ModalRoot :name="DUPLICATE_MODAL_KEY">
			<template v-slot:default="{ modalName, active }">
				<DuplicateWorkflowDialog
					:isActive="active"
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="TAGS_MANAGER_MODAL_KEY">
			<template v-slot="{ modalName }">
				<TagsManager
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKLOW_OPEN_MODAL_KEY">
			<template v-slot="{ modalName }">
				<WorkflowOpen
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { DUPLICATE_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY } from '@/constants';

import TagsManager from "@/components/TagsManager/TagsManager.vue";
import DuplicateWorkflowDialog from "@/components/DuplicateWorkflowDialog.vue";
import WorkflowOpen from "@/components/WorkflowOpen.vue";
import ModalRoot from "./ModalRoot.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		DuplicateWorkflowDialog,
		WorkflowOpen,
		ModalRoot,
	},
	data: () => ({
		DUPLICATE_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		WORKLOW_OPEN_MODAL_KEY,
	}),
});
</script>
