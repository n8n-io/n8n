import { deepCopy, type INodeTypeDescription } from 'n8n-workflow';

import { serverToNodeDescription } from './node-description-transform';
import type { McpRegistryServer } from './registry/mcp-registry.types';
import { notionMockServer } from './registry/notion-mock-server';

const baseDescription: INodeTypeDescription = {
	displayName: 'MCP Registry Client (internal)',
	name: 'mcpRegistryClientTool',
	hidden: true,
	group: ['output'],
	version: 1,
	description: 'Runtime backing for MCP registry-derived nodes',
	defaults: { name: 'MCP Registry Client' },
	codex: {
		categories: ['AI'],
		subcategories: { AI: ['Model Context Protocol'] },
		alias: ['MCP', 'Model Context Protocol'],
	},
	inputs: [],
	outputs: [],
	credentials: [{ name: 'mcpOAuth2Api', required: true }],
	properties: [
		{ displayName: 'Endpoint URL', name: 'endpointUrl', type: 'hidden', default: '' },
		{
			displayName: 'Server Transport',
			name: 'serverTransport',
			type: 'hidden',
			default: 'httpStreamable',
		},
		{
			displayName: 'Tools to Include',
			name: 'include',
			type: 'options',
			default: 'all',
			options: [],
		},
	],
};

describe('serverToNodeDescription', () => {
	it('returns a description tailored to the Notion mock server', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		expect(description).not.toBeNull();
		expect(description).toMatchObject({
			name: 'notion',
			displayName: 'Notion MCP',
			description: notionMockServer.description,
			iconUrl: notionMockServer.icons[0].src,
			defaults: { name: 'Notion MCP' },
			version: 1,
		});
		expect(description?.hidden).toBeUndefined();
	});

	it('prefers streamable-http when both remotes are available', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		const endpointUrl = description?.properties.find((p) => p.name === 'endpointUrl');
		const serverTransport = description?.properties.find((p) => p.name === 'serverTransport');

		expect(serverTransport?.default).toBe('httpStreamable');
		expect(endpointUrl?.default).toBe('https://mcp.notion.com/mcp');
	});

	it('falls back to sse when only sse is available', () => {
		const sseOnlyServer: McpRegistryServer = {
			...notionMockServer,
			remotes: [{ type: 'sse', url: 'https://mcp.notion.com/sse' }],
		};

		const description = serverToNodeDescription(sseOnlyServer, baseDescription);

		const endpointUrl = description?.properties.find((p) => p.name === 'endpointUrl');
		const serverTransport = description?.properties.find((p) => p.name === 'serverTransport');

		expect(serverTransport?.default).toBe('sse');
		expect(endpointUrl?.default).toBe('https://mcp.notion.com/sse');
	});

	it('returns null when no supported remote is available', () => {
		const unsupportedServer: McpRegistryServer = {
			...notionMockServer,
			remotes: [],
		};

		expect(serverToNodeDescription(unsupportedServer, baseDescription)).toBeNull();
	});

	it('marks deprecated servers as hidden so the node creator skips them', () => {
		const deprecatedServer: McpRegistryServer = { ...notionMockServer, status: 'deprecated' };

		const description = serverToNodeDescription(deprecatedServer, baseDescription);

		expect(description?.hidden).toBe(true);
	});

	it('returns a themed iconUrl when both light and dark variants are available', () => {
		const themedServer: McpRegistryServer = {
			...notionMockServer,
			icons: [
				{ src: 'https://example.com/light.svg', theme: 'light' },
				{ src: 'https://example.com/dark.svg', theme: 'dark' },
			],
		};

		const description = serverToNodeDescription(themedServer, baseDescription);

		expect(description?.iconUrl).toEqual({
			light: 'https://example.com/light.svg',
			dark: 'https://example.com/dark.svg',
		});
	});

	it('falls back to the first icon when only one theme is provided', () => {
		const lightOnlyServer: McpRegistryServer = {
			...notionMockServer,
			icons: [{ src: 'https://example.com/light.svg', theme: 'light' }],
		};

		const description = serverToNodeDescription(lightOnlyServer, baseDescription);

		expect(description?.iconUrl).toBe('https://example.com/light.svg');
	});

	it('prefers SVG over PNG over JPG when multiple formats are available', () => {
		const multiFormatServer: McpRegistryServer = {
			...notionMockServer,
			icons: [
				{ src: 'https://example.com/icon.jpg', mimeType: 'image/jpeg' },
				{ src: 'https://example.com/icon.png', mimeType: 'image/png' },
				{ src: 'https://example.com/icon.svg', mimeType: 'image/svg+xml' },
			],
		};

		const description = serverToNodeDescription(multiFormatServer, baseDescription);

		expect(description?.iconUrl).toBe('https://example.com/icon.svg');
	});

	it('prefers PNG over JPG when SVG is not available', () => {
		const noSvgServer: McpRegistryServer = {
			...notionMockServer,
			icons: [
				{ src: 'https://example.com/icon.jpg', mimeType: 'image/jpeg' },
				{ src: 'https://example.com/icon.png', mimeType: 'image/png' },
			],
		};

		const description = serverToNodeDescription(noSvgServer, baseDescription);

		expect(description?.iconUrl).toBe('https://example.com/icon.png');
	});

	it('applies mime type preference within each theme', () => {
		const themedMultiFormatServer: McpRegistryServer = {
			...notionMockServer,
			icons: [
				{ src: 'https://example.com/light.png', mimeType: 'image/png', theme: 'light' },
				{ src: 'https://example.com/light.svg', mimeType: 'image/svg+xml', theme: 'light' },
				{ src: 'https://example.com/dark.jpg', mimeType: 'image/jpeg', theme: 'dark' },
				{ src: 'https://example.com/dark.png', mimeType: 'image/png', theme: 'dark' },
			],
		};

		const description = serverToNodeDescription(themedMultiFormatServer, baseDescription);

		expect(description?.iconUrl).toEqual({
			light: 'https://example.com/light.svg',
			dark: 'https://example.com/dark.png',
		});
	});

	it('extends codex.alias with the title and displayName', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		expect(description?.codex?.alias).toEqual([
			'MCP',
			'Model Context Protocol',
			'Notion',
			'Notion MCP',
		]);
	});

	it('sets primaryDocumentation when websiteUrl is present', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		expect(description?.codex?.resources).toEqual({
			primaryDocumentation: [{ url: notionMockServer.websiteUrl }],
		});
	});

	it('does not mutate the input baseDescription', () => {
		const snapshot = deepCopy(baseDescription);
		serverToNodeDescription(notionMockServer, baseDescription);
		expect(baseDescription).toEqual(snapshot);
	});

	it('leaves properties other than endpointUrl and serverTransport untouched', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		const include = description?.properties.find((p) => p.name === 'include');
		expect(include).toEqual(baseDescription.properties.find((p) => p.name === 'include'));
	});

	it('matches inline snapshot for Notion mock server', () => {
		const description = serverToNodeDescription(notionMockServer, baseDescription);

		expect(description).toMatchInlineSnapshot(`
{
  "codex": {
    "alias": [
      "MCP",
      "Model Context Protocol",
      "Notion",
      "Notion MCP",
    ],
    "categories": [
      "AI",
    ],
    "resources": {
      "primaryDocumentation": [
        {
          "url": "https://developers.notion.com/docs/mcp",
        },
      ],
    },
    "subcategories": {
      "AI": [
        "Model Context Protocol",
      ],
    },
  },
  "credentials": [
    {
      "name": "mcpOAuth2Api",
      "required": true,
    },
  ],
  "defaults": {
    "name": "Notion MCP",
  },
  "description": "Notion's official MCP server lets you use your Notion workspace as a system of record for knowledge work and software development. Search questions about the codebase and business, fetch links to pages such as tech specs and PRDs, and track tasks with your team.",
  "displayName": "Notion MCP",
  "group": [
    "output",
  ],
  "iconUrl": "https://mcp.notion.com/notion-logo-block-main.svg",
  "inputs": [],
  "name": "notion",
  "outputs": [],
  "properties": [
    {
      "default": "https://mcp.notion.com/mcp",
      "displayName": "Endpoint URL",
      "name": "endpointUrl",
      "type": "hidden",
    },
    {
      "default": "httpStreamable",
      "displayName": "Server Transport",
      "name": "serverTransport",
      "type": "hidden",
    },
    {
      "default": "all",
      "displayName": "Tools to Include",
      "name": "include",
      "options": [],
      "type": "options",
    },
  ],
  "version": 1,
}
`);
	});
});
