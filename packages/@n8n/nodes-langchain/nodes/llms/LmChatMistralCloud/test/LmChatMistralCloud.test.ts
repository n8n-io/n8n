import { ChatMistralAI } from '@langchain/mistralai';
import { HTTPClient } from '@mistralai/mistralai/lib/http.js';

describe('Mistral reference chunks', () => {
	it('should stream reference chunks with string and numeric IDs', async () => {
		const event = {
			id: 'completion-1',
			object: 'chat.completion.chunk',
			created: 0,
			model: 'mistral-test',
			choices: [
				{
					index: 0,
					delta: {
						role: 'assistant',
						content: [{ type: 'reference', reference_ids: ['document-1', 2] }],
					},
					finish_reason: null,
				},
			],
		};
		const body = `data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`;
		const httpClient = new HTTPClient({
			fetcher: async () => new Response(body, { headers: { 'content-type': 'text/event-stream' } }),
		});
		const model = new ChatMistralAI({
			apiKey: 'test-api-key',
			model: 'mistral-test',
			httpClient,
			maxRetries: 0,
		});

		const chunks = [];
		for await (const chunk of await model.stream('Cite the source')) chunks.push(chunk);

		expect(chunks).toHaveLength(1);
		expect(chunks[0]?.content).toEqual([{ type: 'reference', referenceIds: ['document-1', 2] }]);
	});
});
