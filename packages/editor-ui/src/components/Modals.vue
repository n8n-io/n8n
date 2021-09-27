<template>
	<div>
		<ModalRoot :name="CREDENTIAL_EDIT_MODAL_KEY">
			<template v-slot="{ modalName, activeId, mode }">
				<CredentialEdit
					:modalName="modalName"
					:mode="mode"
					:activeId="activeId"
					/>
			</template>
		</ModalRoot>
		<ModalRoot :name="ABOUT_MODAL_KEY">
			<template v-slot:default="{ modalName }">
				<AboutModal
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_SELECT_MODAL_KEY">
			<CredentialsSelectModal />
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_LIST_MODAL_KEY">
			<CredentialsList />
		</ModalRoot>

		<ModalRoot :name="DUPLICATE_MODAL_KEY">
			<template v-slot:default="{ modalName, active }">
				<DuplicateWorkflowDialog
					:isActive="active"
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="PERSONALIZATION_MODAL_KEY">
			<PersonalizationModal />
		</ModalRoot>

		<ModalRoot :name="TAGS_MANAGER_MODAL_KEY">
			<TagsManager />
		</ModalRoot>
		<ModalRoot :name="WORKFLOW_OPEN_MODAL_KEY">
			<template v-slot="{ modalName }">
				<WorkflowOpen
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="VERSIONS_MODAL_KEY" :keepAlive="true">
			<UpdatesPanel />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_OPEN_MODAL_KEY">
			<WorkflowOpen />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_SETTINGS_MODAL_KEY">
			<WorkflowSettings />
		</ModalRoot>

		<ModalRoot :name="CHANGE_PASSWORD_MODAL_KEY">
			<template v-slot="{ modalName }">
				<ChangePasswordModal
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="INVITE_USER_MODAL_KEY">
			<template v-slot="{ modalName }">
				<InviteUsersModal
					:modalName="modalName"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import { ABOUT_MODAL_KEY, CHANGE_PASSWORD_MODAL_KEY, CREDENTIAL_LIST_MODAL_KEY, DUPLICATE_MODAL_KEY, INVITE_USER_MODAL_KEY, TAGS_MANAGER_MODAL_KEY, PERSONALIZATION_MODAL_KEY, WORKFLOW_OPEN_MODAL_KEY, VERSIONS_MODAL_KEY, CREDENTIAL_EDIT_MODAL_KEY, CREDENTIAL_SELECT_MODAL_KEY, WORKFLOW_SETTINGS_MODAL_KEY } from '@/constants';

import AboutModal from './AboutModal.vue';
import ChangePasswordModal from "./ChangePasswordModal.vue";
import CredentialEdit from "./CredentialEdit/CredentialEdit.vue";
import CredentialsList from "./CredentialsList.vue";
import InviteUsersModal from "./InviteUsersModal.vue";
import CredentialsSelectModal from "./CredentialsSelectModal.vue";
import DuplicateWorkflowDialog from "./DuplicateWorkflowDialog.vue";
import ModalRoot from "./ModalRoot.vue";
import PersonalizationModal from "./PersonalizationModal.vue";
import TagsManager from "./TagsManager/TagsManager.vue";
import UpdatesPanel from "./UpdatesPanel.vue";
import WorkflowSettings from "./WorkflowSettings.vue";
import WorkflowOpen from "./WorkflowOpen.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		AboutModal,
		ChangePasswordModal,
		CredentialEdit,
		CredentialsList,
		CredentialsSelectModal,
		DuplicateWorkflowDialog,
		InviteUsersModal,
		ModalRoot,
		PersonalizationModal,
		TagsManager,
		UpdatesPanel,
		WorkflowSettings,
		WorkflowOpen,
	},
	data: () => ({
		CREDENTIAL_EDIT_MODAL_KEY,
		CREDENTIAL_LIST_MODAL_KEY,
		CREDENTIAL_SELECT_MODAL_KEY,
		ABOUT_MODAL_KEY,
		CHANGE_PASSWORD_MODAL_KEY,
		DUPLICATE_MODAL_KEY,
		PERSONALIZATION_MODAL_KEY,
		INVITE_USER_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		VERSIONS_MODAL_KEY,
		WORKFLOW_OPEN_MODAL_KEY,
		WORKFLOW_SETTINGS_MODAL_KEY,
	}),
});
</script>
