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

const MIGRATION_NAME = 'ReplacePromotionConnectionsWithEnvironments1792417570699';

const ENVIRONMENT_TABLE = 'promotion_environment';
const LINK_TABLE = 'promotion_environment_project';
const OLD_TABLES = ['promotion_connection', 'promotion_connection_project', 'promotion_config'];

describe('ReplacePromotionConnectionsWithEnvironments migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(
		context: TestMigrationContext,
		table: string,
		row: Record<string, unknown>,
	) {
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)}
			 (${columns.map((column) => context.escape.columnName(column)).join(', ')})
			 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
			row,
		);
	}

	async function insertProvider(context: TestMigrationContext) {
		const id = randomUUID();
		const now = new Date();
		await insert(context, 'promotion_provider', {
			id,
			name: 'Provider',
			type: 'git',
			authType: 'token',
			config: JSON.stringify({ schemaVersion: 1 }),
			auth: 'encrypted',
			createdAt: now,
			updatedAt: now,
		});
		return id;
	}

	async function insertProject(context: TestMigrationContext) {
		const id = randomUUID();
		const now = new Date();
		await insert(context, 'project', {
			id,
			name: 'Project',
			type: 'team',
			customTelemetryTags: '[]',
			createdAt: now,
			updatedAt: now,
		});
		return id;
	}

	async function insertEnvironment(
		context: TestMigrationContext,
		providerId: string,
		scope: 'instance' | 'projects',
		direction: 'apply' | 'promote',
	) {
		const id = randomUUID();
		const now = new Date();
		await insert(context, ENVIRONMENT_TABLE, {
			id,
			name: 'Environment',
			providerId,
			direction,
			scope,
			remote: JSON.stringify({ schemaVersion: 1, remoteUrl: 'https://example.com/team/repo.git' }),
			settings: JSON.stringify(
				direction === 'apply'
					? { schemaVersion: 1, branchName: 'dev' }
					: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: false },
			),
			createdAt: now,
			updatedAt: now,
		});
		return id;
	}

	async function insertLink(
		context: TestMigrationContext,
		projectId: string,
		environmentId: string,
		direction: 'apply' | 'promote',
	) {
		const now = new Date();
		await insert(context, LINK_TABLE, {
			projectId,
			direction,
			environmentId,
			createdAt: now,
			updatedAt: now,
		});
	}

	async function selectColumn(
		context: TestMigrationContext,
		table: string,
		column: string,
		id: string,
	) {
		const rows = await context.runQuery<{ value: unknown }[]>(
			`SELECT ${context.escape.columnName(column)} AS value FROM ${context.escape.tableName(table)}
			 WHERE ${context.escape.columnName('id')} = :id`,
			{ id },
		);
		return rows.map((row) => row.value);
	}

	async function hasTable(context: TestMigrationContext, table: string) {
		return await context.queryRunner.hasTable(`${context.tablePrefix}${table}`);
	}

	it('upgrades a database that holds promotion data', async () => {
		const providerId = await withContext(async (context) => {
			const providerId = await insertProvider(context);
			const projectId = await insertProject(context);
			const connectionId = randomUUID();
			const configId = randomUUID();
			const reviewId = randomUUID();
			const now = new Date();
			await insert(context, 'promotion_connection', {
				id: connectionId,
				name: 'Connection',
				providerId,
				scope: 'instance',
				target: JSON.stringify({
					schemaVersion: 1,
					remoteUrl: 'https://example.com/team/repo.git',
				}),
				createdAt: now,
				updatedAt: now,
			});
			await insert(context, 'promotion_config', {
				id: configId,
				connectionId,
				name: 'Apply',
				direction: 'apply',
				settings: JSON.stringify({ schemaVersion: 1, branchName: 'dev' }),
				createdAt: now,
				updatedAt: now,
			});
			await insert(context, 'promotion_connection_project', {
				projectId,
				connectionId,
				createdAt: now,
				updatedAt: now,
			});
			await insert(context, 'promotion_review', {
				id: reviewId,
				connectionId,
				type: 'gitlab',
				remoteReviewId: '1!2',
			});
			await insert(context, 'promotion_run', {
				id: randomUUID(),
				configId,
				direction: 'apply',
				type: 'git',
				reviewId,
			});
			return providerId;
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			for (const table of OLD_TABLES) expect(await hasTable(context, table)).toBe(false);
			expect(await selectColumn(context, 'promotion_provider', 'id', providerId)).toEqual([
				providerId,
			]);
		});
	});

	it('allows one instance environment for each direction and any number of project environments', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const providerId = await insertProvider(context);
			await insertEnvironment(context, providerId, 'instance', 'apply');
			await insertEnvironment(context, providerId, 'instance', 'promote');

			await expect(insertEnvironment(context, providerId, 'instance', 'apply')).rejects.toThrow();

			await insertEnvironment(context, providerId, 'projects', 'apply');
			await insertEnvironment(context, providerId, 'projects', 'apply');
		});
	});

	it('links a project to one environment for each direction', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const providerId = await insertProvider(context);
			const projectId = await insertProject(context);
			const apply = await insertEnvironment(context, providerId, 'projects', 'apply');
			const otherApply = await insertEnvironment(context, providerId, 'projects', 'apply');
			const promote = await insertEnvironment(context, providerId, 'projects', 'promote');
			await insertLink(context, projectId, apply, 'apply');
			await insertLink(context, projectId, promote, 'promote');

			await expect(insertLink(context, projectId, otherApply, 'apply')).rejects.toThrow();
		});
	});

	it('refuses to delete a provider that an environment uses', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const providerId = await insertProvider(context);
			await insertEnvironment(context, providerId, 'instance', 'apply');

			await expect(
				context.runQuery(
					`DELETE FROM ${context.escape.tableName('promotion_provider')}
					 WHERE ${context.escape.columnName('id')} = :id`,
					{ id: providerId },
				),
			).rejects.toThrow();
		});
	});

	it('removes project links and keeps runs and reviews when an environment is deleted', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const providerId = await insertProvider(context);
			const projectId = await insertProject(context);
			const environmentId = await insertEnvironment(context, providerId, 'projects', 'promote');
			const reviewId = randomUUID();
			const runId = randomUUID();
			await insertLink(context, projectId, environmentId, 'promote');
			await insert(context, 'promotion_review', {
				id: reviewId,
				environmentId,
				type: 'gitlab',
				remoteReviewId: '1!2',
			});
			await insert(context, 'promotion_run', {
				id: runId,
				environmentId,
				direction: 'promote',
				type: 'git',
				reviewId,
			});

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName(ENVIRONMENT_TABLE)}
				 WHERE ${context.escape.columnName('id')} = :id`,
				{ id: environmentId },
			);

			const links = await context.runQuery<unknown[]>(
				`SELECT * FROM ${context.escape.tableName(LINK_TABLE)}`,
			);
			expect(links).toHaveLength(0);
			expect(await selectColumn(context, 'promotion_review', 'environmentId', reviewId)).toEqual([
				null,
			]);
			expect(await selectColumn(context, 'promotion_run', 'environmentId', runId)).toEqual([null]);
		});
	});

	it('drops the environment tables, restores the connection tables, and can be applied again', async () => {
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();

		await withContext(async (context) => {
			expect(await hasTable(context, ENVIRONMENT_TABLE)).toBe(false);
			expect(await hasTable(context, LINK_TABLE)).toBe(false);
			for (const table of OLD_TABLES) expect(await hasTable(context, table)).toBe(true);
			expect(
				await context.queryRunner.hasColumn(`${context.tablePrefix}promotion_run`, 'configId'),
			).toBe(true);
			expect(
				await context.queryRunner.hasColumn(
					`${context.tablePrefix}promotion_review`,
					'connectionId',
				),
			).toBe(true);
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await hasTable(context, ENVIRONMENT_TABLE)).toBe(true);
			expect(await hasTable(context, LINK_TABLE)).toBe(true);
		});
	});
});
