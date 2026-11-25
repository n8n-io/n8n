import {
	ABOUT_MODAL_KEY,
	ADD_EXECUTION_TO_DATASET_MODAL_KEY,
	AI_BUILDER_DIFF_MODAL_KEY,
	AI_GATEWAY_TOP_UP_MODAL_KEY,
	BINARY_DATA_VIEW_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	FROM_AI_PARAMETERS_MODAL_KEY,
	IMPORT_CURL_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	MIGRATE_WORKFLOW_MODAL_KEY,
	NEW_ASSISTANT_SESSION_MODAL,
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
	SETUP_CREDENTIALS_MODAL_KEY,
	STOP_MANY_EXECUTIONS_MODAL_KEY,
	TRIAL_INTRO_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_DESCRIPTION_MODAL_KEY,
	WORKFLOW_DIFF_MODAL_KEY,
	WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
	WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_UNPUBLISH,
	WORKFLOW_PUBLISH_MODAL_KEY,
	WORKFLOW_SETTINGS_MODAL_KEY,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/app/constants';
import { PROJECT_MOVE_RESOURCE_MODAL } from '@/features/collaboration/projects/projects.constants';
import {
	DELETE_FOLDER_MODAL_KEY,
	MOVE_FOLDER_MODAL_KEY,
} from '@/features/core/folders/folders.constants';
import {
	CREDENTIAL_EDIT_MODAL_KEY,
	CREDENTIAL_SELECT_MODAL_KEY,
} from '@/features/credentials/credentials.constants';
import { DEBUG_PAYWALL_MODAL_KEY } from '@/features/execution/executions/executions.constants';
import {
	SOURCE_CONTROL_PULL_MODAL_KEY,
	SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
} from '@/features/integrations/sourceControl.ee/sourceControl.constants';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '@/features/settings/apiKeys/apiKeys.constants';
import {
	COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY,
	COMMUNITY_PACKAGE_INSTALL_MODAL_KEY,
} from '@/features/settings/communityNodes/communityNodes.constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/features/settings/usage/usage.constants';
import {
	DELETE_USER_MODAL_KEY,
	INVITE_USER_MODAL_KEY,
	PERSONALIZATION_MODAL_KEY,
} from '@/features/settings/users/users.constants';
import {
	ANNOTATION_TAGS_MANAGER_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
} from '@/features/shared/tags/tags.constants';

// Two modal keys open this component. One loader keeps one async component in `Modals.vue`.
const loadWorkflowVersionFormModal = async () =>
	await import('@/features/workflows/workflowHistory/components/WorkflowVersionFormModal.vue');

/**
 * The lazy modal loaders of `Modals.vue`, by modal key.
 *
 * `Modals.vue` and `usePrefetchModals` call the same function for a key, so a prefetch and
 * the later open share one module request. This file imports no modal code itself.
 */
export const lazyModalLoaders = {
	[ABOUT_MODAL_KEY]: async () => await import('@/app/components/AboutModal.vue'),
	[WORKFLOW_ACTIVE_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/ActivationModal.vue'),
	[API_KEY_CREATE_OR_EDIT_MODAL_KEY]: async () =>
		await import('@/features/settings/apiKeys/components/ApiKeyCreateOrEditModal.vue'),
	[NEW_ASSISTANT_SESSION_MODAL]: async () =>
		await import('@/features/ai/assistant/components/Chat/NewAssistantSessionModal.vue'),
	[CHAT_EMBED_MODAL_KEY]: async () => await import('@/app/components/ChatEmbedModal.vue'),
	[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]: async () =>
		await import('@/features/settings/communityNodes/components/CommunityPackageInstallModal.vue'),
	[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: async () =>
		await import(
			'@/features/settings/communityNodes/components/CommunityPackageManageConfirmModal.vue'
		),
	[COMMUNITY_PLUS_ENROLLMENT_MODAL]: async () =>
		await import('@/features/settings/usage/components/CommunityPlusEnrollmentModal.vue'),
	[CREDENTIAL_EDIT_MODAL_KEY]: async () =>
		await import('@/features/credentials/components/CredentialEdit/CredentialEdit.vue'),
	[CREDENTIAL_SELECT_MODAL_KEY]: async () =>
		await import('@/features/credentials/components/CredentialsSelectModal.vue'),
	[DEBUG_PAYWALL_MODAL_KEY]: async () =>
		await import('@/features/execution/executions/components/DebugPaywallModal.vue'),
	[DELETE_FOLDER_MODAL_KEY]: async () =>
		await import('@/features/core/folders/components/DeleteFolderModal.vue'),
	[MOVE_FOLDER_MODAL_KEY]: async () =>
		await import('@/features/core/folders/components/MoveToFolderModal.vue'),
	[DELETE_USER_MODAL_KEY]: async () =>
		await import('@/features/settings/users/components/DeleteUserModal.vue'),
	[DUPLICATE_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/DuplicateWorkflowDialog.vue'),
	[EXTERNAL_SECRETS_PROVIDER_MODAL_KEY]: async () =>
		await import(
			'@/features/integrations/externalSecrets.ee/components/ExternalSecretsProviderModal.ee.vue'
		),
	[SECRETS_PROVIDER_CONNECTION_MODAL_KEY]: async () =>
		await import(
			'@/features/integrations/secretsProviders.ee/components/SecretsProviderConnectionModal.ee.vue'
		),
	[DELETE_SECRETS_PROVIDER_MODAL_KEY]: async () =>
		await import(
			'@/features/integrations/secretsProviders.ee/components/DeleteSecretsProviderModal.ee.vue'
		),
	[FROM_AI_PARAMETERS_MODAL_KEY]: async () =>
		await import('@/features/ndv/parameters/components/FromAiParametersModal.vue'),
	[IMPORT_CURL_MODAL_KEY]: async () =>
		await import('@/features/ndv/parameters/components/ImportCurlModal.vue'),
	[BINARY_DATA_VIEW_MODAL_KEY]: async () =>
		await import('@/features/ndv/runData/components/BinaryDataViewModal.vue'),
	[IMPORT_WORKFLOW_URL_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/ImportWorkflowUrlModal.vue'),
	[INVITE_USER_MODAL_KEY]: async () =>
		await import('@/features/settings/users/components/InviteUsersModal.vue'),
	[PERSONALIZATION_MODAL_KEY]: async () =>
		await import('@/features/settings/users/components/PersonalizationModal.vue'),
	[PROJECT_MOVE_RESOURCE_MODAL]: async () =>
		await import('@/features/collaboration/projects/components/ProjectMoveResourceModal.vue'),
	[SETUP_CREDENTIALS_MODAL_KEY]: async () =>
		await import('@/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue'),
	[SOURCE_CONTROL_PULL_MODAL_KEY]: async () =>
		await import('@/features/integrations/sourceControl.ee/components/SourceControlPullModal.vue'),
	[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY]: async () =>
		await import(
			'@/features/integrations/sourceControl.ee/components/SourceControlPullResultModal.vue'
		),
	[SOURCE_CONTROL_PUSH_MODAL_KEY]: async () =>
		await import('@/features/integrations/sourceControl.ee/components/SourceControlPushModal.vue'),
	[ANNOTATION_TAGS_MANAGER_MODAL_KEY]: async () =>
		await import('@/features/shared/tags/components/TagsManager/AnnotationTagsManager.ee.vue'),
	[TAGS_MANAGER_MODAL_KEY]: async () =>
		await import('@/features/shared/tags/components/TagsManager/WorkflowTagsManager.vue'),
	[WHATS_NEW_MODAL_KEY]: async () => await import('@/app/components/WhatsNewModal.vue'),
	[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowActivationConflictingWebhookModal.vue'),
	[WORKFLOW_EXTRACTION_NAME_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowExtractionNameModal.vue'),
	[WORKFLOW_HISTORY_VERSION_UNPUBLISH]: async () =>
		await import(
			'@/features/workflows/workflowHistory/components/WorkflowHistoryVersionUnpublishModal.vue'
		),
	[WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY]: loadWorkflowVersionFormModal,
	[WORKFLOW_HISTORY_PUBLISH_MODAL_KEY]: loadWorkflowVersionFormModal,
	[WORKFLOW_SETTINGS_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowSettings/WorkflowSettings.vue'),
	[WORKFLOW_SHARE_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowShareModal.ee.vue'),
	[WORKFLOW_DIFF_MODAL_KEY]: async () =>
		await import('@/features/workflows/workflowDiff/WorkflowDiffModal.vue'),
	[EXPERIMENT_TEMPLATE_RECO_V2_KEY]: async () =>
		await import('@/experiments/templateRecoV2/components/NodeRecommendationModal.vue'),
	[EXPERIMENT_TEMPLATE_RECO_V3_KEY]: async () =>
		await import('@/experiments/personalizedTemplatesV3/components/NodeRecommendationModal.vue'),
	[VARIABLE_MODAL_KEY]: async () =>
		await import('@/features/settings/environments.ee/components/VariableModal.vue'),
	[STOP_MANY_EXECUTIONS_MODAL_KEY]: async () =>
		await import('@/features/execution/executions/components/StopManyExecutionsModal.vue'),
	[ADD_EXECUTION_TO_DATASET_MODAL_KEY]: async () =>
		await import(
			'@/features/ai/evaluation.ee/components/AddExecutionToDataset/AddExecutionToDatasetModal.vue'
		),
	[WORKFLOW_DESCRIPTION_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowDescriptionModal.vue'),
	[WORKFLOW_PUBLISH_MODAL_KEY]: async () =>
		await import('@/features/workflows/components/WorkflowPublishModal.vue'),
	[MIGRATE_WORKFLOW_MODAL_KEY]: async () =>
		await import('@/features/settings/migrationReport/MigrateWorkflowModal.vue'),
	[CREDENTIAL_RESOLVER_EDIT_MODAL_KEY]: async () =>
		await import('@/features/resolvers/components/CredentialResolverEditModal.vue'),
	[AI_BUILDER_DIFF_MODAL_KEY]: async () =>
		await import('@/features/ai/assistant/components/Agent/AIBuilderDiffModal.vue'),
	[AI_GATEWAY_TOP_UP_MODAL_KEY]: async () =>
		await import('@/features/ai/gateway/components/AiGatewayTopUpModal.vue'),
	[TRIAL_INTRO_MODAL_KEY]: async () =>
		await import('@/experiments/trialIntroModal/components/TrialIntroModal.vue'),
} satisfies Record<string, () => Promise<unknown>>;

export type LazyModalKey = keyof typeof lazyModalLoaders;
