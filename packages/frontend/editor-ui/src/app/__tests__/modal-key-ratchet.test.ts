import * as shellConstants from '@/app/constants/modals';
import { SHELL_MODAL_INITIAL_STATE } from '@/app/stores/defaults/modals';

/**
 * The two modal-key surfaces of the shell can become smaller, but never larger
 * (CAT-3688).
 *
 * `eslint.config.mjs` bans the same shapes, but only at level `warn` until
 * CAT-3973 removes the remaining entries. So this test is the gate that fails.
 *
 * This test reads both lists from the modules at runtime. It does not parse the
 * source text. So it counts an entry in the same way as the application.
 *
 * The two lists below are the CAT-3973 backlog. When a modal moves to its
 * feature, delete its name from the list. Both lists are empty at the end.
 */

/** These are dialog result sentinels, not modal keys. They stay after the migration. */
const RESULT_SENTINELS: string[] = ['MODAL_CANCEL', 'MODAL_CONFIRM', 'MODAL_CLOSE'];

const ALLOWED_KEY_EXPORTS = [
	'ABOUT_MODAL_KEY',
	'ADD_EXECUTION_TO_DATASET_MODAL_KEY',
	'AI_BUILDER_DIFF_MODAL_KEY',
	'AI_GATEWAY_TOP_UP_MODAL_KEY',
	'BINARY_DATA_VIEW_MODAL_KEY',
	'CHAT_EMBED_MODAL_KEY',
	'CREDENTIAL_RESOLVER_EDIT_MODAL_KEY',
	'DELETE_SECRETS_PROVIDER_MODAL_KEY',
	'DUPLICATE_MODAL_KEY',
	'EXPERIMENT_TEMPLATE_RECO_V2_KEY',
	'EXPERIMENT_TEMPLATE_RECO_V3_KEY',
	'EXTERNAL_SECRETS_PROVIDER_MODAL_KEY',
	'FROM_AI_PARAMETERS_MODAL_KEY',
	'IMPORT_CURL_MODAL_KEY',
	'LOG_STREAM_MODAL_KEY',
	'MIGRATE_WORKFLOW_MODAL_KEY',
	'NEW_ASSISTANT_SESSION_MODAL',
	'NPS_SURVEY_MODAL_KEY',
	'SECRETS_PROVIDER_CONNECTION_MODAL_KEY',
	'SETUP_CREDENTIALS_MODAL_KEY',
	'STOP_MANY_EXECUTIONS_MODAL_KEY',
	'TRIAL_INTRO_MODAL_KEY',
	'VERSIONS_MODAL_KEY',
	'WHATS_NEW_MODAL_KEY',
	'WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY',
	'WORKFLOW_ACTIVE_MODAL_KEY',
	'WORKFLOW_DESCRIPTION_MODAL_KEY',
	'WORKFLOW_DIFF_MODAL_KEY',
	'WORKFLOW_EXTRACTION_NAME_MODAL_KEY',
	'WORKFLOW_HISTORY_DIFF_MODAL_KEY',
	'WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY',
	'WORKFLOW_HISTORY_PUBLISH_MODAL_KEY',
	'WORKFLOW_HISTORY_VERSION_UNPUBLISH',
	'WORKFLOW_PUBLISH_MODAL_KEY',
	'WORKFLOW_SETTINGS_MODAL_KEY',
	'WORKFLOW_SHARE_MODAL_KEY',
];

const ALLOWED_CATALOGUE_KEYS = [
	'about',
	'activation',
	'addExecutionToDataset',
	'aiBuilderDiff',
	'aiGatewayTopUp',
	'annotationTagsManager',
	'binaryDataView',
	'chatEmbed',
	'communityPackageInstall',
	'communityPackageManageConfirm',
	'communityPlusEnrollment',
	'createOrEditApiKey',
	'credentialResolverEdit',
	'debugPaywall',
	'deleteFolder',
	'deleteSecretsProvider',
	'deleteUser',
	'duplicate',
	'editCredential',
	'externalSecretsProvider',
	'fromAiParameters',
	'importCurl',
	'inviteUser',
	'migrateWorkflow',
	'moveFolder',
	'newAssistantSession',
	'npsSurvey',
	'personalization',
	'projectMoveResourceModal',
	'secretsProviderConnection',
	'selectCredential',
	'settings',
	'settingsLogStream',
	'setupCredentials',
	'sourceControlPull',
	'sourceControlPullResult',
	'sourceControlPush',
	'stopManyExecutions',
	'tagsManager',
	'templateRecoV2',
	'templateRecoV3',
	'trialIntroModal',
	'variableModal',
	'versions',
	'whatsNew',
	'workflowActivationConflictingWebhook',
	'workflowDescription',
	'workflowDiff',
	'workflowExtractionName',
	'workflowHistoryDiff',
	'workflowHistoryNameVersion',
	'workflowHistoryPublish',
	'workflowHistoryVersionUnpublish',
	'workflowPublish',
	'workflowShare',
];

const shellKeyExports = () =>
	Object.keys(shellConstants)
		.filter((name) => !RESULT_SENTINELS.includes(name))
		.sort();

describe('modal-key ratchet', () => {
	it('does not let the shell reacquire a modal key constant', () => {
		expect(
			shellKeyExports(),
			'Declare the key in the constants file of the feature that owns it. Then register the modal from the modals.ts fragment of that feature. If a key moved to its feature, delete its name from ALLOWED_KEY_EXPORTS in this file.',
		).toEqual(ALLOWED_KEY_EXPORTS);
	});

	it('does not let the shell reacquire a modal definition', () => {
		expect(
			Object.keys(SHELL_MODAL_INITIAL_STATE).sort(),
			'Write a ModalDefinition for the modal in the fragment of its feature. Then modalRegistry registers the modal. In the same change, delete the <ModalRoot> of the modal from Modals.vue. If a modal moved to its feature, delete its key from ALLOWED_CATALOGUE_KEYS in this file.',
		).toEqual(ALLOWED_CATALOGUE_KEYS);
	});
});
