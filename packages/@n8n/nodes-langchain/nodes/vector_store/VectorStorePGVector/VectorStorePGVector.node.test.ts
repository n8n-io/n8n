import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Mock external modules that are not needed for these unit tests
vi.mock('@langchain/community/vectorstores/pgvector', () => {
	const state: { ctorArgs?: unknown[] } = { ctorArgs: undefined };
	class PGVectorStore {
		static fromDocuments = vi.fn().mockResolvedValue({ client: { release: vi.fn() } });
		_initializeClient = vi.fn();
		ensureTableInDatabase = vi.fn();
		ensureCollectionTableInDatabase = vi.fn();
		similaritySearchVectorWithScore = vi.fn();
		constructor(...args: unknown[]) {
			state.ctorArgs = args;
		}
	}
	return { PGVectorStore, __state: state };
});

vi.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
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

import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import * as PGVectorNode from './VectorStorePGVector.node';
import type { MockedClass, MockedFunction } from 'vitest';

const MockConfigurePostgres = configurePostgres as MockedFunction<typeof configurePostgres>;
const MockPGVectorStore = PGVectorStore as MockedClass<typeof PGVectorStore>;

const EXTENSION_SQL = 'CREATE EXTENSION IF NOT EXISTS vector';

describe('VectorStorePGVector.node', () => {
	const helpers = mock<ISupplyDataFunctions['helpers']>();
	const dataFunctions = mock<ISupplyDataFunctions>({ helpers });
	dataFunctions.logger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		verbose: vi.fn(),
	} as unknown as ISupplyDataFunctions['logger'];

	const baseCredentials = {
		host: 'localhost',
		port: 5432,
		database: 'test',
		user: 'test',
		password: 'test',
	};

	const mockPool = {
		query: vi.fn().mockResolvedValue({ rows: [] }),
	};

	const defaultParams: Record<string, unknown> = {
		tableName: 'n8n_vectors',
		'options.collection.values': {},
		'options.columnNames.values': {
			idColumnName: 'id',
			vectorColumnName: 'embedding',
			contentColumnName: 'text',
			metadataColumnName: 'metadata',
		},
		'options.distanceStrategy': 'cosine',
		createExtension: false,
	};

	function makeContext(params: Record<string, unknown> = {}) {
		return {
			getCredentials: vi.fn().mockResolvedValue(baseCredentials),
			getNodeParameter: vi.fn((name: string) => params[name]),
			getNode: () => ({ name: 'VectorStorePGVector' }),
			logger: dataFunctions.logger,
		} as never;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		MockConfigurePostgres.mockResolvedValue({ db: { $pool: mockPool } } as never);
		MockPGVectorStore.fromDocuments = vi.fn().mockResolvedValue({ client: { release: vi.fn() } });
	});

	describe('getVectorStoreClient', () => {
		it('does not run CREATE EXTENSION when Create Extension is off', async () => {
			const context = makeContext({ ...defaultParams, createExtension: false });
			const node = new PGVectorNode.VectorStorePGVector();
			const vs = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockPool.query).not.toHaveBeenCalled();
			// initialize() ran (table setup happens before table creation)
			expect(vs._initializeClient).toHaveBeenCalled();
			expect(vs.ensureTableInDatabase).toHaveBeenCalled();
		});

		it('runs CREATE EXTENSION before table creation when Create Extension is on', async () => {
			const context = makeContext({ ...defaultParams, createExtension: true });
			const node = new PGVectorNode.VectorStorePGVector();
			const vs = await (node as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockPool.query).toHaveBeenCalledTimes(1);
			expect(mockPool.query).toHaveBeenCalledWith(EXTENSION_SQL);
			// table creation runs after the extension is created
			expect(vs.ensureTableInDatabase).toHaveBeenCalled();
		});
	});

	describe('populateVectorStore', () => {
		it('does not run CREATE EXTENSION when Create Extension is off', async () => {
			const context = makeContext({ ...defaultParams, createExtension: false });
			const node = new PGVectorNode.VectorStorePGVector();
			await (node as any).populateVectorStore(context, {}, [{ pageContent: 'x', metadata: {} }], 0);

			expect(mockPool.query).not.toHaveBeenCalled();
			expect(MockPGVectorStore.fromDocuments).toHaveBeenCalled();
		});

		it('runs CREATE EXTENSION before inserting documents when Create Extension is on', async () => {
			const context = makeContext({ ...defaultParams, createExtension: true });
			const node = new PGVectorNode.VectorStorePGVector();
			await (node as any).populateVectorStore(context, {}, [{ pageContent: 'x', metadata: {} }], 0);

			expect(mockPool.query).toHaveBeenCalledTimes(1);
			expect(mockPool.query).toHaveBeenCalledWith(EXTENSION_SQL);
			expect(MockPGVectorStore.fromDocuments).toHaveBeenCalled();
		});
	});
});
