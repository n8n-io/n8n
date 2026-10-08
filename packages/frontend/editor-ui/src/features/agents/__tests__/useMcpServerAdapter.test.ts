import { describe, it, expect, vi } from 'vitest';
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
	});
});
