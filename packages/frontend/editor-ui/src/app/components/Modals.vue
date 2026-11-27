<script setup lang="ts">
import type { VariableModalOptions } from '@/features/settings/environments.ee/environments.types';
import {
	ABOUT_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
	FROM_AI_PARAMETERS_MODAL_KEY,
	IMPORT_CURL_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	NEW_ASSISTANT_SESSION_MODAL,
	NPS_SURVEY_MODAL_KEY,
	SETUP_CREDENTIALS_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_DIFF_MODAL_KEY,
	WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_UNPUBLISH,
	WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	BINARY_DATA_VIEW_MODAL_KEY,
	STOP_MANY_EXECUTIONS_MODAL_KEY,
	ADD_EXECUTION_TO_DATASET_MODAL_KEY,
	MIGRATE_WORKFLOW_MODAL_KEY,
	WORKFLOW_DESCRIPTION_MODAL_KEY,
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
	CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
	AI_BUILDER_DIFF_MODAL_KEY,
	AI_GATEWAY_TOP_UP_MODAL_KEY,
	TRIAL_INTRO_MODAL_KEY,
} from '@/app/constants';
import {
	ANNOTATION_TAGS_MANAGER_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
} from '@/features/shared/tags/tags.constants';
import { DEBUG_PAYWALL_MODAL_KEY } from '@/features/execution/executions/executions.constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import {
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
} from '@/features/credentials/credentials.constants';
import {
	DELETE_USER_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
} from '@/features/settings/users/users.constants';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/features/settings/usage/usage.constants';
import {
	DELETE_FOLDER_MODAL_KEY,
	MOVE_FOLDER_MODAL_KEY,
} from '@/features/core/folders/folders.constants';
import {
	SOURCE_CONTROL_PULL_MODAL_KEY,
	SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
} from '@/features/integrations/sourceControl.ee/sourceControl.constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import {
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
} from '@/features/settings/communityNodes/communityNodes.constants';
import ModalRoot from '@/app/components/ModalRoot.vue';
import NpsSurvey from '@/app/components/NpsSurvey.vue';
import type { WorkflowVersionFormModalData } from '@/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue';
import DynamicModalLoader from './DynamicModalLoader.vue';
import UpdatesPanel from './UpdatesPanel.vue';
import type { AiGatewayTopUpVariant } from '@/app/composables/useAiGatewayTopUp';
import { defineAsyncComponent } from 'vue';
import { lazyModalLoaders } from '@/app/modals/lazyModals';

const AboutModal = defineAsyncComponent(lazyModalLoaders[ABOUT_MODAL_KEY]);
const ActivationModal = defineAsyncComponent(lazyModalLoaders[WORKFLOW_ACTIVE_MODAL_KEY]);
const NewAssistantSessionModal = defineAsyncComponent(
	lazyModalLoaders[NEW_ASSISTANT_SESSION_MODAL],
);
const ChatEmbedModal = defineAsyncComponent(lazyModalLoaders[CHAT_EMBED_MODAL_KEY]);
const CommunityPackageInstallModal = defineAsyncComponent(
	lazyModalLoaders[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY],
);
const CommunityPackageManageConfirmModal = defineAsyncComponent(
	lazyModalLoaders[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY],
);
const CommunityPlusEnrollmentModal = defineAsyncComponent(
	lazyModalLoaders[COMMUNITY_PLUS_ENROLLMENT_MODAL],
);
const CredentialEdit = defineAsyncComponent(lazyModalLoaders[CREDENTIAL_EDIT_MODAL_KEY]);
const CredentialsSelectModal = defineAsyncComponent(lazyModalLoaders[CREDENTIAL_SELECT_MODAL_KEY]);
const DebugPaywallModal = defineAsyncComponent(lazyModalLoaders[DEBUG_PAYWALL_MODAL_KEY]);
const DeleteFolderModal = defineAsyncComponent(lazyModalLoaders[DELETE_FOLDER_MODAL_KEY]);
const MoveToFolderModal = defineAsyncComponent(lazyModalLoaders[MOVE_FOLDER_MODAL_KEY]);
const DeleteUserModal = defineAsyncComponent(lazyModalLoaders[DELETE_USER_MODAL_KEY]);
const DuplicateWorkflowDialog = defineAsyncComponent(lazyModalLoaders[DUPLICATE_MODAL_KEY]);
const ExternalSecretsProviderModal = defineAsyncComponent(
	lazyModalLoaders[EXTERNAL_SECRETS_PROVIDER_MODAL_KEY],
);
const SecretsProviderConnectionModal = defineAsyncComponent(
	lazyModalLoaders[SECRETS_PROVIDER_CONNECTION_MODAL_KEY],
);
const DeleteSecretsProviderModal = defineAsyncComponent(
	lazyModalLoaders[DELETE_SECRETS_PROVIDER_MODAL_KEY],
);
const FromAiParametersModal = defineAsyncComponent(lazyModalLoaders[FROM_AI_PARAMETERS_MODAL_KEY]);
const ImportCurlModal = defineAsyncComponent(lazyModalLoaders[IMPORT_CURL_MODAL_KEY]);
const BinaryDataViewModal = defineAsyncComponent(lazyModalLoaders[BINARY_DATA_VIEW_MODAL_KEY]);
const ImportWorkflowUrlModal = defineAsyncComponent(
	lazyModalLoaders[IMPORT_WORKFLOW_URL_MODAL_KEY],
);
const InviteUsersModal = defineAsyncComponent(lazyModalLoaders[INVITE_USER_MODAL_KEY]);
const PersonalizationModal = defineAsyncComponent(lazyModalLoaders[PERSONALIZATION_MODAL_KEY]);
const ProjectMoveResourceModal = defineAsyncComponent(
	lazyModalLoaders[PROJECT_MOVE_RESOURCE_MODAL],
);
const SetupWorkflowCredentialsModal = defineAsyncComponent(
	lazyModalLoaders[SETUP_CREDENTIALS_MODAL_KEY],
);
const SourceControlPullModal = defineAsyncComponent(
	lazyModalLoaders[SOURCE_CONTROL_PULL_MODAL_KEY],
);
const SourceControlPullResultModal = defineAsyncComponent(
	lazyModalLoaders[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY],
);
const SourceControlPushModal = defineAsyncComponent(
	lazyModalLoaders[SOURCE_CONTROL_PUSH_MODAL_KEY],
);
const AnnotationTagsManager = defineAsyncComponent(
	lazyModalLoaders[ANNOTATION_TAGS_MANAGER_MODAL_KEY],
);
const WorkflowTagsManager = defineAsyncComponent(lazyModalLoaders[TAGS_MANAGER_MODAL_KEY]);
const WhatsNewModal = defineAsyncComponent(lazyModalLoaders[WHATS_NEW_MODAL_KEY]);
const WorkflowActivationConflictingWebhookModal = defineAsyncComponent(
	lazyModalLoaders[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY],
);
const WorkflowExtractionNameModal = defineAsyncComponent(
	lazyModalLoaders[WORKFLOW_EXTRACTION_NAME_MODAL_KEY],
);
const WorkflowHistoryVersionUnpublishModal = defineAsyncComponent(
	lazyModalLoaders[WORKFLOW_HISTORY_VERSION_UNPUBLISH],
);
const WorkflowVersionFormModal = defineAsyncComponent(
	lazyModalLoaders[WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY],
);
const WorkflowSettings = defineAsyncComponent(lazyModalLoaders[WORKFLOW_SETTINGS_MODAL_KEY]);
const WorkflowShareModal = defineAsyncComponent(lazyModalLoaders[WORKFLOW_SHARE_MODAL_KEY]);
const WorkflowDiffModal = defineAsyncComponent(lazyModalLoaders[WORKFLOW_DIFF_MODAL_KEY]);
const NodeRecommendationModalV2 = defineAsyncComponent(
	lazyModalLoaders[EXPERIMENT_TEMPLATE_RECO_V2_KEY],
);
const NodeRecommendationModalV3 = defineAsyncComponent(
	lazyModalLoaders[EXPERIMENT_TEMPLATE_RECO_V3_KEY],
);
const VariableModal = defineAsyncComponent(lazyModalLoaders[VARIABLE_MODAL_KEY]);
const StopManyExecutionsModal = defineAsyncComponent(
	lazyModalLoaders[STOP_MANY_EXECUTIONS_MODAL_KEY],
);
const AddExecutionToDatasetModal = defineAsyncComponent(
	lazyModalLoaders[ADD_EXECUTION_TO_DATASET_MODAL_KEY],
);
const WorkflowDescriptionModal = defineAsyncComponent(
	lazyModalLoaders[WORKFLOW_DESCRIPTION_MODAL_KEY],
);
const WorkflowPublishModal = defineAsyncComponent(lazyModalLoaders[WORKFLOW_PUBLISH_MODAL_KEY]);
const MigrateWorkflowModal = defineAsyncComponent(lazyModalLoaders[MIGRATE_WORKFLOW_MODAL_KEY]);
const CredentialResolverEditModal = defineAsyncComponent(
	lazyModalLoaders[CREDENTIAL_RESOLVER_EDIT_MODAL_KEY],
);
const AIBuilderDiffModal = defineAsyncComponent(lazyModalLoaders[AI_BUILDER_DIFF_MODAL_KEY]);
const AiGatewayTopUpModal = defineAsyncComponent(lazyModalLoaders[AI_GATEWAY_TOP_UP_MODAL_KEY]);
const TrialIntroModal = defineAsyncComponent(lazyModalLoaders[TRIAL_INTRO_MODAL_KEY]);
</script>

<template>
	<div>
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

		<ModalRoot :name="INVITE_USER_MODAL_KEY">
			<template #default="{ modalName, data }">
				<InviteUsersModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="DELETE_USER_MODAL_KEY">
			<template #default="{ modalName, data }">
				<DeleteUserModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_ACTIVE_MODAL_KEY">
			<ActivationModal />
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

		<ModalRoot :name="SOURCE_CONTROL_PULL_RESULT_MODAL_KEY">
			<template #default="{ modalName, data }">
				<SourceControlPullResultModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_DIFF_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowDiffModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="AI_BUILDER_DIFF_MODAL_KEY">
			<template #default="{ modalName, data }">
				<AIBuilderDiffModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY">
			<template #default="{ modalName, data }">
				<ExternalSecretsProviderModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="SECRETS_PROVIDER_CONNECTION_MODAL_KEY">
			<template #default="{ modalName, data }">
				<SecretsProviderConnectionModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="DELETE_SECRETS_PROVIDER_MODAL_KEY">
			<template #default="{ modalName, data }">
				<DeleteSecretsProviderModal :modal-name="modalName" :data="data" />
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

		<ModalRoot :name="WORKFLOW_HISTORY_VERSION_UNPUBLISH">
			<template #default="{ modalName, data }">
				<WorkflowHistoryVersionUnpublishModal
					data-test-id="workflow-history-version-unpublish-modal"
					:modal-name="modalName"
					:data="data"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowVersionFormModal
					data-test-id="workflow-history-name-version-modal"
					:modal-name="modalName"
					:data="data as WorkflowVersionFormModalData"
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

		<ModalRoot :name="STOP_MANY_EXECUTIONS_MODAL_KEY">
			<template #default="{ modalName, data }">
				<StopManyExecutionsModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="ADD_EXECUTION_TO_DATASET_MODAL_KEY">
			<template #default="{ modalName, data }">
				<AddExecutionToDatasetModal :modal-name="modalName" :data="data" />
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

		<ModalRoot :name="EXPERIMENT_TEMPLATE_RECO_V2_KEY">
			<template #default="{ modalName, data }">
				<NodeRecommendationModalV2 :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="EXPERIMENT_TEMPLATE_RECO_V3_KEY">
			<template #default="{ modalName, data }">
				<NodeRecommendationModalV3 :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="VARIABLE_MODAL_KEY">
			<template #default="{ data }: { data: VariableModalOptions }">
				<VariableModal v-bind="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="BINARY_DATA_VIEW_MODAL_KEY">
			<template #default="{ modalName, data }">
				<BinaryDataViewModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_DESCRIPTION_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowDescriptionModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_PUBLISH_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowPublishModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="MIGRATE_WORKFLOW_MODAL_KEY">
			<template #default="{ modalName, data }">
				<MigrateWorkflowModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="WORKFLOW_HISTORY_PUBLISH_MODAL_KEY">
			<template #default="{ modalName, data }">
				<WorkflowVersionFormModal
					:modal-name="modalName"
					:data="data as WorkflowVersionFormModalData"
				/>
			</template>
		</ModalRoot>

		<ModalRoot :name="CREDENTIAL_RESOLVER_EDIT_MODAL_KEY">
			<template #default="{ modalName, data }">
				<CredentialResolverEditModal :modal-name="modalName" :data="data" />
			</template>
		</ModalRoot>

		<ModalRoot :name="AI_GATEWAY_TOP_UP_MODAL_KEY">
			<template #default="{ data }: { data: { variant: AiGatewayTopUpVariant } }">
				<AiGatewayTopUpModal :variant="data.variant" />
			</template>
		</ModalRoot>

		<ModalRoot :name="TRIAL_INTRO_MODAL_KEY">
			<template #default="{ modalName }">
				<TrialIntroModal :modal-name="modalName" />
			</template>
		</ModalRoot>

		<!-- Dynamic modals from modules -->
		<DynamicModalLoader />
	</div>
</template>
