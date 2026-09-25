import type { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { OperationalError } from 'n8n-workflow';

import { BedrockInvokeModelEmbeddings } from '../BedrockInvokeModelEmbeddings';

const encodeResponse = (body: unknown) => ({
	body: new TextEncoder().encode(JSON.stringify(body)),
});

describe('BedrockInvokeModelEmbeddings', () => {
	const createClient = (response: unknown) => {
		const send = vi.fn().mockResolvedValue(encodeResponse(response));
		return { client: { send } as unknown as BedrockRuntimeClient, send };
	};

	const sentBody = (send: ReturnType<typeof vi.fn>, callIndex = 0) => {
		const command = send.mock.calls[callIndex][0] as InvokeModelCommand;
		return JSON.parse(command.input.body as string) as Record<string, unknown>;
	};

	describe('Titan-style models', () => {
		it('sends inputText and returns the embedding', async () => {
			const { client, send } = createClient({ embedding: [0.1, 0.2] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'amazon.titan-embed-text-v2:0',
			});

			const result = await embeddings.embedQuery('hello world');

			expect(result).toEqual([0.1, 0.2]);
			expect(sentBody(send)).toEqual({ inputText: 'hello world' });
			const command = send.mock.calls[0][0] as InvokeModelCommand;
			expect(command.input.modelId).toBe('amazon.titan-embed-text-v2:0');
		});

		it('replaces newlines with spaces', async () => {
			const { client, send } = createClient({ embedding: [0.1] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'amazon.titan-embed-text-v1',
			});

			await embeddings.embedQuery('line one\nline two');

			expect(sentBody(send)).toEqual({ inputText: 'line one line two' });
		});

		it('parses a Titan binary-only embeddingTypes response (no embedding field)', async () => {
			const { client } = createClient({
				inputTextTokenCount: 3,
				embeddingsByType: { binary: [1, 0, 1] },
			});
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'amazon.titan-embed-text-v2:0',
				additionalModelRequestFields: { embeddingTypes: ['binary'] },
			});

			await expect(embeddings.embedQuery('hello')).resolves.toEqual([1, 0, 1]);
		});

		it('prefers the embedding field over embeddingsByType when both are present', async () => {
			const { client } = createClient({
				embedding: [0.1, 0.2],
				embeddingsByType: { float: [0.1, 0.2], binary: [1, 0] },
			});
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'amazon.titan-embed-text-v2:0',
				additionalModelRequestFields: { embeddingTypes: ['float', 'binary'] },
			});

			await expect(embeddings.embedQuery('hello')).resolves.toEqual([0.1, 0.2]);
		});

		it('merges additional model request fields into the body', async () => {
			const { client, send } = createClient({ embedding: [0.1] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'amazon.titan-embed-text-v2:0',
				additionalModelRequestFields: { dimensions: 256, normalize: true },
			});

			await embeddings.embedQuery('hello');

			expect(sentBody(send)).toEqual({ inputText: 'hello', dimensions: 256, normalize: true });
		});
	});

	describe('Cohere embed models', () => {
		it('sends texts with input_type search_query for queries', async () => {
			const { client, send } = createClient({ embeddings: [[0.3, 0.4]] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-multilingual-v3',
			});

			const result = await embeddings.embedQuery('hello');

			expect(result).toEqual([0.3, 0.4]);
			expect(sentBody(send)).toEqual({ texts: ['hello'], input_type: 'search_query' });
		});

		it('sends input_type search_document for documents', async () => {
			const { client, send } = createClient({ embeddings: [[0.3]] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
			});

			const result = await embeddings.embedDocuments(['doc one', 'doc two']);

			expect(result).toEqual([[0.3], [0.3]]);
			expect(send).toHaveBeenCalledTimes(2);
			expect(sentBody(send, 0)).toEqual({ texts: ['doc one'], input_type: 'search_document' });
			expect(sentBody(send, 1)).toEqual({ texts: ['doc two'], input_type: 'search_document' });
		});

		it('detects Cohere models behind an inference profile ID', async () => {
			const { client, send } = createClient({ embeddings: [[0.3]] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'us.cohere.embed-english-v3:0',
			});

			await embeddings.embedQuery('hello');

			expect(sentBody(send)).toHaveProperty('texts');
		});

		it('parses the embeddings.float response shape', async () => {
			const { client } = createClient({ embeddings: { float: [[0.5, 0.6]] } });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
			});

			await expect(embeddings.embedQuery('hello')).resolves.toEqual([0.5, 0.6]);
		});

		it('parses a single non-float embedding_types response (e.g. int8)', async () => {
			const { client } = createClient({ embeddings: { int8: [[3, -7]] } });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
				additionalModelRequestFields: { embedding_types: ['int8'] },
			});

			await expect(embeddings.embedQuery('hello')).resolves.toEqual([3, -7]);
		});

		it('prefers float when multiple embedding types are returned', async () => {
			const { client } = createClient({ embeddings: { int8: [[3]], float: [[0.5]] } });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
				additionalModelRequestFields: { embedding_types: ['float', 'int8'] },
			});

			await expect(embeddings.embedQuery('hello')).resolves.toEqual([0.5]);
		});

		it('rejects an ambiguous multi-type response without float', async () => {
			const { client } = createClient({ embeddings: { int8: [[3]], binary: [[1]] } });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
				additionalModelRequestFields: { embedding_types: ['int8', 'binary'] },
			});

			await expect(embeddings.embedQuery('hello')).rejects.toThrow(OperationalError);
		});

		it('lets additional fields override the default input_type', async () => {
			const { client, send } = createClient({ embeddings: [[0.3]] });
			const embeddings = new BedrockInvokeModelEmbeddings({
				client,
				model: 'cohere.embed-english-v3',
				additionalModelRequestFields: { input_type: 'classification' },
			});

			await embeddings.embedQuery('hello');

			expect(sentBody(send)).toEqual({ texts: ['hello'], input_type: 'classification' });
		});
	});

	it('throws an OperationalError on an unexpected response shape', async () => {
		const { client } = createClient({ unexpected: true });
		const embeddings = new BedrockInvokeModelEmbeddings({
			client,
			model: 'amazon.titan-embed-text-v2:0',
		});

		await expect(embeddings.embedQuery('hello')).rejects.toThrow(OperationalError);
	});

	it('propagates client errors without retrying in the LangChain caller', async () => {
		const send = vi.fn().mockRejectedValue(new Error('AccessDenied'));
		const embeddings = new BedrockInvokeModelEmbeddings({
			client: { send } as unknown as BedrockRuntimeClient,
			model: 'amazon.titan-embed-text-v2:0',
		});

		await expect(embeddings.embedQuery('hello')).rejects.toThrow('AccessDenied');
		expect(send).toHaveBeenCalledTimes(1);
	});
});
