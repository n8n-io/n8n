import type { NodeMcpPocBinding, NodeMcpPocEndpoint } from './node-mcp-poc.types';

const PROJECT_ID = process.env.N8N_PROJECT_ID ?? 'REPLACE_WITH_PROJECT_ID';
const USER_ID = process.env.N8N_USER_ID ?? 'REPLACE_WITH_USER_ID';
const GMAIL_CREDENTIAL_ID =
	process.env.N8N_GMAIL_CREDENTIAL_ID ?? 'REPLACE_WITH_GMAIL_CREDENTIAL_ID';
const SLACK_CREDENTIAL_ID =
	process.env.N8N_SLACK_CREDENTIAL_ID ?? 'REPLACE_WITH_SLACK_CREDENTIAL_ID';
const GOOGLE_SHEETS_CREDENTIAL_ID =
	process.env.N8N_GOOGLE_SHEETS_CREDENTIAL_ID ?? 'REPLACE_WITH_GOOGLE_SHEETS_CREDENTIAL_ID';
const NOTION_CREDENTIAL_ID =
	process.env.N8N_NOTION_CREDENTIAL_ID ?? 'REPLACE_WITH_NOTION_CREDENTIAL_ID';

const GMAIL_BINDING: NodeMcpPocBinding = {
	nodeType: 'n8n-nodes-base.gmail',
	nodeVersion: 2.2,
	projectId: PROJECT_ID,
	userId: USER_ID,
	credentials: {
		gmailOAuth2: { id: GMAIL_CREDENTIAL_ID, name: 'POC Gmail' },
	},
	fixedParameters: { authentication: 'oAuth2' },
};

const GOOGLE_SHEETS_BINDING: NodeMcpPocBinding = {
	nodeType: 'n8n-nodes-base.googleSheets',
	nodeVersion: 4.7,
	projectId: PROJECT_ID,
	userId: USER_ID,
	credentials: {
		googleSheetsOAuth2Api: {
			id: GOOGLE_SHEETS_CREDENTIAL_ID,
			name: 'POC Google Sheets',
		},
	},
	fixedParameters: { authentication: 'oAuth2' },
};

const NOTION_BINDING: NodeMcpPocBinding = {
	nodeType: 'n8n-nodes-base.notion',
	nodeVersion: 3,
	projectId: PROJECT_ID,
	userId: USER_ID,
	credentials: {
		notionApi: { id: NOTION_CREDENTIAL_ID, name: 'POC Notion' },
	},
	fixedParameters: { authentication: 'apiKey' },
};

/**
 * Development-only POC bindings. Replace the placeholder IDs locally before
 * invoking tools. Credential secrets are never stored here.
 */
export const NODE_MCP_POC_ENDPOINTS: readonly NodeMcpPocEndpoint[] = [
	{
		endpoint: 'eval-json-schema-generic-batch',
		type: 'json-schema',
		binding: GOOGLE_SHEETS_BINDING,
		flavor: { resolver: 'generic-batch', hideOptions: false },
	},
	{
		endpoint: 'eval-action-lookup',
		type: 'action-lookup',
		bindings: [GOOGLE_SHEETS_BINDING],
	},
	{
		endpoint: 'eval-gmail-json-schema-generic-batch',
		type: 'json-schema',
		binding: GMAIL_BINDING,
		flavor: { resolver: 'generic-batch', hideOptions: false },
	},
	{
		endpoint: 'eval-gmail-action-lookup',
		type: 'action-lookup',
		bindings: [GMAIL_BINDING],
	},
	{
		endpoint: 'eval-notion-action-lookup',
		type: 'action-lookup',
		bindings: [NOTION_BINDING],
	},
	{
		endpoint: 'json-schema-generic-batch-gmail',
		type: 'json-schema',
		binding: GMAIL_BINDING,
		flavor: { resolver: 'generic-batch', hideOptions: false },
	},
	{
		endpoint: 'json-schema-generic-single-slack',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.slack',
			nodeVersion: 2.5,
			projectId: PROJECT_ID,
			userId: USER_ID,
			credentials: {
				slackOAuth2Api: { id: SLACK_CREDENTIAL_ID, name: 'POC Slack' },
			},
			fixedParameters: { authentication: 'oAuth2' },
		},
		flavor: { resolver: 'generic-single', hideOptions: false },
	},
	{
		endpoint: 'json-schema-generic-batch-google-sheets',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.googleSheets',
			nodeVersion: 4.7,
			projectId: PROJECT_ID,
			userId: USER_ID,
			credentials: {
				googleSheetsOAuth2Api: {
					id: GOOGLE_SHEETS_CREDENTIAL_ID,
					name: 'POC Google Sheets',
				},
			},
			fixedParameters: { authentication: 'oAuth2' },
		},
		flavor: { resolver: 'generic-batch', hideOptions: false },
	},
	{
		endpoint: 'action-lookup',
		type: 'action-lookup',
		bindings: [
			GMAIL_BINDING,
			{
				nodeType: 'n8n-nodes-base.slack',
				nodeVersion: 2.5,
				projectId: PROJECT_ID,
				userId: USER_ID,
				credentials: {
					slackOAuth2Api: { id: SLACK_CREDENTIAL_ID, name: 'POC Slack' },
				},
				fixedParameters: { authentication: 'oAuth2' },
			},
			{
				nodeType: 'n8n-nodes-base.googleSheets',
				nodeVersion: 4.7,
				projectId: PROJECT_ID,
				userId: USER_ID,
				credentials: {
					googleSheetsOAuth2Api: {
						id: GOOGLE_SHEETS_CREDENTIAL_ID,
						name: 'POC Google Sheets',
					},
				},
				fixedParameters: { authentication: 'oAuth2' },
			},
		],
	},
];
