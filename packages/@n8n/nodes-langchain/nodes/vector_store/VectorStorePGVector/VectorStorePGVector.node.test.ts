// cspell:ignore pgvector langchain vectorstores vectorstore
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStoreNodeConstructorArgs } from '@n8n/ai-utilities';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { Pool } from 'pg';
import { mock } from 'vitest-mock-extended';

const { capturedConfigRef } = vi.hoisted(() => ({
	capturedConfigRef: { current: undefined as VectorStoreNodeConstructorArgs<any> | undefined },
}));

vi.mock('@n8n/ai-utilities', () => ({
	metadataFilterField: {},
	createVectorStoreNode: (config: VectorStoreNodeConstructorArgs<any>) => {
		capturedConfigRef.current = config;

		return class TestVectorStoreNode {
			async getVectorStoreClient(...args: Parameters<typeof config.getVectorStoreClient>) {
				if (!capturedConfigRef.current) throw new Error('Vector store config not captured');
				return await capturedConfigRef.current.getVectorStoreClient(...args);
			}

			async populateVectorStore(...args: Parameters<typeof config.populateVectorStore>) {
				if (!capturedConfigRef.current) throw new Error('Vector store config not captured');
				return await capturedConfigRef.current.populateVectorStore(...args);
			}
		};
	},
}));

const configurePostgresMock = vi.fn();

vi.mock('n8n-nodes-base/dist/nodes/Postgres/transport/index', () => ({
	configurePostgres: (...args: unknown[]) => configurePostgresMock(...args),
}));

import { ExtendedPGVectorStore, VectorStorePGVector } from './VectorStorePGVector.node';

type FakeClient = { release: ReturnType<typeof vi.fn> };
type FakePool = {
	query: ReturnType<typeof vi.fn>;
	connect: ReturnType<typeof vi.fn<() => Promise<FakeClient>>>;
};

function createFakePool(): FakePool {
	const client: FakeClient = { release: vi.fn() };
	return {
		query: vi.fn().mockResolvedValue({ rows: [] }),
		connect: vi.fn().mockResolvedValue(client),
	};
}

function extensionQueries(pool: FakePool): string[] {
	return pool.query.mock.calls
		.map(([query]) => query as string)
		.filter((query) => query.includes('CREATE EXTENSION'));
}

function tableQueries(pool: FakePool): string[] {
	return pool.query.mock.calls
		.map(([query]) => query as string)
		.filter((query) => query.includes('CREATE TABLE'));
}

const fakeEmbeddings = {
	embedDocuments: vi.fn().mockResolvedValue([[0.1, 0.2]]),
	embedQuery: vi.fn().mockResolvedValue([0.1, 0.2]),
} as unknown as Embeddings;

const documents: Document[] = [{ pageContent: 'hello', metadata: {} }];

describe('VectorStorePGVector.node', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('ExtendedPGVectorStore.ensureTableInDatabase', () => {
		it('does not create the pgvector extension by default', async () => {
			const pool = createFakePool();
			const store = new ExtendedPGVectorStore(fakeEmbeddings, {
				pool: pool as unknown as Pool,
				tableName: 'n8n_vectors',
			});

			await store.ensureTableInDatabase();

			expect(extensionQueries(pool)).toHaveLength(0);
			expect(tableQueries(pool)).toHaveLength(1);
			expect(tableQueries(pool)[0]).toContain('CREATE TABLE IF NOT EXISTS n8n_vectors');
		});

		it('creates the pgvector extension when createExtension is true', async () => {
			const pool = createFakePool();
			const store = new ExtendedPGVectorStore(fakeEmbeddings, {
				pool: pool as unknown as Pool,
				tableName: 'n8n_vectors',
				createExtension: true,
			});

			await store.ensureTableInDatabase();

			expect(extensionQueries(pool)).toEqual(['CREATE EXTENSION IF NOT EXISTS vector;']);
			expect(tableQueries(pool)).toHaveLength(1);
		});

		it('schema-qualifies the extension creation when extensionSchemaName is set', async () => {
			const pool = createFakePool();
			const store = new ExtendedPGVectorStore(fakeEmbeddings, {
				pool: pool as unknown as Pool,
				tableName: 'n8n_vectors',
				extensionSchemaName: 'myschema',
				createExtension: true,
			});

			await store.ensureTableInDatabase();

			expect(extensionQueries(pool)).toEqual([
				'CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA "myschema";',
			]);
		});

		it('skips all queries when skipInitializationCheck is true', async () => {
			const pool = createFakePool();
			const store = new ExtendedPGVectorStore(fakeEmbeddings, {
				pool: pool as unknown as Pool,
				tableName: 'n8n_vectors',
				createExtension: true,
				skipInitializationCheck: true,
			});

			await store.ensureTableInDatabase();

			expect(pool.query).not.toHaveBeenCalled();
		});

		it('includes the vector dimensions in the column type when provided', async () => {
			const pool = createFakePool();
			const store = new ExtendedPGVectorStore(fakeEmbeddings, {
				pool: pool as unknown as Pool,
				tableName: 'n8n_vectors',
			});

			await store.ensureTableInDatabase(1536);

			expect(tableQueries(pool)[0]).toContain('vector(1536)');
		});
	});

	describe('getVectorStoreClient', () => {
		const baseParams: Record<string, unknown> = {
			tableName: 'n8n_vectors',
			'options.collection.values': {},
			'options.columnNames.values': {
				idColumnName: 'id',
				vectorColumnName: 'embedding',
				contentColumnName: 'text',
				metadataColumnName: 'metadata',
			},
			'options.distanceStrategy': 'cosine',
		};

		function createContext(overrides: Record<string, unknown> = {}) {
			const context = mock<IExecuteFunctions>();
			context.getNodeParameter.mockImplementation(((
				name: string,
				_itemIndex: number,
				fallback?: unknown,
			) => {
				const params = { ...baseParams, ...overrides };
				return name in params ? params[name] : fallback;
			}) as IExecuteFunctions['getNodeParameter']);
			context.getCredentials.mockResolvedValue({});
			return context;
		}

		it('does not create the extension when the option is left at its default', async () => {
			const pool = createFakePool();
			configurePostgresMock.mockResolvedValue({ db: { $pool: pool } });
			const context = createContext();

			await capturedConfigRef.current!.getVectorStoreClient(context, undefined, fakeEmbeddings, 0);

			expect(extensionQueries(pool)).toHaveLength(0);
		});

		it('creates the extension when options.createExtension is true', async () => {
			const pool = createFakePool();
			configurePostgresMock.mockResolvedValue({ db: { $pool: pool } });
			const context = createContext({ 'options.createExtension': true });

			await capturedConfigRef.current!.getVectorStoreClient(context, undefined, fakeEmbeddings, 0);

			expect(extensionQueries(pool)).toHaveLength(1);
		});
	});

	describe('populateVectorStore', () => {
		const baseParams: Record<string, unknown> = {
			tableName: 'n8n_vectors',
			'options.collection.values': {},
			'options.columnNames.values': {
				idColumnName: 'id',
				vectorColumnName: 'embedding',
				contentColumnName: 'text',
				metadataColumnName: 'metadata',
			},
		};

		function createContext(overrides: Record<string, unknown> = {}) {
			const context = mock<IExecuteFunctions>();
			context.getNodeParameter.mockImplementation(((
				name: string,
				_itemIndex: number,
				fallback?: unknown,
			) => {
				const params = { ...baseParams, ...overrides };
				return name in params ? params[name] : fallback;
			}) as IExecuteFunctions['getNodeParameter']);
			context.getCredentials.mockResolvedValue({});
			return context;
		}

		it('initializes the store, adds documents and releases the client, without using fromDocuments', async () => {
			const fromDocumentsSpy = vi.spyOn(PGVectorStore, 'fromDocuments');
			const pool = createFakePool();
			configurePostgresMock.mockResolvedValue({ db: { $pool: pool } });
			const context = createContext();

			await capturedConfigRef.current!.populateVectorStore(context, fakeEmbeddings, documents, 0);

			expect(fromDocumentsSpy).not.toHaveBeenCalled();
			expect(extensionQueries(pool)).toHaveLength(0);
			expect(
				pool.query.mock.calls.some(([query]) => (query as string).includes('INSERT INTO')),
			).toBe(true);
			const client = await pool.connect();
			expect(client.release).toHaveBeenCalled();
		});

		it('creates the extension during insert when options.createExtension is true', async () => {
			const pool = createFakePool();
			configurePostgresMock.mockResolvedValue({ db: { $pool: pool } });
			const context = createContext({ 'options.createExtension': true });

			await capturedConfigRef.current!.populateVectorStore(context, fakeEmbeddings, documents, 0);

			expect(extensionQueries(pool)).toHaveLength(1);
		});
	});

	describe('node description', () => {
		it('exposes a createExtension option (default false) on insert and retrieve fields', () => {
			void VectorStorePGVector;
			const config = capturedConfigRef.current!;

			for (const fields of [config.insertFields ?? [], config.retrieveFields ?? []]) {
				const optionsField = fields.find((field) => field.name === 'options');
				const createExtensionOption = (
					optionsField?.options as unknown as Array<Record<string, unknown>> | undefined
				)?.find((option) => option.name === 'createExtension');

				expect(createExtensionOption).toMatchObject({
					type: 'boolean',
					default: false,
				});
			}
		});
	});
});
