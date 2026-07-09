import type { LanguageModel } from 'ai';
import { describe, expect, it } from 'vitest';

import { Agent } from '../agent';
import { McpClient } from '../mcp-client';

const fakeModel = { doGenerate: vi.fn() } as unknown as LanguageModel;

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
});
