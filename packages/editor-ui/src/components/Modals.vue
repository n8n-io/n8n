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
		<ModalRoot :name="VERSIONS_MODAL_KEY" :keepAlive="true">
			<template v-slot="{ modalName, open }">
				<UpdatesPanel
					:modalName="modalName"
					:visible="open"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { DUPLICATE_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY, VERSIONS_MODAL_KEY } from '@/constants';

import TagsManager from "@/components/TagsManager/TagsManager.vue";
import DuplicateWorkflowDialog from "@/components/DuplicateWorkflowDialog.vue";
import WorkflowOpen from "@/components/WorkflowOpen.vue";
import ModalRoot from "./ModalRoot.vue";
import UpdatesPanel from "./UpdatesPanel.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		TagsManager,
		DuplicateWorkflowDialog,
		WorkflowOpen,
		ModalRoot,
		UpdatesPanel,
	},
	data: () => ({
		DUPLICATE_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		WORKLOW_OPEN_MODAL_KEY,
		VERSIONS_MODAL_KEY,
	}),
});
</script>
