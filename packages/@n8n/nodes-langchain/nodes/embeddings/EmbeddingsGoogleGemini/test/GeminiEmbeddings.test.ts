import { TaskType, type GenerativeModel } from '@google/generative-ai';

import { GeminiEmbeddings } from '../helpers';

type EmbedFn = ReturnType<typeof vi.fn>;

interface MockClient {
	embedContent: EmbedFn;
	batchEmbedContents: EmbedFn;
}

const createMockClient = (): MockClient => ({
	embedContent: vi.fn().mockResolvedValue({ embedding: { values: [0.1, 0.2] } }),
	batchEmbedContents: vi.fn().mockImplementation(
		async (request: { requests: unknown[] }) =>
			await Promise.resolve({
				embeddings: request.requests.map((_, index) => ({ values: [index] })),
			}),
	),
});

describe('GeminiEmbeddings', () => {
	// Replace both GenerativeModel instances so no request leaves the process and the request
	// bodies are observable: `embedClient` is ours, `client` belongs to the base class.
	const buildEmbeddings = (overrides: Record<string, unknown> = {}) => {
		const embeddings = new GeminiEmbeddings({
			apiKey: 'test-key',
			model: 'models/gemini-embedding-001',
			...overrides,
		});
		const ownClient = createMockClient();
		const baseClient = createMockClient();
		const instance = embeddings as unknown as {
			embedClient: GenerativeModel;
			client: GenerativeModel;
		};
		instance.embedClient = ownClient as unknown as GenerativeModel;
		instance.client = baseClient as unknown as GenerativeModel;

		return { embeddings, ownClient, baseClient };
	};

	describe('with outputDimensionality set', () => {
		it('sends outputDimensionality when embedding a query', async () => {
			const { embeddings, ownClient, baseClient } = buildEmbeddings({ outputDimensionality: 768 });

			const result = await embeddings.embedQuery('What is n8n?');

			expect(result).toEqual([0.1, 0.2]);
			expect(baseClient.embedContent).not.toHaveBeenCalled();
			expect(ownClient.embedContent).toHaveBeenCalledTimes(1);
			expect(ownClient.embedContent.mock.calls[0][0]).toEqual({
				content: { role: 'user', parts: [{ text: 'What is n8n?' }] },
				taskType: undefined,
				title: undefined,
				outputDimensionality: 768,
			});
		});

		it('sends outputDimensionality on every batched document request', async () => {
			const { embeddings, ownClient, baseClient } = buildEmbeddings({ outputDimensionality: 768 });
			embeddings.maxBatchSize = 2;

			const result = await embeddings.embedDocuments(['a', 'b', 'c']);

			expect(baseClient.batchEmbedContents).not.toHaveBeenCalled();
			expect(ownClient.batchEmbedContents).toHaveBeenCalledTimes(2);
			const [firstBatch, secondBatch] = ownClient.batchEmbedContents.mock.calls.map(
				(call) => (call[0] as { requests: Array<Record<string, unknown>> }).requests,
			);
			expect(firstBatch).toHaveLength(2);
			expect(secondBatch).toHaveLength(1);
			for (const request of [...firstBatch, ...secondBatch]) {
				expect(request).toMatchObject({ outputDimensionality: 768 });
			}
			expect(firstBatch[0].content).toEqual({ role: 'user', parts: [{ text: 'a' }] });
			expect(secondBatch[0].content).toEqual({ role: 'user', parts: [{ text: 'c' }] });
			// One embedding per input, in input order.
			expect(result).toEqual([[0], [1], [0]]);
		});

		it('rejects when a batch request fails instead of returning empty vectors', async () => {
			// maxRetries: 0 keeps the AsyncCaller from retrying the rejected mock with backoff.
			const { embeddings, ownClient } = buildEmbeddings({
				outputDimensionality: 768,
				maxRetries: 0,
			});
			embeddings.maxBatchSize = 1;
			ownClient.batchEmbedContents
				.mockRejectedValueOnce(new Error('quota exceeded'))
				.mockResolvedValueOnce({ embeddings: [{ values: [0.5] }] });

			await expect(embeddings.embedDocuments(['a', 'b'])).rejects.toThrow('quota exceeded');
		});

		it('honours stripNewLines, taskType and title in the request it builds', async () => {
			const { embeddings, ownClient } = buildEmbeddings({
				outputDimensionality: 1536,
				taskType: TaskType.RETRIEVAL_DOCUMENT,
				title: 'Docs',
			});
			// The base class only exposes stripNewLines as a field, not as a constructor option.
			embeddings.stripNewLines = false;

			await embeddings.embedQuery('line one\nline two');

			expect(ownClient.embedContent.mock.calls[0][0]).toEqual({
				content: { role: 'user', parts: [{ text: 'line one\nline two' }] },
				taskType: TaskType.RETRIEVAL_DOCUMENT,
				title: 'Docs',
				outputDimensionality: 1536,
			});
		});

		it('sends query requests through the configured fetch function', async () => {
			const fetch = vi
				.fn<typeof globalThis.fetch>()
				.mockResolvedValue(
					new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), { status: 200 }),
				);
			const embeddings = new GeminiEmbeddings({
				apiKey: 'test-key',
				baseUrl: 'https://gemini.example.com',
				model: 'models/gemini-embedding-001',
				outputDimensionality: 768,
				fetch,
			});

			const result = await embeddings.embedQuery('What is n8n?');

			expect(result).toEqual([0.1, 0.2]);
			expect(fetch).toHaveBeenCalledTimes(1);
			const [url, init] = fetch.mock.calls[0];
			expect(String(url)).toBe(
				'https://gemini.example.com/v1beta/models/gemini-embedding-001:embedContent',
			);
			expect(JSON.parse(String(init?.body))).toMatchObject({ outputDimensionality: 768 });
		});

		it('sends batched document requests through the configured fetch function', async () => {
			const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
				new Response(JSON.stringify({ embeddings: [{ values: [0.1] }, { values: [0.2] }] }), {
					status: 200,
				}),
			);
			const embeddings = new GeminiEmbeddings({
				apiKey: 'test-key',
				baseUrl: 'https://gemini.example.com',
				model: 'models/gemini-embedding-001',
				outputDimensionality: 768,
				fetch,
			});

			const result = await embeddings.embedDocuments(['a', 'b']);

			expect(result).toEqual([[0.1], [0.2]]);
			expect(fetch).toHaveBeenCalledTimes(1);
			const [url, init] = fetch.mock.calls[0];
			expect(String(url)).toBe(
				'https://gemini.example.com/v1beta/models/gemini-embedding-001:batchEmbedContents',
			);
			const { requests } = JSON.parse(String(init?.body)) as {
				requests: Array<Record<string, unknown>>;
			};
			for (const request of requests) {
				expect(request).toMatchObject({ outputDimensionality: 768 });
			}
		});

		it('replaces newlines with spaces by default', async () => {
			const { embeddings, ownClient } = buildEmbeddings({ outputDimensionality: 768 });

			await embeddings.embedQuery('line one\nline two');

			expect(ownClient.embedContent.mock.calls[0][0]).toMatchObject({
				content: { parts: [{ text: 'line one line two' }] },
			});
		});
	});

	describe('without outputDimensionality', () => {
		it('delegates queries to the base class and sends no outputDimensionality', async () => {
			const { embeddings, ownClient, baseClient } = buildEmbeddings();

			const result = await embeddings.embedQuery('What is n8n?');

			expect(result).toEqual([0.1, 0.2]);
			expect(ownClient.embedContent).not.toHaveBeenCalled();
			expect(baseClient.embedContent).toHaveBeenCalledTimes(1);
			expect(baseClient.embedContent.mock.calls[0][0]).not.toHaveProperty('outputDimensionality');
		});

		it('delegates documents to the base class and sends no outputDimensionality', async () => {
			const { embeddings, ownClient, baseClient } = buildEmbeddings();

			await embeddings.embedDocuments(['a', 'b']);

			expect(ownClient.batchEmbedContents).not.toHaveBeenCalled();
			expect(baseClient.batchEmbedContents).toHaveBeenCalledTimes(1);
			const { requests } = baseClient.batchEmbedContents.mock.calls[0][0] as {
				requests: Array<Record<string, unknown>>;
			};
			expect(requests).toHaveLength(2);
			for (const request of requests) {
				expect(request).not.toHaveProperty('outputDimensionality');
			}
		});
	});

	it('strips the models/ prefix from the model name like the base class', () => {
		const { embeddings } = buildEmbeddings({ outputDimensionality: 768 });

		expect(embeddings.model).toBe('gemini-embedding-001');
		expect(embeddings.outputDimensionality).toBe(768);
	});
});
