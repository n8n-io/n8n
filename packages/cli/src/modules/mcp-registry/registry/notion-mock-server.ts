import type { McpRegistryServer } from './mcp-registry.types';

export const notionMockServer: McpRegistryServer = {
	id: 42,
	name: 'com.notion/mcp',
	slug: 'notion',
	title: 'Notion',
	description:
		"Notion's official MCP server lets you use your Notion workspace as a system of record for knowledge work and software development. Search questions about the codebase and business, fetch links to pages such as tech specs and PRDs, and track tasks with your team.",
	version: '1.2.0',
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
			description:
				'Semantic search over a Notion workspace and connected sources (Slack, Google Drive, GitHub, Jira, Microsoft Teams, SharePoint, OneDrive, Linear), or search for users by name or email.',
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		{
			name: 'notion-fetch',
			title: 'Fetch Notion entities',
			description:
				'Retrieve details about a Notion entity (page, database, or data source) by URL or ID.',
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		{
			name: 'notion-create-pages',
			title: 'Create pages in Markdown',
			description:
				'Create one or more Notion pages under a shared parent (page, database, or data source) with specified properties and content.',
			annotations: { readOnlyHint: false, destructiveHint: false },
		},
	],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	tags: ['productivity', 'docs', 'knowledge-base'],
};
