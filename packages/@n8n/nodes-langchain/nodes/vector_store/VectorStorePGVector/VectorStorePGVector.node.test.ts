import { VectorStorePGVector } from '../VectorStorePGVector/VectorStorePGVector.node';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';

// Mock configurePostgres
jest.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: jest.fn(),
}));

// Mock helpers
jest.mock('@utils/helpers', () => ({
	logAiEvent: jest.fn(),
	getMetadataFiltersValues: jest.fn().mockReturnValue(undefined),
}));

// We only need handleInsertOperation for the insert test; others can be simple stubs.
jest.mock('../../vector_store/shared/createVectorStoreNode/operations', () => {
	// Use the real module so we can call the actual implementation when needed
	const actual = jest.requireActual('../../vector_store/shared/createVectorStoreNode/operations');
	return {
		...actual,
		handleInsertOperation: jest.fn(async (ctx: any, args: any, embeddings: any) => {
			// Simulate creation of documents and call the node's populateVectorStore function
			const documents = [{ id: '1', pageContent: 'hello' }];
			await (args as any).populateVectorStore(ctx, embeddings, documents, 0);
			return [];
		}),
		handleUpdateOperation: jest.fn(),
		handleRetrieveOperation: jest.fn(),
		handleRetrieveAsToolOperation: jest.fn(),
	};
});

// Provide a class-like mock so ExtendedPGVectorStore can extend it
jest.mock('@langchain/community/vectorstores/pgvector', () => {
	const mockFromDocuments = jest.fn();
	class MockPGVectorStore {
		static fromDocuments = mockFromDocuments;
		constructor(
			public embeddings?: any,
			public args?: any,
		) {
			(this as any).client = null;
			(this as any).filter = args?.filter ?? {};
			this.args = args;
		}

		async _initializeClient() {
			return;
		}
		async ensureTableInDatabase() {
			return;
		}
		async ensureCollectionTableInDatabase() {
			return;
		}
		async similaritySearchVectorWithScore() {
			return [];
		}
	}

	// Make instance methods mockable via prototype
	MockPGVectorStore.prototype._initializeClient = jest.fn().mockResolvedValue(undefined);
	MockPGVectorStore.prototype.ensureTableInDatabase = jest.fn().mockResolvedValue(undefined);
	MockPGVectorStore.prototype.ensureCollectionTableInDatabase = jest
		.fn()
		.mockResolvedValue(undefined);

	return { PGVectorStore: MockPGVectorStore, __esModule: true };
});

describe('VectorStorePGVector -> execute (load) triggers ----', () => {
	const mockPool = { dummy: 'pool' };

	const mockContext: any = {
		initialize: jest.fn(),
		// These will be used by the code path / or by our mocked handleInsertOperation
		getNodeParameter: jest.fn(),
		getInputConnectionData: jest.fn(),
		getInputData: jest.fn(),
		getCredentials: jest.fn(),
		getNode: jest.fn(),
	};

	const mockGetNodeParameter = (skipValidation: boolean) => {
		return (name: string, itemIndex: number, defaultValue: any) => {
			if (name === 'mode') return 'load';
			if (name === 'tableName') return 'n8n_vectors';
			if (name === 'options') return {};
			if (name === 'options.collection.values')
				return {
					useCollection: true,
					collectionName: 'my_collection',
					collectionTableName: 'my_collection_table',
				};
			if (name === 'options.columnNames.values')
				return {
					idColumnName: 'id',
					vectorColumnName: 'embedding',
					contentColumnName: 'text',
					metadataColumnName: 'metadata',
				};
			if (name === 'prompt') return '';
			if (name === 'topK') return 4;
			if (name === 'useReranker') return false;
			if (name === 'includeDocumentMetadata') return false;
			if (name === 'skipInitializationCheck') {
				console.log('check: ' + skipValidation);
				return skipValidation;
			}

			return defaultValue;
		};
	};

	const pgModule = require('@langchain/community/vectorstores/pgvector');

	beforeEach(() => {
		jest.resetAllMocks();

		// configurePostgres returns an object with db.$pool
		(configurePostgres as jest.Mock).mockResolvedValue({ db: { $pool: mockPool } });

		pgModule.PGVectorStore.prototype.ensureTableInDatabase.mockResolvedValue(undefined);
		pgModule.PGVectorStore.prototype.ensureCollectionTableInDatabase.mockResolvedValue(undefined);

		// The node expects embeddings from input connection; return a dummy object
		const mockEmbeddings = {
			embedDocuments: jest.fn(),
			embedQuery: jest.fn(),
		};
		mockContext.getInputConnectionData.mockResolvedValue(mockEmbeddings);
		mockContext.getInputData.mockReturnValue([1]);
		mockEmbeddings.embedQuery.mockResolvedValue([]);
		mockEmbeddings.embedDocuments.mockResolvedValue([]);
		mockContext.getCredentials.mockResolvedValue({ user: 'pg', password: 'pw' });
	});

	it('execute (load) should call ensureTableInDatabase', async () => {
		// Default node parameters used inside populateVectorStore
		const mockCtx = { ...mockContext };
		mockCtx.getNodeParameter.mockImplementation(mockGetNodeParameter(false));

		// Create node instance
		const nodeInstance: any = new VectorStorePGVector();

		// Call the execute method with our mocked "this"
		await nodeInstance.execute.call(mockCtx);
		expect(mockCtx.getInputData).toHaveBeenCalledTimes(1);

		// validate ensureTableInDatabase get a call
		expect(pgModule.PGVectorStore.prototype.ensureTableInDatabase).toHaveBeenCalledTimes(1);
	});

	it('execute (load) should not call ensureTableInDatabase', async () => {
		// Default node parameters used inside populateVectorStore
		mockContext.getNodeParameter.mockImplementation(mockGetNodeParameter(true));

		// Create node instance
		const nodeInstance: any = new VectorStorePGVector();

		// Call the execute method with our mocked "this"
		await nodeInstance.execute.call(mockContext);
		expect(mockContext.getInputData).toHaveBeenCalledTimes(1);

		// validate ensureTableInDatabase arent execute
		expect(pgModule.PGVectorStore.prototype.ensureTableInDatabase).toHaveBeenCalledTimes(0);
	});
});
