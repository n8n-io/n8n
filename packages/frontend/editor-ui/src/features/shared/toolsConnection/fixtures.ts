import type {
	AgentConnectionItem,
	DataStoreConnectionItem,
	McpServerConnectionItem,
	NodeConnectionItem,
	ToolConnectionItem,
	WorkflowConnectionItem,
} from './types';

const ICON = {
	notion: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png',
	slack: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
	github: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg',
	gmail: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
	linear: 'https://cdn.simpleicons.org/linear/5E6AD2',
	googleDrive:
		'https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg',
	openai: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
	gemini: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg',
	googleSheets:
		'https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg',
} as const;

const connectedNotion: McpServerConnectionItem = {
	id: 'mcp-notion',
	kind: 'mcp-server',
	title: 'Notion',
	description: 'Connect to the Notion MCP Server',
	iconSource: { type: 'file', src: ICON.notion },
	isConnected: true,
	credentials: [{ authType: 'mcpOAuth2Api', credentialId: 'cred-notion-1', required: true }],
	settings: {
		inclusionMode: 'except',
		selectedTools: [],
		excludedTools: ['notion.update-database'],
	},
	longDescription:
		'Notion MCP helps you plug tools into your Notion workspace, allowing you to create, edit, search and organize content directly from n8n. Get contextual and relevant assistance from n8n, while keeping knowledge organized in Notion.',
	publisher: { name: 'Notion', url: 'https://www.notion.so' },
	version: '1.24',
	docsUrl: 'https://developers.notion.com/',
	availableTools: [
		{
			id: 'notion.search',
			name: 'search',
			category: 'read',
			description: 'Search across the connected workspace.',
		},
		{
			id: 'notion.fetch',
			name: 'fetch',
			category: 'read',
			description: 'Fetch a page or block by id.',
		},
		{
			id: 'notion.read-page',
			name: 'read-page',
			category: 'read',
			description: 'Read the contents of a Notion page.',
		},
		{
			id: 'notion.move-pages',
			name: 'move-pages',
			category: 'read',
			description: 'Move pages between parents.',
		},
		{
			id: 'notion.duplicate-page',
			name: 'duplicate-page',
			category: 'read',
			description: 'Duplicate a page.',
		},
		{
			id: 'notion.query-database',
			name: 'query-database',
			category: 'read',
			description: 'Query rows from a Notion database.',
		},
		{
			id: 'notion.create-pages',
			name: 'create-pages',
			category: 'write',
			description: 'Create new pages.',
		},
		{
			id: 'notion.update-page',
			name: 'update-page',
			category: 'write',
			description: 'Update properties on a Notion page.',
		},
		{
			id: 'notion.create-database',
			name: 'create-database',
			category: 'write',
			description: 'Create a new database.',
		},
		{
			id: 'notion.update-database',
			name: 'update-database',
			category: 'write',
			description: 'Update a database schema.',
		},
	],
};

const connectedSlack: McpServerConnectionItem = {
	id: 'mcp-slack',
	kind: 'mcp-server',
	title: 'Slack',
	description: 'Connect to the Slack MCP Server',
	iconSource: { type: 'file', src: ICON.slack },
	isConnected: true,
	credentials: [{ authType: 'httpBearerAuth', credentialId: 'cred-slack-1', required: true }],
	longDescription:
		'The Slack MCP server connects an n8n agent to a Slack workspace so it can read recent channel history and post messages on behalf of a user.',
	publisher: { name: 'Slack', url: 'https://slack.com' },
	version: '0.9',
	docsUrl: 'https://api.slack.com/',
	availableTools: [
		{ id: 'slack.list-channels', name: 'list-channels', category: 'read' },
		{ id: 'slack.history', name: 'channel-history', category: 'read' },
		{ id: 'slack.send-message', name: 'send-message', category: 'write' },
	],
};

const availableGithub: McpServerConnectionItem = {
	id: 'mcp-github',
	kind: 'mcp-server',
	title: 'GitHub',
	description: 'Connect to the GitHub MCP Server',
	iconSource: { type: 'file', src: ICON.github },
	isConnected: false,
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	longDescription:
		'The GitHub MCP server lets agents triage issues, draft pull requests, and run common repository workflows from inside n8n.',
	publisher: { name: 'GitHub', url: 'https://github.com' },
	version: '0.3',
	docsUrl: 'https://docs.github.com/en/rest',
	availableTools: [
		{ id: 'github.list-issues', name: 'list-issues', category: 'read' },
		{ id: 'github.get-pr', name: 'get-pr', category: 'read' },
		{ id: 'github.create-pr', name: 'create-pr', category: 'write' },
	],
};

const availableGmail: McpServerConnectionItem = {
	id: 'mcp-gmail',
	kind: 'mcp-server',
	title: 'Gmail',
	description: 'Connect to the Gmail MCP Server',
	iconSource: { type: 'file', src: ICON.gmail },
	isConnected: false,
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	availableTools: [
		{ id: 'gmail.send', name: 'send-email', category: 'write' },
		{ id: 'gmail.search', name: 'search', category: 'read' },
	],
};

const availableLinear: McpServerConnectionItem = {
	id: 'mcp-linear',
	kind: 'mcp-server',
	title: 'Linear',
	description: 'Connect to the Linear MCP Server',
	iconSource: { type: 'file', src: ICON.linear },
	isConnected: false,
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	availableTools: [
		{ id: 'linear.list-issues', name: 'list-issues', category: 'read' },
		{ id: 'linear.create-issue', name: 'create-issue', category: 'write' },
	],
};

const availableGoogleDrive: McpServerConnectionItem = {
	id: 'mcp-google-drive',
	kind: 'mcp-server',
	title: 'Google Drive',
	description: 'Connect to the Google Drive MCP Server',
	iconSource: { type: 'file', src: ICON.googleDrive },
	isConnected: false,
	credentials: [{ authType: 'mcpOAuth2Api', required: true }],
	availableTools: [{ id: 'drive.list-files', name: 'list-files', category: 'read' }],
};

const availableHttp: McpServerConnectionItem = {
	id: 'mcp-http',
	kind: 'mcp-server',
	title: 'HTTP Request',
	description: 'Connect to the HTTP Request MCP Server',
	isConnected: false,
	credentials: [{ authType: 'httpBearerAuth', required: true }],
	availableTools: [{ id: 'http.fetch', name: 'fetch', category: 'read' }],
};

const availableOpenAi: NodeConnectionItem = {
	id: 'node-openai',
	kind: 'node',
	title: 'OpenAI',
	description: 'Message an assistant or GPT, analyze images, generate audio, etc.',
	iconSource: { type: 'file', src: ICON.openai },
	isConnected: false,
	nodeTypeName: '@n8n/n8n-nodes-langchain.openAi',
	credentials: [{ authType: 'openAiApi', required: true }],
	longDescription:
		"Talk to OpenAI from inside an agent run — message an assistant, transcribe audio, generate images, or call any of OpenAI's chat/completion endpoints. Best for one-off LLM calls inside multi-step flows; for the agent's primary model use the Model section instead.",
};

const availableMultiCredentialHttp: NodeConnectionItem = {
	id: 'node-http-multi',
	kind: 'node',
	title: 'HTTP Request',
	description: 'Make HTTP requests with OAuth2 or a bearer token.',
	isConnected: false,
	nodeTypeName: 'n8n-nodes-base.httpRequestTool',
	credentials: [
		{ authType: 'oAuth2Api', required: false },
		{ authType: 'httpBearerAuth', required: false },
	],
};

const availableGemini: NodeConnectionItem = {
	id: 'node-gemini',
	kind: 'node',
	title: 'Google Gemini',
	description: 'Interact with Google Gemini AI models.',
	iconSource: { type: 'file', src: ICON.gemini },
	isConnected: false,
	nodeTypeName: '@n8n/n8n-nodes-langchain.googleGemini',
};

const availableGoogleSheets: NodeConnectionItem = {
	id: 'node-google-sheets',
	kind: 'node',
	title: 'Google Sheets Tool',
	description: 'Read, update and write data to Google Sheets.',
	iconSource: { type: 'file', src: ICON.googleSheets },
	isConnected: false,
	nodeTypeName: 'n8n-nodes-base.googleSheetsTool',
	longDescription:
		'Read or write rows in a Google Sheet. The agent can append new rows, look up data by query, update existing values, and delete rows when asked. Best for tabular data that needs to be shared with a team or kept in sync with other Sheets-based tools.',
	credentials: [
		{ authType: 'googleApi', required: true },
		{ authType: 'googleSheetsOAuth2Api', required: false },
	],
};

const availableAgentCodeReviewer: AgentConnectionItem = {
	id: 'agent-code-reviewer',
	kind: 'agent',
	title: 'Code Reviewer',
	description: 'Reviews diffs and flags issues before merge.',
	isConnected: false,
	agentId: 'agent-1001',
};

const availableAgentDocWriter: AgentConnectionItem = {
	id: 'agent-doc-writer',
	kind: 'agent',
	title: 'Doc Writer',
	description: 'Drafts release notes from changelog entries.',
	isConnected: false,
	agentId: 'agent-1002',
};

const availableDataCustomers: DataStoreConnectionItem = {
	id: 'data-customers',
	kind: 'data-store',
	title: 'Customers database',
	description: 'Read or write customer rows and their related orders.',
	isConnected: false,
	dataStoreId: 'ds-customers',
};

const availableDataSalesCsv: DataStoreConnectionItem = {
	id: 'data-sales-csv',
	kind: 'data-store',
	title: 'Sales CSV',
	description: 'Monthly export of closed deals — read-only.',
	isConnected: false,
	dataStoreId: 'ds-sales-csv',
};

const availableWorkflowSummariser: WorkflowConnectionItem = {
	id: 'workflow-summariser',
	kind: 'workflow',
	title: 'Notion onboarding flow',
	isConnected: false,
	workflowId: 'wf-1234',
	longDescription:
		'Walks a new employee through their first day in Notion — fetches their profile, creates a starter task list, and posts a welcome message to the team channel.',
};

const availableWorkflowEmailParser: WorkflowConnectionItem = {
	id: 'workflow-email-parser',
	kind: 'workflow',
	title: 'Notion data extraction',
	isConnected: false,
	workflowId: 'wf-5678',
};

export const realisticItems: ToolConnectionItem[] = [
	connectedNotion,
	connectedSlack,
	availableGithub,
	availableGmail,
	availableLinear,
	availableGoogleDrive,
	availableHttp,
	availableOpenAi,
	availableMultiCredentialHttp,
	availableGemini,
	availableGoogleSheets,
	availableAgentCodeReviewer,
	availableAgentDocWriter,
	availableDataCustomers,
	availableDataSalesCsv,
	availableWorkflowSummariser,
	availableWorkflowEmailParser,
];

export const connectedMcpFixture = connectedNotion;

export const sampleCredentials = [
	makeFixtureCredential('cred-notion-1', 'mcpOAuth2Api', "Jake's Notion"),
	makeFixtureCredential('cred-notion-2', 'mcpOAuth2Api', "Giulio's Notion"),
	makeFixtureCredential('cred-notion-3', 'mcpOAuth2Api', "Bob's Notion"),
	makeFixtureCredential('cred-notion-4', 'mcpOAuth2Api', "Rob's Notion"),
	makeFixtureCredential('cred-slack-1', 'httpBearerAuth', "Jake's Slack token"),
	makeFixtureCredential('cred-slack-2', 'httpBearerAuth', 'Workspace Slack token'),
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeFixtureCredential(id: string, type: string, name: string): any {
	const now = new Date().toISOString();
	return {
		id,
		name,
		type,
		data: {},
		createdAt: now,
		updatedAt: now,
		isManaged: false,
	};
}

export function makeLargeMcpList(count: number): McpServerConnectionItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `mcp-generated-${index}`,
		kind: 'mcp-server' as const,
		title: `Synthetic MCP Server #${index + 1}`,
		description: `Connect to a fabricated MCP server for virtualization testing (${index + 1}).`,
		isConnected: false,
		credentials: [{ authType: 'httpBearerAuth', required: true }],
		availableTools: [
			{
				id: `mcp-generated-${index}.echo`,
				name: 'echo',
				category: 'read' as const,
				description: 'Returns its input.',
			},
		],
	}));
}
