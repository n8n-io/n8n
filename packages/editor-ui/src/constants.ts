export const MAX_DISPLAY_DATA_SIZE = 204800;
export const MAX_DISPLAY_ITEMS_AUTO_ALL = 250;
export const NODE_NAME_PREFIX = 'node-';

// workflows
export const PLACEHOLDER_EMPTY_WORKFLOW_ID = '__EMPTY__';
export const DEFAULT_NEW_WORKFLOW_NAME = 'My workflow';
export const MIN_WORKFLOW_NAME_LENGTH = 1;
export const MAX_WORKFLOW_NAME_LENGTH = 128;
export const DUPLICATE_POSTFFIX = ' copy';

// tags
export const MAX_TAG_NAME_LENGTH = 24;
export const DUPLICATE_MODAL_KEY = 'duplicate';
export const TAGS_MANAGER_MODAL_KEY = 'tagsManager';
export const WORKLOW_OPEN_MODAL_KEY = 'workflowOpen';
export const VERSIONS_MODAL_KEY = 'versions';

// breakpoints
export const BREAKPOINT_SM = 768;
export const BREAKPOINT_MD = 992;
export const BREAKPOINT_LG = 1200;
export const BREAKPOINT_XL = 1920;


// templates
export const TEMPLATES_BASE_URL = `https://api.n8n.io/`;
export const START_NODE_TYPE = 'n8n-nodes-base.start';

// Node creator
export const CORE_NODES_CATEGORY = 'Core Nodes';
export const CUSTOM_NODES_CATEGORY = 'Custom Nodes';
export const SUBCATEGORY_DESCRIPTIONS: {
	[category: string]: { [subcategory: string]: string };
} = {
	'Core Nodes': {
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
export const HIDDEN_NODES = ['n8n-nodes-base.start'];
export const WEBHOOK_NODE_NAME = 'n8n-nodes-base.webhook';
export const HTTP_REQUEST_NODE_NAME = 'n8n-nodes-base.httpRequest';
export const REQUEST_NODE_FORM_URL = 'https://n8n-community.typeform.com/to/K1fBVTZ3';

// General
export const INSTANCE_ID_HEADER = 'n8n-instance-id';