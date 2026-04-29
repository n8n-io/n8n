import type { McpRegistryServer } from './mcp-registry.types';

export const notionMockServer: McpRegistryServer = {
	id: 42,
	name: 'com.notion/mcp',
	slug: 'notion',
	title: 'Notion',
	description: 'Official Notion MCP server',
	version: '1.0.1',
	icons: [{ src: 'https://cdn.n8n.io/mcp/notion.svg', mimeType: 'image/svg+xml' }],
	websiteUrl: 'https://developers.notion.com/docs/mcp',
	authType: 'oauth2',
	remotes: [
		{ type: 'streamable-http', url: 'https://mcp.notion.com/mcp' },
		{ type: 'sse', url: 'https://mcp.notion.com/sse' },
	],
	tools: [
		{
			name: 'search',
			title: 'Search Notion',
			description: 'Full-text search across pages and databases.',
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
		{
			name: 'create-pages',
			title: 'Create Page',
			description: 'Create one or more pages under a given parent.',
			annotations: { readOnlyHint: false, destructiveHint: false },
		},
		{
			name: 'fetch',
			title: 'Fetch',
			description: 'Read a page or database by ID.',
			annotations: { readOnlyHint: true, destructiveHint: false },
		},
	],
	isOfficial: true,
	origin: 'registry',
	status: 'active',
	tags: ['productivity', 'docs', 'knowledge-base'],
};
