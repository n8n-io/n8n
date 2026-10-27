import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateAgentMemoryEntryCandidates1789029973536';

describe('CreateAgentMemoryEntryCandidates migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('preserves legacy sources and enforces one provenance type', async () => {
		const ids = {
			project: randomUUID(),
			agent: randomUUID(),
			resource: randomUUID(),
			thread: randomUUID(),
			observation: randomUUID(),
			entry: randomUUID(),
			legacySource: randomUUID(),
			candidate: randomUUID(),
			candidateEntry: randomUUID(),
			candidateSource: randomUUID(),
			mixedSource: randomUUID(),
		};
		const now = new Date('2026-05-12T10:00:00.000Z');

		await withContext(async (context) => {
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
				{ id: ids.project, name: 'Test project', type: 'team', createdAt: now, updatedAt: now },
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents')} ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
				{
					id: ids.agent,
					name: 'Test agent',
					projectId: ids.project,
					integrations: '[]',
					tools: '{}',
					skills: '{}',
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_resources')} ("id", "metadata", "createdAt", "updatedAt")
				 VALUES (:id, :metadata, :createdAt, :updatedAt)`,
				{ id: ids.resource, metadata: null, createdAt: now, updatedAt: now },
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_threads')} ("id", "resourceId", "title", "metadata", "createdAt", "updatedAt")
				 VALUES (:id, :resourceId, :title, :metadata, :createdAt, :updatedAt)`,
				{
					id: ids.thread,
					resourceId: ids.resource,
					title: null,
					metadata: null,
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_observations')} ("id", "agentId", "observationScopeId", "marker", "text", "parentId", "tokenCount", "status", "supersededBy", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :threadId, :marker, :text, :parentId, :tokenCount, :status, :supersededBy, :createdAt, :updatedAt)`,
				{
					id: ids.observation,
					agentId: ids.agent,
					threadId: ids.thread,
					marker: 'important',
					text: 'User chose Postgres.',
					parentId: null,
					tokenCount: 5,
					status: 'active',
					supersededBy: null,
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_memory_entries')} ("id", "agentId", "resourceId", "content", "contentHash", "status", "supersededBy", "embeddingModel", "embedding", "metadata", "lastSeenAt", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :resourceId, :content, :contentHash, :status, :supersededBy, :embeddingModel, :embedding, :metadata, :lastSeenAt, :createdAt, :updatedAt)`,
				{
					id: ids.entry,
					agentId: ids.agent,
					resourceId: ids.resource,
					content: 'User chose Postgres.',
					contentHash: 'a'.repeat(64),
					status: 'active',
					supersededBy: null,
					embeddingModel: null,
					embedding: null,
					metadata: null,
					lastSeenAt: now,
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_memory_entry_sources')} ("id", "agentId", "memoryEntryId", "observationId", "threadId", "evidenceHash", "evidenceText", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :entryId, :observationId, :threadId, :evidenceHash, :evidenceText, :createdAt, :updatedAt)`,
				{
					id: ids.legacySource,
					agentId: ids.agent,
					entryId: ids.entry,
					observationId: ids.observation,
					threadId: ids.thread,
					evidenceHash: 'b'.repeat(64),
					evidenceText: 'User chose Postgres',
					createdAt: now,
					updatedAt: now,
				},
			);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(
				await context.queryRunner.hasTable(`${context.tablePrefix}agents_memory_entry_cursors`),
			).toBe(false);
			const sourceTable = context.escape.tableName('agents_memory_entry_sources');
			const legacyRows = await context.runQuery<
				Array<{ id: string; observationId: string | null; candidateId: string | null }>
			>(`SELECT "id", "observationId", "candidateId" FROM ${sourceTable} WHERE "id" = :id`, {
				id: ids.legacySource,
			});
			expect(legacyRows).toEqual([
				{
					id: ids.legacySource,
					observationId: ids.observation,
					candidateId: null,
				},
			]);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_memory_entry_candidates')} ("id", "agentId", "resourceId", "threadId", "sourceMessageId", "runId", "toolCallId", "content", "evidenceText", "kind", "status", "attemptCount", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :resourceId, :threadId, :sourceMessageId, :runId, :toolCallId, :content, :evidenceText, :kind, :status, :attemptCount, :createdAt, :updatedAt)`,
				{
					id: ids.candidate,
					agentId: ids.agent,
					resourceId: ids.resource,
					threadId: ids.thread,
					sourceMessageId: null,
					runId: 'run-1',
					toolCallId: 'call-1',
					content: 'User prefers concise reports.',
					evidenceText: 'I prefer concise reports.',
					kind: 'preference',
					status: 'pending',
					attemptCount: 0,
					createdAt: now,
					updatedAt: now,
				},
			);
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('agents_memory_entries')} ("id", "agentId", "resourceId", "content", "contentHash", "status", "supersededBy", "embeddingModel", "embedding", "metadata", "lastSeenAt", "createdAt", "updatedAt")
				 VALUES (:id, :agentId, :resourceId, :content, :contentHash, :status, :supersededBy, :embeddingModel, :embedding, :metadata, :lastSeenAt, :createdAt, :updatedAt)`,
				{
					id: ids.candidateEntry,
					agentId: ids.agent,
					resourceId: ids.resource,
					content: 'User prefers concise reports.',
					contentHash: 'c'.repeat(64),
					status: 'active',
					supersededBy: null,
					embeddingModel: null,
					embedding: null,
					metadata: null,
					lastSeenAt: now,
					createdAt: now,
					updatedAt: now,
				},
			);

			const insertSource = async (
				id: string,
				observationId: string | null,
				candidateId: string | null,
				entryId = ids.entry,
			) =>
				await context.runQuery(
					`INSERT INTO ${sourceTable} ("id", "agentId", "memoryEntryId", "observationId", "candidateId", "threadId", "evidenceHash", "evidenceText", "createdAt", "updatedAt")
					 VALUES (:id, :agentId, :entryId, :observationId, :candidateId, :threadId, :evidenceHash, :evidenceText, :createdAt, :updatedAt)`,
					{
						id,
						agentId: ids.agent,
						entryId,
						observationId,
						candidateId,
						threadId: ids.thread,
						evidenceHash: id.replaceAll('-', '').padEnd(64, 'c').slice(0, 64),
						evidenceText: 'Source evidence',
						createdAt: now,
						updatedAt: now,
					},
				);

			await expect(
				insertSource(ids.candidateSource, null, ids.candidate, ids.candidateEntry),
			).resolves.not.toThrow();
			// Mixed provenance: the legacy entry now also has a candidate source.
			await insertSource(ids.mixedSource, null, ids.candidate);
			await expect(insertSource(randomUUID(), ids.observation, ids.candidate)).rejects.toThrow();
			await expect(insertSource(randomUUID(), null, null)).rejects.toThrow();
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			const rows = await context.runQuery<Array<{ id: string; observationId: string }>>(
				`SELECT "id", "observationId" FROM ${context.escape.tableName('agents_memory_entry_sources')}`,
			);
			expect(rows).toEqual([{ id: ids.legacySource, observationId: ids.observation }]);
			expect(
				await context.queryRunner.hasTable(`${context.tablePrefix}agents_memory_entry_candidates`),
			).toBe(false);
			expect(
				await context.queryRunner.hasTable(`${context.tablePrefix}agents_memory_entry_cursors`),
			).toBe(true);
			// Only the candidate-only entry loses its provenance; the mixed one keeps its observation source.
			const statuses = await context.runQuery<Array<{ id: string; status: string }>>(
				`SELECT "id", "status" FROM ${context.escape.tableName('agents_memory_entries')}`,
			);
			expect(new Map(statuses.map((row) => [row.id, row.status]))).toEqual(
				new Map([
					[ids.entry, 'active'],
					[ids.candidateEntry, 'dropped'],
				]),
			);
		});
	});
});
