export const MAX_WORKFLOW_SIZE = 16777216; // Workflow size limit in bytes
export const MAX_WORKFLOW_PINNED_DATA_SIZE = 12582912; // Workflow pinned data size limit in bytes
export const MAX_DISPLAY_DATA_SIZE = 204800;
export const MAX_DISPLAY_ITEMS_AUTO_ALL = 250;

export const PLACEHOLDER_FILLED_AT_EXECUTION_TIME = '[filled at execution time]';

// parameter input
export const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';

// workflows
export const PLACEHOLDER_EMPTY_WORKFLOW_ID = '__EMPTY__';
export const DEFAULT_NODETYPE_VERSION = 1;
export const DEFAULT_NEW_WORKFLOW_NAME = 'My workflow';
export const MIN_WORKFLOW_NAME_LENGTH = 1;
export const MAX_WORKFLOW_NAME_LENGTH = 128;
export const DUPLICATE_POSTFFIX = ' copy';
export const NODE_OUTPUT_DEFAULT_KEY = '_NODE_OUTPUT_DEFAULT_KEY_';
export const QUICKSTART_NOTE_NAME = '_QUICKSTART_NOTE_';

// tags
export const MAX_TAG_NAME_LENGTH = 24;

// modals
export const ABOUT_MODAL_KEY = 'about';
export const CHANGE_PASSWORD_MODAL_KEY = 'changePassword';
export const CREDENTIAL_EDIT_MODAL_KEY = 'editCredential';
export const CREDENTIAL_SELECT_MODAL_KEY = 'selectCredential';
export const DELETE_USER_MODAL_KEY = 'deleteUser';
export const INVITE_USER_MODAL_KEY = 'inviteUser';
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const TAGS_MANAGER_MODAL_KEY = 'tagsManager';
export const WORKFLOW_OPEN_MODAL_KEY = 'workflowOpen';
export const VERSIONS_MODAL_KEY = 'versions';
export const WORKFLOW_SETTINGS_MODAL_KEY = 'settings';
export const PERSONALIZATION_MODAL_KEY = 'personalization';
export const CONTACT_PROMPT_MODAL_KEY = 'contactPrompt';
export const VALUE_SURVEY_MODAL_KEY = 'valueSurvey';
export const EXECUTIONS_MODAL_KEY = 'executions';
export const WORKFLOW_ACTIVE_MODAL_KEY = 'activation';
export const ONBOARDING_CALL_SIGNUP_MODAL_KEY = 'onboardingCallSignup';
export const COMMUNITY_PACKAGE_INSTALL_MODAL_KEY = 'communityPackageInstall';
export const COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY = 'communityPackageManageConfirm';
export const IMPORT_CURL_MODAL_KEY = 'importCurl';

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

export const N8N_IO_BASE_URL = `https://api.n8n.io/api/`;
export const BUILTIN_NODES_DOCS_URL = `https://docs.n8n.io/integrations/builtin/`;
export const BUILTIN_CREDENTIALS_DOCS_URL = `https://docs.n8n.io/integrations/builtin/credentials/`;
export const DATA_PINNING_DOCS_URL = 'https://docs.n8n.io/data/data-pinning/';
export const DATA_EDITING_DOCS_URL = 'https://docs.n8n.io/data/data-editing/';
export const NPM_COMMUNITY_NODE_SEARCH_API_URL = `https://api.npms.io/v2/`;
export const NPM_PACKAGE_DOCS_BASE_URL = `https://www.npmjs.com/package/`;
export const NPM_KEYWORD_SEARCH_URL = `https://www.npmjs.com/search?q=keywords%3An8n-community-node-package`;
export const N8N_QUEUE_MODE_DOCS_URL = `https://docs.n8n.io/hosting/scaling/queue-mode/`;
export const COMMUNITY_NODES_INSTALLATION_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/installation/`;
export const COMMUNITY_NODES_NPM_INSTALLATION_URL = 'https://docs.npmjs.com/downloading-and-installing-node-js-and-npm';
export const COMMUNITY_NODES_RISKS_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/risks/`;
export const COMMUNITY_NODES_BLOCKLIST_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/blocklist/`;
export const CUSTOM_NODES_DOCS_URL = `https://docs.n8n.io/integrations/creating-nodes/code/create-n8n-nodes-module/`;


// node types
export const BAMBOO_HR_NODE_TYPE = 'n8n-nodes-base.bambooHr';
export const CALENDLY_TRIGGER_NODE_TYPE = 'n8n-nodes-base.calendlyTrigger';
export const CODE_NODE_TYPE = 'n8n-nodes-base.code';
export const CRON_NODE_TYPE = 'n8n-nodes-base.cron';
export const CLEARBIT_NODE_TYPE = 'n8n-nodes-base.clearbit';
export const FUNCTION_NODE_TYPE = 'n8n-nodes-base.function';
export const GITHUB_TRIGGER_NODE_TYPE = 'n8n-nodes-base.githubTrigger';
export const GOOGLE_SHEETS_NODE_TYPE = 'n8n-nodes-base.googleSheets';
export const ERROR_TRIGGER_NODE_TYPE = 'n8n-nodes-base.errorTrigger';
export const ELASTIC_SECURITY_NODE_TYPE = 'n8n-nodes-base.elasticSecurity';
export const EMAIL_SEND_NODE_TYPE = 'n8n-nodes-base.emailSend';
export const EXECUTE_COMMAND_NODE_TYPE = 'n8n-nodes-base.executeCommand';
export const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
export const HUBSPOT_TRIGGER_NODE_TYPE = 'n8n-nodes-base.hubspotTrigger';
export const IF_NODE_TYPE = 'n8n-nodes-base.if';
export const INTERVAL_NODE_TYPE = 'n8n-nodes-base.interval';
export const ITEM_LISTS_NODE_TYPE = 'n8n-nodes-base.itemLists';
export const JIRA_NODE_TYPE = 'n8n-nodes-base.jira';
export const JIRA_TRIGGER_NODE_TYPE = 'n8n-nodes-base.jiraTrigger';
export const MICROSOFT_EXCEL_NODE_TYPE = 'n8n-nodes-base.microsoftExcel';
export const MICROSOFT_TEAMS_NODE_TYPE = 'n8n-nodes-base.microsoftTeams';
export const NO_OP_NODE_TYPE = 'n8n-nodes-base.noOp';
export const STICKY_NODE_TYPE = 'n8n-nodes-base.stickyNote';
export const NOTION_TRIGGER_NODE_TYPE = 'n8n-nodes-base.notionTrigger';
export const PAGERDUTY_NODE_TYPE = 'n8n-nodes-base.pagerDuty';
export const SALESFORCE_NODE_TYPE = 'n8n-nodes-base.salesforce';
export const SEGMENT_NODE_TYPE = 'n8n-nodes-base.segment';
export const SET_NODE_TYPE = 'n8n-nodes-base.set';
export const SERVICENOW_NODE_TYPE = 'n8n-nodes-base.serviceNow';
export const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
export const SPREADSHEET_FILE_NODE_TYPE = 'n8n-nodes-base.spreadsheetFile';
export const SPLIT_IN_BATCHES_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
export const START_NODE_TYPE = 'n8n-nodes-base.start';
export const SWITCH_NODE_TYPE = 'n8n-nodes-base.switch';
export const THE_HIVE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.theHiveTrigger';
export const QUICKBOOKS_NODE_TYPE = 'n8n-nodes-base.quickbooks';
export const WEBHOOK_NODE_TYPE = 'n8n-nodes-base.webhook';
export const WORKABLE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.workableTrigger';
export const WOOCOMMERCE_TRIGGER_NODE_TYPE = 'n8n-nodes-base.wooCommerceTrigger';
export const XERO_NODE_TYPE = 'n8n-nodes-base.xero';
export const ZENDESK_NODE_TYPE = 'n8n-nodes-base.zendesk';
export const ZENDESK_TRIGGER_NODE_TYPE = 'n8n-nodes-base.zendeskTrigger';

export const MULTIPLE_OUTPUT_NODE_TYPES = [
	IF_NODE_TYPE,
	SWITCH_NODE_TYPE,
];

export const PIN_DATA_NODE_TYPES_DENYLIST = [
	...MULTIPLE_OUTPUT_NODE_TYPES,
	SPLIT_IN_BATCHES_NODE_TYPE,
];

// Node creator
export const CORE_NODES_CATEGORY = 'Core Nodes';
export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
export const SUBCATEGORY_DESCRIPTIONS: {
	[category: string]: { [subcategory: string]: string };
} = {
	'Core Nodes': { // this - all subkeys are set from codex
		Flow: 'Branches, core triggers, merge data',
		Files:  'Work with CSV, XML, text, images etc.',
		'Data Transformation': 'Manipulate data fields, run code',
		Helpers: 'HTTP Requests (API calls), date and time, scrape HTML',
	},
};
export const REGULAR_NODE_FILTER = 'Regular';
export const TRIGGER_NODE_FILTER = 'Trigger';
export const ALL_NODE_FILTER = 'All';
export const UNCATEGORIZED_CATEGORY = 'Miscellaneous';
export const UNCATEGORIZED_SUBCATEGORY = 'Helpers';
export const PERSONALIZED_CATEGORY = 'Suggested Nodes';

export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';

// General
export const INSTANCE_ID_HEADER = 'n8n-instance-id';
export const WAIT_TIME_UNLIMITED = '3000-01-01T00:00:00.000Z';

/** PERSONALIZATION SURVEY */
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
export const HEALTHCARE_INDUSTRY= 'healthcare';
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

export const USAGE_MODE_KEY = 'usageModes';
export const USAGE_MODE_CONNECT_TO_DB = 'connect-internal-db';
export const USAGE_MODE_BUILD_BE_SERVICES = 'build-be-services';
export const USAGE_MODE_MANIPULATE_FILES = 'manipulate-files';

export const AUTOMATION_GOAL_KEY = 'automationGoal';
export const AUTOMATION_GOAL_OTHER_KEY = 'otherAutomationGoal';
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

/** END OF PERSONALIZATION SURVEY */

export const MODAL_CANCEL = 'cancel';
export const MODAL_CLOSE = 'close';
export const MODAL_CONFIRMED = 'confirmed';

export const VALID_EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const LOCAL_STORAGE_ACTIVATION_FLAG = 'N8N_HIDE_ACTIVATION_ALERT';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG = 'N8N_PIN_DATA_DISCOVERY_NDV';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG = 'N8N_PIN_DATA_DISCOVERY_CANVAS';
export const LOCAL_STORAGE_MAPPING_FLAG = 'N8N_MAPPING_ONBOARDED';
export const LOCAL_STORAGE_MAIN_PANEL_RELATIVE_WIDTH = 'N8N_MAIN_PANEL_RELATIVE_WIDTH';
export const BASE_NODE_SURVEY_URL = 'https://n8n-community.typeform.com/to/BvmzxqYv#nodename=';

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

Love n8n? Help us build the future of automation! https://n8n.io/careers
`;

export const TEMPLATES_NODES_FILTER = [
	'n8n-nodes-base.start',
	'n8n-nodes-base.respondToWebhook',
];

export enum VIEWS {
	HOMEPAGE = "Homepage",
	COLLECTION = "TemplatesCollectionView",
	EXECUTION = "ExecutionById",
	TEMPLATE = "TemplatesWorkflowView",
	TEMPLATES = "TemplatesSearchView",
	CREDENTIALS = "CredentialsView",
	NEW_WORKFLOW = "NodeViewNew",
	WORKFLOW = "NodeViewExisting",
	DEMO = "WorkflowDemo",
	TEMPLATE_IMPORT = "WorkflowTemplate",
	SIGNIN = "SigninView",
	SIGNUP = "SignupView",
	SETUP = "SetupView",
	FORGOT_PASSWORD = "ForgotMyPasswordView",
	CHANGE_PASSWORD = "ChangePasswordView",
	USERS_SETTINGS = "UsersSettings",
	PERSONAL_SETTINGS = "PersonalSettings",
	API_SETTINGS = "APISettings",
	NOT_FOUND = "NotFoundView",
	FAKE_DOOR = "ComingSoon",
	COMMUNITY_NODES = "CommunityNodes",
	WORKFLOWS = "WorkflowsView",
}

export enum FAKE_DOOR_FEATURES {
	ENVIRONMENTS = 'environments',
	LOGGING = 'logging',
	SHARING = 'sharing',
}

export const ONBOARDING_PROMPT_TIMEBOX = 14;
export const FIRST_ONBOARDING_PROMPT_TIMEOUT = 300000;

export const TEST_PIN_DATA = [
	{
		name: "First item",
		code: 1,
	},
	{
		name: "Second item",
		code: 2,
	},
];
export const MAPPING_PARAMS = [
	'$binary',
	'$data',
	'$env',
	'$evaluateExpression',
	'$execution',
	'$input',
	'$item',
	'$jmespath',
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
	'$workflow',
];

export const DEFAULT_STICKY_HEIGHT = 160;
export const DEFAULT_STICKY_WIDTH = 240;

export enum WORKFLOW_MENU_ACTIONS {
	DUPLICATE = 'duplicate',
	DOWNLOAD = 'download',
	IMPORT_FROM_URL = 'import-from-url',
	IMPORT_FROM_FILE = 'import-from-file',
	SETTINGS = 'settings',
	DELETE = 'delete',
}

/**
 * Enterprise edition
 */
export enum EnterpriseEditionFeature {
	Sharing = 'sharing',
}
export const MAIN_NODE_PANEL_WIDTH = 360;

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
	'ftp': 'FTP',
	'ftps': 'FTP',
	'ldap': 'LDAP',
	'ldaps': 'LDAP',
	'mqtt': 'MQTT',
	'imap': 'IMAP',
	'imaps': 'IMAP',
};
