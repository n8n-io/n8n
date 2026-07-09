import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { startSseServer, type TestServer } from './mcp-server-helpers';
import { Agent, McpClient, Tool } from '../../index';

describe('McpClient.listTools()', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('connects and returns tools when server is reachable', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const tools = await client.listTools();

		expect(tools.length).toBe(3);
		expect(tools.map((t) => t.name).sort()).toEqual(['tools_add', 'tools_echo', 'tools_image']);

		await client.close();
	});

	it('returns cached tools on subsequent calls without reconnecting', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url }]);

		const first = await client.listTools();
		const second = await client.listTools();

		expect(first).toBe(second);

		await client.close();
	});

	it('returns empty array when no servers are configured', async () => {
		const client = new McpClient([]);
		const tools = await client.listTools();

		expect(tools).toHaveLength(0);
	});

	it('throws and clears cache when server is unreachable', async () => {
		const client = new McpClient([{ name: 'dead', url: 'http://127.0.0.1:1/sse' }]);

		await expect(client.listTools()).rejects.toThrow();
	});

	it('reports per-server errors for partially-failing multi-server configs', async () => {
		const client = new McpClient([
			{ name: 'ok', url: server.url },
			{ name: 'dead', url: 'http://127.0.0.1:1/sse' },
		]);

		await expect(client.listTools()).rejects.toThrow(/dead/);
	});
});

describe('Agent with MCP boundary errors', () => {
	it('rejects when MCP server is unreachable', async () => {
		const client = new McpClient([{ name: 'dead', url: 'http://127.0.0.1:1/sse' }]);
		const agent = new Agent('bad-mcp-agent')
			.model('anthropic/claude-haiku-4-5')
			.instructions('test')
			.mcp(client);

		await expect(agent.generate('hello')).rejects.toThrow(/dead/i);
	});

	describe('MCP tool name collision detection', () => {
		let server: TestServer;

		beforeAll(async () => {
			server = await startSseServer();
		});

		afterAll(async () => {
			await server.close();
		});

		it('throws when a static tool and an MCP tool share the same prefixed name', async () => {
			const conflicting = new Tool('tools_echo')
				.description('conflicts with MCP echo')
				.input(z.object({ message: z.string() }))
				.handler(async ({ message }) => ({ result: message }));

			const client = new McpClient([{ name: 'tools', url: server.url }]);
			const agent = new Agent('collision-agent')
				.model('anthropic/claude-haiku-4-5')
				.instructions('test')
				.tool(conflicting)
				.mcp(client);

			try {
				await expect(agent.generate('hello')).rejects.toThrow(/collision/i);
			} finally {
				await client.close();
			}
		});
	});
});
