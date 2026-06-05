import { NvidiaEmbeddings } from '../EmbeddingsNvidia/helpers';

type CreateFn = ReturnType<typeof vi.fn>;

describe('NvidiaEmbeddings', () => {
	const buildEmbeddings = (overrides: Record<string, unknown> = {}) => {
		const create: CreateFn = vi.fn().mockImplementation((body: { input: string | string[] }) => {
			const inputs = Array.isArray(body.input) ? body.input : [body.input];
			return { data: inputs.map(() => ({ embedding: [0.1, 0.2, 0.3] })) };
		});

		const embeddings = new NvidiaEmbeddings({
			apiKey: 'test-key',
			model: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
			configuration: { baseURL: 'https://integrate.api.nvidia.com/v1' },
			...overrides,
		});

		// Replace the OpenAI client so no real request is made and the request body is observable.
		(embeddings as unknown as { client: { embeddings: { create: CreateFn } } }).client = {
			embeddings: { create },
		};

		return { embeddings, create };
	};

	it('should send input_type "passage" when embedding documents', async () => {
		const { embeddings, create } = buildEmbeddings();

		await embeddings.embedDocuments(['hello world']);

		expect(create).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0][0]).toMatchObject({
			model: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
			input_type: 'passage',
		});
	});

	it('should send input_type "query" when embedding a query', async () => {
		const { embeddings, create } = buildEmbeddings();

		await embeddings.embedQuery('what is n8n?');

		expect(create).toHaveBeenCalledTimes(1);
		expect(create.mock.calls[0][0]).toMatchObject({ input_type: 'query' });
	});

	it('should set input_type "passage" on every request when documents are chunked into batches', async () => {
		const { embeddings, create } = buildEmbeddings({ batchSize: 1 });

		await embeddings.embedDocuments(['doc a', 'doc b', 'doc c']);

		expect(create).toHaveBeenCalledTimes(3);
		for (const call of create.mock.calls) {
			expect(call[0]).toMatchObject({ input_type: 'passage' });
		}
	});

	it('should not leak passage mode into a subsequent query call', async () => {
		const { embeddings, create } = buildEmbeddings();

		await embeddings.embedDocuments(['a doc']);
		await embeddings.embedQuery('a query');

		expect(create.mock.calls[0][0]).toMatchObject({ input_type: 'passage' });
		expect(create.mock.calls[1][0]).toMatchObject({ input_type: 'query' });
	});
});
