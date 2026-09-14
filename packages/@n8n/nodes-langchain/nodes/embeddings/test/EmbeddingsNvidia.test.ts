/* eslint-disable n8n-nodes-base/node-filename-against-convention */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { EmbeddingsNvidia } from '../EmbeddingsNvidia/EmbeddingsNvidia.node';
import { NvidiaEmbeddings } from '../EmbeddingsNvidia/helpers';
import { NVIDIA_EMBEDDING_MODELS, searchModels } from '../EmbeddingsNvidia/methods/searchModels';

vi.mock('../EmbeddingsNvidia/helpers', () => ({ NvidiaEmbeddings: vi.fn() }));

class MockProxyAgent {}

vi.mock('@n8n/ai-utilities', async () => {
	const actual = await vi.importActual('@n8n/ai-utilities');
	return {
		...actual,
		logWrapper: vi.fn().mockImplementation(() => vi.fn()),
		getProxyAgent: vi.fn().mockImplementation(() => new MockProxyAgent()),
	};
});

const MockedNvidiaEmbeddings = vi.mocked(NvidiaEmbeddings);

describe('EmbeddingsNvidia', () => {
	let node: EmbeddingsNvidia;

	const mockNode: INode = {
		id: '1',
		name: 'NVIDIA Nemotron Embeddings',
		typeVersion: 1,
		type: '@n8n/n8n-nodes-langchain.embeddingsNvidia',
		position: [0, 0],
		parameters: {},
	};

	const setupMockContext = (credentialOverrides: Partial<{ apiKey: string; url: string }> = {}) => {
		const ctx = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as Mocked<ISupplyDataFunctions>;

		ctx.getCredentials = vi.fn().mockResolvedValue({
			apiKey: 'test-key',
			url: 'https://integrate.api.nvidia.com/v1',
			...credentialOverrides,
		});
		ctx.getNode = vi.fn().mockReturnValue(mockNode);
		ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
			if (paramName === 'model') return 'nvidia/llama-3.2-nv-embedqa-1b-v2';
			if (paramName === 'options') return {};
			return undefined;
		});
		ctx.logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		};
		return ctx;
	};

	beforeEach(() => {
		node = new EmbeddingsNvidia();
		vi.clearAllMocks();
	});

	describe('node description', () => {
		it('should have the correct node properties', () => {
			expect(node.description).toMatchObject({
				displayName: 'NVIDIA Nemotron Embeddings',
				name: 'embeddingsNvidia',
				group: ['transform'],
				version: [1],
			});
		});

		it('should require a single nvidiaApi credential', () => {
			expect(node.description.credentials).toEqual([{ name: 'nvidiaApi', required: true }]);
		});

		it('should output ai_embedding', () => {
			expect(node.description.outputs).toEqual(['ai_embedding']);
			expect(node.description.outputNames).toEqual(['Embeddings']);
		});

		it('should be discoverable via the nemotron alias', () => {
			expect(node.description.codex?.alias).toContain('nemotron');
		});

		it('should use a resourceLocator model picker backed by searchModels', () => {
			const modelProp = node.description.properties.find((p) => p.name === 'model');
			expect(modelProp?.type).toBe('resourceLocator');
			const listMode = modelProp?.modes?.find((m) => m.name === 'list');
			expect(listMode?.typeOptions?.searchListMethod).toBe('searchModels');
			// A free-text mode lets self-hosted NIM users enter arbitrary model IDs.
			expect(modelProp?.modes?.some((m) => m.name === 'id')).toBe(true);
		});
	});

	describe('supplyData', () => {
		it('should pass the credential url to the embeddings configuration', async () => {
			const ctx = setupMockContext();

			const result = await node.supplyData.call(ctx, 0);

			expect(ctx.getCredentials).toHaveBeenCalledWith('nvidiaApi');
			expect(MockedNvidiaEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: 'test-key',
					model: 'nvidia/llama-3.2-nv-embedqa-1b-v2',
					configuration: expect.objectContaining({
						baseURL: 'https://integrate.api.nvidia.com/v1',
						fetchOptions: { dispatcher: expect.any(MockProxyAgent) },
					}),
				}),
			);
			expect(result).toHaveProperty('response');
		});

		it('should accept a self-hosted base URL on the same credential', async () => {
			const ctx = setupMockContext({ url: 'http://localhost:8000/v1', apiKey: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedNvidiaEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({
					configuration: expect.objectContaining({ baseURL: 'http://localhost:8000/v1' }),
				}),
			);
		});

		it('should fall back to a placeholder apiKey when the credential has none', async () => {
			const ctx = setupMockContext({ apiKey: '' });

			await node.supplyData.call(ctx, 0);

			expect(MockedNvidiaEmbeddings).toHaveBeenCalledWith(
				expect.objectContaining({ apiKey: 'unused' }),
			);
		});

		it('should treat a timeout of -1 as no timeout', async () => {
			const ctx = setupMockContext();
			ctx.getNodeParameter = vi.fn().mockImplementation((paramName: string) => {
				if (paramName === 'model') return 'nvidia/nv-embedqa-e5-v5';
				if (paramName === 'options') return { timeout: -1, batchSize: 256 };
				return undefined;
			});

			await node.supplyData.call(ctx, 0);

			const callArgs = MockedNvidiaEmbeddings.mock.calls[0][0];
			expect(callArgs).toMatchObject({ model: 'nvidia/nv-embedqa-e5-v5', batchSize: 256 });
			expect(callArgs?.timeout).toBeUndefined();
		});
	});

	describe('searchModels', () => {
		const buildLoadOptionsContext = (data: Array<{ id: string }>) =>
			({
				getCredentials: vi.fn().mockResolvedValue({ url: 'https://integrate.api.nvidia.com/v1' }),
				helpers: {
					httpRequestWithAuthentication: vi.fn().mockResolvedValue({ data }),
				},
			}) as unknown as Mocked<ILoadOptionsFunctions>;

		it('should surface only curated, supported embedding models', async () => {
			const ctx = buildLoadOptionsContext([
				{ id: 'nvidia/llama-3.2-nv-embedqa-1b-v2' }, // supported
				{ id: 'nvidia/nv-embedqa-e5-v5' }, // supported
				{ id: 'nvidia/llama-3.3-nemotron-super-49b-v1' }, // a chat model, not an embedding model
				{ id: 'baai/bge-m3' }, // embedding model but no input_type support
			]);

			const result = await searchModels.call(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith('nvidiaApi', {
				url: 'https://integrate.api.nvidia.com/v1/models',
			});
			const ids = result.results.map((r) => r.value);
			expect(ids).toEqual(['nvidia/llama-3.2-nv-embedqa-1b-v2', 'nvidia/nv-embedqa-e5-v5']);
			expect(ids).not.toContain('nvidia/llama-3.3-nemotron-super-49b-v1');
			expect(ids).not.toContain('baai/bge-m3');
		});

		it('should apply a case-insensitive search filter within the supported set', async () => {
			const ctx = buildLoadOptionsContext(NVIDIA_EMBEDDING_MODELS.map((id) => ({ id })));

			const result = await searchModels.call(ctx, 'E5');

			expect(result.results).toEqual([
				{ name: 'nvidia/nv-embedqa-e5-v5', value: 'nvidia/nv-embedqa-e5-v5' },
			]);
		});

		it('should return an empty list when the endpoint exposes no supported models', async () => {
			const ctx = buildLoadOptionsContext([{ id: 'meta/llama-3.1-8b-instruct' }]);

			const result = await searchModels.call(ctx);

			expect(result.results).toEqual([]);
		});
	});
});
