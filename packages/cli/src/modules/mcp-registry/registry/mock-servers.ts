import type { McpRegistryServer } from './mcp-registry.types';

export const notionMockServer: McpRegistryServer = {
	name: 'com.notion/mcp',
	slug: 'notion',
	title: 'Notion',
	description:
		"Notion's official MCP server lets you use your Notion workspace as a system of record for knowledge work and software development. Search questions about the codebase and business, fetch links to pages such as tech specs and PRDs, and track tasks with your team.",
	tagline: 'Connect to the Notion MCP Server',
	version: '1.2.0',
	updatedAt: '2026-04-22T10:00:00.000Z',
	icons: [{ src: 'https://mcp.notion.com/notion-logo-block-main.svg', mimeType: 'image/svg+xml' }],
	websiteUrl: 'https://developers.notion.com/docs/mcp',
	authType: 'oauth2',
	remotes: [
		{ type: 'streamable-http', url: 'https://mcp.notion.com/mcp' },
		{ type: 'sse', url: 'https://mcp.notion.com/sse' },
	],
	tools: [
		{
			name: 'notion-search',
			title: 'Search Notion and connected sources',
			annotations: { readOnlyHint: true },
		},
		{
			name: 'notion-fetch',
			title: 'Fetch Notion entities',
			annotations: { readOnlyHint: true },
		},
		{
			name: 'notion-create-pages',
			title: 'Create pages in Markdown',
			annotations: { readOnlyHint: false },
		},
	],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	tags: ['productivity', 'docs', 'knowledge-base'],
};

export const slackExtendingMockServer: McpRegistryServer = {
	name: 'com.slack/mcp',
	slug: 'slack',
	title: 'Slack',
	description: "Slack's MCP server reuses the existing Slack credential type.",
	tagline: 'Connect to the Slack MCP Server',
	version: '1.0.0',
	updatedAt: '2026-05-10T10:00:00.000Z',
	icons: [{ src: 'https://slack.com/icon.svg', mimeType: 'image/svg+xml' }],
	websiteUrl: 'https://slack.com',
	authType: 'extendsCredential',
	remotes: [{ type: 'streamable-http', url: 'https://mcp.slack.com/mcp' }],
	tools: [],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	extendsCredential: {
		extends: 'slackOAuth2Api',
		authUrl: 'https://slack.com/oauth/v2_user/authorize',
		accessTokenUrl: 'https://slack.com/api/oauth.v2.user.access',
		scope: 'channels:read chat:write',
		authQueryParameters: '',
	},
};

export const gmailDirectExtendMockServer: McpRegistryServer = {
	name: 'com.google/gmail-mcp',
	slug: 'gmail',
	title: 'Gmail',
	description: 'Gmail MCP server reusing the existing Gmail OAuth2 credential as-is.',
	tagline: 'Connect to the Gmail MCP Server',
	version: '1.0.0',
	updatedAt: '2026-05-12T10:00:00.000Z',
	icons: [{ src: 'https://gmail.com/icon.svg', mimeType: 'image/svg+xml' }],
	websiteUrl: 'https://gmail.com',
	authType: 'extendsCredential',
	remotes: [{ type: 'streamable-http', url: 'https://mcp.gmail.com/mcp' }],
	tools: [],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	extendsCredential: {
		extends: 'gmailOAuth2',
	},
};

export const databricksGenieTemplatedMockServer: McpRegistryServer = {
	name: 'com.databricks/genie-mcp',
	slug: 'databricks-genie',
	title: 'Databricks Genie',
	description: 'Databricks Genie MCP server, resolved per-customer from the workspace host.',
	tagline: 'Connect to Databricks Genie',
	version: '1.0.0',
	updatedAt: '2026-08-20T10:00:00.000Z',
	icons: [
		{
			src: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0iI0ZGMzYyMSIvPjwvc3ZnPg==',
			mimeType: 'image/svg+xml',
		},
	],
	websiteUrl: 'https://databricks.com',
	authType: 'extendsCredential',
	remotes: [
		{
			type: 'streamable-http-templated',
			// Trailing slash stripped in case the customer pastes the host straight
			// from the browser, matching DatabricksOAuth2Api's own accessTokenUrl/authUrl.
			url: '={{$self["host"].replace(/\\/$/, "")}}/api/2.0/mcp/genie',
		},
	],
	tools: [],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	extendsCredential: {
		extends: 'databricksOAuth2Api',
		scope: 'genie offline_access',
		grantType: 'authorizationCode',
		// databricksOAuth2Api already provides a per-host authUrl default, no
		// override needed. customScopes is hidden here because Genie's scope is
		// fixed above; without this the parent's "Custom Scopes" toggle and its
		// dependent fields would render with no effect.
		customScopes: false,
	},
};

export const linearMockServer: McpRegistryServer = {
	name: 'app.linear/linear',
	slug: 'linear',
	title: 'Linear',
	description: 'MCP server for Linear project management and issue tracking',
	tagline: 'Connect to the Linear MCP Server',
	version: '1.0.0',
	updatedAt: '2026-05-05T10:00:00.000Z',
	icons: [
		{ src: 'https://static.linear.app/integrations/mcp/icon.svg', mimeType: 'image/svg+xml' },
	],
	websiteUrl: 'https://linear.app',
	authType: 'oauth2',
	remotes: [
		{ type: 'sse', url: 'https://mcp.linear.app/sse' },
		{ type: 'streamable-http', url: 'https://mcp.linear.app/mcp' },
	],
	tools: [
		{
			name: 'list_issues',
			title: 'List issues',
			annotations: { readOnlyHint: true },
		},
		{
			name: 'get_issue',
			title: 'Get issue',
			annotations: { readOnlyHint: true },
		},
		{
			name: 'save_issue',
			title: 'Save issue',
			annotations: { readOnlyHint: false },
		},
	],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	tags: ['issue-tracking', 'project-management'],
};
