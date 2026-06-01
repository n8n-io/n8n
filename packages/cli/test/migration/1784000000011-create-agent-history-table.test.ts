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

const MIGRATION_NAME = 'CreateAgentHistoryTable1784000000011';

describe('CreateAgentHistoryTable Migration', () => {
	let dataSource: DataSource;
	jest.setTimeout(20_000);

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
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(
		context: TestMigrationContext,
		id: string,
		overrides: { firstName?: string | null; lastName?: string | null } = {},
	): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: overrides.firstName === undefined ? 'Test' : overrides.firstName,
				lastName: overrides.lastName === undefined ? 'User' : overrides.lastName,
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

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
		data: { id: string; projectId: string; versionId: string | null },
	): Promise<void> {
		const tableName = context.escape.tableName('agents');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("id", "name", "projectId", "integrations", "tools", "skills", "versionId", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :versionId, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: `agent-${data.id.slice(0, 8)}`,
				projectId: data.projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				versionId: data.versionId,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertPublishedVersion(
		context: TestMigrationContext,
		data: {
			agentId: string;
			publishedFromVersionId: string;
			publishedById: string | null;
			schema: Record<string, unknown> | null;
			tools?: Record<string, unknown> | null;
			skills?: Record<string, unknown> | null;
		},
	): Promise<void> {
		const tableName = context.escape.tableName('agent_published_version');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("agentId", "publishedFromVersionId", "publishedById", "schema", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:agentId, :versionId, :publishedById, :schema, :tools, :skills, :createdAt, :updatedAt)`,
			{
				agentId: data.agentId,
				versionId: data.publishedFromVersionId,
				publishedById: data.publishedById,
				schema: data.schema === null ? null : JSON.stringify(data.schema),
				tools:
					data.tools === undefined ? '{}' : data.tools === null ? null : JSON.stringify(data.tools),
				skills:
					data.skills === undefined
						? '{}'
						: data.skills === null
							? null
							: JSON.stringify(data.skills),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	describe('up', () => {
		it('copies each agent_published_version into agent_history and sets activeVersionId', async () => {
			const userId = randomUUID();
			const projectId = randomUUID();
			const publishedAgentId = randomUUID();
			const unpublishedAgentId = randomUUID();
			const publishedVersionId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, projectId);
				await insertAgent(context, {
					id: publishedAgentId,
					projectId,
					versionId: publishedVersionId,
				});
				await insertAgent(context, {
					id: unpublishedAgentId,
					projectId,
					versionId: randomUUID(),
				});
				await insertPublishedVersion(context, {
					agentId: publishedAgentId,
					publishedFromVersionId: publishedVersionId,
					publishedById: userId,
					schema: { name: 'Published Agent', model: 'anthropic/claude-sonnet-4-5' },
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const historyTable = context.escape.tableName('agent_history');
				const agentsTable = context.escape.tableName('agents');

				const historyRows = await context.runQuery<
					Array<{
						versionId: string;
						agentId: string;
						publishedById: string;
						author: string;
					}>
				>(`SELECT "versionId", "agentId", "publishedById", "author" FROM ${historyTable}`);

				expect(historyRows).toHaveLength(1);
				expect(historyRows[0]).toEqual({
					versionId: publishedVersionId,
					agentId: publishedAgentId,
					publishedById: userId,
					author: 'Test User',
				});

				const publishedAgentRow = await context.runQuery<Array<{ activeVersionId: string | null }>>(
					`SELECT "activeVersionId" FROM ${agentsTable} WHERE "id" = :id`,
					{ id: publishedAgentId },
				);
				expect(publishedAgentRow[0].activeVersionId).toBe(publishedVersionId);

				const unpublishedAgentRow = await context.runQuery<
					Array<{ activeVersionId: string | null }>
				>(`SELECT "activeVersionId" FROM ${agentsTable} WHERE "id" = :id`, {
					id: unpublishedAgentId,
				});
				expect(unpublishedAgentRow[0].activeVersionId).toBeNull();
			});
		});

		it('preserves a partially-populated publisher name (only firstName or only lastName)', async () => {
			const projectId = randomUUID();
			const firstNameOnlyUserId = randomUUID();
			const lastNameOnlyUserId = randomUUID();
			const firstAgentId = randomUUID();
			const lastAgentId = randomUUID();
			const firstVersionId = randomUUID();
			const lastVersionId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertUser(context, firstNameOnlyUserId, { firstName: 'Solo', lastName: null });
				await insertUser(context, lastNameOnlyUserId, { firstName: null, lastName: 'Onlylast' });
				await insertAgent(context, {
					id: firstAgentId,
					projectId,
					versionId: firstVersionId,
				});
				await insertAgent(context, { id: lastAgentId, projectId, versionId: lastVersionId });
				await insertPublishedVersion(context, {
					agentId: firstAgentId,
					publishedFromVersionId: firstVersionId,
					publishedById: firstNameOnlyUserId,
					schema: { name: 'First-only Agent' },
				});
				await insertPublishedVersion(context, {
					agentId: lastAgentId,
					publishedFromVersionId: lastVersionId,
					publishedById: lastNameOnlyUserId,
					schema: { name: 'Last-only Agent' },
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const historyTable = context.escape.tableName('agent_history');
				const rows = await context.runQuery<Array<{ agentId: string; author: string }>>(
					`SELECT "agentId", "author" FROM ${historyTable} WHERE "agentId" IN (:firstId, :lastId)`,
					{ firstId: firstAgentId, lastId: lastAgentId },
				);
				const authorByAgent = new Map(rows.map((r) => [r.agentId, r.author]));
				expect(authorByAgent.get(firstAgentId)).toBe('Solo');
				expect(authorByAgent.get(lastAgentId)).toBe('Onlylast');
			});
		});

		it('copies rows whose schema/tools/skills are NULL without violating constraints', async () => {
			// Legacy `agent_published_version` rows can legitimately have NULL
			// json columns (the source table defines them nullable). Adding
			// NOT NULL on agent_history.{schema,tools,skills} would break the
			// data move for those rows.
			const userId = randomUUID();
			const projectId = randomUUID();
			const agentId = randomUUID();
			const versionId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId, versionId });
				await insertPublishedVersion(context, {
					agentId,
					publishedFromVersionId: versionId,
					publishedById: userId,
					schema: null,
					tools: null,
					skills: null,
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const historyTable = context.escape.tableName('agent_history');
				const rows = await context.runQuery<
					Array<{ schema: string | null; tools: string | null; skills: string | null }>
				>(`SELECT "schema", "tools", "skills" FROM ${historyTable} WHERE "agentId" = :id`, {
					id: agentId,
				});
				expect(rows).toHaveLength(1);
				expect(rows[0].schema).toBeNull();
				expect(rows[0].tools).toBeNull();
				expect(rows[0].skills).toBeNull();
			});
		});

		it('falls back to "Unknown" when the published version has no publisher to join to', async () => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			const versionId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId, versionId });
				await insertPublishedVersion(context, {
					agentId,
					publishedFromVersionId: versionId,
					publishedById: null,
					schema: { name: 'Orphan Agent' },
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const historyTable = context.escape.tableName('agent_history');
				const rows = await context.runQuery<
					Array<{ publishedById: string | null; author: string }>
				>(`SELECT "publishedById", "author" FROM ${historyTable} WHERE "agentId" = :id`, {
					id: agentId,
				});
				expect(rows).toHaveLength(1);
				expect(rows[0].publishedById).toBeNull();
				expect(rows[0].author).toBe('Unknown');
			});
		});

		it('drops agent_published_version and the dead columns from agents', async () => {
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const publishedTable = `${context.tablePrefix}agent_published_version`;
				expect(await context.queryRunner.hasTable(publishedTable)).toBe(false);

				if (context.isSqlite) {
					const agentsInfo = await context.queryRunner.query(
						`PRAGMA table_info(${context.escape.tableName('agents')})`,
					);
					const columnNames = agentsInfo.map((c: { name: string }) => c.name);
					expect(columnNames).not.toContain('credentialId');
					expect(columnNames).not.toContain('provider');
					expect(columnNames).not.toContain('model');
					expect(columnNames).toContain('activeVersionId');
				} else {
					const rows = await context.queryRunner.query(
						'SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name',
						[`${context.tablePrefix}agents`],
					);
					const columnNames = rows.map((r: { column_name: string }) => r.column_name);
					expect(columnNames).not.toContain('credentialId');
					expect(columnNames).not.toContain('provider');
					expect(columnNames).not.toContain('model');
					expect(columnNames).toContain('activeVersionId');
				}
			});
		});
	});

	describe('down', () => {
		it('restores agent_published_version with one row per agents.activeVersionId and re-adds the dead columns', async () => {
			const userId = randomUUID();
			const projectId = randomUUID();
			const publishedAgentId = randomUUID();
			const unpublishedAgentId = randomUUID();
			const publishedVersionId = randomUUID();

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertProject(context, projectId);
				await insertAgent(context, {
					id: publishedAgentId,
					projectId,
					versionId: publishedVersionId,
				});
				await insertAgent(context, {
					id: unpublishedAgentId,
					projectId,
					versionId: randomUUID(),
				});
				await insertPublishedVersion(context, {
					agentId: publishedAgentId,
					publishedFromVersionId: publishedVersionId,
					publishedById: userId,
					schema: { name: 'Published Agent', model: 'anthropic/claude-sonnet-4-5' },
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const publishedTable = `${context.tablePrefix}agent_published_version`;
				expect(await context.queryRunner.hasTable(publishedTable)).toBe(true);

				const restoredRows = await context.runQuery<
					Array<{
						agentId: string;
						publishedFromVersionId: string;
						publishedById: string;
						model: string | null;
						provider: string | null;
						credentialId: string | null;
					}>
				>(
					`SELECT "agentId", "publishedFromVersionId", "publishedById", "model", "provider", "credentialId"
					 FROM ${context.escape.tableName('agent_published_version')}`,
				);
				expect(restoredRows).toHaveLength(1);
				expect(restoredRows[0]).toEqual({
					agentId: publishedAgentId,
					publishedFromVersionId: publishedVersionId,
					publishedById: userId,
					model: null,
					provider: null,
					credentialId: null,
				});

				const historyTable = `${context.tablePrefix}agent_history`;
				expect(await context.queryRunner.hasTable(historyTable)).toBe(false);

				const agentsTable = context.escape.tableName('agents');
				if (context.isSqlite) {
					const agentsInfo = await context.queryRunner.query(`PRAGMA table_info(${agentsTable})`);
					const columnNames = agentsInfo.map((c: { name: string }) => c.name);
					expect(columnNames).toContain('credentialId');
					expect(columnNames).toContain('provider');
					expect(columnNames).toContain('model');
					expect(columnNames).not.toContain('activeVersionId');
				} else {
					const rows = await context.queryRunner.query(
						'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
						[`${context.tablePrefix}agents`],
					);
					const columnNames = rows.map((r: { column_name: string }) => r.column_name);
					expect(columnNames).toContain('credentialId');
					expect(columnNames).toContain('provider');
					expect(columnNames).toContain('model');
					expect(columnNames).not.toContain('activeVersionId');
				}
			});
		});
	});
});
