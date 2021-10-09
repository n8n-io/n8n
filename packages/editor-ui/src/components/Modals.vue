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
			<template v-slot="{ modalName }">
				<UpdatesPanel
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
		<ModalRoot :name="WORKFLOW_SETTINGS_MODAL_KEY">
			<template v-slot="{ modalName }">
				<WorkflowSettings
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_EDIT_MODAL_KEY">
			<template v-slot="{ modalName, activeId, mode }">
				<CredentialEdit
					:modalName="modalName"
					:mode="mode"
					:activeId="activeId"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_SELECT_MODAL_KEY">
			<template v-slot="{ modalName }">
				<CredentialsSelectModal
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { DUPLICATE_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, WORKLOW_OPEN_MODAL_KEY, VERSIONS_MODAL_KEY, CREDENTIAL_EDIT_MODAL_KEY, CREDENTIAL_SELECT_MODAL_KEY, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';

import CredentialEdit from "./CredentialEdit/CredentialEdit.vue";
import DuplicateWorkflowDialog from "@/components/DuplicateWorkflowDialog.vue";
import WorkflowOpen from "@/components/WorkflowOpen.vue";
import ModalRoot from "./ModalRoot.vue";
import CredentialsSelectModal from "./CredentialsSelectModal.vue";
import UpdatesPanel from "./UpdatesPanel.vue";
import WorkflowSettings from "./WorkflowSettings.vue";
import TagsManager from "@/components/TagsManager/TagsManager.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		CredentialEdit,
		DuplicateWorkflowDialog,
		ModalRoot,
		CredentialsSelectModal,
		UpdatesPanel,
		WorkflowSettings,
		TagsManager,
		WorkflowOpen,
	},
	data: () => ({
		DUPLICATE_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		WORKLOW_OPEN_MODAL_KEY,
		WORKFLOW_SETTINGS_MODAL_KEY,
		VERSIONS_MODAL_KEY,
		CREDENTIAL_EDIT_MODAL_KEY,
		CREDENTIAL_SELECT_MODAL_KEY,
	}),
});
</script>
