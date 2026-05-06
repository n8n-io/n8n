import type { McpRegistryServer } from './mcp-registry.types';

export const notionMockServer: McpRegistryServer = {
	id: 42,
	name: 'com.notion/mcp',
	slug: 'notion',
	title: 'Notion',
	description:
		"Notion's official MCP server lets you use your Notion workspace as a system of record for knowledge work and software development. Search questions about the codebase and business, fetch links to pages such as tech specs and PRDs, and track tasks with your team.",
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
