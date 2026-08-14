/**
 * This file is being emptied of modal keys (CAT-3688).
 *
 * ## What is left when it is done
 *
 * The three dialog *result* sentinels below, and nothing else. They are return
 * values of a confirm dialog, not modal keys, so they were never part of the
 * inversion. Every `*_MODAL_KEY` here is on its way to the feature that owns it:
 * the key is declared in `src/features/<feature>/<feature>.constants.ts` and
 * registered from that feature's `modals.ts` fragment.
 *
 * That includes the handful of modals the shell genuinely owns (about, NPS
 * survey, versions, what's new). "Shell-owned" decides *who registers it*, not
 * *where the constant lives* — those keys move next to their fragment, reachable
 * from `app/modals.manifest.ts`, like every other modal. It leaves the target
 * unambiguous: this file's modal-key count goes to **0**, with no allowlist of
 * exceptions to argue about. `VERSIONS_MODAL_KEY` / `WHATS_NEW_MODAL_KEY` are
 * already owned by `@n8n/frontend-constants/versions`; only the re-export goes.
 *
 * When the last key is gone, this file holds three dialog sentinels and should be
 * renamed to match (`dialog.ts`) — a barrel-only change, since consumers import
 * from `@/app/constants`.
 *
 * ## Removing a key: hard-delete, re-checked after a fresh master merge
 *
 * Delete the export in the same commit that moves it. Do **not** leave a
 * `@deprecated` re-export behind: a re-export keeps `@/app/constants` alive as a
 * valid import path for a key the shell no longer owns, which is precisely the
 * reacquisition the ratchet exists to prevent, and it would freeze the count for
 * the whole deprecation window.
 *
 * Hard-delete is safe to prefer because it fails *loudly* — TS2305 at typecheck
 * and MISSING_EXPORT at build — never silently. The silent class this migration
 * has to fear is a modal that quietly stops opening, and a deleted constant is
 * not in it.
 *
 * Its one real trap, learned on #36147: CI compiles the *merge ref*, so a branch
 * can be green, current with its own last merge, and still fail on importers that
 * exist only on master. Nothing observable from the branch alone catches it. So
 * before pushing an extraction PR, merge `origin/master` and only then re-check
 * every symbol the PR moved:
 *
 *   git merge origin/master
 *   grep -rn "MOVED_SYMBOL" packages/frontend --include="*.ts" --include="*.vue"
 *
 * **Exception, narrow:** a symbol imported from outside `packages/frontend/editor-ui`
 * gets a deprecation window instead, because a cross-package break is not caught
 * by editor-ui's own typecheck. No modal key qualifies today — the only
 * cross-package traffic runs the other way, from `@n8n/frontend-constants`.
 */
export const MODAL_CANCEL = 'cancel';
export const MODAL_CONFIRM = 'confirm';
export const MODAL_CLOSE = 'close';

export const ABOUT_MODAL_KEY = 'about';
export const CHAT_EMBED_MODAL_KEY = 'chatEmbed';
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const IMPORT_WORKFLOW_URL_MODAL_KEY = 'importWorkflowUrl';
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
