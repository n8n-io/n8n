<template>
	<div>
		<ModalRoot :name="CONTACT_PROMPT_MODAL_KEY">
			<template v-slot:default="{ modalName }">
				<ContactPromptModal
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

		<ModalRoot :name="VERSIONS_MODAL_KEY" :keepAlive="true">
			<UpdatesPanel />
		</ModalRoot>

		<ModalRoot :name="VALUE_SURVEY_MODAL_KEY" :keepAlive="true">
			<template v-slot:default="{ active }">
				<ValueSurvey :isActive="active"/>
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_OPEN_MODAL_KEY">
			<WorkflowOpen />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_SETTINGS_MODAL_KEY">
			<WorkflowSettings />
		</ModalRoot>

		<ModalRoot :name="EXECUTIONS_MODAL_KEY">
			<ExecutionsList />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_ACTIVE_MODAL_KEY">
			<ActivationModal />
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import Vue from "vue";
import {
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_LIST_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXECUTIONS_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_OPEN_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
} from '@/constants';

import ContactPromptModal from './ContactPromptModal.vue';
import CredentialEdit from "./CredentialEdit/CredentialEdit.vue";
import CredentialsList from "./CredentialsList.vue";
import CredentialsSelectModal from "./CredentialsSelectModal.vue";
import DuplicateWorkflowDialog from "./DuplicateWorkflowDialog.vue";
import ModalRoot from "./ModalRoot.vue";
import PersonalizationModal from "./PersonalizationModal.vue";
import TagsManager from "./TagsManager/TagsManager.vue";
import UpdatesPanel from "./UpdatesPanel.vue";
import ValueSurvey from "./ValueSurvey.vue";
import WorkflowSettings from "./WorkflowSettings.vue";
import WorkflowOpen from "./WorkflowOpen.vue";
import ExecutionsList from "./ExecutionsList.vue";
import ActivationModal from "./ActivationModal.vue";

export default Vue.extend({
	name: "Modals",
	components: {
		ActivationModal,
		ContactPromptModal,
		CredentialEdit,
		CredentialsList,
		CredentialsSelectModal,
		DuplicateWorkflowDialog,
		ExecutionsList,
		ModalRoot,
		PersonalizationModal,
		TagsManager,
		UpdatesPanel,
		ValueSurvey,
		WorkflowSettings,
		WorkflowOpen,
	},
	data: () => ({
		CONTACT_PROMPT_MODAL_KEY,
		CREDENTIAL_EDIT_MODAL_KEY,
		CREDENTIAL_LIST_MODAL_KEY,
		CREDENTIAL_SELECT_MODAL_KEY,
		DUPLICATE_MODAL_KEY,
		PERSONALIZATION_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		VERSIONS_MODAL_KEY,
		WORKFLOW_OPEN_MODAL_KEY,
		WORKFLOW_SETTINGS_MODAL_KEY,
		VALUE_SURVEY_MODAL_KEY,
		EXECUTIONS_MODAL_KEY,
		WORKFLOW_ACTIVE_MODAL_KEY,
	}),
});
</script>
