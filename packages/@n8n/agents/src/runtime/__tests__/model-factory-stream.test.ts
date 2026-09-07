import { streamText } from 'ai';

import { createModel } from '../model/model-factory';

describe('createModel streaming', () => {
	it.each([true, false, undefined])(
		'streams content with includeUsage=%s',
		async (includeUsage) => {
			const deltas = [
				...['Let me ', 'think.'].map((text) => ({
					content: [{ type: 'thinking', thinking: [{ type: 'text', text }], closed: true }],
					tool_calls: [],
				})),
				{ content: [{ type: 'text', text: 'The answer ' }] },
				{ content: 'is 391.' },
			];
			const responseChunks = [
				...deltas.map((delta) => ({ choices: [{ index: 0, delta, finish_reason: null }] })),
				{ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
				{
					choices: [],
					usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
				},
			];
			const body = responseChunks
				.map((chunk) => {
					const payload = {
						id: 'completion-1',
						object: 'chat.completion.chunk',
						created: 1,
						model: 'zai-glm-5-2',
						...chunk,
					};
					return `data: ${JSON.stringify(payload)}\n\n`;
				})
				.join('');
			const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				new Response(`${body}data: [DONE]\n\n`, {
					headers: { 'content-type': 'text/event-stream' },
				}),
			);
			const model = createModel(
				{
					id: 'custom/zai-glm-5-2',
					url: 'https://model.example.com/v1',
					apiKey: 'test-key',
					includeUsage,
				},
				fetch,
			);
			const result = streamText({ model, prompt: 'Hello', maxRetries: 0 });
			const chunks = [];
			for await (const chunk of result.fullStream) chunks.push(chunk);

			expect(fetch).toHaveBeenCalledOnce();
			expect(fetch.mock.calls[0][0]).toBe('https://model.example.com/v1/chat/completions');
			const requestBody = fetch.mock.calls[0][1]?.body;
			if (includeUsage) {
				expect(requestBody).toContain('"stream_options":{"include_usage":true}');
			} else {
				expect(requestBody).not.toContain('"stream_options"');
			}
			expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
			expect(chunks.filter((chunk) => chunk.type.startsWith('reasoning-'))).toEqual([
				{ type: 'reasoning-start', id: 'reasoning-0' },
				{ type: 'reasoning-delta', id: 'reasoning-0', text: 'Let me ' },
				{ type: 'reasoning-delta', id: 'reasoning-0', text: 'think.' },
				{ type: 'reasoning-end', id: 'reasoning-0' },
			]);
			await expect(result.text).resolves.toBe('The answer is 391.');
			await expect(result.totalUsage).resolves.toMatchObject({
				inputTokens: 120,
				outputTokens: 30,
				totalTokens: 150,
			});
		},
	);
});
