<script setup lang="ts">
import {
	ABOUT_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
	CONTACT_PROMPT_MODAL_KEY,
	CREDENTIAL_EDIT_MODAL_KEY,
	API_KEY_CREATE_OR_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
	DELETE_USER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
	ANNOTATION_TAGS_MANAGER_MODAL_KEY,
	NPS_SURVEY_MODAL_KEY,
	NEW_ASSISTANT_SESSION_MODAL,
	VERSIONS_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
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
	PROJECT_MOVE_RESOURCE_MODAL,
	PROMPT_MFA_CODE_MODAL_KEY,
	COMMUNITY_PLUS_ENROLLMENT_MODAL,
	DELETE_FOLDER_MODAL_KEY,
	MOVE_FOLDER_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	FROM_AI_PARAMETERS_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
} from '@/constants';

import AboutModal from '@/components/AboutModal.vue';
import ChatEmbedModal from '@/components/ChatEmbedModal.vue';
import CommunityPackageManageConfirmModal from '@/components/CommunityPackageManageConfirmModal.vue';
import CommunityPackageInstallModal from '@/components/CommunityPackageInstallModal.vue';
import ChangePasswordModal from '@/components/ChangePasswordModal.vue';
import ContactPromptModal from '@/components/ContactPromptModal.vue';
import CredentialEdit from '@/components/CredentialEdit/CredentialEdit.vue';
import InviteUsersModal from '@/components/InviteUsersModal.vue';
import CredentialsSelectModal from '@/components/CredentialsSelectModal.vue';
import DuplicateWorkflowDialog from '@/components/DuplicateWorkflowDialog.vue';
import ModalRoot from '@/components/ModalRoot.vue';
import PersonalizationModal from '@/components/PersonalizationModal.vue';
import WorkflowTagsManager from '@/components/TagsManager/WorkflowTagsManager.vue';
import AnnotationTagsManager from '@/components/TagsManager/AnnotationTagsManager.ee.vue';
import UpdatesPanel from '@/components/UpdatesPanel.vue';
import NpsSurvey from '@/components/NpsSurvey.vue';
import WorkflowSettings from '@/components/WorkflowSettings.vue';
import DeleteUserModal from '@/components/DeleteUserModal.vue';
import ActivationModal from '@/components/ActivationModal.vue';
import ImportCurlModal from '@/components/ImportCurlModal.vue';
import ApiKeyCreateOrEditModal from '@/components/ApiKeyCreateOrEditModal.vue';
import MfaSetupModal from '@/components/MfaSetupModal.vue';
import WorkflowShareModal from '@/components/WorkflowShareModal.ee.vue';
import EventDestinationSettingsModal from '@/components/SettingsLogStreaming/EventDestinationSettingsModal.ee.vue';
import SourceControlPushModal from '@/components/SourceControlPushModal.ee.vue';
import SourceControlPullModal from '@/components/SourceControlPullModal.ee.vue';
import ExternalSecretsProviderModal from '@/components/ExternalSecretsProviderModal.ee.vue';
import DebugPaywallModal from '@/components/DebugPaywallModal.vue';
import WorkflowHistoryVersionRestoreModal from '@/components/WorkflowHistory/WorkflowHistoryVersionRestoreModal.vue';
import SetupWorkflowCredentialsModal from '@/components/SetupWorkflowCredentialsModal/SetupWorkflowCredentialsModal.vue';
import ProjectMoveResourceModal from '@/components/Projects/ProjectMoveResourceModal.vue';
import NewAssistantSessionModal from '@/components/AskAssistant/Chat/NewAssistantSessionModal.vue';
import PromptMfaCodeModal from './PromptMfaCodeModal/PromptMfaCodeModal.vue';
import CommunityPlusEnrollmentModal from '@/components/CommunityPlusEnrollmentModal.vue';
import WorkflowActivationConflictingWebhookModal from '@/components/WorkflowActivationConflictingWebhookModal.vue';
import FromAiParametersModal from '@/components/FromAiParametersModal.vue';
import ImportWorkflowUrlModal from '@/components/ImportWorkflowUrlModal.vue';
import type { EventBus } from '@n8n/utils/event-bus';
</script>

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

		<ModalRoot :name="API_KEY_CREATE_OR_EDIT_MODAL_KEY">
			<template
				#default="{
					modalName,
					data: { mode, activeId },
				}: {
					modalName: string;
					data: { mode: 'new' | 'edit'; activeId: string };
				}"
			>
				<ApiKeyCreateOrEditModal :modal-name="modalName" :mode="mode" :active-id="activeId" />
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

		<ModalRoot :name="IMPORT_WORKFLOW_URL_MODAL_KEY">
			<ImportWorkflowUrlModal />
		</ModalRoot>

		<ModalRoot :name="PERSONALIZATION_MODAL_KEY">
			<PersonalizationModal />
		</ModalRoot>

		<ModalRoot :name="TAGS_MANAGER_MODAL_KEY">
			<WorkflowTagsManager />
		</ModalRoot>

		<ModalRoot :name="ANNOTATION_TAGS_MANAGER_MODAL_KEY">
			<AnnotationTagsManager />
		</ModalRoot>

		<ModalRoot :name="VERSIONS_MODAL_KEY" :keep-alive="true">
			<UpdatesPanel />
		</ModalRoot>

		<ModalRoot :name="NPS_SURVEY_MODAL_KEY" :keep-alive="true">
			<template #default="{ active }">
				<NpsSurvey :is-active="active" />
			</template>
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

		<ModalRoot :name="PROMPT_MFA_CODE_MODAL_KEY">
			<PromptMfaCodeModal />
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_SHARE_MODAL_KEY">
			<template #default="{ modalName, active, data }">
				<WorkflowShareModal :data="data" :is-active="active" :modal-name="modalName" />
			</template>
		</ModalRoot>

		<ModalRoot :name="COMMUNITY_PACKAGE_INSTALL_MODAL_KEY">
			<CommunityPackageInstallModal />
		</ModalRoot>

		<ModalRoot :name="IMPORT_CURL_MODAL_KEY">
			<ImportCurlModal />
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
			<template
				#default="{
					modalName,
					data,
				}: {
					modalName: string;
					data: { destination: Object; isNew: boolean; eventBus: EventBus };
				}"
			>
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
		<ModalRoot :name="PROJECT_MOVE_RESOURCE_MODAL">
			<template #default="{ modalName, data }">
				<ProjectMoveResourceModal
					data-test-id="project-move-resource-modal"
					:modal-name="modalName"
					:data="data"
				/>
			</template>
		</ModalRoot>
		<ModalRoot :name="NEW_ASSISTANT_SESSION_MODAL">
			<template #default="{ modalName, data }">
				<NewAssistantSessionModal :name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="COMMUNITY_PLUS_ENROLLMENT_MODAL">
			<template #default="{ modalName, data }">
				<CommunityPlusEnrollmentModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="DELETE_FOLDER_MODAL_KEY">
			<template #default="{ modalName, activeId, data }">
				<DeleteFolderModal :modal-name="modalName" :active-id="activeId" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="MOVE_FOLDER_MODAL_KEY">
			<template #default="{ modalName, activeId, data }">
				<MoveToFolderModal :modal-name="modalName" :active-id="activeId" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowActivationConflictingWebhookModal :data="data" :modal-name="modalName" />
			</template>
		</ModalRoot>

		<ModalRoot :name="FROM_AI_PARAMETERS_MODAL_KEY">
			<template #default="{ modalName, data }">
				<FromAiParametersModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_EXTRACTION_NAME_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowExtractionNameModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WHATS_NEW_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WhatsNewModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>
	</div>
</template>
