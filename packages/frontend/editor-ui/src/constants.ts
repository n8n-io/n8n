import type {
	EnterpriseEditionFeatureKey,
	EnterpriseEditionFeatureValue,
	NodeCreatorOpenSource,
} from './Interface';
import type { NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	CanvasInjectionData,
	CanvasNodeHandleInjectionData,
	CanvasNodeInjectionData,
} from '@/features/workflows/canvas/canvas.types';
import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type { ExpressionLocalResolveContext } from './types/expressions';
import { DATA_TABLE_MODULE_NAME } from '@/features/core/dataTable/constants';
import type { TelemetryContext } from './types/telemetry';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import type { WorkflowState } from './composables/useWorkflowState';

export const MAX_WORKFLOW_SIZE = 1024 * 1024 * 16; // Workflow size limit in bytes
export const MAX_EXPECTED_REQUEST_SIZE = 2048; // Expected maximum workflow request metadata (i.e. headers) size in bytes
export const MAX_PINNED_DATA_SIZE = 1024 * 1024 * 12; // 12 MB; Workflow pinned data size limit in bytes
export const MAX_DISPLAY_DATA_SIZE = 1024 * 1024; // 1 MB
export const MAX_DISPLAY_DATA_SIZE_SCHEMA_VIEW = 1024 * 1024 * 4; // 4 MB
export const MAX_DISPLAY_ITEMS_AUTO_ALL = 250;

export const PLACEHOLDER_FILLED_AT_EXECUTION_TIME = '[filled at execution time]';

export const IN_PROGRESS_EXECUTION_ID = '__IN_PROGRESS__';

// parameter input
export const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';
export const CUSTOM_API_CALL_NAME = 'Custom API Call';

// workflows
export const PLACEHOLDER_EMPTY_WORKFLOW_ID = '__EMPTY__';
export const NEW_WORKFLOW_ID = 'new';
export const DEFAULT_NODETYPE_VERSION = 1;
export const DEFAULT_NEW_WORKFLOW_NAME = 'My workflow';
export const MIN_WORKFLOW_NAME_LENGTH = 1;
export const MAX_WORKFLOW_NAME_LENGTH = 128;
export const DUPLICATE_POSTFFIX = ' copy';
export const NODE_OUTPUT_DEFAULT_KEY = '_NODE_OUTPUT_DEFAULT_KEY_';
export const DEFAULT_WORKFLOW_PAGE_SIZE = 50;

// tags
export const MAX_TAG_NAME_LENGTH = 24;

// modals
export const ABOUT_MODAL_KEY = 'about';
export const CHAT_EMBED_MODAL_KEY = 'chatEmbed';
export const CHANGE_PASSWORD_MODAL_KEY = 'changePassword';
export const CONFIRM_PASSWORD_MODAL_KEY = 'confirmPassword';
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const IMPORT_WORKFLOW_URL_MODAL_KEY = 'importWorkflowUrl';
export const TAGS_MANAGER_MODAL_KEY = 'tagsManager';
export const ANNOTATION_TAGS_MANAGER_MODAL_KEY = 'annotationTagsManager';
export const VERSIONS_MODAL_KEY = 'versions';
export const WORKFLOW_SETTINGS_MODAL_KEY = 'settings';
export const WORKFLOW_SHARE_MODAL_KEY = 'workflowShare';
export const CONTACT_PROMPT_MODAL_KEY = 'contactPrompt';
export const NODE_PINNING_MODAL_KEY = 'nodePinning';
export const NPS_SURVEY_MODAL_KEY = 'npsSurvey';
export const WORKFLOW_ACTIVE_MODAL_KEY = 'activation';
export const IMPORT_CURL_MODAL_KEY = 'importCurl';
export const LOG_STREAM_MODAL_KEY = 'settingsLogStream';
export const MFA_SETUP_MODAL_KEY = 'mfaSetup';
export const PROMPT_MFA_CODE_MODAL_KEY = 'promptMfaCode';
export const WORKFLOW_HISTORY_VERSION_RESTORE = 'workflowHistoryVersionRestore';
export const SETUP_CREDENTIALS_MODAL_KEY = 'setupCredentials';
export const NEW_ASSISTANT_SESSION_MODAL = 'newAssistantSession';
export const EXTERNAL_SECRETS_PROVIDER_MODAL_KEY = 'externalSecretsProvider';
export const WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY =
	'workflowActivationConflictingWebhook';
export const FROM_AI_PARAMETERS_MODAL_KEY = 'fromAiParameters';
export const WORKFLOW_EXTRACTION_NAME_MODAL_KEY = 'workflowExtractionName';
export const WHATS_NEW_MODAL_KEY = 'whatsNew';
export const WORKFLOW_DIFF_MODAL_KEY = 'workflowDiff';
export const PRE_BUILT_AGENTS_MODAL_KEY = 'preBuiltAgents';
export const CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY = 'chatHubSideMenuDrawer';
export const EXPERIMENT_TEMPLATE_RECO_V2_KEY = 'templateRecoV2';
export const EXPERIMENT_TEMPLATE_RECO_V3_KEY = 'templateRecoV3';

// breakpoints
export const BREAKPOINT_SM = 768;
export const BREAKPOINT_MD = 992;
export const BREAKPOINT_LG = 1200;
export const BREAKPOINT_XL = 1920;

export const DOCS_DOMAIN = 'docs.n8n.io';
export const BUILTIN_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/`;
export const BUILTIN_CREDENTIALS_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/credentials/`;
export const DATA_PINNING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-pinning/`;
export const DATA_EDITING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-editing/`;
export const SCHEMA_PREVIEW_DOCS_URL = `https://${DOCS_DOMAIN}/data/schema-preview/`;
export const MFA_DOCS_URL = `https://${DOCS_DOMAIN}/user-management/two-factor-auth/`;
export const NPM_PACKAGE_DOCS_BASE_URL = 'https://www.npmjs.com/package/';
export const N8N_QUEUE_MODE_DOCS_URL = `https://${DOCS_DOMAIN}/hosting/scaling/queue-mode/`;
export const CUSTOM_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/creating-nodes/code/create-n8n-nodes-module/`;
export const EXPRESSIONS_DOCS_URL = `https://${DOCS_DOMAIN}/code-examples/expressions/`;
export const EVALUATIONS_DOCS_URL = `https://${DOCS_DOMAIN}/advanced-ai/evaluations/overview/`;
export const ERROR_WORKFLOW_DOCS_URL = `https://${DOCS_DOMAIN}/flow-logic/error-handling/#create-and-set-an-error-workflow`;
export const TIME_SAVED_DOCS_URL = `https://${DOCS_DOMAIN}/insights/#setting-the-time-saved-by-a-workflow`;
export const N8N_PRICING_PAGE_URL = 'https://n8n.io/pricing';
export const N8N_MAIN_GITHUB_REPO_URL = 'https://github.com/n8n-io/n8n';

export const NODE_MIN_INPUT_ITEMS_COUNT = 4;

// node types
export const BAMBOO_HR_NODE_TYPE = 'n8n-nodes-base.bambooHr';
export const CALENDLY_TRIGGER_NODE_TYPE = 'n8n-nodes-base.calendlyTrigger';
export const CODE_NODE_TYPE = 'n8n-nodes-base.code';
export const AI_CODE_NODE_TYPE = '@n8n/n8n-nodes-langchain.code';
export const AI_MCP_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpClientTool';
export const WIKIPEDIA_TOOL_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWikipedia';
export const CRON_NODE_TYPE = 'n8n-nodes-base.cron';
export const CLEARBIT_NODE_TYPE = 'n8n-nodes-base.clearbit';
export const FILTER_NODE_TYPE = 'n8n-nodes-base.filter';
export const FUNCTION_NODE_TYPE = 'n8n-nodes-base.function';
export const GITHUB_TRIGGER_NODE_TYPE = 'n8n-nodes-base.githubTrigger';
export const GIT_NODE_TYPE = 'n8n-nodes-base.git';
export const GOOGLE_GMAIL_NODE_TYPE = 'n8n-nodes-base.gmail';
export const GOOGLE_SHEETS_NODE_TYPE = 'n8n-nodes-base.googleSheets';
export const ERROR_TRIGGER_NODE_TYPE = 'n8n-nodes-base.errorTrigger';
export const ELASTIC_SECURITY_NODE_TYPE = 'n8n-nodes-base.elasticSecurity';
export const EMAIL_SEND_NODE_TYPE = 'n8n-nodes-base.emailSend';
export const EMAIL_IMAP_NODE_TYPE = 'n8n-nodes-base.emailReadImap';
export const EXECUTE_COMMAND_NODE_TYPE = 'n8n-nodes-base.executeCommand';
export const FORM_TRIGGER_NODE_TYPE = 'n8n-nodes-base.formTrigger';
export const HTML_NODE_TYPE = 'n8n-nodes-base.html';
export const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
export const HTTP_REQUEST_TOOL_NODE_TYPE = 'n8n-nodes-base.httpRequestTool';
export const HUBSPOT_TRIGGER_NODE_TYPE = 'n8n-nodes-base.hubspotTrigger';
export const IF_NODE_TYPE = 'n8n-nodes-base.if';
export const INTERVAL_NODE_TYPE = 'n8n-nodes-base.interval';
export const ITEM_LISTS_NODE_TYPE = 'n8n-nodes-base.itemLists';
export const JIRA_NODE_TYPE = 'n8n-nodes-base.jira';
export const JIRA_TRIGGER_NODE_TYPE = 'n8n-nodes-base.jiraTrigger';
export const MICROSOFT_EXCEL_NODE_TYPE = 'n8n-nodes-base.microsoftExcel';
export const MANUAL_TRIGGER_NODE_TYPE = 'n8n-nodes-base.manualTrigger';
export const MANUAL_CHAT_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.manualChatTrigger';
export const MCP_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.mcpTrigger';
export const CHAT_TRIGGER_NODE_TYPE = '@n8n/n8n-nodes-langchain.chatTrigger';
export const CHAT_NODE_TYPE = '@n8n/n8n-nodes-langchain.chat';
export const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
export const OPEN_AI_NODE_TYPE = '@n8n/n8n-nodes-langchain.openAi';
export const OPEN_AI_NODE_MESSAGE_ASSISTANT_TYPE =
	'@n8n/n8n-nodes-langchain.openAi.assistant.message';
export const OPEN_AI_ASSISTANT_NODE_TYPE = '@n8n/n8n-nodes-langchain.openAiAssistant';
export const BASIC_CHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.chainLlm';
export const QA_CHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.chainRetrievalQa';
export const MICROSOFT_TEAMS_NODE_TYPE = 'n8n-nodes-base.microsoftTeams';
export const N8N_NODE_TYPE = 'n8n-nodes-base.n8n';
export const NO_OP_NODE_TYPE = 'n8n-nodes-base.noOp';
export const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';
export const NOTION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.notionTrigger';
export const PAGERDUTY_NODE_TYPE = 'n8n-nodes-base.pagerDuty';
export const SALESFORCE_NODE_TYPE = 'n8n-nodes-base.salesforce';
export const SEGMENT_NODE_TYPE = 'n8n-nodes-base.segment';
export const SET_NODE_TYPE = 'n8n-nodes-base.set';
export const SCHEDULE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.scheduleTrigger';
export const SERVICENOW_NODE_TYPE = 'n8n-nodes-base.serviceNow';
export const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
export const SPREADSHEET_FILE_NODE_TYPE = 'n8n-nodes-base.spreadsheetFile';
export const SPLIT_IN_BATCHES_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
export const START_NODE_TYPE = 'n8n-nodes-base.start';
export const SWITCH_NODE_TYPE = 'n8n-nodes-base.switch';
export const TELEGRAM_NODE_TYPE = 'n8n-nodes-base.telegram';
export const THE_HIVE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.theHiveTrigger';
export const QUICKBOOKS_NODE_TYPE = 'n8n-nodes-base.quickbooks';
export const WAIT_NODE_TYPE = 'n8n-nodes-base.wait';
export const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';
export const WORKABLE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.workableTrigger';
export const WORKFLOW_TRIGGER_NODE_TYPE = 'n8n-nodes-base.workflowTrigger';
export const EXECUTE_WORKFLOW_NODE_TYPE = 'n8n-nodes-base.executeWorkflow';
export const EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE = 'n8n-nodes-base.executeWorkflowTrigger';
export const WOOCOMMERCE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.wooCommerceTrigger';
export const XERO_NODE_TYPE = 'n8n-nodes-base.xero';
export const ZENDESK_NODE_TYPE = 'n8n-nodes-base.zendesk';
export const ZENDESK_TRIGGER_NODE_TYPE = 'n8n-nodes-base.zendeskTrigger';
export const DISCORD_NODE_TYPE = 'n8n-nodes-base.discord';
export const EXTRACT_FROM_FILE_NODE_TYPE = 'n8n-nodes-base.extractFromFile';
export const CONVERT_TO_FILE_NODE_TYPE = 'n8n-nodes-base.convertToFile';
export const DATETIME_NODE_TYPE = 'n8n-nodes-base.dateTime';
export const REMOVE_DUPLICATES_NODE_TYPE = 'n8n-nodes-base.removeDuplicates';
export const SPLIT_OUT_NODE_TYPE = 'n8n-nodes-base.splitOut';
export const LIMIT_NODE_TYPE = 'n8n-nodes-base.limit';
export const SUMMARIZE_NODE_TYPE = 'n8n-nodes-base.summarize';
export const AGGREGATE_NODE_TYPE = 'n8n-nodes-base.aggregate';
export const MERGE_NODE_TYPE = 'n8n-nodes-base.merge';
export const MARKDOWN_NODE_TYPE = 'n8n-nodes-base.markdown';
export const XML_NODE_TYPE = 'n8n-nodes-base.xml';
export const CRYPTO_NODE_TYPE = 'n8n-nodes-base.crypto';
export const RSS_READ_NODE_TYPE = 'n8n-nodes-base.rssFeedRead';
export const COMPRESSION_NODE_TYPE = 'n8n-nodes-base.compression';
export const EDIT_IMAGE_NODE_TYPE = 'n8n-nodes-base.editImage';
export const CHAIN_SUMMARIZATION_LANGCHAIN_NODE_TYPE =
	'@n8n/n8n-nodes-langchain.chainSummarization';
export const SIMULATE_NODE_TYPE = 'n8n-nodes-base.simulate';
export const SIMULATE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.simulateTrigger';
export const AI_TRANSFORM_NODE_TYPE = 'n8n-nodes-base.aiTransform';
export const FORM_NODE_TYPE = 'n8n-nodes-base.form';
export const GITHUB_NODE_TYPE = 'n8n-nodes-base.github';
export const SLACK_TRIGGER_NODE_TYPE = 'n8n-nodes-base.slackTrigger';
export const TELEGRAM_TRIGGER_NODE_TYPE = 'n8n-nodes-base.telegramTrigger';
export const FACEBOOK_LEAD_ADS_TRIGGER_NODE_TYPE = 'n8n-nodes-base.facebookLeadAdsTrigger';
export const RESPOND_TO_WEBHOOK_NODE_TYPE = 'n8n-nodes-base.respondToWebhook';
export const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';
export const DATA_TABLE_TOOL_NODE_TYPE = 'n8n-nodes-base.dataTableTool';

export const CREDENTIAL_ONLY_NODE_PREFIX = 'n8n-creds-base';
export const CREDENTIAL_ONLY_HTTP_NODE_VERSION = 4.1;

// template categories
export const TEMPLATE_CATEGORY_AI = 'categories/ai';

export const DATA_TABLE_NODES = [DATA_TABLE_NODE_TYPE, DATA_TABLE_TOOL_NODE_TYPE];

export const EXECUTABLE_TRIGGER_NODE_TYPES = [
	START_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	CRON_NODE_TYPE,
	INTERVAL_NODE_TYPE,
];

export const NON_ACTIVATABLE_TRIGGER_NODE_TYPES = [
	ERROR_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
];

export const NODES_USING_CODE_NODE_EDITOR = [
	CODE_NODE_TYPE,
	AI_CODE_NODE_TYPE,
	AI_TRANSFORM_NODE_TYPE,
];
export const MODULE_ENABLED_NODES = [
	...DATA_TABLE_NODES.map((nodeType) => ({ nodeType, module: DATA_TABLE_MODULE_NAME })),
];

export const NODE_POSITION_CONFLICT_ALLOWLIST = [STICKY_NODE_TYPE];

export const PIN_DATA_NODE_TYPES_DENYLIST = [SPLIT_IN_BATCHES_NODE_TYPE, STICKY_NODE_TYPE];

export const OPEN_URL_PANEL_TRIGGER_NODE_TYPES = [
	WEBHOOK_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
];

export const SINGLE_WEBHOOK_TRIGGERS = [
	TELEGRAM_TRIGGER_NODE_TYPE,
	SLACK_TRIGGER_NODE_TYPE,
	FACEBOOK_LEAD_ADS_TRIGGER_NODE_TYPE,
];

export const LIST_LIKE_NODE_OPERATIONS = ['getAll', 'getMany', 'read', 'search'];

export const PRODUCTION_ONLY_TRIGGER_NODE_TYPES = [CHAT_TRIGGER_NODE_TYPE];

// Node creator
export const NODE_CREATOR_OPEN_SOURCES: Record<
	Uppercase<NodeCreatorOpenSource>,
	NodeCreatorOpenSource
> = {
	NO_TRIGGER_EXECUTION_TOOLTIP: 'no_trigger_execution_tooltip',
	PLUS_ENDPOINT: 'plus_endpoint',
	ADD_INPUT_ENDPOINT: 'add_input_endpoint',
	TRIGGER_PLACEHOLDER_BUTTON: 'trigger_placeholder_button',
	ADD_NODE_BUTTON: 'add_node_button',
	TAB: 'tab',
	NODE_CONNECTION_ACTION: 'node_connection_action',
	REPLACE_NODE_ACTION: 'replace_node_action',
	NODE_CONNECTION_DROP: 'node_connection_drop',
	NOTICE_ERROR_MESSAGE: 'notice_error_message',
	CONTEXT_MENU: 'context_menu',
	ADD_EVALUATION_NODE_BUTTON: 'add_evaluation_node_button',
	ADD_EVALUATION_TRIGGER_BUTTON: 'add_evaluation_trigger_button',
	TEMPLATES_CALLOUT: 'templates_callout',
	'': '',
};
export const CORE_NODES_CATEGORY = 'Core Nodes';
export const HUMAN_IN_THE_LOOP_CATEGORY = 'HITL';
export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
export const DEFAULT_SUBCATEGORY = '*';
export const AI_OTHERS_NODE_CREATOR_VIEW = 'AI Other';
export const AI_NODE_CREATOR_VIEW = 'AI';
export const REGULAR_NODE_CREATOR_VIEW = 'Regular';
export const TRIGGER_NODE_CREATOR_VIEW = 'Trigger';
export const OTHER_TRIGGER_NODES_SUBCATEGORY = 'Other Trigger Nodes';
export const TRANSFORM_DATA_SUBCATEGORY = 'Data Transformation';
export const FILES_SUBCATEGORY = 'Files';
export const FLOWS_CONTROL_SUBCATEGORY = 'Flow';
export const AI_SUBCATEGORY = 'AI';
export const HELPERS_SUBCATEGORY = 'Helpers';
export const HITL_SUBCATEGORY = 'Human in the Loop';
export const AI_CATEGORY_AGENTS = 'Agents';
export const AI_CATEGORY_CHAINS = 'Chains';
export const AI_CATEGORY_LANGUAGE_MODELS = 'Language Models';
export const AI_CATEGORY_MEMORY = 'Memory';
export const AI_CATEGORY_OUTPUTPARSER = 'Output Parsers';
export const AI_CATEGORY_TOOLS = 'Tools';
export const AI_CATEGORY_VECTOR_STORES = 'Vector Stores';
export const AI_CATEGORY_RETRIEVERS = 'Retrievers';
export const AI_CATEGORY_EMBEDDING = 'Embeddings';
export const AI_CATEGORY_DOCUMENT_LOADERS = 'Document Loaders';
export const AI_CATEGORY_TEXT_SPLITTERS = 'Text Splitters';
export const AI_CATEGORY_OTHER_TOOLS = 'Other Tools';
export const AI_CATEGORY_ROOT_NODES = 'Root Nodes';
export const AI_CATEGORY_MCP_NODES = 'Model Context Protocol';
export const AI_EVALUATION = 'Evaluation';
export const AI_UNCATEGORIZED_CATEGORY = 'Miscellaneous';
export const AI_CODE_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolCode';
export const AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';
export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';
export const PRE_BUILT_AGENTS_COLLECTION = 'pre-built-agents-collection';

// Node Connection Types
export const NODE_CONNECTION_TYPE_ALLOW_MULTIPLE: NodeConnectionType[] = [
	NodeConnectionTypes.AiTool,
	NodeConnectionTypes.Main,
];

// Data Types
export const DATA_TYPE_ICON_MAP = {
	['string']: 'type',
	['number']: 'hash',
	['boolean']: 'square-check',
	date: 'calendar',
	array: 'list',
	object: 'box',
	file: 'file',
} satisfies Record<string, IconName>;

export const MODAL_CANCEL = 'cancel';
export const MODAL_CONFIRM = 'confirm';
export const MODAL_CLOSE = 'close';

export const VALID_EMAIL_REGEX =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const VALID_WORKFLOW_IMPORT_URL_REGEX = /^https?:\/\/.+/i;
export const LOCAL_STORAGE_ACTIVATION_FLAG = 'N8N_HIDE_ACTIVATION_ALERT';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG = 'N8N_PIN_DATA_DISCOVERY_NDV';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG = 'N8N_PIN_DATA_DISCOVERY_CANVAS';
export const LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH = 'N8N_MAIN_PANEL_RELATIVE_WIDTH';
export const LOCAL_STORAGE_NDV_DIMENSIONS = 'N8N_NDV_DIMENSIONS';
export const LOCAL_STORAGE_ACTIVE_MODAL = 'N8N_ACTIVE_MODAL';
export const LOCAL_STORAGE_THEME = 'N8N_THEME';
export const LOCAL_STORAGE_EXPERIMENT_OVERRIDES = 'N8N_EXPERIMENT_OVERRIDES';
export const LOCAL_STORAGE_HIDE_GITHUB_STAR_BUTTON = 'N8N_HIDE_HIDE_GITHUB_STAR_BUTTON';
export const LOCAL_STORAGE_LOGS_PANEL_OPEN = 'N8N_LOGS_PANEL_OPEN';
export const LOCAL_STORAGE_TURN_OFF_WORKFLOW_SUGGESTIONS = 'N8N_TURN_OFF_WORKFLOW_SUGGESTIONS';
export const LOCAL_STORAGE_LOGS_SYNC_SELECTION = 'N8N_LOGS_SYNC_SELECTION_ENABLED';
export const LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL = 'N8N_LOGS_DETAILS_PANEL';
export const LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL_SUB_NODE = 'N8N_LOGS_DETAILS_PANEL_SUB_NODE';
export const LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY = 'N8N_WORKFLOWS_LIST_PREFERENCES';
export const LOCAL_STORAGE_READ_WHATS_NEW_ARTICLES = 'N8N_READ_WHATS_NEW_ARTICLES';
export const LOCAL_STORAGE_DISMISSED_WHATS_NEW_CALLOUT = 'N8N_DISMISSED_WHATS_NEW_CALLOUT';
export const LOCAL_STORAGE_FOCUS_PANEL = 'N8N_FOCUS_PANEL';
export const LOCAL_STORAGE_EXPERIMENTAL_DISMISSED_SUGGESTED_WORKFLOWS =
	'N8N_EXPERIMENTAL_DISMISSED_SUGGESTED_WORKFLOWS';
export const LOCAL_STORAGE_RUN_DATA_WORKER = 'N8N_RUN_DATA_WORKER';
export const LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL = (userId: string) =>
	`${userId}_N8N_CHAT_HUB_SELECTED_MODEL`;
export const LOCAL_STORAGE_CHAT_HUB_CREDENTIALS = (userId: string) =>
	`${userId}_N8N_CHAT_HUB_CREDENTIALS`;
export const LOCAL_STORAGE_CHAT_HUB_STATIC_SIDEBAR = (userId: string) =>
	`${userId}_N8N_CHAT_HUB_STATIC_SIDEBAR`;

export const BASE_NODE_SURVEY_URL = 'https://n8n-community.typeform.com/to/BvmzxqYv#nodename=';
export const RELEASE_NOTES_URL = 'https://docs.n8n.io/release-notes/';

export const HIRING_BANNER = `
                                                                    //////
                                                                 ///////////
                                                               /////      ////
                                               ///////////////////         ////
                                             //////////////////////       ////
     ///////               ///////          ////                /////////////
  ////////////          ////////////       ////                    ///////
 ////       ////       ////       ////    ////
/////        /////////////         //////////
 /////     ////       ////       ////     ////
  ////////////          ////////////       ////           ////////
    ///////                //////           ////        /////////////
                                             /////////////        ////
                                                //////////        ////
                                                       ////      ////
                                                        ///////////
                                                          //////

Love n8n? Help us build the future of automation! https://n8n.io/careers?utm_source=n8n_user&utm_medium=console_output
`;

export const TEMPLATES_NODES_FILTER = ['n8n-nodes-base.start', 'n8n-nodes-base.respondToWebhook'];

export const enum VIEWS {
	HOMEPAGE = 'Homepage',
	COLLECTION = 'TemplatesCollectionView',
	EXECUTIONS = 'Executions',
	EXECUTION_PREVIEW = 'ExecutionPreview',
	EXECUTION_DEBUG = 'ExecutionDebug',
	EXECUTION_HOME = 'ExecutionsLandingPage',
	TEMPLATE = 'TemplatesWorkflowView',
	TEMPLATE_SETUP = 'TemplatesWorkflowSetupView',
	TEMPLATES = 'TemplatesSearchView',
	CREDENTIALS = 'CredentialsView',
	VARIABLES = 'VariablesView',
	NEW_WORKFLOW = 'NodeViewNew',
	WORKFLOW = 'NodeViewExisting',
	DEMO = 'WorkflowDemo',
	TEMPLATE_IMPORT = 'WorkflowTemplate',
	WORKFLOW_ONBOARDING = 'WorkflowOnboarding',
	SIGNIN = 'SigninView',
	SIGNUP = 'SignupView',
	SIGNOUT = 'SignoutView',
	SETUP = 'SetupView',
	FORGOT_PASSWORD = 'ForgotMyPasswordView',
	CHANGE_PASSWORD = 'ChangePasswordView',
	SETTINGS = 'Settings',
	USERS_SETTINGS = 'UsersSettings',
	LDAP_SETTINGS = 'LdapSettings',
	PERSONAL_SETTINGS = 'PersonalSettings',
	API_SETTINGS = 'APISettings',
	NOT_FOUND = 'NotFoundView',
	COMMUNITY_NODES = 'CommunityNodes',
	WORKFLOWS = 'WorkflowsView',
	WORKFLOW_EXECUTIONS = 'WorkflowExecutions',
	EVALUATION = 'Evaluation',
	EVALUATION_EDIT = 'EvaluationEdit',
	EVALUATION_RUNS_DETAIL = 'EvaluationRunsDetail',
	USAGE = 'Usage',
	LOG_STREAMING_SETTINGS = 'LogStreamingSettingsView',
	SSO_SETTINGS = 'SSoSettings',
	EXTERNAL_SECRETS_SETTINGS = 'ExternalSecretsSettings',
	PROVISIONING_SETTINGS = 'ProvisioningSettings',
	SAML_ONBOARDING = 'SamlOnboarding',
	SOURCE_CONTROL = 'SourceControl',
	MFA_VIEW = 'MfaView',
	WORKFLOW_HISTORY = 'WorkflowHistory',
	WORKER_VIEW = 'WorkerView',
	PROJECTS = 'Projects',
	PROJECT_DETAILS = 'ProjectDetails',
	PROJECTS_WORKFLOWS = 'ProjectsWorkflows',
	PROJECTS_CREDENTIALS = 'ProjectsCredentials',
	PROJECT_SETTINGS = 'ProjectSettings',
	PROJECTS_EXECUTIONS = 'ProjectsExecutions',
	PROJECT_ROLES_SETTINGS = 'ProjectRolesSettingsView',
	PROJECT_ROLE_SETTINGS = 'ProjectRoleSettingsView',
	PROJECT_NEW_ROLE = 'ProjectNewRoleView',
	PROJECTS_VARIABLES = 'ProjectsVariables',
	HOME_VARIABLES = 'HomeVariables',
	FOLDERS = 'Folders',
	PROJECTS_FOLDERS = 'ProjectsFolders',
	INSIGHTS = 'Insights',
	SHARED_WITH_ME = 'SharedWithMe',
	SHARED_WORKFLOWS = 'SharedWorkflows',
	SHARED_CREDENTIALS = 'SharedCredentials',
	ENTITY_NOT_FOUND = 'EntityNotFound',
	ENTITY_UNAUTHORIZED = 'EntityUnAuthorized',
	PRE_BUILT_AGENT_TEMPLATES = 'PreBuiltAgentTemplates',
}

export const EDITABLE_CANVAS_VIEWS = [VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW, VIEWS.EXECUTION_DEBUG];

export const TEST_PIN_DATA = [
	{
		name: 'First item',
		code: 1,
	},
	{
		name: 'Second item',
		code: 2,
	},
];
export const MAPPING_PARAMS = [
	'$binary',
	'$data',
	'$env',
	'$evaluateExpression',
	'$execution',
	'$ifEmpty',
	'$input',
	'$item',
	'$jmespath',
	'$fromAI',
	'$json',
	'$node',
	'$now',
	'$parameter',
	'$parameters',
	'$position',
	'$prevNode',
	'$resumeWebhookUrl',
	'$runIndex',
	'$today',
	'$vars',
	'$workflow',
	'$nodeVersion',
];

export const DEFAULT_STICKY_HEIGHT = 160;
export const DEFAULT_STICKY_WIDTH = 240;

export const enum WORKFLOW_MENU_ACTIONS {
	DUPLICATE = 'duplicate',
	DOWNLOAD = 'download',
	IMPORT_FROM_URL = 'import-from-url',
	IMPORT_FROM_FILE = 'import-from-file',
	PUSH = 'push',
	SETTINGS = 'settings',
	DELETE = 'delete',
	ARCHIVE = 'archive',
	UNARCHIVE = 'unarchive',
	RENAME = 'rename',
	CHANGE_OWNER = 'change-owner',
}

/**
 * Enterprise edition
 */
export const EnterpriseEditionFeature: Record<
	EnterpriseEditionFeatureKey,
	EnterpriseEditionFeatureValue
> = {
	AdvancedExecutionFilters: 'advancedExecutionFilters',
	Sharing: 'sharing',
	Ldap: 'ldap',
	LogStreaming: 'logStreaming',
	Variables: 'variables',
	Saml: 'saml',
	Oidc: 'oidc',
	EnforceMFA: 'mfaEnforcement',
	SourceControl: 'sourceControl',
	ExternalSecrets: 'externalSecrets',
	AuditLogs: 'auditLogs',
	DebugInEditor: 'debugInEditor',
	WorkflowHistory: 'workflowHistory',
	WorkerView: 'workerView',
	AdvancedPermissions: 'advancedPermissions',
	ApiKeyScopes: 'apiKeyScopes',
	Provisioning: 'provisioning',
};

export const MAIN_NODE_PANEL_WIDTH = 390;

export const enum MAIN_HEADER_TABS {
	WORKFLOW = 'workflow',
	EXECUTIONS = 'executions',
	SETTINGS = 'settings',
	EVALUATION = 'evaluation',
}
export const CURL_IMPORT_NOT_SUPPORTED_PROTOCOLS = [
	'ftp',
	'ftps',
	'dict',
	'imap',
	'imaps',
	'ldap',
	'ldaps',
	'mqtt',
	'pop',
	'pop3s',
	'rtmp',
	'rtsp',
	'scp',
	'sftp',
	'smb',
	'smbs',
	'smtp',
	'smtps',
	'telnet',
	'tftp',
];

export const CURL_IMPORT_NODES_PROTOCOLS: { [key: string]: string } = {
	ftp: 'FTP',
	ftps: 'FTP',
	ldap: 'LDAP',
	ldaps: 'LDAP',
	mqtt: 'MQTT',
	imap: 'IMAP',
	imaps: 'IMAP',
};

export const enum SignInType {
	LDAP = 'ldap',
	EMAIL = 'email',
	OIDC = 'oidc',
}

export const N8N_SALES_EMAIL = 'sales@n8n.io';

export const N8N_CONTACT_EMAIL = 'contact@n8n.io';

export const EXPRESSION_EDITOR_PARSER_TIMEOUT = 15_000; // ms

export const KEEP_AUTH_IN_NDV_FOR_NODES = [
	HTTP_REQUEST_NODE_TYPE,
	HTTP_REQUEST_TOOL_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	WAIT_NODE_TYPE,
	DISCORD_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
];
export const MAIN_AUTH_FIELD_NAME = 'authentication';
export const NODE_RESOURCE_FIELD_NAME = 'resource';

export const CANVAS_ZOOMED_VIEW_EXPERIMENT = {
	name: 'canvas_zoomed_view',
	control: 'control',
	variant: 'variant',
};

export const NDV_IN_FOCUS_PANEL_EXPERIMENT = {
	name: 'ndv_in_focus_panel',
	control: 'control',
	variant: 'variant',
};

export const COMMAND_BAR_EXPERIMENT = {
	name: 'command_bar',
	control: 'control',
	variant: 'variant',
};

export const NDV_UI_OVERHAUL_EXPERIMENT = {
	name: '029_ndv_ui_overhaul',
	control: 'control',
	variant: 'variant',
};

export const WORKFLOW_BUILDER_RELEASE_EXPERIMENT = {
	name: '043_workflow_builder_release',
	control: 'control',
	variant: 'variant',
};

export const WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT = {
	name: '036_workflow_builder_agent',
	control: 'control',
	variant: 'variant',
};

export const EXTRA_TEMPLATE_LINKS_EXPERIMENT = {
	name: '034_extra_template_links',
	control: 'control',
	variant: 'variant',
};

export const TEMPLATE_ONBOARDING_EXPERIMENT = {
	name: '035_template_onboarding',
	control: 'control',
	variantStarterPack: 'variant-starter-pack',
	variantSuggestedTemplates: 'variant-suggested-templates',
};

export const BATCH_11AUG_EXPERIMENT = {
	name: '37_onboarding_experiments_batch_aug11',
	control: 'control',
	variantReadyToRun: 'variant-ready-to-run-workflows',
	variantReadyToRun2: 'variant-ready-to-run-workflows_v2',
	variantReadyToRun3: 'variant-ready-to-run-workflows_v3',
};

export const PRE_BUILT_AGENTS_EXPERIMENT = {
	name: '038_pre_built_agents',
	control: 'control',
	variant: 'variant',
};

export const TEMPLATE_RECO_V2 = {
	name: '039_template_onboarding_v2',
	control: 'control',
	variant: 'variant',
};

export const READY_TO_RUN_V2_EXPERIMENT = {
	name: '042_ready-to-run-worfklow_v2',
	control: 'control',
	variant1: 'variant-1-singlebox',
	variant2: 'variant-2-twoboxes',
};

export const READY_TO_RUN_V2_PART2_EXPERIMENT = {
	name: '045_ready-to-run-worfklow_v2-2',
	control: 'control',
	variant3: 'variant-3',
	variant4: 'variant-4',
};

export const PERSONALIZED_TEMPLATES_V3 = {
	name: '044_template_reco_v3',
	control: 'control',
	variant: 'variant',
};

export const PROJECT_VARIABLES_EXPERIMENT = {
	name: '046_project_variables',
	control: 'control',
	variant: 'variant',
};

export const EXPERIMENTS_TO_TRACK = [
	WORKFLOW_BUILDER_DEPRECATED_EXPERIMENT.name,
	WORKFLOW_BUILDER_RELEASE_EXPERIMENT.name,
	EXTRA_TEMPLATE_LINKS_EXPERIMENT.name,
	TEMPLATE_ONBOARDING_EXPERIMENT.name,
	NDV_UI_OVERHAUL_EXPERIMENT.name,
	BATCH_11AUG_EXPERIMENT.name,
	PRE_BUILT_AGENTS_EXPERIMENT.name,
	TEMPLATE_RECO_V2.name,
	PROJECT_VARIABLES_EXPERIMENT.name,
];

export const MFA_FORM = {
	MFA_TOKEN: 'MFA_TOKEN',
	MFA_RECOVERY_CODE: 'MFA_RECOVERY_CODE',
} as const;

export const MFA_AUTHENTICATION_REQUIRED_ERROR_CODE = 998;

export const MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED = 997;

export const MFA_AUTHENTICATION_CODE_INPUT_MAX_LENGTH = 6;

export const MFA_AUTHENTICATION_RECOVERY_CODE_INPUT_MAX_LENGTH = 36;

export const NODE_TYPES_EXCLUDED_FROM_OUTPUT_NAME_APPEND = [
	FILTER_NODE_TYPE,
	SWITCH_NODE_TYPE,
	REMOVE_DUPLICATES_NODE_TYPE,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
];

type ClearOutgoingConnectonsEvents = {
	[nodeName: string]: {
		parameterPaths: string[];
		eventTypes: string[];
	};
};

export const SHOULD_CLEAR_NODE_OUTPUTS: ClearOutgoingConnectonsEvents = {
	[SWITCH_NODE_TYPE]: {
		parameterPaths: ['parameters.rules.values'],
		eventTypes: ['optionsOrderChanged'],
	},
};

export const ALLOWED_HTML_ATTRIBUTES = ['href', 'name', 'target', 'title', 'class', 'id', 'style'];

export const ALLOWED_HTML_TAGS = [
	'p',
	'strong',
	'b',
	'code',
	'a',
	'br',
	'i',
	'ul',
	'li',
	'em',
	'small',
	'details',
	'summary',
	'mark',
];

export const CLOUD_CHANGE_PLAN_PAGE = window.location.host.includes('stage-app.n8n.cloud')
	? 'https://stage-app.n8n.cloud/account/change-plan'
	: 'https://app.n8n.cloud/account/change-plan';

export const CLOUD_TRIAL_CHECK_INTERVAL = 5000;

// A path that does not exist so that nothing is selected by default
export const nonExistingJsonPath = '_!^&*';

// Ask AI
export const ASK_AI_MAX_PROMPT_LENGTH = 600;
export const ASK_AI_MIN_PROMPT_LENGTH = 15;
export const ASK_AI_LOADING_DURATION_MS = 12000;
export const ASK_AI_SLIDE_OUT_DURATION_MS = 200;
export const PLAN_APPROVAL_MESSAGE = 'Proceed with the plan';

export const APPEND_ATTRIBUTION_DEFAULT_PATH = 'parameters.options.appendAttribution';

export const DRAG_EVENT_DATA_KEY = 'nodesAndConnections';

export const NOT_DUPLICATABLE_NODE_TYPES = [FORM_TRIGGER_NODE_TYPE];
export const UPDATE_WEBHOOK_ID_NODE_TYPES = [FORM_TRIGGER_NODE_TYPE];

export const CREATOR_HUB_URL = 'https://creators.n8n.io/hub';

/**
 * Units of time in milliseconds
 */
export const TIME = {
	SECOND: 1000,
	MINUTE: 60 * 1000,
	HOUR: 60 * 60 * 1000,
	DAY: 24 * 60 * 60 * 1000,
};

export const THREE_DAYS_IN_MILLIS = 3 * TIME.DAY;
export const SEVEN_DAYS_IN_MILLIS = 7 * TIME.DAY;
export const SIX_MONTHS_IN_MILLIS = 6 * 30 * TIME.DAY;

/**
 * Mouse button codes
 */

/**
 * Mapping for the MouseEvent.button property that indicates which button was pressed
 * on the mouse to trigger the event.
 *
 * @docs https://www.w3.org/TR/uievents/#dom-mouseevent-button
 */
export const MOUSE_EVENT_BUTTON = {
	PRIMARY: 0,
	MIDDLE: 1,
	SECONDARY: 2,
	BROWSER_BACK: 3,
	BROWSER_FORWARD: 4,
} as const;

/**
 * Mapping for the MouseEvent.buttons property that indicates which buttons are pressed
 * on the mouse when a mouse event is triggered. If multiple buttons are pressed,
 * the values are added together to produce a new number.
 *
 * @docs https://www.w3.org/TR/uievents/#dom-mouseevent-buttons
 */
export const MOUSE_EVENT_BUTTONS = {
	NONE: 0,
	PRIMARY: 1,
	SECONDARY: 2,
	MIDDLE: 4,
	BROWSER_BACK: 8,
	BROWSER_FORWARD: 16,
} as const;

/**
 * Urls used to route users to the right template repository
 */
export const TEMPLATES_URLS = {
	DEFAULT_API_HOST: 'https://api.n8n.io/api/',
	BASE_WEBSITE_URL: 'https://n8n.io/workflows/',
	UTM_QUERY: {
		utm_source: 'n8n_app',
		utm_medium: 'template_library',
	},
};

export const INSECURE_CONNECTION_WARNING = `
<body style="margin-top: 20px; font-family: 'Open Sans', sans-serif; text-align: center;">
<h1 style="font-size: 40px">&#x1F6AB;</h1>
<h2>Your n8n server is configured to use a secure cookie, <br/>however you are either visiting this via an insecure URL, or using Safari.
</h2>
<br/>
<div style="font-size: 18px; max-width: 640px; text-align: left; margin: 10px auto">
	To fix this, please consider the following options:
	<ul>
		<li>Setup TLS/HTTPS (<strong>recommended</strong>), or</li>
		<li>If you are running this locally, and not using Safari, try using <a href="http://localhost:5678">localhost</a> instead</li>
		<li>If you prefer to disable this security feature (<strong>not recommended</strong>), set the environment variable <code>N8N_SECURE_COOKIE</code> to <code>false</code></li>
	</ul>
</div>
</body>`;

/**
 * Injection Keys
 */

export const CanvasKey = 'canvas' as unknown as InjectionKey<CanvasInjectionData>;
export const CanvasNodeKey = 'canvasNode' as unknown as InjectionKey<CanvasNodeInjectionData>;
export const CanvasNodeHandleKey =
	'canvasNodeHandle' as unknown as InjectionKey<CanvasNodeHandleInjectionData>;
export const PopOutWindowKey: InjectionKey<Ref<Window | undefined>> = Symbol('PopOutWindow');
export const ExpressionLocalResolveContextSymbol: InjectionKey<
	ComputedRef<ExpressionLocalResolveContext | undefined>
> = Symbol('ExpressionLocalResolveContext');
export const TelemetryContextSymbol: InjectionKey<TelemetryContext> = Symbol('TelemetryContext');
export const WorkflowStateKey: InjectionKey<WorkflowState> = Symbol('WorkflowState');

export const APP_MODALS_ELEMENT_ID = 'app-modals';
export const CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID = 'cm-tooltip-container';

export const AI_NODES_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';

export const AI_ASSISTANT_MAX_CONTENT_LENGTH = 100; // in kilobytes

export const RUN_DATA_DEFAULT_PAGE_SIZE = 25;

/**
 * Performance Optimizations
 */

export const LOGS_EXECUTION_DATA_THROTTLE_DURATION = 1000;
export const CANVAS_EXECUTION_DATA_THROTTLE_DURATION = 500;

export const BINARY_DATA_ACCESS_TOOLTIP =
	"Specify the property name of the binary data in the input item or use an expression to access the binary data in previous nodes, e.g. {{ $('Target Node').item.binary.data }}";
