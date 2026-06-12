import type { Embeddings } from '@langchain/core/embeddings';
import type { INode } from 'n8n-workflow';
import type pg from 'pg';

import { escapeQualifiedSqlIdentifier, escapeSqlIdentifier } from '@utils/sqlIdentifier';

// Keep the module import light: the node body calls createVectorStoreNode and
// configurePostgres at load time, neither of which is needed to exercise the
// ExtendedPGVectorStore identifier handling.
vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	createVectorStoreNode: () => class {},
}));

vi.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: vi.fn(),
}));

import { ExtendedPGVectorStore } from './VectorStorePGVector.node';

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
