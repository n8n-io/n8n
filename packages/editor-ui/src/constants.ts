export const MAX_WORKFLOW_SIZE = 16777216; // Workflow size limit in bytes
export const MAX_WORKFLOW_PINNED_DATA_SIZE = 12582912; // Workflow pinned data size limit in bytes
export const MAX_DISPLAY_DATA_SIZE = 204800;
export const MAX_DISPLAY_ITEMS_AUTO_ALL = 250;
export const NODE_NAME_PREFIX = 'node-';

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
export const CREDENTIAL_LIST_MODAL_KEY = 'credentialsList';
export const PERSONALIZATION_MODAL_KEY = 'personalization';
export const CONTACT_PROMPT_MODAL_KEY = 'contactPrompt';
export const VALUE_SURVEY_MODAL_KEY = 'valueSurvey';
export const EXECUTIONS_MODAL_KEY = 'executions';
export const WORKFLOW_ACTIVE_MODAL_KEY = 'activation';
export const COMMUNITY_PACKAGE_INSTALL_MODAL_KEY = 'communityPackageInstall';
export const COMMUNITY_PACKAGE_CONFIRM_MODAL_KEY = 'communityPackageManageConfirm';

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
export const DATA_PINNING_DOCS_URL = 'https://docs.n8n.io/data/data-pinning/';
export const NPM_COMMUNITY_NODE_SEARCH_API_URL = `https://api.npms.io/v2/`;
export const NPM_PACKAGE_DOCS_BASE_URL = `https://www.npmjs.com/package/`;
export const NPM_KEYWORD_SEARCH_URL = `https://www.npmjs.com/search?q=keywords%3An8n-community-node-package`;
export const N8N_QUEUE_MODE_DOCS_URL = `https://docs.n8n.io/hosting/scaling/queue-mode/`;
export const COMMUNITY_NODES_INSTALLATION_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/installation/`;
export const COMMUNITY_NODES_RISKS_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/risks/`;
export const COMMUNITY_NODES_BLOCKLIST_DOCS_URL = `https://docs.n8n.io/integrations/community-nodes/blocklist/`;
export const CUSTOM_NODES_DOCS_URL = `https://docs.n8n.io/integrations/creating-nodes/code/create-n8n-nodes-module/`;

// node types
export const BAMBOO_HR_NODE_TYPE = 'n8n-nodes-base.bambooHr';
export const CALENDLY_TRIGGER_NODE_TYPE = 'n8n-nodes-base.calendlyTrigger';
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
export const HIDDEN_NODES = [START_NODE_TYPE];

export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';

// General
export const INSTANCE_ID_HEADER = 'n8n-instance-id';
export const WAIT_TIME_UNLIMITED = '3000-01-01T00:00:00.000Z';

export const WORK_AREA_KEY = 'workArea';
export const FINANCE_WORK_AREA = 'finance';
export const IT_ENGINEERING_WORK_AREA = 'IT-Engineering';
export const PRODUCT_WORK_AREA = 'product';
export const SALES_BUSINESSDEV_WORK_AREA = 'sales-businessDevelopment';
export const SECURITY_WORK_AREA = 'security';

export const COMPANY_TYPE_KEY = 'companyType';
export const SAAS_COMPANY_TYPE = 'saas';
export const ECOMMERCE_COMPANY_TYPE = 'ecommerce';
export const MSP_COMPANY_TYPE = 'msp';
export const DIGITAL_AGENCY_COMPANY_TYPE = 'digital-agency';
export const AUTOMATION_AGENCY_COMPANY_TYPE = 'automation-agency';
export const SYSTEMS_INTEGRATOR_COMPANY_TYPE = 'systems-integrator';
export const OTHER_COMPANY_TYPE = 'other';
export const PERSONAL_COMPANY_TYPE = 'personal';

export const CUSTOMER_TYPE_KEY = 'customerType';
export const INDIVIDUAL_CUSTOMER_TYPE = 'individual';
export const SMALL_CUSTOMER_TYPE = 'small';
export const MEDIUM_CUSTOMER_TYPE = 'medium';
export const LARGE_CUSTOMER_TYPE = 'large';

export const MSP_FOCUS_KEY = 'mspFocus';
export const MSP_FOCUS_OTHER_KEY = 'mspFocusOther';
export const CLOUD_INFRA_FOCUS = 'cloud-infra';
export const IT_SUPPORT_FOCUS = 'it-support';
export const NETWORKING_COMMUNICATION_FOCUS = 'networking-communication';
export const SECURITY_FOCUS = 'security';
export const OTHER_FOCUS = 'other';

export const COMPANY_INDUSTRY_EXTENDED_KEY = 'companyIndustryExtended';
export const OTHER_COMPANY_INDUSTRY_EXTENDED_KEY = 'otherCompanyIndustryExtended';
export const EDUCATION_INDUSTRY = 'education';
export const PHYSICAL_RETAIL_OR_SERVICES = 'physical-retail-or-services';
export const REAL_ESTATE_OR_CONSTRUCTION = 'real-estate-or-construction';
export const GOVERNMENT_INDUSTRY = 'government';
export const LEGAL_INDUSTRY = 'legal-industry';
export const MARKETING_INDUSTRY = 'marketing-industry';
export const MEDIA_INDUSTRY = 'media-industry';
export const MANUFACTURING_INDUSTRY = 'manufacturing-industry';
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

export const CODING_SKILL_KEY = 'codingSkill';

export const AUTOMATION_GOAL_KEY = 'automationGoal';
export const AUTOMATION_GOAL_OTHER_KEY = 'otherAutomationGoal';
export const CUSTOMER_INTEGRATIONS_GOAL = 'customer-integrations';
export const CUSTOMER_SUPPORT_GOAL = 'customer-support';
export const FINANCE_ACCOUNTING_GOAL = 'finance-accounting';
export const HR_GOAL = 'hr';
export const OPERATIONS_GOAL = 'operations';
export const PRODUCT_GOAL = 'product';
export const SALES_MARKETING_GOAL = 'sales-marketing';
export const SECURITY_GOAL = 'security';
export const OTHER_AUTOMATION_GOAL = 'other';
export const NOT_SURE_YET_GOAL = 'not-sure-yet';

export const MODAL_CANCEL = 'cancel';
export const MODAL_CLOSE = 'close';
export const MODAL_CONFIRMED = 'confirmed';

export const VALID_EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export const LOCAL_STORAGE_ACTIVATION_FLAG = 'N8N_HIDE_ACTIVATION_ALERT';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_NDV_FLAG = 'N8N_PIN_DATA_DISCOVERY_NDV';
export const LOCAL_STORAGE_PIN_DATA_DISCOVERY_CANVAS_FLAG = 'N8N_PIN_DATA_DISCOVERY_CANVAS';
export const LOCAL_STORAGE_MAPPING_FLAG = 'N8N_MAPPING_ONBOARDED';
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
	COMMUNITY_NODES = "CommunityNodes",
}

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
export const MAPPING_PARAMS = [`$evaluateExpression`, `$item`, `$jmespath`, `$node`, `$binary`, `$data`, `$env`, `$json`, `$now`, `$parameters`, `$position`, `$resumeWebhookUrl`, `$runIndex`, `$today`, `$workflow`, '$parameter'];

export const DEFAULT_STICKY_HEIGHT = 160;
export const DEFAULT_STICKY_WIDTH = 240;
