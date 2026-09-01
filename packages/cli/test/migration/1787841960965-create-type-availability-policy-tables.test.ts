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

const MIGRATION_NAME = 'CreateTypeAvailabilityPolicyTables1787841960965';

const KIND = 'node-types';

describe('CreateTypeAvailabilityPolicyTables migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertProject(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertPolicy(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('type_availability_policy');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "kind", "rules", "version", "updatedBy", "createdAt", "updatedAt")
			 VALUES (:id, :kind, :rules, :version, :updatedBy, :createdAt, :updatedAt)`,
			{
				id,
				kind: KIND,
				rules: '[]',
				version: 1,
				updatedBy: 'environment',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertScope(
		context: TestMigrationContext,
		id: string,
		projectId: string | null,
		defaultAction = 'allow',
	) {
		const table = context.escape.tableName('type_availability_policy_scope');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "kind", "projectId", "defaultAction", "version", "updatedBy", "createdAt", "updatedAt")
			 VALUES (:id, :kind, :projectId, :defaultAction, :version, :updatedBy, :createdAt, :updatedAt)`,
			{
				id,
				kind: KIND,
				projectId,
				defaultAction,
				version: 1,
				updatedBy: 'environment',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertAttachment(
		context: TestMigrationContext,
		scopeId: string,
		policyId: string,
		{ priority = 0, isFloor = false }: { priority?: number; isFloor?: boolean } = {},
	) {
		const table = context.escape.tableName('type_availability_policy_attachment');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("scopeId", "policyId", "priority", "isFloor", "createdAt", "updatedAt")
			 VALUES (:scopeId, :policyId, :priority, :isFloor, :createdAt, :updatedAt)`,
			{ scopeId, policyId, priority, isFloor, createdAt: now, updatedAt: now },
		);
	}

	/**
	 * Only one instance scope may exist per kind, and rows persist across cases here,
	 * so tests that just need *a* scope take a project-scoped one of their own.
	 */
	async function insertScopeInFreshProject(context: TestMigrationContext) {
		const projectId = randomUUID();
		const scopeId = randomUUID();
		await insertProject(context, projectId);
		await insertScope(context, scopeId, projectId);
		return scopeId;
	}

	async function countAttachments(context: TestMigrationContext, scopeId: string) {
		const table = context.escape.tableName('type_availability_policy_attachment');
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${table} WHERE "scopeId" = :scopeId`,
			{ scopeId },
		);
		return Number(rows[0].c);
	}

	describe('uq_type_availability_policy_scope_instance', () => {
		// An instance scope is a singleton per kind and this suite has no per-test
		// cleanup, so the row is removed here rather than left to collide with
		// whatever runs next.
		afterEach(async () => {
			const context = createTestMigrationContext(dataSource);
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('type_availability_policy_scope')}
				 WHERE "projectId" IS NULL AND "kind" = :kind`,
				{ kind: KIND },
			);
			await context.queryRunner.release();
		});

		it('rejects a second instance scope for the same kind', async () => {
			const context = createTestMigrationContext(dataSource);
			await insertScope(context, randomUUID(), null);

			await expect(insertScope(context, randomUUID(), null)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('admits an instance scope for a different kind', async () => {
			const context = createTestMigrationContext(dataSource);
			await insertScope(context, randomUUID(), null);

			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('type_availability_policy_scope')}
				 ("id", "kind", "projectId", "defaultAction", "version", "updatedBy", "createdAt", "updatedAt")
				 VALUES (:id, :kind, NULL, :defaultAction, 1, :updatedBy, :now, :now)`,
				{
					id: randomUUID(),
					kind: 'credential-types',
					defaultAction: 'allow',
					updatedBy: 'environment',
					now: new Date(),
				},
			);

			const rows = await context.runQuery<Array<{ c: number }>>(
				`SELECT COUNT(*) as c FROM ${context.escape.tableName('type_availability_policy_scope')}
				 WHERE "projectId" IS NULL`,
			);
			expect(Number(rows[0].c)).toBe(2);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('type_availability_policy_scope')}
				 WHERE "projectId" IS NULL AND "kind" = :kind`,
				{ kind: 'credential-types' },
			);
			await context.queryRunner.release();
		});
	});

	describe('uq_type_availability_policy_scope_project', () => {
		it('rejects a second scope for the same kind and project', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			await insertProject(context, projectId);
			await insertScope(context, randomUUID(), projectId);

			await expect(insertScope(context, randomUUID(), projectId)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('admits the same kind in a different project', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectA = randomUUID();
			const projectB = randomUUID();
			await insertProject(context, projectA);
			await insertProject(context, projectB);
			await insertScope(context, randomUUID(), projectA);

			await expect(insertScope(context, randomUUID(), projectB)).resolves.not.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('attachment uniqueness (composite primary key)', () => {
		it('rejects attaching the same policy to a scope twice', async () => {
			const context = createTestMigrationContext(dataSource);
			const scopeId = await insertScopeInFreshProject(context);
			const policyId = randomUUID();
			await insertPolicy(context, policyId);
			await insertAttachment(context, scopeId, policyId, { priority: 0 });

			await expect(insertAttachment(context, scopeId, policyId, { priority: 1 })).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('uq_type_availability_attachment_slot', () => {
		it('rejects two attachments sharing a priority in the same partition', async () => {
			const context = createTestMigrationContext(dataSource);
			const scopeId = await insertScopeInFreshProject(context);
			const policyA = randomUUID();
			const policyB = randomUUID();
			await insertPolicy(context, policyA);
			await insertPolicy(context, policyB);
			await insertAttachment(context, scopeId, policyA, { priority: 0, isFloor: false });

			await expect(
				insertAttachment(context, scopeId, policyB, { priority: 0, isFloor: false }),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('admits the same priority in the floor and normal partitions', async () => {
			const context = createTestMigrationContext(dataSource);
			const scopeId = await insertScopeInFreshProject(context);
			const policyA = randomUUID();
			const policyB = randomUUID();
			await insertPolicy(context, policyA);
			await insertPolicy(context, policyB);
			await insertAttachment(context, scopeId, policyA, { priority: 0, isFloor: false });

			await expect(
				insertAttachment(context, scopeId, policyB, { priority: 0, isFloor: true }),
			).resolves.not.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('foreign keys', () => {
		it('cascades attachments away when the scope is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			const scopeId = await insertScopeInFreshProject(context);
			const policyId = randomUUID();
			await insertPolicy(context, policyId);
			await insertAttachment(context, scopeId, policyId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('type_availability_policy_scope')} WHERE "id" = :id`,
				{ id: scopeId },
			);

			expect(await countAttachments(context, scopeId)).toBe(0);
			await context.queryRunner.release();
		});

		it('cascades the scope away when its project is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const scopeId = randomUUID();
			await insertProject(context, projectId);
			await insertScope(context, scopeId, projectId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`,
				{ id: projectId },
			);

			const rows = await context.runQuery<Array<{ c: number }>>(
				`SELECT COUNT(*) as c FROM ${context.escape.tableName('type_availability_policy_scope')} WHERE "id" = :id`,
				{ id: scopeId },
			);
			expect(Number(rows[0].c)).toBe(0);
			await context.queryRunner.release();
		});

		it('refuses to delete a policy that is still attached', async () => {
			const context = createTestMigrationContext(dataSource);
			const scopeId = await insertScopeInFreshProject(context);
			const policyId = randomUUID();
			await insertPolicy(context, policyId);
			await insertAttachment(context, scopeId, policyId);

			await expect(
				context.runQuery(
					`DELETE FROM ${context.escape.tableName('type_availability_policy')} WHERE "id" = :id`,
					{ id: policyId },
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops all three tables and can be re-applied', async () => {
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			const tables = [
				'type_availability_policy_attachment',
				'type_availability_policy_scope',
				'type_availability_policy',
			].map((name) => `${context.tablePrefix}${name}`);
			for (const table of tables) {
				expect(await context.queryRunner.hasTable(table)).toBe(false);
			}
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			const context2 = createTestMigrationContext(dataSource);
			for (const table of tables) {
				expect(await context2.queryRunner.hasTable(table)).toBe(true);
			}
			await context2.queryRunner.release();
		});
	});
});
