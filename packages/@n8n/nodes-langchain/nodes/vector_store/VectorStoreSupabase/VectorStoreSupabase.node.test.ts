import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const mockCreateClient = jest.fn();

jest.mock('@langchain/community/vectorstores/supabase', () => {
	class SupabaseVectorStore {
		static fromDocuments = jest.fn();
		static fromExistingIndex = jest.fn();
	}
	return { SupabaseVectorStore };
});

jest.mock('@supabase/supabase-js', () => ({
	createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

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
	}) =>
		class BaseNode {
			async getVectorStoreClient(...args: unknown[]) {
				return config.getVectorStoreClient.apply(config, args);
			}
			async populateVectorStore(...args: unknown[]) {
				return config.populateVectorStore.apply(config, args);
			}
		},
}));

jest.mock('../shared/methods/listSearch', () => ({
	supabaseTableNameSearch: jest.fn(),
}));

jest.mock('../shared/descriptions', () => ({
	supabaseTableNameRLC: {},
}));

import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';

import * as SupabaseNode from './VectorStoreSupabase.node';

const MockSupabaseVectorStore = SupabaseVectorStore as jest.MockedClass<typeof SupabaseVectorStore>;

describe('VectorStoreSupabase.node', () => {
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
		host: 'https://test.supabase.co',
		serviceRole: 'test-service-role-key',
	};

	const mockSupabaseClient = { from: jest.fn() };

	beforeEach(() => {
		jest.resetAllMocks();
		mockCreateClient.mockReturnValue(mockSupabaseClient);
	});

	function createContext(paramOverrides: Record<string, unknown> = {}) {
		const defaults: Record<string, unknown> = {
			tableName: 'documents',
			useCustomSchema: false,
			schema: 'public',
			options: { queryName: 'match_documents' },
		};
		const params = { ...defaults, ...paramOverrides };

		return {
			getCredentials: jest.fn().mockResolvedValue(baseCredentials),
			getNodeParameter: jest.fn((name: string, _itemIndex: number, fallback?: unknown) => {
				if (name in params) return params[name];
				return fallback;
			}),
			getNode: () => ({ name: 'VectorStoreSupabase' }),
			logger: dataFunctions.logger,
		} as never;
	}

	describe('getVectorStoreClient', () => {
		it('should use public schema by default', async () => {
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).getVectorStoreClient(createContext(), undefined, {}, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: 'public' } },
			);
		});

		it('should use custom schema when enabled', async () => {
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);

			const context = createContext({
				useCustomSchema: true,
				schema: 'vector_store',
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: 'vector_store' } },
			);
		});

		it('should pass table name and query name to vector store', async () => {
			const mockEmbeddings = {};
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);

			const context = createContext({
				tableName: 'my_vectors',
				options: { queryName: 'custom_match' },
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			const result = await (node as any).getVectorStoreClient(
				context,
				undefined,
				mockEmbeddings,
				0,
			);

			expect(MockSupabaseVectorStore.fromExistingIndex).toHaveBeenCalledWith(mockEmbeddings, {
				client: mockSupabaseClient,
				tableName: 'my_vectors',
				queryName: 'custom_match',
				filter: undefined,
			});
			expect(result).toBe(mockVectorStore);
		});

		it('should pass filter to vector store', async () => {
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);
			const filter = { key: 'metadata.type', value: 'doc' };

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).getVectorStoreClient(createContext(), filter, {}, 0);

			expect(MockSupabaseVectorStore.fromExistingIndex).toHaveBeenCalledWith(
				{},
				expect.objectContaining({ filter }),
			);
		});
	});

	describe('populateVectorStore', () => {
		it('should use public schema by default', async () => {
			MockSupabaseVectorStore.fromDocuments = jest.fn().mockResolvedValue(undefined);

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).populateVectorStore(createContext(), {}, [], 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: 'public' } },
			);
		});

		it('should use custom schema when enabled', async () => {
			MockSupabaseVectorStore.fromDocuments = jest.fn().mockResolvedValue(undefined);

			const context = createContext({
				useCustomSchema: true,
				schema: 'ai_data',
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).populateVectorStore(context, {}, [], 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: 'ai_data' } },
			);
		});

		it('should throw NodeOperationError when table not found', async () => {
			MockSupabaseVectorStore.fromDocuments = jest
				.fn()
				.mockRejectedValue(new Error('Error inserting: undefined 404 Not Found'));

			const node = new SupabaseNode.VectorStoreSupabase();
			await expect(
				(node as any).populateVectorStore(createContext(), {}, [{ pageContent: 'x' }], 0),
			).rejects.toThrow(NodeOperationError);
		});
	});

	describe('schema validation', () => {
		it('should reject schema names with special characters', async () => {
			MockSupabaseVectorStore.fromExistingIndex = jest.fn();

			const context = createContext({
				useCustomSchema: true,
				schema: 'my-schema; DROP TABLE',
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			await expect(
				(node as any).getVectorStoreClient(context, undefined, {}, 0),
			).rejects.toThrow(NodeOperationError);

			expect(mockCreateClient).not.toHaveBeenCalled();
		});

		it('should reject schema names starting with a digit', async () => {
			MockSupabaseVectorStore.fromExistingIndex = jest.fn();

			const context = createContext({
				useCustomSchema: true,
				schema: '123schema',
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			await expect(
				(node as any).getVectorStoreClient(context, undefined, {}, 0),
			).rejects.toThrow(NodeOperationError);
		});

		it('should accept valid schema names with underscores', async () => {
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);

			const context = createContext({
				useCustomSchema: true,
				schema: '_my_custom_schema_v2',
			});

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: '_my_custom_schema_v2' } },
			);
		});

		it('should not validate schema when useCustomSchema is false', async () => {
			const mockVectorStore = { similaritySearch: jest.fn() };
			MockSupabaseVectorStore.fromExistingIndex = jest.fn().mockResolvedValue(mockVectorStore);

			const context = createContext({ useCustomSchema: false });

			const node = new SupabaseNode.VectorStoreSupabase();
			await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				{ db: { schema: 'public' } },
			);
		});
	});
});
