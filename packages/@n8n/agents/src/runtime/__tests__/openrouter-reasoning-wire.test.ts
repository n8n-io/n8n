import type { ProviderOptions } from '@ai-sdk/provider-utils';
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
	const MODEL_ID = 'openrouter/anthropic/claude-fable-5.1';

	function fakeFetch() {
		const completion = JSON.stringify({
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
		});
		const fetch = vi.fn(
			async () =>
				await Promise.resolve(
					new Response(completion, {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
				),
		);
		return fetch;
	}

	function sentBody(fetch: ReturnType<typeof fakeFetch>): Record<string, unknown> {
		const [, init] = fetch.mock.calls[0] as unknown as [unknown, { body: string }];
		try {
			return JSON.parse(init.body) as Record<string, unknown>;
		} catch (error) {
			throw new Error(`request body was not JSON: ${String(error)}`);
		}
	}

	function thinkingOptions(reasoningEffort?: 'low'): ProviderOptions | undefined {
		return getProviderQuirks('openrouter').thinkingToProviderOptions?.(
			reasoningEffort ? { reasoningEffort } : {},
			MODEL_ID,
		) as ProviderOptions | undefined;
	}

	it("sends the effort as OpenRouter's unified `reasoning.effort` parameter", async () => {
		const fetch = fakeFetch();
		const model = createModel(
			{ id: MODEL_ID, apiKey: 'or-test' },
			fetch as unknown as typeof globalThis.fetch,
		);

		await generateText({ model, prompt: 'hi', providerOptions: thinkingOptions('low') });

		const body = sentBody(fetch);
		expect(body.reasoning).toEqual({ effort: 'low' });
		expect(body).not.toHaveProperty('reasoningEffort');
		expect(body).not.toHaveProperty('reasoning_effort');
	});

	it('sends no reasoning parameter when effort is unset', async () => {
		const fetch = fakeFetch();
		const model = createModel(
			{ id: MODEL_ID, apiKey: 'or-test' },
			fetch as unknown as typeof globalThis.fetch,
		);

		await generateText({ model, prompt: 'hi', providerOptions: thinkingOptions() });

		expect(sentBody(fetch)).not.toHaveProperty('reasoning');
	});
});
