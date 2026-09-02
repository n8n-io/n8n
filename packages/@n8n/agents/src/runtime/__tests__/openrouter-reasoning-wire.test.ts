import { generateText } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import { createModel } from '../model/model-factory';
import { getProviderQuirks } from '../model/provider-quirks';

/**
 * Exercises the real `@openrouter/ai-sdk-provider` against a fake fetch so the
 * assertion is on the bytes that leave the process, not on the shape the quirk
 * returns. The provider spreads `providerOptions.openrouter` straight into the
 * request body, so a wrongly named key is dropped upstream without any error.
 */
describe('openrouter reasoning effort on the wire', () => {
	function fakeFetch() {
		const fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						id: 'gen-1',
						model: 'anthropic/claude-fable-5.1',
						choices: [
							{
								index: 0,
								message: { role: 'assistant', content: 'ok' },
								finish_reason: 'stop',
							},
						],
						usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
		);
		return fetch as unknown as typeof globalThis.fetch;
	}

	function sentBody(fetch: typeof globalThis.fetch): Record<string, unknown> {
		const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
			unknown,
			{ body: string },
		];
		return JSON.parse(call[1].body) as Record<string, unknown>;
	}

	it("sends the effort as OpenRouter's unified `reasoning.effort` parameter", async () => {
		const fetch = fakeFetch();
		const model = createModel(
			{ id: 'openrouter/anthropic/claude-fable-5.1', apiKey: 'or-test' },
			fetch,
		);

		await generateText({
			model,
			prompt: 'hi',
			providerOptions: getProviderQuirks('openrouter').thinkingToProviderOptions?.(
				{ reasoningEffort: 'low' },
				'openrouter/anthropic/claude-fable-5.1',
			),
		});

		const body = sentBody(fetch);
		expect(body.reasoning).toEqual({ effort: 'low' });
		expect(body).not.toHaveProperty('reasoningEffort');
		expect(body).not.toHaveProperty('reasoning_effort');
	});

	it('sends no reasoning parameter when effort is unset', async () => {
		const fetch = fakeFetch();
		const model = createModel(
			{ id: 'openrouter/anthropic/claude-fable-5.1', apiKey: 'or-test' },
			fetch,
		);

		await generateText({
			model,
			prompt: 'hi',
			providerOptions: getProviderQuirks('openrouter').thinkingToProviderOptions?.(
				{},
				'openrouter/anthropic/claude-fable-5.1',
			),
		});

		expect(sentBody(fetch)).not.toHaveProperty('reasoning');
	});
});
