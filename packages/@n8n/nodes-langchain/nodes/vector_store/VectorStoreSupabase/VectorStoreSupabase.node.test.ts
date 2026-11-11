import type { VectorStoreNodeConstructorArgs } from '@n8n/ai-utilities';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// ---------------------------------------------------------------------------
// Module mocks — declared before any imports that pull in the mocked modules
// ---------------------------------------------------------------------------

const mockCreateClient = vi.fn();
const mockFromExistingIndex = vi.fn();
const mockFromDocuments = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
	createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('@langchain/community/vectorstores/supabase', () => ({
	SupabaseVectorStore: class {
		static fromExistingIndex = (...args: unknown[]) => mockFromExistingIndex(...args);
		static fromDocuments = (...args: unknown[]) => mockFromDocuments(...args);
	},
}));

vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	aiClientFetch: vi.fn(),
	createVectorStoreNode: (
		config: Pick<
			VectorStoreNodeConstructorArgs<never>,
			'getVectorStoreClient' | 'populateVectorStore'
		>,
	) =>
		class {
			getVectorStoreClient = config.getVectorStoreClient;
			populateVectorStore = config.populateVectorStore;
		},
}));

vi.mock('../shared/methods/listSearch', () => ({
	supabaseTableNameSearch: vi.fn(),
}));

vi.mock('../shared/descriptions', () => ({
	supabaseTableNameRLC: {},
}));

// ---------------------------------------------------------------------------
// Import under test — after mocks are set up
// ---------------------------------------------------------------------------

import * as SupabaseNode from './VectorStoreSupabase.node';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseCredentials = {
	host: 'https://test.supabase.co',
	serviceRole: 'test-service-role-key',
};

/** Unique sentinel object so we can assert identity, not just equality. */
function makeTaggedClient(tag: string) {
	return { _tag: tag, from: vi.fn() };
}

// Wrapping the callback in `as never` avoids the strict IExecuteFunctions overload
// signature mismatch — acceptable in test code per project conventions.
type ParamFn = (name: string, itemIndex: unknown, fallback?: unknown) => unknown;

function createContext(paramOverrides: Record<string, unknown> = {}) {
	const defaults: Record<string, unknown> = {
		tableName: 'documents',
		useCustomSchema: false,
		schema: 'public',
		options: { queryName: 'match_documents' },
	};
	const params = { ...defaults, ...paramOverrides };

	const context = mock<ISupplyDataFunctions>();
	context.getCredentials.mockResolvedValue(baseCredentials);
	const paramFn: ParamFn = (name, _itemIndex, fallback) => {
		if (name in params) return params[name];
		return fallback;
	};
	context.getNodeParameter.mockImplementation(paramFn as never);
	context.getNode.mockReturnValue({ name: 'VectorStoreSupabase' } as never);

	return context;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VectorStoreSupabase.node', () => {
	const embeddings = {} as never;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Cast to access the callback methods exposed by the createVectorStoreNode shim.
	function getNode() {
		return new SupabaseNode.VectorStoreSupabase() as unknown as Pick<
			VectorStoreNodeConstructorArgs<never>,
			'getVectorStoreClient' | 'populateVectorStore'
		>;
	}

	// -------------------------------------------------------------------------
	// getVectorStoreClient
	// -------------------------------------------------------------------------

	describe('getVectorStoreClient', () => {
		it('uses public schema by default', async () => {
			const taggedClient = makeTaggedClient('default');
			mockCreateClient.mockReturnValue(taggedClient);
			mockFromExistingIndex.mockResolvedValue({ similaritySearch: vi.fn() });

			await getNode().getVectorStoreClient(createContext(), undefined, embeddings, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				expect.objectContaining({ db: { schema: 'public' } }),
			);
		});

		it('preserves auth block when using default schema', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(createContext(), undefined, embeddings, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({
					auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
				}),
			);
		});

		it('uses a custom schema when useCustomSchema is true', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(
				createContext({ useCustomSchema: true, schema: 'ai_data' }),
				undefined,
				embeddings,
				0,
			);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				expect.objectContaining({ db: { schema: 'ai_data' } }),
			);
		});

		it('allows dollar-sign schema names', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(
				createContext({ useCustomSchema: true, schema: 'my$schema' }),
				undefined,
				embeddings,
				0,
			);

			expect(mockCreateClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ db: { schema: 'my$schema' } }),
			);
		});

		it('rejects an empty schema name before constructing the client', async () => {
			await expect(
				getNode().getVectorStoreClient(
					createContext({ useCustomSchema: true, schema: '' }),
					undefined,
					embeddings,
					0,
				),
			).rejects.toThrow(UserError);

			expect(mockCreateClient).not.toHaveBeenCalled();
		});

		it('rejects a schema name with spaces before constructing the client', async () => {
			await expect(
				getNode().getVectorStoreClient(
					createContext({ useCustomSchema: true, schema: 'bad schema' }),
					undefined,
					embeddings,
					0,
				),
			).rejects.toThrow(UserError);

			expect(mockCreateClient).not.toHaveBeenCalled();
		});

		it('passes the schema-configured client to SupabaseVectorStore (R2 guard)', async () => {
			// Use a tagged object so we can assert identity, not just shape equality.
			const taggedClient = makeTaggedClient('schema-client');
			mockCreateClient.mockReturnValue(taggedClient);
			const mockStore = { similaritySearch: vi.fn() };
			mockFromExistingIndex.mockResolvedValue(mockStore);

			await getNode().getVectorStoreClient(
				createContext({ useCustomSchema: true, schema: 'custom' }),
				undefined,
				embeddings,
				0,
			);

			// fromExistingIndex must have received the exact client instance createClient returned.
			const callArgs = mockFromExistingIndex.mock.calls[0];
			expect(callArgs[1].client).toBe(taggedClient);
		});

		it('passes filter unchanged to fromExistingIndex', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});
			const filter = { key: 'metadata.type', value: 'doc' } as never;

			await getNode().getVectorStoreClient(createContext(), filter, embeddings, 0);

			expect(mockFromExistingIndex).toHaveBeenCalledWith(
				embeddings,
				expect.objectContaining({ filter }),
			);
		});

		it('passes tableName and queryName through to fromExistingIndex', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(
				createContext({
					tableName: 'my_vectors',
					options: { queryName: 'custom_match' },
				}),
				undefined,
				embeddings,
				0,
			);

			expect(mockFromExistingIndex).toHaveBeenCalledWith(
				embeddings,
				expect.objectContaining({
					tableName: 'my_vectors',
					queryName: 'custom_match',
				}),
			);
		});

		/**
		 * retrieve and retrieve-as-tool modes both call getVectorStoreClient with the same
		 * signature. Since sharedFields are present in all modes (confirmed: createVectorStoreNode
		 * spreads sharedFields unconditionally), the schema resolution path is identical.
		 * This test explicitly simulates a retrieve-mode invocation.
		 */
		it('retrieve-mode: schema resolution is identical to other modes', async () => {
			const taggedClient = makeTaggedClient('retrieve-client');
			mockCreateClient.mockReturnValue(taggedClient);
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(
				createContext({ useCustomSchema: true, schema: 'retrieve_schema' }),
				undefined,
				embeddings,
				0,
			);

			expect(mockCreateClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ db: { schema: 'retrieve_schema' } }),
			);
			// The exact client was handed to LangChain.
			expect(mockFromExistingIndex.mock.calls[0][1].client).toBe(taggedClient);
		});

		// retrieve and retrieve-as-tool share the getVectorStoreClient path; one explicit
		// retrieve-mode invocation confirms schema resolution and client identity end-to-end.
		it('retrieve-mode: custom schema ai_data is passed to createSupabaseClient and forwarded to fromExistingIndex', async () => {
			const taggedClient = makeTaggedClient('retrieve-ai_data');
			mockCreateClient.mockReturnValue(taggedClient);
			mockFromExistingIndex.mockResolvedValue({});

			await getNode().getVectorStoreClient(
				createContext({ useCustomSchema: true, schema: 'ai_data' }),
				undefined,
				embeddings,
				0,
			);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				expect.objectContaining({ db: { schema: 'ai_data' } }),
			);
			expect(mockFromExistingIndex.mock.calls[0][1].client).toBe(taggedClient);
		});

		it('backward compat: absent useCustomSchema parameter defaults to public (old workflow)', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromExistingIndex.mockResolvedValue({});

			// Simulate an old workflow where getNodeParameter returns the fallback for absent params.
			const context = mock<ISupplyDataFunctions>();
			context.getCredentials.mockResolvedValue(baseCredentials);
			const compatFn: ParamFn = (name, _itemIndex, fallback) => {
				if (name === 'tableName') return 'documents';
				if (name === 'options') return {};
				// All other params (useCustomSchema, schema) return their fallback — simulates
				// an old workflow where these parameters were not saved.
				return fallback;
			};
			context.getNodeParameter.mockImplementation(compatFn as never);
			context.getNode.mockReturnValue({ name: 'VectorStoreSupabase' } as never);

			await getNode().getVectorStoreClient(context, undefined, embeddings, 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ db: { schema: 'public' } }),
			);
		});
	});

	// -------------------------------------------------------------------------
	// populateVectorStore
	// -------------------------------------------------------------------------

	describe('populateVectorStore', () => {
		it('uses public schema by default', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromDocuments.mockResolvedValue(undefined);

			await getNode().populateVectorStore(createContext(), embeddings, [], 0);

			expect(mockCreateClient).toHaveBeenCalledWith(
				baseCredentials.host,
				baseCredentials.serviceRole,
				expect.objectContaining({ db: { schema: 'public' } }),
			);
		});

		it('uses a custom schema when useCustomSchema is true', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromDocuments.mockResolvedValue(undefined);

			await getNode().populateVectorStore(
				createContext({ useCustomSchema: true, schema: 'ai_data' }),
				embeddings,
				[],
				0,
			);

			expect(mockCreateClient).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.objectContaining({ db: { schema: 'ai_data' } }),
			);
		});

		it('rejects an empty schema name before constructing the client', async () => {
			await expect(
				getNode().populateVectorStore(
					createContext({ useCustomSchema: true, schema: '' }),
					embeddings,
					[],
					0,
				),
			).rejects.toThrow(UserError);

			expect(mockCreateClient).not.toHaveBeenCalled();
		});

		it('passes the schema-configured client to SupabaseVectorStore.fromDocuments (R2 guard)', async () => {
			const taggedClient = makeTaggedClient('populate-client');
			mockCreateClient.mockReturnValue(taggedClient);
			mockFromDocuments.mockResolvedValue(undefined);

			await getNode().populateVectorStore(
				createContext({ useCustomSchema: true, schema: 'populate_schema' }),
				embeddings,
				[],
				0,
			);

			const callArgs = mockFromDocuments.mock.calls[0];
			expect(callArgs[2].client).toBe(taggedClient);
		});

		it('maps the 404 error to a user-friendly NodeOperationError', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromDocuments.mockRejectedValue(new Error('Error inserting: undefined 404 Not Found'));

			const result = getNode().populateVectorStore(
				createContext({ tableName: 'my_table' }),
				embeddings,
				[{ pageContent: 'x', metadata: {} }],
				0,
			);

			await expect(result).rejects.toThrow(NodeOperationError);
			await expect(result).rejects.toThrow('Table my_table not found');
		});

		it('wraps other errors in NodeOperationError', async () => {
			mockCreateClient.mockReturnValue({});
			mockFromDocuments.mockRejectedValue(new Error('some unexpected error'));

			await expect(
				getNode().populateVectorStore(
					createContext(),
					embeddings,
					[{ pageContent: 'x', metadata: {} }],
					0,
				),
			).rejects.toThrow(NodeOperationError);
		});
	});
});
