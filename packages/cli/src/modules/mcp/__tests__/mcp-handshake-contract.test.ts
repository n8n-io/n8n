import {
	CLIENT_CAPABILITIES_META_KEY,
	createMcpHandler,
	McpServer,
	PROTOCOL_VERSION_META_KEY,
} from '@modelcontextprotocol/server';

import { MCP_DISCOVER_METHOD } from '../mcp.constants';

// The controller reads the handshake outcome off the status the SDK handler
// wrote, because the handler answers a failure with an error response instead
// of throwing (see mcp.controller.ts). Both halves of that contract are pinned
// here against the real SDK: if a future version starts throwing, or starts
// answering a rejected handshake with a 2xx, this fails instead of silently
// turning failed connections back into successful ones.
const buildHandler = () =>
	createMcpHandler(async () => new McpServer({ name: 'n8n MCP Server', version: '1.0.0' }), {
		legacy: 'stateless',
	});

const discoverRequest = (protocolVersion: string) =>
	new Request('https://n8n.example.com/mcp-server/http', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'mcp-method': MCP_DISCOVER_METHOD,
		},
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			method: MCP_DISCOVER_METHOD,
			params: {
				_meta: {
					[PROTOCOL_VERSION_META_KEY]: protocolVersion,
					// The 2026-07-28 envelope requires declared client capabilities;
					// omitting them is itself a 400, which is one of the shapes the
					// controller now has to report as a failed connection.
					[CLIENT_CAPABILITIES_META_KEY]: {},
				},
			},
		}),
	});

describe('MCP handshake status contract', () => {
	it('answers an unsupported protocol revision with an error status, without throwing', async () => {
		const response = await buildHandler().fetch(discoverRequest('2020-01-01'));

		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	// A discover with no envelope claim classifies legacy, where the method does
	// not exist. The handler answers that at HTTP 200 with a JSON-RPC
	// method-not-found, which is why the controller cannot judge this one by
	// status and checks the declared protocol version instead.
	it('answers a discover with no protocol version at 200, carrying a JSON-RPC error', async () => {
		const request = new Request('https://n8n.example.com/mcp-server/http', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				// The legacy leg requires both media types in Accept, as real clients send.
				accept: 'application/json, text/event-stream',
				'mcp-method': MCP_DISCOVER_METHOD,
			},
			body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: MCP_DISCOVER_METHOD, params: {} }),
		});

		const response = await buildHandler().fetch(request);

		expect(response.status).toBe(200);
		expect(await response.text()).toContain('"code":-32601');
	});

	// Pinned to the revision the server serves rather than the SDK's
	// LATEST_PROTOCOL_VERSION, which still names a 2025-era revision and so
	// routes to the legacy leg, where `server/discover` is not a method.
	it('answers a supported protocol revision with a success status', async () => {
		const response = await buildHandler().fetch(discoverRequest('2026-07-28'));

		expect(response.status).toBeLessThan(400);
	});
});
