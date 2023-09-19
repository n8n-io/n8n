import { randFirstName, randLastName } from '@ngneat/falso';

export const BACKEND_BASE_URL = 'http://localhost:5678';
export const N8N_AUTH_COOKIE = 'n8n-auth';

const DEFAULT_USER_PASSWORD = 'CypressTest123';

export const INSTANCE_OWNER = {
	email: 'nathan@n8n.io',
	password: DEFAULT_USER_PASSWORD,
	firstName: randFirstName(),
	lastName: randLastName(),
};

export const INSTANCE_MEMBERS = [
	{
		email: 'rebecca@n8n.io',
		password: DEFAULT_USER_PASSWORD,
		firstName: randFirstName(),
		lastName: randLastName(),
	},
	{
		email: 'mustafa@n8n.io',
		password: DEFAULT_USER_PASSWORD,
		firstName: randFirstName(),
		lastName: randLastName(),
	},
];

export const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';
export const MANUAL_TRIGGER_NODE_DISPLAY_NAME = 'When clicking "Execute Workflow"';
export const SCHEDULE_TRIGGER_NODE_NAME = 'Schedule Trigger';
export const CODE_NODE_NAME = 'Code';
export const SET_NODE_NAME = 'Set';
export const EDIT_FIELDS_SET_NODE_NAME = 'Edit Fields';
export const IF_NODE_NAME = 'IF';
export const MERGE_NODE_NAME = 'Merge';
export const SWITCH_NODE_NAME = 'Switch';
export const GMAIL_NODE_NAME = 'Gmail';
export const TRELLO_NODE_NAME = 'Trello';
export const NOTION_NODE_NAME = 'Notion';
export const PIPEDRIVE_NODE_NAME = 'Pipedrive';
export const HTTP_REQUEST_NODE_NAME = 'HTTP Request';

export const META_KEY = Cypress.platform === 'darwin' ? '{meta}' : '{ctrl}';

export const NEW_GOOGLE_ACCOUNT_NAME = 'Gmail account';
export const NEW_TRELLO_ACCOUNT_NAME = 'Trello account';
export const NEW_NOTION_ACCOUNT_NAME = 'Notion account';
export const NEW_QUERY_AUTH_ACCOUNT_NAME = 'Query Auth account';
