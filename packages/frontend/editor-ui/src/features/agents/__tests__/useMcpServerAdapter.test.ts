import { describe, it, expect, vi } from 'vitest';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';

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

	describe('n8nInternalOAuth2 credential-type mapping', () => {
		it('wires the marker credential type when converting a server to a node', () => {
			const node = mcpServerToNode(
				{
					name: 'internal',
					url: 'https://example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'n8nInternalOAuth2',
					credential: 'marker-cred-1',
				},
				makeMcpNodeType(1.2),
			);

			expect(node.parameters.authentication).toBe('n8nInternalOAuth2');
			expect(node.credentials).toEqual({
				n8nInternalOAuth2Api: { id: 'marker-cred-1', name: 'marker-cred-1' },
			});
		});

		it('round-trips authentication back to n8nInternalOAuth2 from the node', () => {
			const server = nodeToMcpServer({
				id: 'n1',
				name: 'internal',
				type: AI_MCP_TOOL_NODE_TYPE,
				typeVersion: 1.2,
				position: [0, 0],
				parameters: {
					endpointUrl: 'https://example.com/mcp',
					serverTransport: 'httpStreamable',
					authentication: 'n8nInternalOAuth2',
				},
				credentials: { n8nInternalOAuth2Api: { id: 'marker-cred-1', name: 'marker-cred-1' } },
			});

			expect(server.authentication).toBe('n8nInternalOAuth2');
			expect(server.credential).toBe('marker-cred-1');
		});
	});
});
