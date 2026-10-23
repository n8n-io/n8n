/**
 * A model can call a tool by a former name. The runtime renames the call to the
 * current tool and runs it.
 *
 * The model is scripted with `MockLanguageModelV3`, so the real `streamText`
 * tool-call parsing and repair run.
 */
import { convertArrayToReadableStream, MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { chunksOfType, collectStreamChunks } from './helpers';
import { Agent, Tool } from '../../index';

type MockStreamResult = Awaited<ReturnType<MockLanguageModelV3['doStream']>>;
type MockStreamPart = MockStreamResult['stream'] extends ReadableStream<infer P> ? P : never;

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

describe('tool calls under a former tool name', () => {
	it('runs the current tool when the model calls it by a former name', async () => {
		const turns = [
			makeToolCallTurn('tc-1', 'workflows', { action: 'list' }),
			makeTextTurn('Listed the workflows.'),
		];
		let nextTurn = 0;
		const model = new MockLanguageModelV3({
			provider: 'mock',
			modelId: 'scripted',
			doStream: async () => turns[nextTurn++],
		});

		const inputs: unknown[] = [];
		const agent = new Agent('legacy-tool-name-agent')
			.model(model)
			.instructions('Use the tools.')
			.tool(
				new Tool('workflow_builder_workflows')
					.description('Manage workflows')
					.input(z.object({ action: z.string() }))
					.legacyNames('workflows')
					.handler(async (input) => {
						inputs.push(input);
						return { ok: true };
					}),
			);

		const result = await agent.stream('List my workflows');
		const chunks = await collectStreamChunks(result.stream);

		expect(inputs).toEqual([{ action: 'list' }]);
		const toolResults = chunksOfType(chunks, 'tool-result');
		expect(toolResults.map((chunk) => chunk.toolName)).toEqual(['workflow_builder_workflows']);
		expect(toolResults.some((chunk) => chunk.isError === true)).toBe(false);
		expect(chunksOfType(chunks, 'finish').at(-1)?.finishReason).toBe('stop');
	});
});
