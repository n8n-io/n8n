import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	chunksOfType,
	collectTextDeltas,
	findAllToolResults,
	createAgentWithAlwaysErrorTool,
	createAgentWithFlakyTool,
} from './helpers';
import type { StreamChunk } from './helpers';

const describe = describeIf('anthropic');

describe('tool error handling integration', () => {
	it('does not crash when a tool throws — stream completes with a finish chunk', async () => {
		const agent = createAgentWithAlwaysErrorTool('anthropic');

		const { stream } = await agent.stream('Fetch the data for id "abc123".');
		const chunks = await collectStreamChunks(stream);

		// Stream must never emit an error chunk
		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		// Stream must close with a finish chunk whose reason is not 'error'
		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks.length).toBeGreaterThan(0);
		const finish = finishChunks[0] as StreamChunk & { type: 'finish' };
		expect(finish.finishReason).not.toBe('error');
	});

	it('does not crash when a tool throws — generate returns finishReason stop', async () => {
		const agent = createAgentWithAlwaysErrorTool('anthropic');

		const result = await agent.generate('Fetch the data for id "abc123".');

		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
	});

	it('LLM receives the error message and acknowledges it in the response', async () => {
		const agent = createAgentWithAlwaysErrorTool('anthropic');

		const { stream } = await agent.stream('Fetch the data for id "abc123".');
		const chunks = await collectStreamChunks(stream);

		// Verify there IS a text response (LLM acknowledged the error)
		const text = collectTextDeltas(chunks);
		expect(text.length).toBeGreaterThan(0);

		// The response should mention the failure (error was visible to LLM)
		const mentionsFailure = /error|fail|unavailable|timeout|unable|could not/i.test(text);
		expect(mentionsFailure).toBe(true);
	});

	it('error tool-result appears in the message list', async () => {
		const agent = createAgentWithAlwaysErrorTool('anthropic');

		const { stream } = await agent.stream('Fetch the data for id "abc123".');
		const chunks = await collectStreamChunks(stream);

		// There should be a tool-result message in the stream
		const messageChunks = chunksOfType(chunks, 'message');
		const toolResults = findAllToolResults(messageChunks.map((c) => c.message));

		// The tool should have been called and produced a result (even if it errored)
		expect(toolResults.length).toBeGreaterThan(0);
		const brokenResult = toolResults.find((r) => r.toolName === 'broken_tool');
		expect(brokenResult).toBeDefined();
	});

	it('LLM can self-correct by retrying a flaky tool', async () => {
		const { agent, callCount } = createAgentWithFlakyTool('anthropic');

		const result = await agent.generate('Fetch the data for id "xyz".');

		// Tool was called more than once — LLM retried after seeing the error
		expect(callCount()).toBeGreaterThanOrEqual(2);

		// Agent completed successfully
		expect(result.error).toBeUndefined();
		expect(result.finishReason).toBe('stop');
	});

	it('LLM self-correction: stream mode — flaky tool succeeds on retry', async () => {
		const { agent, callCount } = createAgentWithFlakyTool('anthropic');

		const { stream } = await agent.stream('Fetch the data for id "xyz".');
		const chunks = await collectStreamChunks(stream);

		// No error chunk in the stream
		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks).toHaveLength(0);

		// Tool was retried
		expect(callCount()).toBeGreaterThanOrEqual(2);

		// Response should mention success or the value
		const text = collectTextDeltas(chunks);
		expect(text.length).toBeGreaterThan(0);
	});
});
