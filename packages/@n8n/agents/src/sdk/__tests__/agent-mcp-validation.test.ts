import type { LanguageModel } from 'ai';
import { describe, expect, it } from 'vitest';

import type { AgentRuntimeConfig } from '../../runtime/loop/agent-runtime';
import type { BuiltTool } from '../../types';
import { Agent } from '../agent';
import { McpClient } from '../mcp-client';

const fakeModel = { doGenerate: vi.fn() } as unknown as LanguageModel;

function makeMcpTool(serverName: string): BuiltTool {
	return {
		name: 'foo_bar_read',
		description: 'Read data',
		inputSchema: { type: 'object' },
		handler: async () => await Promise.resolve({ ok: true }),
		mcpTool: true,
		mcpServerName: serverName,
		mcpToolName: 'read',
	};
}

function makeMcpClient(serverName: string): McpClient {
	const client = new McpClient([]);
	vi.spyOn(client, 'listTools').mockResolvedValue([makeMcpTool(serverName)]);
	return client;
}

async function buildAgentConfig(agent: Agent): Promise<AgentRuntimeConfig> {
	return await (agent as unknown as { build(): Promise<AgentRuntimeConfig> }).build();
}

describe('Agent MCP validation', () => {
	it('throws when requireApproval: true is set without a checkpoint store', async () => {
		const client = new McpClient([
			{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: true },
		]);
		const agent = new Agent('no-checkpoint').model(fakeModel).instructions('test').mcp(client);

		await expect(agent.generate('test')).rejects.toThrow(/checkpoint/i);
	});

	it('throws when requireApproval: string[] is set without a checkpoint store', async () => {
		const client = new McpClient([
			{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: ['echo'] },
		]);
		const agent = new Agent('no-checkpoint-selective')
			.model(fakeModel)
			.instructions('test')
			.mcp(client);

		await expect(agent.generate('test')).rejects.toThrow(/checkpoint/i);
	});

	it('does not throw when requireApproval: true is set with a checkpoint store', () => {
		expect(() =>
			new Agent('with-checkpoint')
				.model(fakeModel)
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
				.model(fakeModel)
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
				.model(fakeModel)
				.instructions('test')
				.mcp(
					new McpClient([{ name: 'tools', url: 'http://localhost:9999/sse', requireApproval: [] }]),
				),
		).not.toThrow();
	});

	it('keeps model-facing names unique across separate MCP clients', async () => {
		const config = await buildAgentConfig(
			new Agent('normalized-prefixes')
				.model(fakeModel)
				.instructions('test')
				.mcp(makeMcpClient('foo bar'))
				.mcp(makeMcpClient('foo_bar')),
		);

		expect(new Set(config.tools?.map((tool) => tool.name)).size).toBe(2);
	});
});
