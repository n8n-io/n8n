import { generateText } from 'ai';

import { createModel } from '../model/model-factory';
import { forgetEndpointApiStyles } from '../model/openai-api-style';

// Runs the real OpenAI SDK, which reads reasoning support from the model id.
describe('createModel reasoning on OpenAI endpoints', () => {
	beforeEach(forgetEndpointApiStyles);

	const responsesBody = {
		id: 'resp_1',
		object: 'response',
		created_at: 1,
		status: 'completed',
		model: 'served-model',
		output: [
			{
				type: 'message',
				id: 'msg_1',
				role: 'assistant',
				status: 'completed',
				content: [{ type: 'output_text', text: 'ok', annotations: [] }],
			},
		],
		usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
	};

	async function sentReasoning(config: { id: string } & Record<string, unknown>) {
		const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
			async () =>
				await Promise.resolve(
					new Response(JSON.stringify(responsesBody), {
						headers: { 'content-type': 'application/json' },
					}),
				),
		);
		const model = createModel(
			{ apiKey: 'sk-test', ...config } as Parameters<typeof createModel>[0],
			fetch,
		);
		await generateText({ model, prompt: 'Hello', reasoning: 'high', maxRetries: 0 });

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(fetch.mock.calls[0][1]?.body as string) as Record<string, unknown>;
		return body.reasoning;
	}

	it.each([undefined, 'responses'])(
		'sends reasoning for any model id on a custom endpoint (apiStyle %s)',
		async (apiStyle) => {
			const reasoning = await sentReasoning({
				id: 'openai/bedrock-claude-sonnet',
				url: 'https://proxy.example/v1',
				...(apiStyle ? { apiStyle } : {}),
			});
			expect(reasoning).toMatchObject({ effort: 'high' });
		},
	);

	it('keeps reasoning off a non-reasoning model on the official API', async () => {
		expect(await sentReasoning({ id: 'openai/gpt-4o' })).toBeUndefined();
	});

	it('keeps reasoning on a reasoning model on the official API', async () => {
		expect(await sentReasoning({ id: 'openai/gpt-5-mini' })).toMatchObject({ effort: 'high' });
	});
});
