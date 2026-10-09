/* eslint-disable @typescript-eslint/unbound-method */
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { INode, INodeProperties, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsGoogleGemini } from '../EmbeddingsGoogleGemini.node';
import { GeminiEmbeddings } from '../helpers';

vi.mock('../helpers', () => ({ GeminiEmbeddings: vi.fn() }));
vi.mock('@n8n/ai-utilities', () => ({
	logWrapper: vi.fn((value: unknown) => value),
	getConnectionHintNoticeField: vi.fn(() => ({})),
}));

const MockedGeminiEmbeddings = vi.mocked(GeminiEmbeddings);

describe('EmbeddingsGoogleGemini', () => {
	let node: EmbeddingsGoogleGemini;

	const mockNode: INode = {
		id: '1',
		name: 'Embeddings Google Gemini',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (options: Record<string, unknown> = {}) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-key',
			host: 'https://generativelanguage.googleapis.com',
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNode);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'modelName') return 'models/gemini-embedding-001';
			if (paramName === 'options') return options;
			return undefined;
		});
		ctx.logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

		return ctx;
	};

	const findProperty = (name: string): INodeProperties | undefined =>
		node.description.properties.find((property) => property.name === name);

	beforeEach(() => {
		node = new EmbeddingsGoogleGemini();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('describes the dimensionality of the default model correctly', () => {
			const notice = findProperty('notice');

			expect(findProperty('modelName')?.default).toBe('models/gemini-embedding-001');
			expect(notice?.displayName).toContain('3072-dimensional');
			expect(notice?.displayName).not.toContain('768-dimensional');
		});

		it('exposes an Output Dimensionality option', () => {
			const optionsProperty = findProperty('options');

			expect(optionsProperty?.type).toBe('collection');
			expect(optionsProperty?.options).toContainEqual(
				expect.objectContaining({ name: 'outputDimensionality', type: 'number' }),
			);
		});
	});

	describe('supplyData', () => {
		it('passes credentials and model to the embeddings client', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('googlePalmApi');
			expect(MockedGeminiEmbeddings).toHaveBeenCalledWith({
				apiKey: 'test-key',
				baseUrl: 'https://generativelanguage.googleapis.com',
				model: 'models/gemini-embedding-001',
				outputDimensionality: undefined,
			});
			expect(result).toHaveProperty('response');
		});

		it('passes the configured output dimensionality to the embeddings client', async () => {
			const ctx = setupMockContext({ outputDimensionality: 768 });

			await node.supplyData.call(ctx, 0);

			expect(MockedGeminiEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({ outputDimensionality: 768 }),
			);
		});

		it('treats an empty output dimensionality as unset', async () => {
			const ctx = setupMockContext({ outputDimensionality: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedGeminiEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({ outputDimensionality: undefined }),
			);
		});

		it('accepts an output dimensionality that an expression returns as a string', async () => {
			const ctx = setupMockContext({ outputDimensionality: '768' });

			await node.supplyData.call(ctx, 0);

			expect(MockedGeminiEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({ outputDimensionality: 768 }),
			);
		});

		it.each([768.5, 0, -1, 'many'])(
			'rejects the output dimensionality %p before a request is made',
			async (outputDimensionality) => {
				const ctx = setupMockContext({ outputDimensionality });

				await expect(node.supplyData.call(ctx, 0)).rejects.toThrow('Invalid output dimensionality');
				expect(MockedGeminiEmbeddings).not.toHaveBeenCalled();
			},
		);
	});
});
