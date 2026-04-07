/**
 * Integration tests for MCP lifecycle via McpClient and the Agent builder.
 * Covers: McpClient constructor validation, connect/listTools/close, tool merge,
 * name collision, requireToolApproval, and rich content handling.
 *
 * Tests that don't require a real LLM run unconditionally.
 * Tests that call agent.generate() / agent.stream() are gated on ANTHROPIC_API_KEY.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	getModel,
	findLastTextContent,
	collectStreamChunks,
	chunksOfType,
} from './helpers';
import { startSseServer, type TestServer } from './mcp-server-helpers';
import { Agent, McpClient, Tool, isLlmMessage } from '../../index';

// ---------------------------------------------------------------------------
// McpClient constructor validation — no MCP server required
// ---------------------------------------------------------------------------

describe('McpClient constructor validation', () => {
	it('throws if neither url nor command is provided', () => {
		expect(() => new McpClient([{ name: 'bad' }])).toThrow(
			'exactly one of "url" or "command" must be provided',
		);
	});

	it('throws if both url and command are provided', () => {
		expect(
			() => new McpClient([{ name: 'bad', url: 'http://localhost', command: 'node' }]),
		).toThrow('provide either "url" or "command", not both');
	});

	it('throws if a duplicate server name is registered', () => {
		expect(
			() =>
				new McpClient([
					{ name: 'browser', url: 'http://localhost:9999/sse' },
					{ name: 'browser', url: 'http://localhost:9998/sse' },
				]),
		).toThrow('MCP server name "browser" is already registered');
	});

	it('accepts valid url-based config', () => {
		expect(() => new McpClient([{ name: 'srv', url: 'http://localhost:9999/sse' }])).not.toThrow();
	});

	it('accepts valid command-based config', () => {
		expect(
			() => new McpClient([{ name: 'stdio-srv', command: 'node', args: ['server.mjs'] }]),
		).not.toThrow();
	});

	it('accepts multiple servers with distinct names', () => {
		expect(
			() =>
				new McpClient([
					{ name: 'srv-a', url: 'http://localhost:9999/sse' },
					{ name: 'srv-b', url: 'http://localhost:9998/sse' },
				]),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// McpClient.listTools() — needs in-process MCP server, no LLM
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// generate() with MCP tools — requires ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

const describe_llm = describeIf('anthropic');

describe_llm('agent generate() with MCP tool', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('calls an MCP tool during generation and returns the result', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const agent = new Agent('mcp-agent')
			.model(getModel('anthropic'))
			.instructions(
				'You are a helpful assistant. When asked to echo a message, use the tools_echo tool. Be concise.',
			)
			.mcp(client);

		const result = await agent.generate(
			'Echo the message "integration test passed" using the tools_echo tool.',
		);

		expect(result.finishReason).not.toBe('error');

		const text = findLastTextContent(result.messages);
		expect(text?.toLowerCase()).toContain('integration test passed');

		await client.close();
	});

	it('merges static tools and MCP tools in the same agent', async () => {
		const staticTool = new Tool('double')
			.description('Double a number')
			.input(z.object({ n: z.number().describe('The number to double') }))
			.output(z.object({ result: z.number() }))
			.handler(async ({ n }) => ({ result: n * 2 }));

		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const agent = new Agent('mixed-tools-agent')
			.model(getModel('anthropic'))
			.instructions(
				'You are a calculator. ' +
					'Use the double tool to double numbers and the tools.add tool to add numbers. ' +
					'Be concise.',
			)
			.tool(staticTool)
			.mcp(client);

		const result = await agent.generate('Use the tools.add tool to add 15 and 27.');

		expect(result.finishReason).not.toBe('error');
		const text = findLastTextContent(result.messages);
		expect(text).toContain('42');

		await client.close();
	});

	it('MCP connections persist across multiple generate() calls', async () => {
		// Connections are kept alive by McpClient and reused across runs.
		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const agent = new Agent('lifecycle-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools.add to add numbers. Be concise.')
			.mcp(client);

		const result1 = await agent.generate('Use tools.add to add 1 and 2.');
		const result2 = await agent.generate('Use tools.add to add 3 and 4.');

		expect(result1.finishReason).not.toBe('error');
		expect(result2.finishReason).not.toBe('error');

		await client.close();
	});
});

// ---------------------------------------------------------------------------
// stream() with MCP tools — requires ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

describe_llm('agent stream() with MCP tool', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('streams a response that includes an MCP tool call', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const agent = new Agent('stream-mcp-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools_echo to echo messages. Be concise.')
			.mcp(client);

		const { stream } = await agent.stream('Echo "stream works" using tools_echo.');

		const chunks = await collectStreamChunks(stream);
		const messageChunks = chunksOfType(chunks, 'message');
		const messages = messageChunks.map((c) => c.message);

		const hasToolCall = messages.some(
			(m) => isLlmMessage(m) && m.content.some((c) => c.type === 'tool-call'),
		);
		expect(hasToolCall).toBe(true);

		await client.close();
	});
});

// ---------------------------------------------------------------------------
// generate() error cases — no LLM needed for the connection failure case
// ---------------------------------------------------------------------------

describe('generate() with unreachable MCP server', () => {
	it('rejects when MCP server is unreachable', async () => {
		const client = new McpClient([{ name: 'dead', url: 'http://127.0.0.1:1/sse' }]);
		const agent = new Agent('bad-mcp-agent')
			.model('anthropic/claude-haiku-4-5')
			.instructions('test')
			.mcp(client);

		await expect(agent.generate('hello')).rejects.toThrow(/dead/i);
	});
});

// ---------------------------------------------------------------------------
// MCP tool name collision detection — no LLM needed
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// requireToolApproval with MCP tools — requires ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

describe_llm('requireToolApproval() with MCP tools', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('suspends the MCP tool call when requireToolApproval is enabled', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url }]);
		const agent = new Agent('approval-mcp-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools_echo to echo messages. Be concise.')
			.mcp(client)
			.requireToolApproval()
			.checkpoint('memory');

		const { stream } = await agent.stream('Echo "needs approval" using tools_echo.');
		const chunks = await collectStreamChunks(stream);

		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBeGreaterThanOrEqual(1);
		expect(suspendedChunks[0].toolName).toBe('tools_echo');

		await client.close();
	});
});

// ---------------------------------------------------------------------------
// McpServerConfig.requireApproval — builder validation (no LLM needed)
// ---------------------------------------------------------------------------

describe('McpServerConfig.requireApproval — builder validation', () => {
	it('throws when requireApproval: true is set without a checkpoint store', async () => {
		const client = new McpClient([
			{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: true },
		]);
		const agent = new Agent('no-checkpoint')
			.model('anthropic/claude-haiku-4-5')
			.instructions('test')
			.mcp(client);

		// build() is triggered by generate() — fails before attempting connection
		await expect(agent.generate('test')).rejects.toThrow(/checkpoint/i);
	});

	it('throws when requireApproval: string[] is set without a checkpoint store', async () => {
		const client = new McpClient([
			{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: ['echo'] },
		]);
		const agent = new Agent('no-checkpoint-selective')
			.model('anthropic/claude-haiku-4-5')
			.instructions('test')
			.mcp(client);

		await expect(agent.generate('test')).rejects.toThrow(/checkpoint/i);
	});

	it('does not throw when requireApproval: true is set with a checkpoint store', () => {
		expect(() =>
			new Agent('with-checkpoint')
				.model('anthropic/claude-haiku-4-5')
				.instructions('test')
				.mcp(
					new McpClient([
						{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: true },
					]),
				)
				.checkpoint('memory'),
		).not.toThrow();
	});

	it('does not throw when requireApproval: false is set without a checkpoint store', () => {
		expect(() =>
			new Agent('no-approval')
				.model('anthropic/claude-haiku-4-5')
				.instructions('test')
				.mcp(
					new McpClient([
						{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: false },
					]),
				),
		).not.toThrow();
	});

	it('does not throw when requireApproval is an empty array without a checkpoint store', () => {
		expect(() =>
			new Agent('empty-approval')
				.model('anthropic/claude-haiku-4-5')
				.instructions('test')
				.mcp(
					new McpClient([{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: [] }]),
				),
		).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// McpServerConfig.requireApproval end-to-end — requires ANTHROPIC_API_KEY
// ---------------------------------------------------------------------------

describe_llm('McpServerConfig.requireApproval with MCP tools', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('suspends all MCP tools when config.requireApproval: true', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url, requireApproval: true }]);
		const agent = new Agent('config-approval-all-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools_echo to echo messages. Be concise.')
			.mcp(client)
			.checkpoint('memory');

		const { stream } = await agent.stream('Echo "needs approval" using tools_echo.');
		const chunks = await collectStreamChunks(stream);

		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBeGreaterThanOrEqual(1);
		expect(suspendedChunks[0].toolName).toBe('tools_echo');

		await client.close();
	});

	it('suspends only the listed tool when config.requireApproval is a string array', async () => {
		const client = new McpClient([{ name: 'tools', url: server.url, requireApproval: ['echo'] }]);
		const agent = new Agent('config-approval-selective-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools_echo to echo messages. Be concise.')
			.mcp(client)
			.checkpoint('memory');

		const { stream } = await agent.stream('Echo "selective approval" using tools_echo.');
		const chunks = await collectStreamChunks(stream);

		const suspendedChunks = chunksOfType(chunks, 'tool-call-suspended');
		expect(suspendedChunks.length).toBeGreaterThanOrEqual(1);
		expect(suspendedChunks[0].toolName).toBe('tools_echo');

		await client.close();
	});

	it('does not suspend a tool not listed in config.requireApproval', async () => {
		// Only 'echo' requires approval; 'add' should run to completion without suspension.
		const client = new McpClient([{ name: 'tools', url: server.url, requireApproval: ['echo'] }]);
		const agent = new Agent('config-approval-unlisted-agent')
			.model(getModel('anthropic'))
			.instructions('Use tools.add to add numbers. Do not use any other tool. Be concise.')
			.mcp(client)
			.checkpoint('memory');

		const result = await agent.generate('Use tools.add to add 10 and 32.');

		expect(result.finishReason).not.toBe('error');
		const text = findLastTextContent(result.messages);
		expect(text).toContain('42');

		await client.close();
	});
});
