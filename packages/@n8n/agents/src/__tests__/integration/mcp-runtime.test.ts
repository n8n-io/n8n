/**
 * Integration tests for MCP lifecycle via McpClient and the Agent builder.
 * Covers LLM-facing MCP behavior in the Agent builder/runtime.
 */
import { afterAll, beforeAll, expect, it } from 'vitest';
import { z } from 'zod';

import {
	describeIf,
	getModel,
	findLastTextContent,
	collectStreamChunks,
	chunksOfType,
} from './helpers';
import { startSseServer, type TestServer } from './mcp-server-helpers';
import { Agent, McpClient, Tool } from '../../index';

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
		// Tool calls now ride their own discrete `tool-call` chunks rather than
		// being wrapped in `message` envelopes.
		const toolCallChunks = chunksOfType(chunks, 'tool-call');
		expect(toolCallChunks.length).toBeGreaterThan(0);

		await client.close();
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
