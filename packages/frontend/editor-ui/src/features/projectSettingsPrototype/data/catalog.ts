import { asset } from './assets';
import type { CatalogIcon, CredentialType, NodeType } from './types';

/** Icon files are n8n's own, bundled from `assets/catalog-icons`. */
const nodeIcon = (name: string, dark = false): CatalogIcon => ({
	file: asset(`catalog-icons/nodes/${name}.svg`),
	darkFile: dark ? asset(`catalog-icons/nodes/${name}.dark.svg`) : undefined,
});

const credentialIcon = (name: string, dark = false): CatalogIcon => ({
	file: asset(`catalog-icons/credentials/${name}.svg`),
	darkFile: dark ? asset(`catalog-icons/credentials/${name}.dark.svg`) : undefined,
});

const glyph = (name: string): CatalogIcon => ({ glyph: name });

export const NODE_TYPES: NodeType[] = [
	{ id: 'slack', name: 'Slack', icon: nodeIcon('slack'), category: 'Apps' },
	{ id: 'gmail', name: 'Gmail', icon: nodeIcon('gmail'), category: 'Apps' },
	{ id: 'google-sheets', name: 'Google Sheets', icon: nodeIcon('google-sheets'), category: 'Apps' },
	{ id: 'google-drive', name: 'Google Drive', icon: nodeIcon('google-drive'), category: 'Apps' },
	{
		id: 'google-calendar',
		name: 'Google Calendar',
		icon: nodeIcon('google-calendar'),
		category: 'Apps',
	},
	{ id: 'notion', name: 'Notion', icon: nodeIcon('notion', true), category: 'Apps' },
	{ id: 'airtable', name: 'Airtable', icon: nodeIcon('airtable'), category: 'Apps' },
	{ id: 'hubspot', name: 'HubSpot', icon: nodeIcon('hubspot'), category: 'Apps' },
	{ id: 'salesforce', name: 'Salesforce', icon: nodeIcon('salesforce'), category: 'Apps' },
	{ id: 'mailchimp', name: 'Mailchimp', icon: nodeIcon('mailchimp', true), category: 'Apps' },
	{ id: 'send-grid', name: 'SendGrid', icon: nodeIcon('send-grid'), category: 'Apps' },
	{ id: 'intercom', name: 'Intercom', icon: nodeIcon('intercom'), category: 'Apps' },
	{ id: 'zendesk', name: 'Zendesk', icon: nodeIcon('zendesk'), category: 'Apps' },
	{ id: 'asana', name: 'Asana', icon: nodeIcon('asana'), category: 'Apps' },
	{ id: 'jira', name: 'Jira Software', icon: nodeIcon('jira'), category: 'Apps' },
	{ id: 'linear', name: 'Linear', icon: nodeIcon('linear'), category: 'Apps' },
	{ id: 'github', name: 'GitHub', icon: nodeIcon('github', true), category: 'Apps' },
	{ id: 'gitlab', name: 'GitLab', icon: nodeIcon('gitlab'), category: 'Apps' },
	{
		id: 'microsoft-teams',
		name: 'Microsoft Teams',
		icon: nodeIcon('microsoft-teams'),
		category: 'Apps',
	},
	{
		id: 'microsoft-outlook',
		name: 'Microsoft Outlook',
		icon: nodeIcon('microsoft-outlook'),
		category: 'Apps',
	},
	{ id: 'discord', name: 'Discord', icon: nodeIcon('discord'), category: 'Apps' },
	{ id: 'telegram', name: 'Telegram', icon: nodeIcon('telegram'), category: 'Apps' },
	{ id: 'twilio', name: 'Twilio', icon: nodeIcon('twilio'), category: 'Apps' },
	{ id: 'stripe', name: 'Stripe', icon: nodeIcon('stripe'), category: 'Apps' },
	{ id: 'shopify', name: 'Shopify', icon: nodeIcon('shopify'), category: 'Apps' },
	{ id: 'quickbooks', name: 'QuickBooks Online', icon: nodeIcon('quickbooks'), category: 'Apps' },
	{ id: 'pager-duty', name: 'PagerDuty', icon: nodeIcon('pager-duty'), category: 'Apps' },
	{ id: 'sentry-io', name: 'Sentry.io', icon: nodeIcon('sentry-io', true), category: 'Apps' },
	{ id: 'postgres', name: 'Postgres', icon: nodeIcon('postgres'), category: 'Data' },
	{ id: 'my-sql', name: 'MySQL', icon: nodeIcon('my-sql', true), category: 'Data' },
	{ id: 'mongo-db', name: 'MongoDB', icon: nodeIcon('mongo-db'), category: 'Data' },
	{ id: 'redis', name: 'Redis', icon: nodeIcon('redis'), category: 'Data' },
	{ id: 'snowflake', name: 'Snowflake', icon: nodeIcon('snowflake'), category: 'Data' },
	{
		id: 'google-big-query',
		name: 'Google BigQuery',
		icon: nodeIcon('google-big-query'),
		category: 'Data',
	},
	{ id: 'aws-s3', name: 'AWS S3', icon: nodeIcon('aws-s3'), category: 'Data' },
	{
		id: 'aws-lambda',
		name: 'AWS Lambda',
		icon: nodeIcon('aws-lambda'),
		category: 'Developer tools',
	},
	{ id: 'open-ai', name: 'OpenAI', icon: nodeIcon('open-ai', true), category: 'AI' },
	{ id: 'anthropic', name: 'Anthropic', icon: nodeIcon('anthropic'), category: 'AI' },
	{ id: 'google-gemini', name: 'Google Gemini', icon: nodeIcon('google-gemini'), category: 'AI' },
	{ id: 'ai-agent', name: 'AI Agent', icon: glyph('robot'), category: 'AI' },
	{ id: 'http-request', name: 'HTTP Request', icon: nodeIcon('http-request'), category: 'Core' },
	{ id: 'webhook', name: 'Webhook', icon: nodeIcon('webhook'), category: 'Core' },
	{ id: 'code', name: 'Code', icon: nodeIcon('code'), category: 'Core' },
	{
		id: 'execute-command',
		name: 'Execute Command',
		icon: glyph('terminal'),
		category: 'Developer tools',
	},
	{ id: 'ssh', name: 'SSH', icon: glyph('terminal'), category: 'Developer tools' },
	{
		id: 'read-write-file',
		name: 'Read/Write Files from Disk',
		icon: nodeIcon('read-write-file'),
		category: 'Developer tools',
	},
];

export const CREDENTIAL_TYPES: CredentialType[] = [
	{ id: 'slack-oauth2', name: 'Slack OAuth2 API', icon: nodeIcon('slack') },
	{ id: 'gmail-oauth2', name: 'Gmail OAuth2 API', icon: nodeIcon('gmail') },
	{ id: 'google-sheets-oauth2', name: 'Google Sheets OAuth2 API', icon: nodeIcon('google-sheets') },
	{ id: 'google-drive-oauth2', name: 'Google Drive OAuth2 API', icon: nodeIcon('google-drive') },
	{
		id: 'google-service-account',
		name: 'Google Service Account',
		icon: credentialIcon('google-oauth2-api'),
	},
	{ id: 'notion-api', name: 'Notion API', icon: nodeIcon('notion', true) },
	{ id: 'airtable-token', name: 'Airtable Personal Access Token', icon: nodeIcon('airtable') },
	{ id: 'hubspot-app-token', name: 'HubSpot App Token', icon: nodeIcon('hubspot') },
	{ id: 'salesforce-oauth2', name: 'Salesforce OAuth2 API', icon: nodeIcon('salesforce') },
	{ id: 'mailchimp-api', name: 'Mailchimp API', icon: nodeIcon('mailchimp', true) },
	{ id: 'zendesk-api', name: 'Zendesk API', icon: nodeIcon('zendesk') },
	{ id: 'jira-cloud', name: 'Jira Software Cloud API', icon: nodeIcon('jira') },
	{ id: 'linear-api', name: 'Linear API', icon: nodeIcon('linear') },
	{ id: 'github-api', name: 'GitHub API', icon: nodeIcon('github', true) },
	{
		id: 'microsoft-oauth2',
		name: 'Microsoft OAuth2 API',
		icon: credentialIcon('microsoft-oauth2-api'),
	},
	{ id: 'stripe-api', name: 'Stripe API', icon: nodeIcon('stripe') },
	{ id: 'postgres', name: 'Postgres', icon: nodeIcon('postgres') },
	{ id: 'my-sql', name: 'MySQL', icon: nodeIcon('my-sql', true) },
	{ id: 'snowflake', name: 'Snowflake', icon: nodeIcon('snowflake') },
	{ id: 'aws', name: 'AWS', icon: credentialIcon('aws', true) },
	{ id: 'open-ai-api', name: 'OpenAI', icon: nodeIcon('open-ai', true) },
	{ id: 'anthropic-api', name: 'Anthropic', icon: nodeIcon('anthropic') },
	{ id: 'datadog-api', name: 'Datadog API', icon: credentialIcon('datadog-api', true) },
	{ id: 'okta-api', name: 'Okta API', icon: credentialIcon('okta-api', true) },
	{ id: 'http-header-auth', name: 'Header Auth', icon: nodeIcon('http-request') },
	{ id: 'http-basic-auth', name: 'Basic Auth', icon: nodeIcon('http-request') },
	{ id: 'jwt-auth', name: 'JWT Auth', icon: credentialIcon('jwt-auth') },
	{ id: 'ssh-private-key', name: 'SSH Private Key', icon: glyph('terminal') },
];

const nodeTypesById = new Map(NODE_TYPES.map((type) => [type.id, type]));
const credentialTypesById = new Map(CREDENTIAL_TYPES.map((type) => [type.id, type]));

export function nodeTypeById(id: string): NodeType | undefined {
	return nodeTypesById.get(id);
}

export function credentialTypeById(id: string): CredentialType | undefined {
	return credentialTypesById.get(id);
}
