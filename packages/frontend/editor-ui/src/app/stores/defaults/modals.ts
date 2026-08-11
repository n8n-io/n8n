import {
	ABOUT_MODAL_KEY,
	ADD_EXECUTION_TO_DATASET_MODAL_KEY,
	AGENT_CONFIRMATION_MODAL_KEY,
	AI_BUILDER_DIFF_MODAL_KEY,
	AI_GATEWAY_TOP_UP_MODAL_KEY,
	BINARY_DATA_VIEW_MODAL_KEY,
	CHANGE_PASSWORD_MODAL_KEY,
	CHAT_EMBED_MODAL_KEY,
	CONFIRM_PASSWORD_MODAL_KEY,
	CREDENTIAL_RESOLVER_EDIT_MODAL_KEY,
	DUPLICATE_MODAL_KEY,
	EXPERIMENT_TEMPLATE_RECO_V2_KEY,
	EXPERIMENT_TEMPLATE_RECO_V3_KEY,
	EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
	FROM_AI_PARAMETERS_MODAL_KEY,
	IMPORT_CURL_MODAL_KEY,
	IMPORT_WORKFLOW_URL_MODAL_KEY,
	INSTANCE_AI_CREDENTIAL_SETUP_MODAL_KEY,
	INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY,
	LOG_STREAM_MODAL_KEY,
	MFA_SETUP_MODAL_KEY,
	MIGRATE_WORKFLOW_MODAL_KEY,
	NEW_ASSISTANT_SESSION_MODAL,
	NPS_SURVEY_MODAL_KEY,
	PROMPT_MFA_CODE_MODAL_KEY,
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
	SETUP_CREDENTIALS_MODAL_KEY,
	STOP_MANY_EXECUTIONS_MODAL_KEY,
	TRIAL_INTRO_MODAL_KEY,
	VERSIONS_MODAL_KEY,
	WHATS_NEW_MODAL_KEY,
	WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY,
	WORKFLOW_ACTIVE_MODAL_KEY,
	WORKFLOW_DESCRIPTION_MODAL_KEY,
	WORKFLOW_DIFF_MODAL_KEY,
	WORKFLOW_EXTRACTION_NAME_MODAL_KEY,
	WORKFLOW_HISTORY_DIFF_MODAL_KEY,
	WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY,
	WORKFLOW_HISTORY_PUBLISH_MODAL_KEY,
	WORKFLOW_HISTORY_VERSION_RESTORE,
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
	SOURCE_CONTROL_PULL_MODAL_KEY,
	SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
} from '@/features/integrations/sourceControl.ee/sourceControl.constants';
import {
	ANNOTATION_TAGS_MANAGER_MODAL_KEY,
	TAGS_MANAGER_MODAL_KEY,
} from '@/features/shared/tags/tags.constants';
import type { ModalState } from '@/Interface';

/**
 * Modal definitions still owned by the shell: the key and the state it starts in.
 *
 * Every entry here is rendered by a hand-written `<ModalRoot>` in `Modals.vue`
 * — `ui.store.registration.spec.ts` holds those two in sync. Module-owned modals
 * are not here; they register their definition through `modalRegistry` and render
 * through `DynamicModalLoader`.
 *
 * This catalogue shrinks by one entry per modal moved onto the registry, and is
 * empty when the inversion is complete. Nothing else should be added to it.
 */
export const SHELL_MODAL_INITIAL_STATE: Readonly<Record<string, ModalState>> = Object.freeze({
	[ABOUT_MODAL_KEY]: { open: false },
	[ADD_EXECUTION_TO_DATASET_MODAL_KEY]: { open: false, data: {} },
	[AGENT_CONFIRMATION_MODAL_KEY]: { open: false },
	[AI_BUILDER_DIFF_MODAL_KEY]: { open: false },
	[AI_GATEWAY_TOP_UP_MODAL_KEY]: { open: false },
	[ANNOTATION_TAGS_MANAGER_MODAL_KEY]: { open: false },
	[API_KEY_CREATE_OR_EDIT_MODAL_KEY]: {
		open: false,
		data: {
			activeId: null,
			mode: '',
		},
	},
	[BINARY_DATA_VIEW_MODAL_KEY]: { open: false },
	[CHANGE_PASSWORD_MODAL_KEY]: { open: false },
	[CHAT_EMBED_MODAL_KEY]: { open: false },
	[COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY]: {
		open: false,
		mode: '',
		activeId: null,
	},
	[COMMUNITY_PACKAGE_INSTALL_MODAL_KEY]: { open: false },
	[COMMUNITY_PLUS_ENROLLMENT_MODAL]: {
		open: false,
		data: {
			customHeading: undefined,
		},
	},
	[CONFIRM_PASSWORD_MODAL_KEY]: { open: false },
	[CREDENTIAL_EDIT_MODAL_KEY]: {
		open: false,
		mode: '',
		activeId: null,
		showAuthSelector: false,
		closeOnSave: false,
	} as ModalState,
	[CREDENTIAL_RESOLVER_EDIT_MODAL_KEY]: { open: false },
	[CREDENTIAL_SELECT_MODAL_KEY]: { open: false },
	[DEBUG_PAYWALL_MODAL_KEY]: { open: false },
	[DELETE_FOLDER_MODAL_KEY]: {
		open: false,
		activeId: null,
		data: {
			workflowListEventBus: undefined,
			content: {
				workflowCount: 0,
				subFolderCount: 0,
			},
		},
	},
	[DELETE_SECRETS_PROVIDER_MODAL_KEY]: { open: false },
	[DELETE_USER_MODAL_KEY]: {
		open: false,
		activeId: null,
	},
	[DUPLICATE_MODAL_KEY]: { open: false },
	[EXPERIMENT_TEMPLATE_RECO_V2_KEY]: {
		open: false,
		data: {
			nodeName: '',
		},
	},
	[EXPERIMENT_TEMPLATE_RECO_V3_KEY]: { open: false },
	[EXTERNAL_SECRETS_PROVIDER_MODAL_KEY]: { open: false },
	[FROM_AI_PARAMETERS_MODAL_KEY]: {
		open: false,
		data: {
			nodeName: undefined,
		},
	},
	[IMPORT_CURL_MODAL_KEY]: {
		open: false,
		data: {
			curlCommands: {},
		},
	},
	[IMPORT_WORKFLOW_URL_MODAL_KEY]: {
		open: false,
		data: {
			url: '',
		},
	},
	[INSTANCE_AI_CREDENTIAL_SETUP_MODAL_KEY]: { open: false },
	[INSTANCE_AI_TOOLS_CONNECTION_MODAL_KEY]: { open: false },
	[INVITE_USER_MODAL_KEY]: { open: false },
	[LOG_STREAM_MODAL_KEY]: {
		open: false,
		data: undefined,
	},
	[MFA_SETUP_MODAL_KEY]: { open: false },
	[MIGRATE_WORKFLOW_MODAL_KEY]: { open: false },
	[MOVE_FOLDER_MODAL_KEY]: {
		open: false,
		activeId: null,
		data: {
			workflowListEventBus: undefined,
		},
	},
	[NEW_ASSISTANT_SESSION_MODAL]: { open: false },
	[NPS_SURVEY_MODAL_KEY]: { open: false },
	[PERSONALIZATION_MODAL_KEY]: { open: false },
	[PROJECT_MOVE_RESOURCE_MODAL]: { open: false },
	[PROMPT_MFA_CODE_MODAL_KEY]: { open: false },
	[SECRETS_PROVIDER_CONNECTION_MODAL_KEY]: { open: false },
	[SETUP_CREDENTIALS_MODAL_KEY]: { open: false },
	[SOURCE_CONTROL_PULL_MODAL_KEY]: { open: false },
	[SOURCE_CONTROL_PULL_RESULT_MODAL_KEY]: { open: false },
	[SOURCE_CONTROL_PUSH_MODAL_KEY]: { open: false },
	[STOP_MANY_EXECUTIONS_MODAL_KEY]: { open: false, data: {} },
	[TAGS_MANAGER_MODAL_KEY]: { open: false },
	[TRIAL_INTRO_MODAL_KEY]: { open: false },
	[VARIABLE_MODAL_KEY]: { open: false },
	[VERSIONS_MODAL_KEY]: { open: false },
	[WHATS_NEW_MODAL_KEY]: {
		open: false,
		data: {
			articleId: undefined,
		},
	},
	[WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY]: {
		open: false,
		data: {
			triggerType: '',
			workflowName: '',
			workflowId: '',
			webhookPath: '',
			node: '',
		},
	},
	[WORKFLOW_ACTIVE_MODAL_KEY]: { open: false },
	[WORKFLOW_DESCRIPTION_MODAL_KEY]: { open: false },
	[WORKFLOW_DIFF_MODAL_KEY]: { open: false },
	[WORKFLOW_EXTRACTION_NAME_MODAL_KEY]: {
		open: false,
		data: {
			workflowName: '',
		},
	},
	[WORKFLOW_HISTORY_DIFF_MODAL_KEY]: { open: false },
	[WORKFLOW_HISTORY_NAME_VERSION_MODAL_KEY]: { open: false },
	[WORKFLOW_HISTORY_PUBLISH_MODAL_KEY]: { open: false },
	[WORKFLOW_HISTORY_VERSION_RESTORE]: { open: false },
	[WORKFLOW_HISTORY_VERSION_UNPUBLISH]: { open: false },
	[WORKFLOW_PUBLISH_MODAL_KEY]: { open: false },
	[WORKFLOW_SETTINGS_MODAL_KEY]: { open: false },
	[WORKFLOW_SHARE_MODAL_KEY]: { open: false },
});
