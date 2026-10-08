import type { Embeddings } from '@langchain/core/embeddings';
import type { INode } from 'n8n-workflow';
import type pg from 'pg';

import { escapeQualifiedSqlIdentifier, escapeSqlIdentifier } from '@utils/sqlIdentifier';

const mockState: {
	lastInstance?: any;
} = {};

vi.mock('@langchain/community/vectorstores/pgvector', () => {
	class PGVectorStore {
		tableName: string;
		schemaName: string | null = null;
		collectionTableName?: string;
		filter?: Record<string, unknown>;
		pool?: pg.Pool;
		client = { release: vi.fn() };
		_initializeClient = vi.fn();
		ensureTableInDatabase = vi.fn();
		ensureCollectionTableInDatabase = vi.fn();
		similaritySearchVectorWithScore = vi.fn();
		addDocuments = vi.fn().mockResolvedValue(undefined);

		constructor(_embeddings: unknown, args: Record<string, unknown> = {}) {
			this.tableName = (args.tableName as string) ?? '';
			this.schemaName = (args.schemaName as string) ?? null;
			this.collectionTableName = args.collectionTableName as string | undefined;
			this.filter = args.filter as Record<string, unknown> | undefined;
			this.pool = args.pool as pg.Pool | undefined;
			mockState.lastInstance = this;
		}
	}
	return { PGVectorStore };
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

import { configurePostgres } from 'n8n-nodes-base/dist/nodes/Postgres/transport/index';
import type { MockedFunction } from 'vitest';
import { ExtendedPGVectorStore, VectorStorePGVector } from './VectorStorePGVector.node';

const MockConfigurePostgres = configurePostgres as MockedFunction<typeof configurePostgres>;

const embeddings = {} as unknown as Embeddings;
const node = { name: 'Postgres PGVector Store' } as unknown as INode;

function createStore(args: {
	tableName: string;
	collectionTableName?: string;
	filter?: Record<string, unknown>;
}): ExtendedPGVectorStore {
	const queryMock = vi.fn().mockResolvedValue({ rows: [] });
	const pool = { query: queryMock } as unknown as pg.Pool;
	const store = new ExtendedPGVectorStore(embeddings, {
		pool,
		tableName: args.tableName,
		collectionName: args.collectionTableName ? 'collection' : undefined,
		collectionTableName: args.collectionTableName,
		filter: args.filter as Record<string, never> | undefined,
	});
	store.n8nNode = node;
	return store;
}

describe('ExtendedPGVectorStore', () => {
	const maliciousName = 'x"; DROP TABLE victim; --';

	describe('computedTableName', () => {
		it('quotes a plain table name', () => {
			const store = createStore({ tableName: 'n8n_vectors' });
			expect(store.computedTableName).toBe('"n8n_vectors"');
		});

		it('folds mixed-case names to preserve the previous unquoted target', () => {
			const store = createStore({ tableName: 'MyTable' });
			expect(store.computedTableName).toBe('"mytable"');
		});

		it('quotes a statement-breaking table name as a single identifier', () => {
			const store = createStore({ tableName: maliciousName });
			expect(store.computedTableName).toBe(escapeQualifiedSqlIdentifier(maliciousName));
			expect(store.computedTableName).toBe('"x""; drop table victim; --"');
		});
	});

	describe('computedCollectionTableName', () => {
		it('quotes the collection table name', () => {
			const store = createStore({
				tableName: 'n8n_vectors',
				collectionTableName: maliciousName,
			});
			expect(store.computedCollectionTableName).toBe(escapeQualifiedSqlIdentifier(maliciousName));
		});
	});

	describe('ensureCollectionTableInDatabase', () => {
		it('issues SQL with quoted table, constraint and index identifiers', async () => {
			const queryMock = vi.fn().mockResolvedValue({ rows: [] });
			const pool = { query: queryMock } as unknown as pg.Pool;
			const store = new ExtendedPGVectorStore(embeddings, {
				pool,
				tableName: maliciousName,
				collectionName: 'collection',
				collectionTableName: 'n8n_collections',
			});
			store.n8nNode = node;

			await store.ensureCollectionTableInDatabase();

			const sql = queryMock.mock.calls[0]?.[0] as string;

			// Table name only appears as a fully quoted identifier.
			expect(sql).toContain(escapeQualifiedSqlIdentifier(maliciousName));
			// The constraint name embeds the table name but is escaped as one identifier.
			expect(sql).toContain(escapeSqlIdentifier(`${maliciousName}_collection_id_fkey`));
			// The index name embeds the collection table name and is escaped too.
			expect(sql).toContain(escapeSqlIdentifier('idx_n8n_collections_name'));
			// The quote-then-statement breakout sequence is neutralised.
			expect(sql).not.toContain('x"; DROP');
		});
	});

	describe('similaritySearchVectorWithScore', () => {
		it('rejects a metadata filter key that could break out of a SQL literal', async () => {
			const store = createStore({ tableName: 'n8n_vectors' });

			await expect(
				store.similaritySearchVectorWithScore([0.1, 0.2], 4, {
					"x'); DROP TABLE victim; --": '1',
				}),
			).rejects.toThrow('Invalid metadata filter key');
		});

		it('rejects an unsafe filter supplied at construction time', async () => {
			const store = createStore({
				tableName: 'n8n_vectors',
				filter: { "a' OR '1'='1": 'x' },
			});

			await expect(store.similaritySearchVectorWithScore([0.1, 0.2], 4)).rejects.toThrow(
				'Invalid metadata filter key',
			);
		});
	});
});

const EXTENSION_SQL = 'CREATE EXTENSION IF NOT EXISTS vector';

describe('VectorStorePGVector.node', () => {
	const mockLogger = {
		info: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		verbose: vi.fn(),
	};

	const baseCredentials = {
		host: 'localhost',
		port: 5432,
		database: 'test',
		user: 'test',
		password: 'test',
	};

	const mockClient = {
		query: vi.fn().mockResolvedValue({ rows: [] }),
		release: vi.fn(),
	};
	const mockPool = {
		query: vi.fn().mockResolvedValue({ rows: [] }),
		connect: vi.fn().mockResolvedValue(mockClient),
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
			logger: mockLogger,
		} as never;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockClient.query.mockClear();
		mockClient.release.mockClear();
		mockPool.connect.mockClear();
		MockConfigurePostgres.mockResolvedValue({ db: { $pool: mockPool } } as never);
	});

	describe('getVectorStoreClient', () => {
		it('does not run CREATE EXTENSION when Create Extension is off', async () => {
			const context = makeContext({ ...defaultParams, createExtension: false });
			const nodeInstance = new VectorStorePGVector();
			const vs = await (nodeInstance as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockPool.connect).not.toHaveBeenCalled();
			expect(mockClient.query).not.toHaveBeenCalled();
			expect(vs._initializeClient).toHaveBeenCalled();
			expect(vs.ensureTableInDatabase).toHaveBeenCalled();
		});

		it('runs CREATE EXTENSION before table creation when Create Extension is on', async () => {
			const context = makeContext({ ...defaultParams, createExtension: true });
			const nodeInstance = new VectorStorePGVector();
			const vs = await (nodeInstance as any).getVectorStoreClient(context, undefined, {}, 0);

			expect(mockPool.connect).toHaveBeenCalledTimes(1);
			const queries = mockClient.query.mock.calls.map((c: unknown[]) => c[0]);
			expect(queries).toContain(EXTENSION_SQL);
			expect(
				queries.some((q: unknown) => typeof q === 'string' && q.includes('pg_advisory_xact_lock')),
			).toBe(true);
			expect(mockClient.release).toHaveBeenCalled();
			// table creation runs after the extension is created
			expect(vs.ensureTableInDatabase).toHaveBeenCalled();
			const extensionCallOrder = mockClient.query.mock.invocationCallOrder[0];
			const tableInitCallOrder = (vs.ensureTableInDatabase as any).mock.invocationCallOrder[0];
			expect(extensionCallOrder).toBeLessThan(tableInitCallOrder);
		});
	});

	describe('populateVectorStore', () => {
		it('does not run CREATE EXTENSION when Create Extension is off', async () => {
			const context = makeContext({ ...defaultParams, createExtension: false });
			const nodeInstance = new VectorStorePGVector();
			await (nodeInstance as any).populateVectorStore(
				context,
				{},
				[{ pageContent: 'x', metadata: {} }],
				0,
			);

			expect(mockPool.connect).not.toHaveBeenCalled();
			expect(mockClient.query).not.toHaveBeenCalled();
			expect(mockState.lastInstance.addDocuments).toHaveBeenCalled();
		});

		it('runs CREATE EXTENSION before table creation and document insert when Create Extension is on', async () => {
			const context = makeContext({ ...defaultParams, createExtension: true });
			const nodeInstance = new VectorStorePGVector();
			await (nodeInstance as any).populateVectorStore(
				context,
				{},
				[{ pageContent: 'x', metadata: {} }],
				0,
			);

			expect(mockPool.connect).toHaveBeenCalledTimes(1);
			const queries = mockClient.query.mock.calls.map((c: unknown[]) => c[0]);
			expect(queries).toContain(EXTENSION_SQL);
			expect(
				queries.some((q: unknown) => typeof q === 'string' && q.includes('pg_advisory_xact_lock')),
			).toBe(true);
			expect(mockClient.release).toHaveBeenCalled();
			expect(mockState.lastInstance.ensureTableInDatabase).toHaveBeenCalled();
			expect(mockState.lastInstance.addDocuments).toHaveBeenCalled();
			const extensionCallOrder = mockClient.query.mock.invocationCallOrder[0];
			const tableInitCallOrder = (mockState.lastInstance.ensureTableInDatabase as any)
				.mock.invocationCallOrder[0];
			const addDocsCallOrder = (mockState.lastInstance.addDocuments as any).mock
				.invocationCallOrder[0];
			expect(extensionCallOrder).toBeLessThan(tableInitCallOrder);
			expect(extensionCallOrder).toBeLessThan(addDocsCallOrder);
		});
	});
});
