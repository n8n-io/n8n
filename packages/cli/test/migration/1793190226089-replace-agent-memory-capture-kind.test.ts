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

const MIGRATION_NAME = 'ReplaceAgentMemoryCaptureKind1793190226089';

describe('ReplaceAgentMemoryCaptureKind migration', () => {
	const ids = {
		project: randomUUID(),
		agent: randomUUID(),
		resource: 'draft-chat:user-1',
		thread: randomUUID(),
		keptCandidate: randomUUID(),
		deletedCandidate: randomUUID(),
		keptEntry: randomUUID(),
		deletedEntry: randomUUID(),
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
		const candidates = [
			[ids.keptCandidate, 'correction'],
			[ids.deletedCandidate, 'preference'],
		];
		for (const [candidate, kind] of candidates) {
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_memory_entry_candidates')}
				 ("id", "agentId", "resourceId", "threadId", "sourceMessageId", "runId", "toolCallId", "content", "evidenceText", "kind", "status", "attemptCount", "createdAt", "updatedAt")
				 VALUES (:candidate, :agent, :resource, :thread, NULL, 'run-1', :candidate, 'Fact', 'Fact', :kind, 'completed', 0, :now, :now)`,
				{ candidate, kind, agent: ids.agent, resource: ids.resource, thread: ids.thread, now },
			);
		}
		for (const entry of [ids.keptEntry, ids.deletedEntry]) {
			await runQuery(
				`INSERT INTO ${escape.tableName('agents_memory_entries')}
				 ("id", "agentId", "resourceId", "content", "contentHash", "status", "lastSeenAt", "createdAt", "updatedAt")
				 VALUES (:entry, :agent, :resource, 'Fact', :entry, 'active', :now, :now, :now)`,
				{ entry, agent: ids.agent, resource: ids.resource, now },
			);
		}
		await runQuery(
			`INSERT INTO ${escape.tableName('agents_memory_entry_sources')}
			 ("id", "agentId", "memoryEntryId", "observationId", "candidateId", "threadId", "evidenceHash", "evidenceText", "createdAt", "updatedAt")
			 VALUES (:source, :agent, :entry, NULL, :candidate, :thread, 'hash', 'Fact', :now, :now)`,
			{
				source: ids.source,
				agent: ids.agent,
				entry: ids.keptEntry,
				candidate: ids.keptCandidate,
				thread: ids.thread,
				now,
			},
		);
	}

	async function candidateColumn(
		{ escape, runQuery }: TestMigrationContext,
		column: string,
	): Promise<Record<string, unknown>> {
		const rows = await runQuery<Array<{ id: string; value: unknown }>>(
			`SELECT "id", ${escape.columnName(column)} AS "value" FROM ${escape.tableName('agents_memory_entry_candidates')}`,
		);
		return Object.fromEntries(rows.map((row) => [row.id, row.value]));
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('maps corrections to replacesEarlier, keeps sources, and restores kind on revert', async () => {
		await withContext(seed);

		await runSingleMigration(MIGRATION_NAME);
		await withContext(async (context) => {
			const replacesEarlier = await candidateColumn(context, 'replacesEarlier');
			expect(Boolean(replacesEarlier[ids.keptCandidate])).toBe(true);
			expect(Boolean(replacesEarlier[ids.deletedCandidate])).toBe(false);
			const sources = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agents_memory_entry_sources')}`,
			);
			expect(sources).toEqual([{ id: ids.source }]);
		});

		await undoLastSingleMigration();
		await withContext(async (context) => {
			expect(await candidateColumn(context, 'kind')).toEqual({
				[ids.keptCandidate]: 'correction',
				[ids.deletedCandidate]: 'fact',
			});
		});
	});
});
