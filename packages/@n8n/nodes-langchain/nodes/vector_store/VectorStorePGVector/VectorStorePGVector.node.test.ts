import type { Mock } from 'vitest';
import * as pgModule from '@langchain/community/vectorstores/pgvector'; // <- added
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';

import { VectorStorePGVector } from '../VectorStorePGVector/VectorStorePGVector.node';

// Mock configurePostgres
vi.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: vi.fn(),
}));

// Mock helpers (now in @n8n/ai-utilities)
vi.mock('@n8n/ai-utilities', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/ai-utilities')>();
	return {
		...actual,
		logAiEvent: vi.fn(),
		getMetadataFiltersValues: vi.fn().mockReturnValue(undefined),
	};
});

// Provide a class-like mock so ExtendedPGVectorStore can extend it
vi.mock('@langchain/community/vectorstores/pgvector', () => {
	const mockFromDocuments = vi.fn();
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
	MockPGVectorStore.prototype._initializeClient = vi.fn().mockResolvedValue(undefined);
	MockPGVectorStore.prototype.ensureTableInDatabase = vi.fn().mockResolvedValue(undefined);
	MockPGVectorStore.prototype.ensureCollectionTableInDatabase = vi
		.fn()
		.mockResolvedValue(undefined);

	return { PGVectorStore: MockPGVectorStore, __esModule: true };
});

describe('VectorStorePGVector -> execute (load) triggers ----', () => {
	const mockPool = { dummy: 'pool' };

	const mockContext: any = {
		initialize: vi.fn(),
		// These will be used by the code path / or by our mocked handleInsertOperation
		getNodeParameter: vi.fn(),
		getInputConnectionData: vi.fn(),
		getInputData: vi.fn(),
		getCredentials: vi.fn(),
		getNode: vi.fn(),
		logAiEvent: vi.fn(),
		logger: { debug: vi.fn() },
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

	beforeEach(() => {
		vi.resetAllMocks();

		// configurePostgres returns an object with db.$pool
		(configurePostgres as Mock).mockResolvedValue({ db: { $pool: mockPool } });

		(pgModule.PGVectorStore.prototype.ensureTableInDatabase as Mock).mockResolvedValue(undefined);
		(pgModule.PGVectorStore.prototype.ensureCollectionTableInDatabase as Mock).mockResolvedValue(
			undefined,
		);

		// The node expects embeddings from input connection; return a dummy object
		const mockEmbeddings = {
			embedDocuments: vi.fn(),
			embedQuery: vi.fn(),
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
