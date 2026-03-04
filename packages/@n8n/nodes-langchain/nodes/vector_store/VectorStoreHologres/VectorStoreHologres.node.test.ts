import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';

// ─── Mock pg module ──────────────────────────────────────────────────────────

const mockPoolQuery = jest.fn();
const mockPoolConnect = jest.fn();
const mockClientRelease = jest.fn();

jest.mock('pg', () => {
	const Pool = jest.fn().mockImplementation(() => ({
		query: mockPoolQuery,
		connect: mockPoolConnect,
	}));
	return { __esModule: true, default: { Pool } };
});

// ─── Mock createVectorStoreNode ──────────────────────────────────────────────

jest.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	getMetadataFiltersValues: jest.fn(),
	logAiEvent: jest.fn(),
	N8nBinaryLoader: class {},
	N8nJsonLoader: class {},
	logWrapper: (fn: unknown) => fn,
	createVectorStoreNode: (config: {
		getVectorStoreClient: (...args: unknown[]) => unknown;
		populateVectorStore: (...args: unknown[]) => unknown;
		releaseVectorStoreClient: (...args: unknown[]) => unknown;
	}) =>
		class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return config.getVectorStoreClient.apply(config, args);
			}

			async populateVectorStore(...args: unknown[]) {
				return config.populateVectorStore.apply(config, args);
			}

			releaseVectorStoreClient(...args: unknown[]) {
				return config.releaseVectorStoreClient.apply(config, args);
			}
		},
}));

import * as HologresNode from './VectorStoreHologres.node';
import pg from 'pg';

const MockPool = pg.Pool as jest.MockedClass<typeof pg.Pool>;

describe('VectorStoreHologres.node', () => {
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers });
	dataFunctions.logger = {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		verbose: jest.fn(),
	} as unknown as ISupplyDataFunctions['logger'];

	const baseCredentials = {
		host: 'hologres-cn-hangzhou.aliyuncs.com',
		port: 80,
		database: 'testdb',
		user: 'test_user',
		password: 'test_password',
		maxConnections: 50,
	};

	const mockClient = {
		release: mockClientRelease,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockPoolConnect.mockResolvedValue(mockClient);
		mockPoolQuery.mockResolvedValue({ rows: [] });
	});

	describe('getVectorStoreClient', () => {
		it('should create vector store client with default options', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			// Verify pg.Pool was created with correct credentials
			expect(MockPool).toHaveBeenCalledWith(
				expect.objectContaining({
					host: 'hologres-cn-hangzhou.aliyuncs.com',
					port: 80,
					database: 'testdb',
					user: 'test_user',
					password: 'test_password',
					max: 50,
					application_name: 'n8n_hologres_vector_store',
				}),
			);

			// Verify pool.connect was called to initialize client
			expect(mockPoolConnect).toHaveBeenCalled();

			// Verify the returned store has correct properties
			expect(vectorStore).toBeDefined();
			expect(vectorStore._vectorstoreType()).toBe('hologres');
			expect(vectorStore.tableName).toBe('test_vectors');
			expect(vectorStore.distanceMethod).toBe('Cosine');
		});

		it('should create vector store client with custom distance method', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'my_table',
						'options.distanceMethod': 'InnerProduct',
						'options.columnNames.values': {
							idColumnName: 'doc_id',
							vectorColumnName: 'vec',
							contentColumnName: 'content',
							metadataColumnName: 'meta',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			expect(vectorStore.distanceMethod).toBe('InnerProduct');
			expect(vectorStore.columns).toEqual({
				idColumnName: 'doc_id',
				vectorColumnName: 'vec',
				contentColumnName: 'content',
				metadataColumnName: 'meta',
			});
		});

		it('should pass filter to vector store client', async () => {
			const mockEmbeddings = {};
			const filter = { category: 'tech', author: 'test' };

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				filter,
				mockEmbeddings,
				0,
			);

			expect(vectorStore.filter).toEqual(filter);
		});

		it('should use dimensions=0 for retrieve operations', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			expect(vectorStore.dimensions).toBe(0);
		});
	});

	describe('populateVectorStore', () => {
		it('should populate vector store with default options', async () => {
			const mockEmbeddings = {
				embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
			};
			const mockDocuments = [{ pageContent: 'test content', metadata: { id: 1 } }];

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						dimensions: 1536,
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
						'options.hgraphIndex.values': {
							baseQuantizationType: 'rabitq',
							useReorder: true,
							preciseQuantizationType: 'fp32',
							preciseIoType: 'block_memory_io',
							maxDegree: 64,
							efConstruction: 400,
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			// Verify pg.Pool was created
			expect(MockPool).toHaveBeenCalledWith(
				expect.objectContaining({
					host: 'hologres-cn-hangzhou.aliyuncs.com',
					port: 80,
					application_name: 'n8n_hologres_vector_store',
				}),
			);

			// Verify pool.connect was called (for _initializeClient)
			expect(mockPoolConnect).toHaveBeenCalled();

			// Verify pool.query was called for table creation and index setup
			expect(mockPoolQuery).toHaveBeenCalled();
			const calls = mockPoolQuery.mock.calls;

			// First call should be CREATE TABLE
			expect(calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS');
			expect(calls[0][0]).toContain('test_vectors');
			expect(calls[0][0]).toContain('float4[]');

			// Second call should be ALTER TABLE for HGraph index
			expect(calls[1][0]).toContain('ALTER TABLE');
			expect(calls[1][0]).toContain('HGraph');

			// Third call should be INSERT
			expect(calls[2][0]).toContain('INSERT INTO');
		});

		it('should populate vector store with custom HGraph index settings', async () => {
			const mockEmbeddings = {
				embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2]]),
			};
			const mockDocuments = [{ pageContent: 'doc', metadata: {} }];

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'custom_table',
						dimensions: 768,
						'options.distanceMethod': 'Euclidean',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
						'options.hgraphIndex.values': {
							baseQuantizationType: 'sq8',
							useReorder: false,
							maxDegree: 32,
							efConstruction: 200,
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			// Verify ALTER TABLE query contains correct HGraph config
			const alterCall = mockPoolQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === 'string' && (call[0] as string).includes('ALTER TABLE'),
			);
			expect(alterCall).toBeDefined();
			const alterQuery = alterCall![0] as string;
			expect(alterQuery).toContain('sq8');
			expect(alterQuery).toContain('Euclidean');
			expect(alterQuery).not.toContain('use_reorder');
		});

		it('should release client after populating vector store', async () => {
			const mockEmbeddings = {
				embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
			};
			const mockDocuments = [{ pageContent: 'test', metadata: {} }];

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						dimensions: 1536,
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
						'options.hgraphIndex.values': {
							baseQuantizationType: 'rabitq',
							useReorder: true,
							preciseQuantizationType: 'fp32',
							preciseIoType: 'block_memory_io',
							maxDegree: 64,
							efConstruction: 400,
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			// Verify client.release was called after population
			expect(mockClientRelease).toHaveBeenCalled();
		});

		it('should handle empty documents array', async () => {
			const mockEmbeddings = {
				embedDocuments: jest.fn().mockResolvedValue([]),
			};
			const mockDocuments: Array<{ pageContent: string; metadata: Record<string, unknown> }> = [];

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						dimensions: 1536,
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
						'options.hgraphIndex.values': {
							baseQuantizationType: 'rabitq',
							useReorder: true,
							preciseQuantizationType: 'fp32',
							preciseIoType: 'block_memory_io',
							maxDegree: 64,
							efConstruction: 400,
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			await (node as any).populateVectorStore(context, mockEmbeddings, mockDocuments, 0);

			// Should still call CREATE TABLE and ALTER TABLE, but no INSERT
			const insertCalls = mockPoolQuery.mock.calls.filter(
				(call: unknown[]) =>
					typeof call[0] === 'string' && (call[0] as string).includes('INSERT INTO'),
			);
			expect(insertCalls).toHaveLength(0);
		});
	});

	describe('releaseVectorStoreClient', () => {
		it('should release the client connection', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			(node as any).releaseVectorStoreClient(vectorStore);
			expect(mockClientRelease).toHaveBeenCalled();
		});
	});

	describe('HologresVectorStore internal behavior', () => {
		it('should build similarity search query with Cosine distance', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			mockPoolQuery.mockResolvedValue({
				rows: [
					{
						id: '1',
						text: 'hello world',
						metadata: { source: 'test' },
						embedding: [0.1, 0.2],
						_distance: 0.95,
					},
				],
			});

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			const results = await vectorStore.similaritySearchVectorWithScore([0.1, 0.2], 5);

			// Verify query uses approx_cosine_distance and DESC ordering
			const searchCall = mockPoolQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === 'string' && (call[0] as string).includes('approx_cosine_distance'),
			);
			expect(searchCall).toBeDefined();
			expect(searchCall![0]).toContain('ORDER BY "_distance" DESC');

			// Verify results are correctly parsed
			expect(results).toHaveLength(1);
			expect(results[0][0].pageContent).toBe('hello world');
			expect(results[0][0].metadata).toEqual({ source: 'test' });
			expect(results[0][1]).toBe(0.95);
		});

		it('should build similarity search query with Euclidean distance', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Euclidean',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			mockPoolQuery.mockResolvedValue({ rows: [] });

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			await vectorStore.similaritySearchVectorWithScore([0.1, 0.2], 3);

			const searchCall = mockPoolQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === 'string' && (call[0] as string).includes('approx_euclidean_distance'),
			);
			expect(searchCall).toBeDefined();
			expect(searchCall![0]).toContain('ORDER BY "_distance" ASC');
		});

		it('should include metadata filter in similarity search WHERE clause', async () => {
			const mockEmbeddings = {};
			const filter = { category: 'tech' };

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			mockPoolQuery.mockResolvedValue({ rows: [] });

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				filter,
				mockEmbeddings,
				0,
			);

			await vectorStore.similaritySearchVectorWithScore([0.1, 0.2], 5);

			const searchCall = mockPoolQuery.mock.calls.find(
				(call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('WHERE'),
			);
			expect(searchCall).toBeDefined();
			expect(searchCall![0]).toContain("metadata->>'category'");
			expect(searchCall![1]).toContain('tech');
		});

		it('should delete documents by ids', async () => {
			const mockEmbeddings = {};

			const context = {
				getCredentials: jest.fn().mockResolvedValue(baseCredentials),
				getNodeParameter: jest.fn((name: string) => {
					const map: Record<string, unknown> = {
						tableName: 'test_vectors',
						'options.distanceMethod': 'Cosine',
						'options.columnNames.values': {
							idColumnName: 'id',
							vectorColumnName: 'embedding',
							contentColumnName: 'text',
							metadataColumnName: 'metadata',
						},
					};
					return map[name];
				}),
				getNode: () => ({ name: 'VectorStoreHologres' }),
				logger: dataFunctions.logger,
			} as never;

			const node = new HologresNode.VectorStoreHologres();
			const vectorStore = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			await vectorStore.delete({ ids: ['id1', 'id2'] });

			const deleteCall = mockPoolQuery.mock.calls.find(
				(call: unknown[]) =>
					typeof call[0] === 'string' && (call[0] as string).includes('DELETE FROM'),
			);
			expect(deleteCall).toBeDefined();
			expect(deleteCall![0]).toContain('test_vectors');
			expect(deleteCall![1]).toEqual([['id1', 'id2']]);
		});
	});
});
