import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'StoreAgentMemoryEmbeddingsAsBinary1793204018114';

describe('StoreAgentMemoryEmbeddingsAsBinary migration', () => {
	const ids = {
		project: randomUUID(),
		agent: randomUUID(),
		resource: 'draft-chat:user-1',
		thread: randomUUID(),
		candidate: randomUUID(),
		entry: randomUUID(),
		source: randomUUID(),
	};

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(Container.get(DataSource));
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function seed({ escape, runQuery }: TestMigrationContext) {
		const now = new Date();
		await runQuery(
			`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:project, 'Project', 'personal', :now, :now)`,
			{ project: ids.project, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents')}
			 ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:agent, 'Agent', :project, '[]', '{}', '{}', :now, :now)`,
			{ agent: ids.agent, project: ids.project, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_resources')} ("id", "metadata", "createdAt", "updatedAt")
			 VALUES (:resource, NULL, :now, :now)`,
			{ resource: ids.resource, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_threads')} ("id", "resourceId", "title", "metadata", "createdAt", "updatedAt")
			 VALUES (:thread, :resource, NULL, NULL, :now, :now)`,
			{ thread: ids.thread, resource: ids.resource, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_memory_entry_candidates')}
			 ("id", "agentId", "resourceId", "threadId", "sourceMessageId", "runId", "toolCallId", "content", "evidenceText", "kind", "status", "attemptCount", "createdAt", "updatedAt")
			 VALUES (:candidate, :agent, :resource, :thread, NULL, 'run-1', 'call-1', 'Fact', 'Fact', 'fact', 'completed', 0, :now, :now)`,
			{
				candidate: ids.candidate,
				agent: ids.agent,
				resource: ids.resource,
				thread: ids.thread,
				now,
			},
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_memory_entries')}
			 ("id", "agentId", "resourceId", "content", "contentHash", "status", "embeddingModel", "embedding", "lastSeenAt", "createdAt", "updatedAt")
			 VALUES (:entry, :agent, :resource, 'Fact', 'hash', 'active', 'model', '[0.5,0.25]', :now, :now, :now)`,
			{ entry: ids.entry, agent: ids.agent, resource: ids.resource, now },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_memory_entry_sources')}
			 ("id", "agentId", "memoryEntryId", "observationId", "candidateId", "threadId", "evidenceHash", "evidenceText", "createdAt", "updatedAt")
			 VALUES (:source, :agent, :entry, NULL, :candidate, :thread, 'hash', 'Fact', :now, :now)`,
			{
				source: ids.source,
				agent: ids.agent,
				entry: ids.entry,
				candidate: ids.candidate,
				thread: ids.thread,
				now,
			},
		);
	}

	async function readEntry({ escape, runQuery }: TestMigrationContext) {
		const [entry] = await runQuery<Array<{ content: string; embedding: unknown }>>(
			`SELECT "content", "embedding" FROM ${escape.tableName('agents_memory_entries')} WHERE "id" = :id`,
			{ id: ids.entry },
		);
		return entry;
	}

	async function writeEmbedding({ escape, runQuery }: TestMigrationContext, embedding: unknown) {
		await runQuery(
			`UPDATE ${escape.tableName('agents_memory_entries')} SET "embedding" = :embedding WHERE "id" = :id`,
			{ embedding, id: ids.entry },
		);
	}

	async function sourceIds({ escape, runQuery }: TestMigrationContext) {
		const rows = await runQuery<Array<{ id: string }>>(
			`SELECT "id" FROM ${escape.tableName('agents_memory_entry_sources')}`,
		);
		return rows.map(({ id }) => id);
	}

	async function embeddingColumnType(context: TestMigrationContext): Promise<string> {
		if (context.isPostgres) {
			const [column] = await context.queryRunner.query(
				`SELECT data_type FROM information_schema.columns
				 WHERE table_name = $1 AND column_name = 'embedding'`,
				[`${context.tablePrefix}agents_memory_entries`],
			);
			return column?.data_type;
		}
		const columns: Array<{ name: string; type: string }> = await context.queryRunner.query(
			`PRAGMA table_info(${context.escape.tableName('agents_memory_entries')})`,
		);
		return columns.find(({ name }) => name === 'embedding')?.type ?? 'unknown';
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('drops old embeddings, keeps entries and sources, and stores bytes', async () => {
		await withContext(seed);

		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			expect(await embeddingColumnType(context)).toBe(context.isPostgres ? 'bytea' : 'BLOB');
			expect(await readEntry(context)).toEqual({ content: 'Fact', embedding: null });
			expect(await sourceIds(context)).toEqual([ids.source]);

			const bytes = Buffer.from([0, 0, 0, 63]);
			await writeEmbedding(context, bytes);
			const { embedding } = await readEntry(context);
			expect(Buffer.from(embedding as Uint8Array)).toEqual(bytes);
		});
	});
});
