import { describe, it, expect, vi } from 'vitest';
import { AI_GATEWAY_MANAGED_AUTH_TYPE } from 'n8n-workflow';
import type { INode, INodeProperties, INodeTypeDescription } from 'n8n-workflow';

import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import {
	mcpServerToNode,
	nodeToMcpServer,
	nodeTypeToNewMcpServer,
} from '../composables/useMcpServerAdapter';

vi.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

// Mirrors the two version-gated `serverTransport` declarations from the real
// McpClientTool node: `sse` on v1.1, `httpStreamable` from v1.2 onwards.
const serverTransportProperties: INodeProperties[] = [
	{
		displayName: 'Server Transport',
		name: 'serverTransport',
		type: 'options',
		options: [
			{ name: 'HTTP Streamable', value: 'httpStreamable' },
			{ name: 'Server Sent Events (Deprecated)', value: 'sse' },
		],
		default: 'sse',
		displayOptions: { show: { '@version': [1.1] } },
	},
	{
		displayName: 'Server Transport',
		name: 'serverTransport',
		type: 'options',
		options: [
			{ name: 'HTTP Streamable', value: 'httpStreamable' },
			{ name: 'Server Sent Events (Deprecated)', value: 'sse' },
		],
		default: 'httpStreamable',
		displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
	},
];

function makeMcpNodeType(version: number | number[]): INodeTypeDescription {
	return {
		name: AI_MCP_TOOL_NODE_TYPE,
		displayName: 'MCP Client Tool',
		description: 'Connect to an MCP server',
		version,
		group: ['output'],
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [
			{
				displayName: 'Endpoint',
				name: 'endpointUrl',
				type: 'string',
				default: '',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.1 } }] } },
			},
			...serverTransportProperties,
		],
	} as INodeTypeDescription;
}

describe('useMcpServerAdapter', () => {
	describe('nodeTypeToNewMcpServer()', () => {
		it('defaults a newly added MCP server tool to the httpStreamable transport', () => {
			// A first-class agent always adds the node at its latest version, so the
			// resolved transport must come from the v1.2+ declaration, not the first
			// (deprecated `sse`) one.
			const server = nodeTypeToNewMcpServer(makeMcpNodeType([1, 1.1, 1.2, 1.3, 1.4]));

			expect(server.transport).toBe('streamableHttp');
		});

		it('resolves the transport from a legacy latest version when node is pinned to v1.1', () => {
			const server = nodeTypeToNewMcpServer(makeMcpNodeType(1.1));

			expect(server.transport).toBe('sse');
		});
	});

	describe('nodeToMcpServer()', () => {
		it('uses the credential type as authentication for a registry MCP server', () => {
			const node: INode = {
				id: 'github-mcp',
				name: 'github-mcp',
				type: '@n8n/mcp-registry.gitHub',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					endpointUrl: 'https://api.githubcopilot.com/mcp/',
					serverTransport: 'httpStreamable',
					authentication: 'enterpriseOAuth2',
					options: { timeout: 60001 },
				},
				credentials: {
					githubEnterpriseOAuth2Api: {
						id: 'UZscC4Mgs5EMeouw',
						name: 'GitHub Enterprise OAuth2',
					},
				},
			};

			expect(nodeToMcpServer(node)).toEqual({
				name: 'github-mcp',
				url: 'https://api.githubcopilot.com/mcp/',
				transport: 'streamableHttp',
				authentication: 'githubEnterpriseOAuth2Api',
				credential: 'UZscC4Mgs5EMeouw',
				toolFilter: undefined,
				description: undefined,
				approval: undefined,
				connectionTimeoutMs: 60001,
				metadata: {
					nodeTypeName: '@n8n/mcp-registry.gitHub',
				},
			});
		});

		it('maps a registry node set to Gateway credits to the no-credential shape', () => {
			// The own credential stays on the node, inactive, after the user switches.
			const node: INode = {
				id: 'firecrawl-mcp',
				name: 'firecrawl-mcp',
				type: '@n8n/mcp-registry.firecrawl',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					endpointUrl: 'https://mcp.firecrawl.dev/mcp',
					serverTransport: 'httpStreamable',
					authentication: AI_GATEWAY_MANAGED_AUTH_TYPE,
				},
				credentials: {
					firecrawlMcpOAuth2Api: { id: 'own-credential', name: 'My Firecrawl' },
					firecrawlMcpGatewayApi: { id: null, name: '', __aiGatewayManaged: true },
				},
			};

			expect(nodeToMcpServer(node)).toMatchObject({
				authentication: 'none',
				credential: undefined,
			});
		});
	});

	describe('mcpServerToNode()', () => {
		it('uses the registry selector that matches the authentication credential type', () => {
			const nodeType = {
				...makeMcpNodeType(1),
				name: '@n8n/mcp-registry.gitHub',
				credentials: [
					{
						name: 'githubEnterpriseOAuth2Api',
						required: true,
						displayOptions: {
							show: {
								authentication: ['enterpriseOAuth2'],
							},
						},
					},
				],
			} satisfies INodeTypeDescription;

			const node = mcpServerToNode(
				{
					name: 'github-mcp',
					url: 'https://api.githubcopilot.com/mcp/',
					transport: 'streamableHttp',
					authentication: 'githubEnterpriseOAuth2Api',
					credential: 'UZscC4Mgs5EMeouw',
					connectionTimeoutMs: 60001,
				},
				nodeType,
			);

			expect(node.parameters.authentication).toBe('enterpriseOAuth2');
			expect(node.credentials).toEqual({
				githubEnterpriseOAuth2Api: {
					id: 'UZscC4Mgs5EMeouw',
					name: 'UZscC4Mgs5EMeouw',
				},
			});
		});

		it('rebuilds the managed credential slot for a gateway-hosted registry server', () => {
			// A gateway server carries no stored credential id; the registry node
			// type declares its credential as a `*McpGatewayApi` type. Rebuild the
			// managed slot so the config modal opens without auto-enabling it.
			const nodeType = {
				...makeMcpNodeType(1),
				name: '@n8n/mcp-registry.firecrawl',
				credentials: [
					{
						name: 'firecrawlMcpGatewayApi',
						required: true,
					},
				],
			} satisfies INodeTypeDescription;

			const node = mcpServerToNode(
				{
					name: 'firecrawl-mcp',
					url: 'https://mcp.gateway/firecrawl',
					transport: 'streamableHttp',
					authentication: 'none',
					metadata: { nodeTypeName: '@n8n/mcp-registry.firecrawl' },
				},
				nodeType,
			);

			expect(node.credentials).toEqual({
				firecrawlMcpGatewayApi: {
					id: null,
					name: '',
					__aiGatewayManaged: true,
				},
			});
		});
		it('selects the Gateway credits route on a registry server that also has its own credential', () => {
			const nodeType = {
				...makeMcpNodeType(1),
				name: '@n8n/mcp-registry.firecrawl',
				credentials: [
					{
						name: 'firecrawlMcpOAuth2Api',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
					{
						name: 'firecrawlMcpGatewayApi',
						required: true,
						displayOptions: { show: { authentication: [AI_GATEWAY_MANAGED_AUTH_TYPE] } },
					},
				],
			} satisfies INodeTypeDescription;
			const server = {
				name: 'firecrawl-mcp',
				url: 'https://mcp.firecrawl.dev/mcp',
				transport: 'streamableHttp' as const,
				metadata: { nodeTypeName: '@n8n/mcp-registry.firecrawl' },
			};

			const gatewayNode = mcpServerToNode({ ...server, authentication: 'none' }, nodeType);
			expect(gatewayNode.parameters.authentication).toBe(AI_GATEWAY_MANAGED_AUTH_TYPE);
			expect(gatewayNode.credentials).toEqual({
				firecrawlMcpGatewayApi: { id: null, name: '', __aiGatewayManaged: true },
			});

			// An own credential type without a credential yet is not Gateway credits.
			const ownNode = mcpServerToNode(
				{ ...server, authentication: 'firecrawlMcpOAuth2Api' },
				nodeType,
			);
			expect(ownNode.parameters.authentication).toBe('oAuth2');
			expect(ownNode.credentials).toBeUndefined();
		});
	});
});
