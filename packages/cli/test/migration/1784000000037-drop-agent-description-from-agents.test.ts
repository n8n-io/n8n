import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection, type Migration } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type EntitySubscriberInterface } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'DropAgentDescriptionFromAgents1784000000037';
const isSqlite = (process.env.DB_TYPE ?? 'sqlite') === 'sqlite';

describe('DropAgentDescriptionFromAgents Migration', () => {
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
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertProject(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('project');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id,
				name: `project-${id.slice(0, 8)}`,
				type: 'personal',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: { id: string; projectId: string; description?: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agents');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("id", "name", "description", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :description, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: `agent-${data.id.slice(0, 8)}`,
				description: data.description ?? null,
				projectId: data.projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertAgentHistory(
		context: TestMigrationContext,
		data: { versionId: string; agentId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agent_history');
		await context.runQuery(
			`INSERT INTO ${tableName} ("versionId", "agentId", "author", "createdAt", "updatedAt")
			 VALUES (:versionId, :agentId, :author, :createdAt, :updatedAt)`,
			{
				versionId: data.versionId,
				agentId: data.agentId,
				author: 'Test User',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getAgentColumns(context: TestMigrationContext): Promise<string[]> {
		const table = await context.queryRunner.getTable(`${context.tablePrefix}agents`);
		return table?.columns.map((column) => column.name) ?? [];
	}

	async function countMigrationRecords(context: TestMigrationContext): Promise<number> {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('migrations')} WHERE "name" = :name`,
			{ name: MIGRATION_NAME },
		);
		return Number(count);
	}

	it('drops description from agents and preserves child rows with CASCADE FKs', async () => {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const versionId = randomUUID();

		await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertAgent(context, {
				id: agentId,
				projectId,
				description: 'Legacy agent description',
			});
			await insertAgentHistory(context, { versionId, agentId });
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await getAgentColumns(context)).not.toContain('description');

			const agentRows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agents')} WHERE "id" = :id`,
				{ id: agentId },
			);
			expect(agentRows).toHaveLength(1);

			const historyRows = await context.runQuery<Array<{ versionId: string }>>(
				`SELECT "versionId" FROM ${context.escape.tableName('agent_history')} WHERE "agentId" = :id`,
				{ id: agentId },
			);
			expect(historyRows).toHaveLength(1);
			expect(historyRows[0].versionId).toBe(versionId);

			expect(await countMigrationRecords(context)).toBe(1);
		});
	});

	it.skipIf(!isSqlite)(
		'does not crash-loop on SQLite when interrupted right after the schema commit (CAP-733)',
		async () => {
			// Regression test for CAP-733:
			// On SQLite, withFKsDisabled commits the table rebuild before TypeORM records
			// the migration. Interrupting execution right after that commit leaves the
			// column dropped without a record, so the next boot fails.
			const dbConnection = Container.get(DbConnection);
			const allMigrations = dataSource.options.migrations as Migration[];
			const targetMigration = allMigrations.find((migration) => migration.name === MIGRATION_NAME);
			expect(targetMigration).toBeDefined();

			let interrupted = false;
			const crashAfterCommit: EntitySubscriberInterface = {
				afterTransactionCommit() {
					if (!interrupted) {
						interrupted = true;
						throw new Error('Simulated process stop after transaction commit');
					}
				},
			};

			(dataSource.options as { migrations: Migration[] }).migrations = [targetMigration!];
			try {
				await dbConnection.close();
				await dbConnection.init();
				dataSource = Container.get(DataSource);
				dataSource.subscribers.push(crashAfterCommit);

				await expect(dbConnection.migrate()).rejects.toThrow('Transaction commit failed');
				expect(interrupted).toBe(true);
			} finally {
				const subscriberIndex = dataSource.subscribers.indexOf(crashAfterCommit);
				if (subscriberIndex !== -1) {
					dataSource.subscribers.splice(subscriberIndex, 1);
				}
				(dataSource.options as { migrations: Migration[] }).migrations = allMigrations;
				await dbConnection.close();
				await dbConnection.init();
				dataSource = Container.get(DataSource);
			}

			const recordedAfterCrash = await withContext(
				async (context) => await countMigrationRecords(context),
			);

			// The next boot must finish cleanly without failing on the already-dropped column.
			await expect(runSingleMigration(MIGRATION_NAME)).resolves.not.toThrow();
			dataSource = Container.get(DataSource);

			expect(recordedAfterCrash).toBe(1);
			await withContext(async (context) => {
				expect(await getAgentColumns(context)).not.toContain('description');
				expect(await countMigrationRecords(context)).toBe(1);
			});
		},
	);

	it.skipIf(!isSqlite)(
		'recovers on SQLite when description is already dropped but its migration record is missing (CAP-733)',
		async () => {
			// Regression test for CAP-733 recovery path:
			// Existing databases that were already interrupted after the column drop
			// have no `description` column on `agents` and no row in `migrations`.
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				await context.runQuery(
					`DELETE FROM ${context.escape.tableName('migrations')} WHERE "name" = :name`,
					{ name: MIGRATION_NAME },
				);
			});

			await expect(runSingleMigration(MIGRATION_NAME)).resolves.not.toThrow();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getAgentColumns(context)).not.toContain('description');
				expect(await countMigrationRecords(context)).toBe(1);
			});
		},
	);
});
