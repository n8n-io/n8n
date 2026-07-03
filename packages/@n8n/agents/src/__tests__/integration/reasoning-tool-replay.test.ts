import { expect, it } from 'vitest';

import {
	describeIf,
	collectStreamChunks,
	collectTextDeltas,
	chunksOfType,
	createReasoningAgentWithAddTool,
	REASONING_PROVIDER_CASES,
	type ReasoningProviderCase,
} from './helpers';
import { type ContentReasoning, filterLlmMessages } from '../../index';

/**
 * Reasoning + tool-call replay integration tests.
 *
 * A reasoning model that calls a client-executed tool forces a second
 * provider request that replays the assistant turn (reasoning + tool call)
 * from history. Providers reject a replayed tool call whose reasoning block
 * was stripped, so these tests pin the reasoning replay path: in record mode
 * a regression fails with a provider error, in CI replay mode it fails
 * because the second request no longer matches the cassette.
 *
 * Runs once per entry in REASONING_PROVIDER_CASES. Test titles embed the
 * provider because cassette paths are derived from the test name alone.
 */

function hasReplayMetadata(block: ContentReasoning, reasoningCase: ReasoningProviderCase): boolean {
	const metadata = {
		...block.providerOptions?.[reasoningCase.provider],
		...(block.providerMetadata?.[reasoningCase.provider] as Record<string, unknown> | undefined),
	};
	if (reasoningCase.provider === 'anthropic') {
		return typeof metadata.signature === 'string' || typeof metadata.redactedData === 'string';
	}
	return (
		typeof metadata.itemId === 'string' || typeof metadata.reasoningEncryptedContent === 'string'
	);
}

for (const reasoningCase of REASONING_PROVIDER_CASES) {
	const describe = describeIf(reasoningCase.provider);

	describe(`reasoning with tool calls (${reasoningCase.provider})`, () => {
		it(`${reasoningCase.provider} replays reasoning across a tool-call round trip`, async () => {
			const agent = createReasoningAgentWithAddTool(reasoningCase);

			const { stream } = await agent.stream(
				'What is 17 + 25? Use the add_numbers tool to compute it.',
			);
			const chunks = await collectStreamChunks(stream);

			// Provider rejections surface as error chunks, not thrown errors —
			// assert on them first so a replay failure names its actual cause.
			expect(chunksOfType(chunks, 'error')).toEqual([]);

			const toolResults = chunksOfType(chunks, 'tool-result').filter(
				(chunk) => chunk.toolName === 'add_numbers',
			);
			expect(toolResults.length).toBeGreaterThanOrEqual(1);
			expect((toolResults[0].output as { result: number }).result).toBe(42);

			// The final answer proves the post-tool request succeeded — i.e. the
			// replayed history (reasoning + tool call) was accepted by the provider.
			const text = collectTextDeltas(chunks);
			expect(text).toContain('42');
		});

		it(`${reasoningCase.provider} retains reasoning replay metadata on history messages`, async () => {
			const agent = createReasoningAgentWithAddTool(reasoningCase);

			const result = await agent.generate(
				'What is 19 + 23? Use the add_numbers tool to compute it.',
			);

			const reasoningBlocks = filterLlmMessages(result.messages)
				.filter((message) => message.role === 'assistant')
				.flatMap((message) =>
					message.content.filter((block): block is ContentReasoning => block.type === 'reasoning'),
				);

			expect(reasoningBlocks.length).toBeGreaterThan(0);
			expect(reasoningBlocks.some((block) => hasReplayMetadata(block, reasoningCase))).toBe(true);
		});
	});
}
