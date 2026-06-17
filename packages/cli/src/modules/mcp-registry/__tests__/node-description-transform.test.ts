import { deepCopy, type INodeTypeDescription } from 'n8n-workflow';

import {
	getMcpRegistryCredentialTypeName,
	serverToNodeDescription,
	serverToCredentialDescription,
} from '../node-description-transform';
import type { McpRegistryServer } from '../registry/mcp-registry.types';
import {
	gmailDirectExtendMockServer,
	notionMockServer,
	slackExtendingMockServer,
} from '../registry/mock-servers';

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

// oauth2 servers never consult the predicate; this stub keeps those calls type-correct.
const isKnownCredentialType = () => true;

describe('serverToNodeDescription', () => {
	it('returns a description tailored to the Notion mock server', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

		expect(description).not.toBeNull();
		expect(description).toMatchObject({
			name: 'notion',
			displayName: 'Notion MCP',
			description: notionMockServer.tagline,
			iconUrl: notionMockServer.icons[0].src,
			defaults: { name: 'Notion MCP' },
			version: 1,
		});
		expect(description?.hidden).toBeUndefined();
	});

	it('prefers streamable-http when both remotes are available', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			sseOnlyServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		expect(
			serverToNodeDescription(unsupportedServer, baseDescription, isKnownCredentialType),
		).toBeNull();
	});

	it('marks deprecated servers as hidden so the node creator skips them', () => {
		const deprecatedServer: McpRegistryServer = { ...notionMockServer, status: 'deprecated' };

		const description = serverToNodeDescription(
			deprecatedServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			themedServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			lightOnlyServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			multiFormatServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			noSvgServer,
			baseDescription,
			isKnownCredentialType,
		);

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

		const description = serverToNodeDescription(
			themedMultiFormatServer,
			baseDescription,
			isKnownCredentialType,
		);

		expect(description?.iconUrl).toEqual({
			light: 'https://example.com/light.svg',
			dark: 'https://example.com/dark.png',
		});
	});

	it('extends codex.alias with the title and displayName', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

		expect(description?.codex?.alias).toEqual([
			'MCP',
			'Model Context Protocol',
			'Notion',
			'Notion MCP',
		]);
	});

	it('sets primaryDocumentation when websiteUrl is present', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

		expect(description?.codex?.resources).toEqual({
			primaryDocumentation: [{ url: notionMockServer.websiteUrl }],
		});
	});

	it('does not mutate the input baseDescription', () => {
		const snapshot = deepCopy(baseDescription);
		serverToNodeDescription(notionMockServer, baseDescription, isKnownCredentialType);
		expect(baseDescription).toEqual(snapshot);
	});

	it('leaves properties other than endpointUrl and serverTransport untouched', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

		const include = description?.properties.find((p) => p.name === 'include');
		expect(include).toEqual(baseDescription.properties.find((p) => p.name === 'include'));
	});

	it('matches inline snapshot for Notion mock server', () => {
		const description = serverToNodeDescription(
			notionMockServer,
			baseDescription,
			isKnownCredentialType,
		);

		expect(description).toMatchInlineSnapshot(`
{
  "builderHint": {
    "searchHint": "Agent-optimised Notion integration. When wiring an ai_tool to an AI Agent for Notion, use THIS node, not the native action node — this variant exposes Notion's tools in the shape AI Agents expect and ships pre-configured connection details.",
  },
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
      "name": "notionMcpOAuth2Api",
      "required": true,
    },
  ],
  "defaults": {
    "name": "Notion MCP",
  },
  "description": "Connect to the Notion MCP Server",
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

	describe('with extendsCredential', () => {
		it('wires the synthetic credential name into the node description when overrides are present', () => {
			const description = serverToNodeDescription(
				slackExtendingMockServer,
				baseDescription,
				isKnownCredentialType,
			);

			expect(description).not.toBeNull();
			expect(description?.credentials).toEqual([{ name: 'slackMcpOAuth2Api', required: true }]);
		});

		it('wires the synthetic credential name even when no overrides are present', () => {
			const description = serverToNodeDescription(
				gmailDirectExtendMockServer,
				baseDescription,
				(name) => name === 'gmailOAuth2',
			);

			expect(description).not.toBeNull();
			expect(description?.credentials).toEqual([{ name: 'gmailMcpOAuth2Api', required: true }]);
		});

		it('omits credentials when the parent type is not registered', () => {
			const description = serverToNodeDescription(
				gmailDirectExtendMockServer,
				baseDescription,
				() => false,
			);

			expect(description?.credentials).toEqual([]);
		});
	});
});

describe('serverToCredentialDescription', () => {
	it('returns a description for servers with OAuth2 auth type', () => {
		const description = serverToCredentialDescription(notionMockServer, isKnownCredentialType);

		expect(description).not.toBeNull();
		expect(description).toEqual({
			name: 'notionMcpOAuth2Api',
			displayName: 'Notion MCP OAuth2',
			extends: ['mcpOAuth2Api'],
			icon: 'node:@n8n/mcp-registry.notion',
			properties: [
				{
					displayName: 'Use Dynamic Client Registration',
					name: 'useDynamicClientRegistration',
					type: 'hidden',
					default: true,
				},
				{
					displayName: 'Server URL',
					name: 'serverUrl',
					type: 'hidden',
					default: 'https://mcp.notion.com/mcp',
				},
				{
					displayName: 'Resource URL',
					name: 'resourceUrl',
					type: 'hidden',
					default: '',
				},
				{
					displayName: 'Allowed HTTP Request Domains',
					name: 'allowedHttpRequestDomains',
					type: 'hidden',
					default: 'domains',
				},
				{
					displayName: 'Allowed Domains',
					name: 'allowedDomains',
					type: 'hidden',
					default: 'mcp.notion.com',
				},
			],
		});
	});

	it('returns null when the auth type is not supported', () => {
		const unsupportedServer: McpRegistryServer = {
			...notionMockServer,
			authType: 'foo' as never,
		};

		expect(serverToCredentialDescription(unsupportedServer, isKnownCredentialType)).toBeNull();
	});

	it('returns null when no remote is available', () => {
		const noRemoteServer: McpRegistryServer = {
			...notionMockServer,
			remotes: [],
		};

		expect(serverToCredentialDescription(noRemoteServer, isKnownCredentialType)).toBeNull();
	});

	it('returns null when the endpoint URL is not a valid URL', () => {
		const invalidUrlServer: McpRegistryServer = {
			...notionMockServer,
			remotes: [{ type: 'streamable-http', url: 'invalid-url' }],
		};

		expect(serverToCredentialDescription(invalidUrlServer, isKnownCredentialType)).toBeNull();
	});

	describe('with extendsCredential', () => {
		const isKnownCredentialType = (name: string) => name === 'slackOAuth2Api';

		it('extends the named credential and emits hidden override properties for non-null values', () => {
			const description = serverToCredentialDescription(
				slackExtendingMockServer,
				isKnownCredentialType,
			);

			expect(description).toEqual({
				name: 'slackMcpOAuth2Api',
				displayName: 'Slack MCP OAuth2',
				extends: ['slackOAuth2Api'],
				icon: 'node:@n8n/mcp-registry.slack',
				properties: [
					{
						displayName: 'authUrl',
						name: 'authUrl',
						type: 'hidden',
						default: 'https://slack.com/oauth/v2_user/authorize',
					},
					{
						displayName: 'accessTokenUrl',
						name: 'accessTokenUrl',
						type: 'hidden',
						default: 'https://slack.com/api/oauth.v2.user.access',
					},
					{
						displayName: 'scope',
						name: 'scope',
						type: 'hidden',
						default: 'channels:read chat:write',
					},
					{
						displayName: 'authQueryParameters',
						name: 'authQueryParameters',
						type: 'hidden',
						default: '',
					},
					{
						displayName: 'Allowed HTTP Request Domains',
						name: 'allowedHttpRequestDomains',
						type: 'hidden',
						default: 'domains',
					},
					{
						displayName: 'Allowed Domains',
						name: 'allowedDomains',
						type: 'hidden',
						default: 'mcp.slack.com',
					},
				],
			});
		});

		it('drops override keys whose value is null', () => {
			const server: McpRegistryServer = {
				...slackExtendingMockServer,
				extendsCredential: {
					extends: 'slackOAuth2Api',
					authUrl: 'https://slack.com/oauth/v2_user/authorize',
					accessTokenUrl: null as unknown as string,
					scope: null as unknown as string,
				},
			};

			const description = serverToCredentialDescription(server, isKnownCredentialType);

			expect(description?.properties).toEqual([
				{
					displayName: 'authUrl',
					name: 'authUrl',
					type: 'hidden',
					default: 'https://slack.com/oauth/v2_user/authorize',
				},
				{
					displayName: 'Allowed HTTP Request Domains',
					name: 'allowedHttpRequestDomains',
					type: 'hidden',
					default: 'domains',
				},
				{
					displayName: 'Allowed Domains',
					name: 'allowedDomains',
					type: 'hidden',
					default: 'mcp.slack.com',
				},
			]);
		});

		it('returns null when the parent credential type is not registered', () => {
			const description = serverToCredentialDescription(
				slackExtendingMockServer,
				(name) => name === 'somethingElse',
			);

			expect(description).toBeNull();
		});

		it('returns null when the extendsCredential payload fails schema validation', () => {
			const server: McpRegistryServer = {
				...slackExtendingMockServer,
				extendsCredential: {
					extends: 'slackOAuth2Api',
					grantType: 'invalidGrant' as never,
				},
			};

			expect(serverToCredentialDescription(server, isKnownCredentialType)).toBeNull();
		});

		it('returns null when authType is "extendsCredential" but the extendsCredential field is missing', () => {
			const server: McpRegistryServer = {
				...slackExtendingMockServer,
				extendsCredential: undefined,
			};

			expect(serverToCredentialDescription(server, isKnownCredentialType)).toBeNull();
		});

		it('creates a synthetic credential extending the parent even when no overrides are present', () => {
			const description = serverToCredentialDescription(
				gmailDirectExtendMockServer,
				(name) => name === 'gmailOAuth2',
			);

			expect(description).toEqual({
				name: 'gmailMcpOAuth2Api',
				displayName: 'Gmail MCP OAuth2',
				extends: ['gmailOAuth2'],
				icon: 'node:@n8n/mcp-registry.gmail',
				properties: [
					{
						displayName: 'Allowed HTTP Request Domains',
						name: 'allowedHttpRequestDomains',
						type: 'hidden',
						default: 'domains',
					},
					{
						displayName: 'Allowed Domains',
						name: 'allowedDomains',
						type: 'hidden',
						default: 'mcp.gmail.com',
					},
				],
			});
		});

		it('is ignored when authType is "oauth2"', () => {
			const server: McpRegistryServer = {
				...slackExtendingMockServer,
				authType: 'oauth2',
			};

			const description = serverToCredentialDescription(server, isKnownCredentialType);

			expect(description?.extends).toEqual(['mcpOAuth2Api']);
		});
	});
});

describe('getMcpRegistryCredentialTypeName', () => {
	it.each([
		{ slug: 'notion', expected: 'notionMcpOAuth2Api' },
		{ slug: 'linear', expected: 'linearMcpOAuth2Api' },
		{ slug: 'multi-word-service', expected: 'multiWordServiceMcpOAuth2Api' },
	])('maps slug "$slug" to credential type "$expected"', ({ slug, expected }) => {
		expect(
			getMcpRegistryCredentialTypeName({ ...notionMockServer, slug } as McpRegistryServer),
		).toBe(expected);
	});
});
