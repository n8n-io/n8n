import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { createMcpCaller } from '../mcp-upstream';

interface Seen {
	host?: string;
	authorization?: string;
	methods: string[];
}

// A minimal MCP server over HTTP: JSON answers for initialize, tools/list and tools/call.
async function startServer(seen: Seen): Promise<http.Server> {
	const server = http.createServer((req, res) => {
		if (req.method !== 'POST') {
			res.writeHead(405).end();
			return;
		}
		let body = '';
		req.on('data', (chunk: Buffer) => (body += chunk.toString()));
		req.on('end', () => {
			seen.host = req.headers.host;
			seen.authorization = req.headers.authorization;
			const message = JSON.parse(body) as { id?: number; method: string; params?: any };
			seen.methods.push(message.method);
			if (message.id === undefined) {
				res.writeHead(202).end();
				return;
			}
			const results: Record<string, unknown> = {
				initialize: {
					protocolVersion: message.params?.protocolVersion,
					capabilities: { tools: {} },
					serverInfo: { name: 'fake', version: '1' },
				},
				'tools/list': { tools: [{ name: 'get_issue', inputSchema: { type: 'object' } }] },
				'tools/call': { content: [{ type: 'text', text: `called ${message.params?.name}` }] },
			};
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: results[message.method] }));
		});
	});
	return await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

describe('createMcpCaller', () => {
	let server: http.Server;
	let url: string;
	let seen: Seen;

	beforeEach(async () => {
		seen = { methods: [] };
		server = await startServer(seen);
		url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
	});

	afterEach(async () => await new Promise((resolve) => server.close(resolve)));

	it('should list the tools of the server with the bearer', async () => {
		const tools = await createMcpCaller(url, 'secret').listTools();
		expect(tools.map((t) => t.name)).toEqual(['get_issue']);
		expect(seen.authorization).toBe('Bearer secret');
	});

	it('should call a tool and parse its result', async () => {
		const result = await createMcpCaller(url, 'secret').callTool('get_issue', { id: 'T-1' });
		expect(result.content).toEqual([{ type: 'text', text: 'called get_issue' }]);
		expect(seen.methods).toEqual(
			expect.arrayContaining(['initialize', 'notifications/initialized', 'tools/call']),
		);
	});

	it('should send the Host header that the caller names', async () => {
		await createMcpCaller(url, 'secret', { Host: 'mcp.linear.app' }).listTools();
		expect(seen.host).toBe('mcp.linear.app');
		expect(seen.authorization).toBe('Bearer secret');
	});

	it('should fail when the server is not there', async () => {
		await new Promise((resolve) => server.close(resolve));
		await expect(createMcpCaller(url, 'secret').listTools()).rejects.toThrow();
	});
});
