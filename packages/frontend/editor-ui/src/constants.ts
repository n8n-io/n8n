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
} from '@/types';
import type { InjectionKey, MaybeRefOrGetter } from 'vue';

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
export const CREDENTIAL_EDIT_MODAL_KEY = 'editCredential';
export const API_KEY_CREATE_OR_EDIT_MODAL_KEY = 'createOrEditApiKey';
export const CREDENTIAL_SELECT_MODAL_KEY = 'selectCredential';
export const DELETE_USER_MODAL_KEY = 'deleteUser';
export const INVITE_USER_MODAL_KEY = 'inviteUser';
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const IMPORT_WORKFLOW_URL_MODAL_KEY = 'importWorkflowUrl';
export const TAGS_MANAGER_MODAL_KEY = 'tagsManager';
export const ANNOTATION_TAGS_MANAGER_MODAL_KEY = 'annotationTagsManager';
export const VERSIONS_MODAL_KEY = 'versions';
export const WORKFLOW_SETTINGS_MODAL_KEY = 'settings';
export const WORKFLOW_SHARE_MODAL_KEY = 'workflowShare';
export const PERSONALIZATION_MODAL_KEY = 'personalization';
export const CONTACT_PROMPT_MODAL_KEY = 'contactPrompt';
export const NODE_PINNING_MODAL_KEY = 'nodePinning';
export const NPS_SURVEY_MODAL_KEY = 'npsSurvey';
export const WORKFLOW_ACTIVE_MODAL_KEY = 'activation';
export const COMMUNITY_PACKAGE_INSTALL_MODAL_KEY = 'communityPackageInstall';
export const COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY = 'communityPackageManageConfirm';
export const IMPORT_CURL_MODAL_KEY = 'importCurl';
export const LOG_STREAM_MODAL_KEY = 'settingsLogStream';
export const SOURCE_CONTROL_PUSH_MODAL_KEY = 'sourceControlPush';
export const SOURCE_CONTROL_PULL_MODAL_KEY = 'sourceControlPull';
export const DEBUG_PAYWALL_MODAL_KEY = 'debugPaywall';
export const MFA_SETUP_MODAL_KEY = 'mfaSetup';
export const PROMPT_MFA_CODE_MODAL_KEY = 'promptMfaCode';
export const WORKFLOW_HISTORY_VERSION_RESTORE = 'workflowHistoryVersionRestore';
export const SETUP_CREDENTIALS_MODAL_KEY = 'setupCredentials';
export const PROJECT_MOVE_RESOURCE_MODAL = 'projectMoveResourceModal';
export const NEW_ASSISTANT_SESSION_MODAL = 'newAssistantSession';
export const EXTERNAL_SECRETS_PROVIDER_MODAL_KEY = 'externalSecretsProvider';
export const COMMUNITY_PLUS_ENROLLMENT_MODAL = 'communityPlusEnrollment';
export const DELETE_FOLDER_MODAL_KEY = 'deleteFolder';
export const MOVE_FOLDER_MODAL_KEY = 'moveFolder';
export const WORKFLOW_ACTIVATION_CONFLICTING_WEBHOOK_MODAL_KEY =
	'workflowActivationConflictingWebhook';
export const FROM_AI_PARAMETERS_MODAL_KEY = 'fromAiParameters';

export const COMMUNITY_PACKAGE_MANAGE_ACTIONS = {
	UNINSTALL: 'uninstall',
	UPDATE: 'update',
	VIEW_DOCS: 'view-documentation',
};

// breakpoints
export const BREAKPOINT_SM = 768;
export const BREAKPOINT_MD = 992;
export const BREAKPOINT_LG = 1200;
export const BREAKPOINT_XL = 1920;

export const N8N_IO_BASE_URL = 'https://api.n8n.io/api/';
export const DOCS_DOMAIN = 'docs.n8n.io';
export const BUILTIN_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/`;
export const BUILTIN_CREDENTIALS_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/builtin/credentials/`;
export const DATA_PINNING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-pinning/`;
export const DATA_EDITING_DOCS_URL = `https://${DOCS_DOMAIN}/data/data-editing/`;
export const SCHEMA_PREVIEW_DOCS_URL = `https://${DOCS_DOMAIN}/data/schema-preview/`;
export const MFA_DOCS_URL = `https://${DOCS_DOMAIN}/user-management/two-factor-auth/`;
export const NPM_COMMUNITY_NODE_SEARCH_API_URL = 'https://api.npms.io/v2/';
export const NPM_PACKAGE_DOCS_BASE_URL = 'https://www.npmjs.com/package/';
export const NPM_KEYWORD_SEARCH_URL =
	'https://www.npmjs.com/search?q=keywords%3An8n-community-node-package';
export const N8N_QUEUE_MODE_DOCS_URL = `https://${DOCS_DOMAIN}/hosting/scaling/queue-mode/`;
export const COMMUNITY_NODES_INSTALLATION_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/installation/gui-install/`;
export const COMMUNITY_NODES_RISKS_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/risks/`;
export const COMMUNITY_NODES_BLOCKLIST_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/community-nodes/blocklist/`;
export const CUSTOM_NODES_DOCS_URL = `https://${DOCS_DOMAIN}/integrations/creating-nodes/code/create-n8n-nodes-module/`;
export const EXPRESSIONS_DOCS_URL = `https://${DOCS_DOMAIN}/code-examples/expressions/`;
export const N8N_PRICING_PAGE_URL = 'https://n8n.io/pricing';
export const N8N_MAIN_GITHUB_REPO_URL = 'https://github.com/n8n-io/n8n';

export const NODE_INSERT_SPACER_BETWEEN_INPUT_GROUPS = false;
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
export const EVALUATION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.evaluationTrigger';
export const EVALUATION_DATASET_TRIGGER_NODE = 'n8n-nodes-base.dummyDatasetTrigger';

export const CREDENTIAL_ONLY_NODE_PREFIX = 'n8n-creds-base';
export const CREDENTIAL_ONLY_HTTP_NODE_VERSION = 4.1;

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
	NODE_CONNECTION_DROP: 'node_connection_drop',
	NOTICE_ERROR_MESSAGE: 'notice_error_message',
	CONTEXT_MENU: 'context_menu',
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
export const AI_UNCATEGORIZED_CATEGORY = 'Miscellaneous';
export const AI_CODE_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolCode';
export const AI_WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE = '@n8n/n8n-nodes-langchain.toolWorkflow';
export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';

// Node Connection Types
export const NODE_CONNECTION_TYPE_ALLOW_MULTIPLE: NodeConnectionType[] = [
	NodeConnectionTypes.AiTool,
	NodeConnectionTypes.Main,
];

// General
export const INSTANCE_ID_HEADER = 'n8n-instance-id';

/** PERSONALIZATION SURVEY */
export const EMAIL_KEY = 'email';
export const WORK_AREA_KEY = 'workArea';
export const FINANCE_WORK_AREA = 'finance';
export const IT_ENGINEERING_WORK_AREA = 'IT-Engineering';
export const PRODUCT_WORK_AREA = 'product';
export const SALES_BUSINESSDEV_WORK_AREA = 'sales-businessDevelopment';
export const SECURITY_WORK_AREA = 'security';

export const COMPANY_TYPE_KEY = 'companyType';
export const SAAS_COMPANY_TYPE = 'saas';
export const ECOMMERCE_COMPANY_TYPE = 'ecommerce';
export const EDUCATION_TYPE = 'education';
export const MSP_COMPANY_TYPE = 'msp';
export const DIGITAL_AGENCY_COMPANY_TYPE = 'digital-agency';
export const SYSTEMS_INTEGRATOR_COMPANY_TYPE = 'systems-integrator';
export const OTHER_COMPANY_TYPE = 'other';
export const PERSONAL_COMPANY_TYPE = 'personal';

export const COMPANY_INDUSTRY_EXTENDED_KEY = 'companyIndustryExtended';
export const OTHER_COMPANY_INDUSTRY_EXTENDED_KEY = 'otherCompanyIndustryExtended';
export const PHYSICAL_RETAIL_OR_SERVICES = 'physical-retail-or-services';
export const REAL_ESTATE_OR_CONSTRUCTION = 'real-estate-or-construction';
export const GOVERNMENT_INDUSTRY = 'government';
export const LEGAL_INDUSTRY = 'legal-industry';
export const MARKETING_INDUSTRY = 'marketing-industry';
export const MEDIA_INDUSTRY = 'media-industry';
export const MANUFACTURING_INDUSTRY = 'manufacturing-industry';
export const MSP_INDUSTRY = 'msp';
export const HEALTHCARE_INDUSTRY = 'healthcare';
export const FINANCE_INSURANCE_INDUSTRY = 'finance-insurance-industry';
export const IT_INDUSTRY = 'it-industry';
export const SECURITY_INDUSTRY = 'security-industry';
export const TELECOMS_INDUSTRY = 'telecoms';
export const OTHER_INDUSTRY_OPTION = 'other';

export const COMPANY_SIZE_KEY = 'companySize';
export const COMPANY_SIZE_20_OR_LESS = '<20';
export const COMPANY_SIZE_20_99 = '20-99';
export const COMPANY_SIZE_100_499 = '100-499';
export const COMPANY_SIZE_500_999 = '500-999';
export const COMPANY_SIZE_1000_OR_MORE = '1000+';
export const COMPANY_SIZE_PERSONAL_USE = 'personalUser';

export const MARKETING_AUTOMATION_GOAL_KEY = 'automationGoalSm';
export const MARKETING_AUTOMATION_LEAD_GENERATION_GOAL = 'lead-generation';
export const MARKETING_AUTOMATION_CUSTOMER_COMMUNICATION = 'customer-communication';
export const MARKETING_AUTOMATION_ACTIONS = 'actions';
export const MARKETING_AUTOMATION_AD_CAMPAIGN = 'ad-campaign';
export const MARKETING_AUTOMATION_REPORTING = 'reporting';
export const MARKETING_AUTOMATION_DATA_SYNCHING = 'data-syncing';
export const MARKETING_AUTOMATION_OTHER = 'other';

export const OTHER_MARKETING_AUTOMATION_GOAL_KEY = 'automationGoalSmOther';

export const CODING_SKILL_KEY = 'codingSkill';

export const AUTOMATION_BENEFICIARY_KEY = 'automationBeneficiary';
export const AUTOMATION_BENEFICIARY_SELF = 'myself';
export const AUTOMATION_BENEFICIARY_MY_TEAM = 'my-team';
export const AUTOMATION_BENEFICIARY_OTHER_TEAMS = 'other-teams';

export const USAGE_MODE_KEY = 'usageModes';
export const USAGE_MODE_CONNECT_TO_DB = 'connect-internal-db';
export const USAGE_MODE_BUILD_BE_SERVICES = 'build-be-services';
export const USAGE_MODE_MANIPULATE_FILES = 'manipulate-files';

export const REPORTED_SOURCE_KEY = 'reportedSource';
export const REPORTED_SOURCE_OTHER_KEY = 'reportedSourceOther';
export const REPORTED_SOURCE_GOOGLE = 'google';
export const REPORTED_SOURCE_TWITTER = 'twitter';
export const REPORTED_SOURCE_LINKEDIN = 'linkedin';
export const REPORTED_SOURCE_YOUTUBE = 'youtube';
export const REPORTED_SOURCE_FRIEND = 'friend';
export const REPORTED_SOURCE_PODCAST = 'podcast';
export const REPORTED_SOURCE_EVENT = 'event';
export const REPORTED_SOURCE_OTHER = 'other';

export const AUTOMATION_GOAL_KEY = 'automationGoal';
export const DEVOPS_AUTOMATION_GOAL_KEY = 'automationGoalDevops';
export const DEVOPS_AUTOMATION_GOAL_OTHER_KEY = 'automationGoalDevopsOther';
export const DEVOPS_AUTOMATION_OTHER = 'other';
export const DEVOPS_AUTOMATION_CI_CD_GOAL = 'ci-cd';
export const DEVOPS_AUTOMATION_CLOUD_INFRASTRUCTURE_ORCHESTRATION_GOAL =
	'cloud-infrastructure-orchestration';
export const DEVOPS_AUTOMATION_DATA_SYNCING_GOAL = 'data-syncing';
export const DEVOPS_INCIDENT_RESPONSE_GOAL = 'incident-response';
export const DEVOPS_MONITORING_AND_ALERTING_GOAL = 'monitoring-alerting';
export const DEVOPS_REPORTING_GOAL = 'reporting';
export const DEVOPS_TICKETING_SYSTEMS_INTEGRATIONS_GOAL = 'ticketing-systems-integrations';

export const CUSTOMER_INTEGRATIONS_GOAL = 'customer-integrations';
export const CUSTOMER_SUPPORT_GOAL = 'customer-support';
export const ENGINEERING_GOAL = 'engineering';
export const FINANCE_ACCOUNTING_GOAL = 'finance-accounting';
export const HR_GOAL = 'hr';
export const OPERATIONS_GOAL = 'operations';
export const PRODUCT_GOAL = 'product';
export const SALES_MARKETING_GOAL = 'sales-marketing';
export const SECURITY_GOAL = 'security';
export const OTHER_AUTOMATION_GOAL = 'other';
export const NOT_SURE_YET_GOAL = 'not-sure-yet';

export const ROLE_KEY = 'role';
export const ROLE_OTHER_KEY = 'roleOther';
export const ROLE_BUSINESS_OWNER = 'business-owner';
export const ROLE_CUSTOMER_SUPPORT = 'customer-support';
export const ROLE_DATA_SCIENCE = 'data-science';
export const ROLE_DEVOPS = 'devops';
export const ROLE_IT = 'it';
export const ROLE_ENGINEERING = 'engineering';
export const ROLE_SALES_AND_MARKETING = 'sales-and-marketing';
export const ROLE_SECURITY = 'security';
export const ROLE_OTHER = 'other';

/** END OF PERSONALIZATION SURVEY */

export const MODAL_CANCEL = 'cancel';
export const MODAL_CONFIRM = 'confirm';
export const MODAL_CLOSE = 'close';

export const ILLEGAL_FOLDER_CHARACTERS = [
	'[',
	']',
	'^',
	'\\',
	'/',
	':',
	'*',
	'?',
	'"',
	'<',
	'>',
	'|',
];
export const FOLDER_NAME_ILLEGAL_CHARACTERS_REGEX = new RegExp(
	`[${ILLEGAL_FOLDER_CHARACTERS.map((char) => {
		return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}).join('')}]`,
);

export const FOLDER_NAME_ONLY_DOTS_REGEX = /^\.+$/;
export const FOLDER_NAME_MAX_LENGTH = 100;
export const VALID_EMAIL_REGEX =
	/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const VALID_WORKFLOW_IMPORT_URL_REGEX = /^http[s]?:\/\/.*\.json$/i;
export const LOCAL_STORAGE_ACTIVATION_FLAG = 'N8N_HIDE_ACTIVATION_ALERT';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG = 'N8N_PIN_DATA_DISCOVERY_NDV';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG = 'N8N_PIN_DATA_DISCOVERY_CANVAS';
export const LOCAL_STORAGE_MAPPING_IS_ONBOARDED = 'N8N_MAPPING_ONBOARDED';
export const LOCAL_STORAGE_AUTOCOMPLETE_IS_ONBOARDED = 'N8N_AUTOCOMPLETE_ONBOARDED';
export const LOCAL_STORAGE_TABLE_HOVER_IS_ONBOARDED = 'N8N_TABLE_HOVER_ONBOARDED';
export const LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH = 'N8N_MAIN_PANEL_RELATIVE_WIDTH';
export const LOCAL_STORAGE_ACTIVE_MODAL = 'N8N_ACTIVE_MODAL';
export const LOCAL_STORAGE_THEME = 'N8N_THEME';
export const LOCAL_STORAGE_EXPERIMENT_OVERRIDES = 'N8N_EXPERIMENT_OVERRIDES';
export const LOCAL_STORAGE_HIDE_GITHUB_STAR_BUTTON = 'N8N_HIDE_HIDE_GITHUB_STAR_BUTTON';
export const LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE = 'N8N_NDV_INPUT_PANEL_DISPLAY_MODE';
export const LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE = 'N8N_NDV_OUTPUT_PANEL_DISPLAY_MODE';
export const LOCAL_STORAGE_LOGS_PANEL_OPEN = 'N8N_LOGS_PANEL_OPEN';
export const LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL = 'N8N_LOGS_DETAILS_PANEL';
export const LOCAL_STORAGE_WORKFLOW_LIST_PREFERENCES_KEY = 'N8N_WORKFLOWS_LIST_PREFERENCES';
export const BASE_NODE_SURVEY_URL = 'https://n8n-community.typeform.com/to/BvmzxqYv#nodename=';
export const COMMUNITY_PLUS_DOCS_URL =
	'https://docs.n8n.io/hosting/community-edition-features/#registered-community-edition';

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
	EVALUATION_RUNS_COMPARE = 'EvaluationRunsCompare',
	EVALUATION_RUNS_DETAIL = 'EvaluationRunsDetail',
	USAGE = 'Usage',
	LOG_STREAMING_SETTINGS = 'LogStreamingSettingsView',
	SSO_SETTINGS = 'SSoSettings',
	EXTERNAL_SECRETS_SETTINGS = 'ExternalSecretsSettings',
	SAML_ONBOARDING = 'SamlOnboarding',
	SOURCE_CONTROL = 'SourceControl',
	MFA_VIEW = 'MfaView',
	WORKFLOW_HISTORY = 'WorkflowHistory',
	WORKER_VIEW = 'WorkerView',
	PROJECTS = 'Projects',
	PROJECTS_WORKFLOWS = 'ProjectsWorkflows',
	PROJECTS_CREDENTIALS = 'ProjectsCredentials',
	PROJECT_SETTINGS = 'ProjectSettings',
	PROJECTS_EXECUTIONS = 'ProjectsExecutions',
	FOLDERS = 'Folders',
	PROJECTS_FOLDERS = 'ProjectsFolders',
	INSIGHTS = 'Insights',
	SHARED_WITH_ME = 'SharedWithMe',
	SHARED_WORKFLOWS = 'SharedWorkflows',
	SHARED_CREDENTIALS = 'SharedCredentials',
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
	SWITCH_NODE_VIEW_VERSION = 'switch-node-view-version',
	RENAME = 'rename',
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
	SourceControl: 'sourceControl',
	ExternalSecrets: 'externalSecrets',
	AuditLogs: 'auditLogs',
	DebugInEditor: 'debugInEditor',
	WorkflowHistory: 'workflowHistory',
	WorkerView: 'workerView',
	AdvancedPermissions: 'advancedPermissions',
	ApiKeyScopes: 'apiKeyScopes',
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

export const EVALUATION_TRIGGER = {
	name: '031-evaluation-trigger',
	control: 'control',
	variant: 'variant',
};

export const EASY_AI_WORKFLOW_EXPERIMENT = {
	name: '026_easy_ai_workflow',
	control: 'control',
	variant: 'variant',
};

export const AI_CREDITS_EXPERIMENT = {
	name: '027_free_openai_calls',
	control: 'control',
	variant: 'variant',
};

export const WORKFLOW_BUILDER_EXPERIMENT = {
	name: '30_workflow_builder',
	control: 'control',
	variant: 'variant',
};

export const EXPERIMENTS_TO_TRACK = [
	EASY_AI_WORKFLOW_EXPERIMENT.name,
	AI_CREDITS_EXPERIMENT.name,
	WORKFLOW_BUILDER_EXPERIMENT.name,
];

export const WORKFLOW_EVALUATION_EXPERIMENT = '025_workflow_evaluation';

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
	BASE_WEBSITE_URL: 'https://n8n.io/workflows',
	UTM_QUERY: {
		utm_source: 'n8n_app',
		utm_medium: 'template_library',
	},
};

export const ROLE = {
	Owner: 'global:owner',
	Member: 'global:member',
	Admin: 'global:admin',
	Default: 'default', // default user with no email when setting up instance
} as const;

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
export const IsInPiPWindowSymbol = 'IsInPipWindow' as unknown as InjectionKey<
	MaybeRefOrGetter<boolean>
>;

/** Auth */
export const BROWSER_ID_STORAGE_KEY = 'n8n-browserId';

export const APP_MODALS_ELEMENT_ID = 'app-modals';

export const AI_NODES_PACKAGE_NAME = '@n8n/n8n-nodes-langchain';

export const AI_ASSISTANT_MAX_CONTENT_LENGTH = 100; // in kilobytes
