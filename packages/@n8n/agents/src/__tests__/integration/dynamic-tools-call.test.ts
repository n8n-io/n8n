/**
 * The model reaches catalog tools through the fixed `get_tools` and
 * `call_tool` tools. The runtime runs the real tool under its real name, and
 * the model-facing tool list does not change between turns.
 */
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks } from './helpers';
import { Agent, Tool } from '../../index';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;
type MockCallOptions = Parameters<MockLanguageModelV3['doStream']>[0];

const USAGE: Extract<MockStreamPart, { type: 'finish' }>['usage'] = {
	inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
	outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function makeToolCallTurn(
	toolCallId: string,
	toolName: string,
	args: Record<string, unknown>,
): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(args) },
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function makeTextTurn(text: string): MockStreamResult {
	const parts: MockStreamPart[] = [
		{ type: 'stream-start', warnings: [] },
		{ type: 'text-start', id: 'txt-1' },
		{ type: 'text-delta', id: 'txt-1', delta: text },
		{ type: 'text-end', id: 'txt-1' },
		{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage: USAGE },
	];
	return { stream: convertArrayToReadableStream(parts) };
}

function scriptedAgent(turns: MockStreamResult[], calls: MockCallOptions[], inputs: unknown[]) {
	let nextTurn = 0;
	const model = new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'scripted',
		doStream: async (options) => {
			calls.push(options);
			return turns[nextTurn++];
		},
	});
	return new Agent('dynamic-tools-agent')
		.model(model)
		.instructions('Use the tools.')
		.dynamicTools({
			namespaces: [
				{
					name: 'slack',
					description: 'Slack workspace',
					tools: [
						new Tool('slack_send_message')
							.description('Send a Slack message')
							.input(z.object({ channel: z.string(), text: z.string() }))
							.handler(async (input) => {
								inputs.push(input);
								return await Promise.resolve({ sent: true });
							})
							.build(),
					],
				},
			],
		});
}

function toolNames(options: MockCallOptions): string[] {
	return (options.tools ?? []).map((tool) => tool.name).sort();
}

describe('dynamic tools', () => {
	it('runs the real tool through call_tool with a fixed tool list', async () => {
		const calls: MockCallOptions[] = [];
		const inputs: unknown[] = [];
		const agent = scriptedAgent(
			[
				makeToolCallTurn('tc-1', 'get_tools', { namespace: 'slack' }),
				makeToolCallTurn('tc-2', 'call_tool', {
					namespace: 'slack',
					tool: 'slack_send_message',
					arguments: { channel: 'general', text: 'hi' },
				}),
				makeTextTurn('Sent.'),
			],
			calls,
			inputs,
		);

		const result = await agent.stream('Say hi in general');
		const chunks = await collectStreamChunks(result.stream);

		expect(inputs).toEqual([{ channel: 'general', text: 'hi' }]);
		const toolResults = chunksOfType(chunks, 'tool-result');
		expect(toolResults.map((chunk) => chunk.toolName)).toEqual(['get_tools', 'slack_send_message']);
		expect(toolResults.some((chunk) => chunk.isError === true)).toBe(false);

		expect(calls).toHaveLength(3);
		for (const call of calls) expect(toolNames(call)).toEqual(['call_tool', 'get_tools']);
		expect(JSON.stringify(calls[0].prompt)).toContain('slack_send_message');
	});

	it('returns the input schema when call_tool arguments are invalid', async () => {
		const calls: MockCallOptions[] = [];
		const inputs: unknown[] = [];
		const agent = scriptedAgent(
			[
				makeToolCallTurn('tc-1', 'call_tool', {
					namespace: 'slack',
					tool: 'slack_send_message',
					arguments: { channel: 'general' },
				}),
				makeTextTurn('Failed.'),
			],
			calls,
			inputs,
		);

		const result = await agent.stream('Say hi');
		await collectStreamChunks(result.stream);

		expect(inputs).toEqual([]);
		const secondPrompt = JSON.stringify(calls[1].prompt);
		expect(secondPrompt).toContain('text');
		expect(secondPrompt).toContain('properties');
	});
});
