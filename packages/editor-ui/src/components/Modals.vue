<template>
	<div>
		<ModalRoot :name="CONTACT_PROMPT_MODAL_KEY">
			<template #default="{ modalName }">
				<ContactPromptModal :modal-name="modalName" />
			</template>
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_EDIT_MODAL_KEY">
			<template #default="{ modalName, activeId, mode }">
				<CredentialEdit :modal-name="modalName" :mode="mode" :active-id="activeId" />
			</template>
		</ModalRoot>
		<ModalRoot :name="ABOUT_MODAL_KEY">
			<AboutModal />
		</ModalRoot>

		<ModalRoot :name="CHAT_EMBED_MODAL_KEY">
			<ChatEmbedModal />
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_SELECT_MODAL_KEY">
			<CredentialsSelectModal />
		</ModalRoot>

		<ModalRoot :name="DUPLICATE_MODAL_KEY">
			<template #default="{ modalName, active, data }">
				<DuplicateWorkflowDialog :data="data" :is-active="active" :modal-name="modalName" />
			</template>
		</ModalRoot>

		<ModalRoot :name="PERSONALIZATION_MODAL_KEY">
			<PersonalizationModal />
		</ModalRoot>

		<ModalRoot :name="TAGS_MANAGER_MODAL_KEY">
			<TagsManager />
		</ModalRoot>

		<ModalRoot :name="VERSIONS_MODAL_KEY" :keep-alive="true">
			<UpdatesPanel />
		</ModalRoot>

		<ModalRoot :name="VALUE_SURVEY_MODAL_KEY" :keep-alive="true">
			<template #default="{ active }">
				<ValueSurvey :is-active="active" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_LM_CHAT_MODAL_KEY">
			<WorkflowLMChat />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_SETTINGS_MODAL_KEY">
			<WorkflowSettings />
		</ModalRoot>

		<ModalRoot :name="CHANGE_PASSWORD_MODAL_KEY">
			<ChangePasswordModal />
		</ModalRoot>

		<ModalRoot :name="INVITE_USER_MODAL_KEY">
			<InviteUsersModal />
		</ModalRoot>

		<ModalRoot :name="DELETE_USER_MODAL_KEY">
			<template #default="{ modalName, activeId }">
				<DeleteUserModal :modal-name="modalName" :active-id="activeId" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_ACTIVE_MODAL_KEY">
			<ActivationModal />
		</ModalRoot>

		<ModalRoot :name="MFA_SETUP_MODAL_KEY">
			<MfaSetupModal />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_SHARE_MODAL_KEY">
			<template #default="{ modalName, active, data }">
				<WorkflowShareModal :data="data" :is-active="active" :modal-name="modalName" />
			</template>
		</ModalRoot>

		<ModalRoot :name="ONBOARDING_CALL_SIGNUP_MODAL_KEY">
			<OnboardingCallSignupModal />
		</ModalRoot>

		<ModalRoot :name="COMMUNITY_PACKAGE_INSTALL_MODAL_KEY">
			<CommunityPackageInstallModal />
		</ModalRoot>

		<ModalRoot :name="IMPORT_CURL_MODAL_KEY">
			<ImportCurlModal />
		</ModalRoot>

		<ModalRoot :name="GENERATE_CURL_MODAL_KEY">
			<GenerateCurlModal />
		</ModalRoot>

		<ModalRoot :name="COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY">
			<template #default="{ modalName, activeId, mode }">
				<CommunityPackageManageConfirmModal
					:modal-name="modalName"
					:active-package-name="activeId"
					:mode="mode"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="LOG_STREAM_MODAL_KEY">
			<template #default="{ modalName, data }">
				<EventDestinationSettingsModal
					:modal-name="modalName"
					:destination="data.destination"
					:is-new="data.isNew"
					:event-bus="data.eventBus"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="SOURCE_CONTROL_PUSH_MODAL_KEY">
			<template #default="{ modalName, data }">
				<SourceControlPushModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="SOURCE_CONTROL_PULL_MODAL_KEY">
			<template #default="{ modalName, data }">
				<SourceControlPullModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY">
			<template #default="{ modalName, data }">
				<ExternalSecretsProviderModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="DEBUG_PAYWALL_MODAL_KEY">
			<template #default="{ modalName, data }">
				<DebugPaywallModal
					data-test-id="debug-paywall-modal"
					:modal-name="modalName"
					:data="data"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_HISTORY_VERSION_RESTORE">
			<template #default="{ modalName, data }">
				<WorkflowHistoryVersionRestoreModal
					data-test-id="workflow-history-version-restore-modal"
					:modal-name="modalName"
					:data="data"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="SETUP_CREDENTIALS_MODAL_KEY">
			<template #default="{ modalName, data }">
				<SetupWorkflowCredentialsModal
					data-test-id="setup-workflow-credentials-modal"
					:modal-name="modalName"
					:data="data"
				/>
			</template>
		</ModalRoot>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
	ABOUT_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	VALUE_SURVEY_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_LM_CHAT_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	IMPORT_CURL_MODAL_KEY,
	LOG_STREAM_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	SOURCE_CONTROL_PULL_MODAL_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	DEBUG_PAYWALL_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_RESTORE,
	SETUP_CREDENTIALS_MODAL_KEY,
	GENERATE_CURL_MODAL_KEY,
} from '@/constants';

import AboutModal from './AboutModal.vue';
import ChatEmbedModal from './ChatEmbedModal.vue';
import CommunityPackageManageConfirmModal from './CommunityPackageManageConfirmModal.vue';
import CommunityPackageInstallModal from './CommunityPackageInstallModal.vue';
import ChangePasswordModal from './ChangePasswordModal.vue';
import ContactPromptModal from './ContactPromptModal.vue';
import CredentialEdit from './CredentialEdit/CredentialEdit.vue';
import InviteUsersModal from './InviteUsersModal.vue';
import CredentialsSelectModal from './CredentialsSelectModal.vue';
import DuplicateWorkflowDialog from './DuplicateWorkflowDialog.vue';
import ModalRoot from './ModalRoot.vue';
import OnboardingCallSignupModal from './OnboardingCallSignupModal.vue';
import PersonalizationModal from './PersonalizationModal.vue';
import TagsManager from './TagsManager/TagsManager.vue';
import UpdatesPanel from './UpdatesPanel.vue';
import ValueSurvey from './ValueSurvey.vue';
import WorkflowLMChat from './WorkflowLMChat.vue';
import WorkflowSettings from './WorkflowSettings.vue';
import DeleteUserModal from './DeleteUserModal.vue';
import ActivationModal from './ActivationModal.vue';
import ImportCurlModal from './ImportCurlModal.vue';
import GenerateCurlModal from './GenerateCurlModal.vue';
import MfaSetupModal from './MfaSetupModal.vue';
import WorkflowShareModal from './WorkflowShareModal.ee.vue';
import EventDestinationSettingsModal from '@/components/SettingsLogStreaming/EventDestinationSettingsModal.ee.vue';
import SourceControlPushModal from '@/components/SourceControlPushModal.ee.vue';
import SourceControlPullModal from '@/components/SourceControlPullModal.ee.vue';
import ExternalSecretsProviderModal from '@/components/ExternalSecretsProviderModal.ee.vue';
import DebugPaywallModal from '@/components/DebugPaywallModal.vue';
import WorkflowHistoryVersionRestoreModal from '@/components/WorkflowHistory/WorkflowHistoryVersionRestoreModal.vue';
import SetupWorkflowCredentialsModal from '@/components/SetupWorkflowCredentialsModal/SetupWorkflowCredentialsModal.vue';

export default defineComponent({
	name: 'Modals',
	components: {
		AboutModal,
		ActivationModal,
		ChatEmbedModal,
		CommunityPackageInstallModal,
		CommunityPackageManageConfirmModal,
		ContactPromptModal,
		ChangePasswordModal,
		CredentialEdit,
		CredentialsSelectModal,
		DeleteUserModal,
		DuplicateWorkflowDialog,
		InviteUsersModal,
		ModalRoot,
		OnboardingCallSignupModal,
		PersonalizationModal,
		TagsManager,
		UpdatesPanel,
		ValueSurvey,
		WorkflowLMChat,
		WorkflowSettings,
		WorkflowShareModal,
		ImportCurlModal,
		GenerateCurlModal,
		EventDestinationSettingsModal,
		SourceControlPushModal,
		SourceControlPullModal,
		ExternalSecretsProviderModal,
		DebugPaywallModal,
		MfaSetupModal,
		WorkflowHistoryVersionRestoreModal,
		SetupWorkflowCredentialsModal,
	},
	data: () => ({
		CHAT_EMBED_MODAL_KEY,
		COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
		COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
		CONTACT_PROMPT_MODAL_KEY,
		CREDENTIAL_EDIT_MODAL_KEY,
		CREDENTIAL_SELECT_MODAL_KEY,
		ABOUT_MODAL_KEY,
		CHANGE_PASSWORD_MODAL_KEY,
		DELETE_USER_MODAL_KEY,
		DUPLICATE_MODAL_KEY,
		ONBOARDING_CALL_SIGNUP_MODAL_KEY,
		PERSONALIZATION_MODAL_KEY,
		INVITE_USER_MODAL_KEY,
		TAGS_MANAGER_MODAL_KEY,
		VERSIONS_MODAL_KEY,
		WORKFLOW_LM_CHAT_MODAL_KEY,
		WORKFLOW_SETTINGS_MODAL_KEY,
		WORKFLOW_SHARE_MODAL_KEY,
		VALUE_SURVEY_MODAL_KEY,
		WORKFLOW_ACTIVE_MODAL_KEY,
		IMPORT_CURL_MODAL_KEY,
		GENERATE_CURL_MODAL_KEY,
		LOG_STREAM_MODAL_KEY,
		SOURCE_CONTROL_PUSH_MODAL_KEY,
		SOURCE_CONTROL_PULL_MODAL_KEY,
		EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
		DEBUG_PAYWALL_MODAL_KEY,
		MFA_SETUP_MODAL_KEY,
		WORKFLOW_HISTORY_VERSION_RESTORE,
		SETUP_CREDENTIALS_MODAL_KEY,
	}),
});
</script>
