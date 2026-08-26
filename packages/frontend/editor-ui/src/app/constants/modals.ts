// Modal keys belong to the feature that owns them. Only the three
// dialog result sentinels stay here. To read the removal policy, see PR #36324.
export const MODAL_CANCEL = 'cancel';
export const MODAL_CONFIRM = 'confirm';
export const MODAL_CLOSE = 'close';

export const ABOUT_MODAL_KEY = 'about';
export const CHAT_EMBED_MODAL_KEY = 'chatEmbed';
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const WORKFLOW_SETTINGS_MODAL_KEY = 'settings';
export const WORKFLOW_SHARE_MODAL_KEY = 'workflowShare';
export const NPS_SURVEY_MODAL_KEY = 'npsSurvey';
export const WORKFLOW_ACTIVE_MODAL_KEY = 'activation';
export const IMPORT_CURL_MODAL_KEY = 'importCurl';
export const LOG_STREAM_MODAL_KEY = 'settingsLogStream';
export const WORKFLOW_HISTORY_VERSION_UNPUBLISH = 'workflowHistoryVersionUnpublish';
export const WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY = 'workflowHistoryNameVersion';
export const SETUP_CREDENTIALS_MODAL_KEY = 'setupCredentials';
export const NEW_ASSISTANT_SESSION_MODAL = 'newAssistantSession';
export const EXTERNAL_SECRETS_PROVIDER_MODAL_KEY = 'externalSecretsProvider';
export const SECRETS_PROVIDER_CONNECTION_MODAL_KEY = 'secretsProviderConnection';
export const DELETE_SECRETS_PROVIDER_MODAL_KEY = 'deleteSecretsProvider';
export const WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY =
	'workflowActivationConflictingWebhook';
export const FROM_AI_PARAMETERS_MODAL_KEY = 'fromAiParameters';
export const STOP_MANY_EXECUTIONS_MODAL_KEY = 'stopManyExecutions';
export const WORKFLOW_EXTRACTION_NAME_MODAL_KEY = 'workflowExtractionName';
// Shared with `versions.store` in `@n8n/stores`; re-exported here so app-side
// modal registration and openers keep resolving from `@/app/constants`. (N8N-70)
export { VERSIONS_MODAL_KEY, WHATS_NEW_MODAL_KEY } from '@n8n/frontend-constants/versions';
export const WORKFLOW_DIFF_MODAL_KEY = 'workflowDiff';
export const AI_GATEWAY_TOP_UP_MODAL_KEY = 'aiGatewayTopUp';
export const EXPERIMENT_TEMPLATE_RECO_V2_KEY = 'templateRecoV2';
export const EXPERIMENT_TEMPLATE_RECO_V3_KEY = 'templateRecoV3';
export const BINARY_DATA_VIEW_MODAL_KEY = 'binaryDataView';

export const WORKFLOW_DESCRIPTION_MODAL_KEY = 'workflowDescription';
export const WORKFLOW_PUBLISH_MODAL_KEY = 'workflowPublish';
export const WORKFLOW_HISTORY_PUBLISH_MODAL_KEY = 'workflowHistoryPublish';
export const WORKFLOW_HISTORY_DIFF_MODAL_KEY = 'workflowHistoryDiff';
export const CREDENTIAL_RESOLVER_EDIT_MODAL_KEY = 'credentialResolverEdit';
export const AI_BUILDER_DIFF_MODAL_KEY = 'aiBuilderDiff';
export const ADD_EXECUTION_TO_DATASET_MODAL_KEY = 'addExecutionToDataset';
export const TRIAL_INTRO_MODAL_KEY = 'trialIntroModal';
export const MIGRATE_WORKFLOW_MODAL_KEY = 'migrateWorkflow';
