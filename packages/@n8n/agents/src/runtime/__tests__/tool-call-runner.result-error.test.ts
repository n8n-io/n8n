import { z } from 'zod';

import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import type { McpCallToolResult } from '../mcp/mcp-connection';
import { McpConnection } from '../mcp/mcp-connection';
import { McpToolResolver } from '../mcp/mcp-tool-resolver';
import { AgentMessageList } from '../model/message-list';
import { toAiMessages } from '../model/messages';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { ToolCallRunner } from '../tools/tool-call-runner';
import type { BuiltTool } from '../../types/sdk/tool';
import type { ContentToolCall, Message } from '../../types/sdk/message';

const TOOL_CALL_ID = 'tc-1';

function createRunner(): ToolCallRunner {
	const config = { name: 'result-error-agent' } as AgentRuntimeConfig;
	return new ToolCallRunner({
		telemetry: new RuntimeTelemetry(config),
		eventBus: new AgentEventBus(),
		concurrency: 1,
		onCancelled: vi.fn(),
		tokenCounter: (text) => text.length,
	});
}

function registryMcpTool(result: McpCallToolResult): BuiltTool {
	const connection = new McpConnection({ name: 'slack', url: 'https://example.test/mcp' });
	vi.spyOn(connection, 'callTool').mockResolvedValue(result);
	const [tool] = new McpToolResolver().resolve(connection, [
		{ name: 'post_message', inputSchema: { type: 'object' } },
	]);
	return tool;
}

function localTool(output: unknown, overrides: Partial<BuiltTool> = {}): BuiltTool {
	return {
		name: 'local_tool',
		description: 'Returns a fixed result',
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve(output),
		...overrides,
	};
}

/** Runs one call of `tool` and returns the stored tool-call block and the list. */
async function runAndReadBlock(tool: BuiltTool) {
	const list = new AgentMessageList();
	list.addResponse([
		{
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolCallId: TOOL_CALL_ID,
					toolName: tool.name,
					input: {},
					state: 'pending',
				},
			],
		},
	]);
	const outcome = await createRunner().processToolCall({
		toolCallId: TOOL_CALL_ID,
		toolName: tool.name,
		input: {},
		toolMap: new Map([[tool.name, tool]]),
		list,
		runId: 'run-1',
	});
	const [host] = list.responseDelta();
	const block = (host as Message).content.find(
		(part): part is ContentToolCall => part.type === 'tool-call',
	);
	return { outcome, block, list };
}

describe('ToolCallRunner — results that report a failure', () => {
	it('marks the stored block of an MCP tool whose result has isError: true', async () => {
		const tool = registryMcpTool({
			content: [{ type: 'text', text: 'channel_not_found' }],
			isError: true,
		});

		const { outcome, block } = await runAndReadBlock(tool);

		expect(outcome.outcome).toBe('success');
		expect(block).toMatchObject({ state: 'resolved', resultIsError: true });
		// The stored output is the wrapped text, so it cannot show the failure itself.
		expect(block).toMatchObject({
			output: {
				type: 'content',
				value: [
					{
						type: 'text',
						text: expect.stringMatching(
							/^<untrusted_data source="mcp:slack" label="post_message">/,
						),
					},
				],
			},
		});
	});

	it('does not mark the stored block of an MCP tool whose result succeeded', async () => {
		const ok = await runAndReadBlock(
			registryMcpTool({ content: [{ type: 'text', text: 'sent' }] }),
		);
		const explicit = await runAndReadBlock(
			registryMcpTool({ content: [{ type: 'text', text: 'sent' }], isError: false }),
		);

		expect(ok.block).toMatchObject({ state: 'resolved' });
		expect(ok.block).not.toHaveProperty('resultIsError');
		expect(explicit.block).not.toHaveProperty('resultIsError');
	});

	it('marks a trusted tool result with isError: true as well', async () => {
		const { block } = await runAndReadBlock(localTool({ isError: true, message: 'failed' }));

		expect(block).toMatchObject({
			state: 'resolved',
			output: { isError: true, message: 'failed' },
			resultIsError: true,
		});
	});

	it.each([
		['a text result', 'isError: true'],
		['an isError value that is not true', { isError: 'true' }],
		['a list result', [{ isError: true }]],
		['an empty result', null],
	])('does not mark %s', async (_label, output) => {
		const { block } = await runAndReadBlock(localTool(output));

		expect(block).toMatchObject({ state: 'resolved' });
		expect(block).not.toHaveProperty('resultIsError');
	});

	it('never sends the failure marker to the model', async () => {
		const tool = registryMcpTool({
			content: [{ type: 'text', text: 'channel_not_found' }],
			isError: true,
		});

		const { list } = await runAndReadBlock(tool);
		const modelMessages = JSON.stringify(toAiMessages(list.responseDelta() as Message[]));

		expect(modelMessages).toContain('channel_not_found');
		expect(modelMessages).not.toContain('resultIsError');
	});
});

describe('AgentMessageList.setToolCallResult — resultIsError', () => {
	function listWithPendingCall(): AgentMessageList {
		const list = new AgentMessageList();
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: TOOL_CALL_ID,
						toolName: 'my_tool',
						input: {},
						state: 'pending',
					},
				],
			},
		]);
		return list;
	}

	function blockOf(host: unknown): ContentToolCall | undefined {
		return (host as Message).content.find(
			(part): part is ContentToolCall => part.type === 'tool-call',
		);
	}

	it('sets the marker only when the option asks for it', () => {
		const marked = listWithPendingCall().setToolCallResult(TOOL_CALL_ID, 'x', {
			resultIsError: true,
		});
		const unmarked = listWithPendingCall().setToolCallResult(TOOL_CALL_ID, 'x', {
			resultIsError: false,
		});

		expect(blockOf(marked)).toMatchObject({ state: 'resolved', resultIsError: true });
		expect(blockOf(unmarked)).not.toHaveProperty('resultIsError');
	});

	it('removes a marker of an earlier result when the call settles again without one', () => {
		const list = listWithPendingCall();
		list.setToolCallResult(TOOL_CALL_ID, 'failed', { resultIsError: true });

		const host = list.setToolCallResult(TOOL_CALL_ID, 'done');

		expect(blockOf(host)).toMatchObject({ state: 'resolved', output: 'done' });
		expect(blockOf(host)).not.toHaveProperty('resultIsError');
	});
});
