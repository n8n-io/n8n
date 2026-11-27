import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'DeletePersonalProjectTypeAvailabilityPolicies1795778326728';

const SCOPE_TABLE = 'type_availability_policy_scope';
const POLICY_TABLE = 'type_availability_policy';
const ATTACHMENT_TABLE = 'type_availability_policy_attachment';

describe('DeletePersonalProjectTypeAvailabilityPolicies migration', () => {
	let dataSource: DataSource;
	// The open context. Released before the migration runs, so SQLite has no second writer.
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);

		const cleanup = createTestMigrationContext(dataSource);
		await cleanup.queryRunner.clearDatabase();
		await cleanup.queryRunner.release();

		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insert(table: string, row: Record<string, unknown>) {
		const columns = Object.keys(row);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(table)} (${columns
				.map((column) => context.escape.columnName(column))
				.join(', ')}) VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
			row,
		);
	}

	async function insertScope(id: string, projectId: string | null) {
		await insert(SCOPE_TABLE, {
			id,
			kind: 'node-types',
			projectId,
			defaultAction: 'deny',
			version: 1,
			updatedBy: 'user-1',
		});
	}

	async function insertPolicy(id: string) {
		await insert(POLICY_TABLE, {
			id,
			kind: 'node-types',
			rules: '[]',
			version: 1,
			updatedBy: 'user-1',
		});
	}

	async function attach(scopeId: string, policyId: string, priority = 0) {
		await insert(ATTACHMENT_TABLE, { scopeId, policyId, priority, isFloor: false });
	}

	async function ids(table: string, column = 'id') {
		const name = context.escape.columnName(column);
		const rows = await context.runQuery<Array<Record<string, string>>>(
			`SELECT ${name} AS ${name} FROM ${context.escape.tableName(table)} ORDER BY ${name}`,
		);
		return rows.map((row) => row[column]);
	}

	it('deletes the policies of personal projects and keeps the rest', async () => {
		context = createTestMigrationContext(dataSource);
		await insert('project', { id: 'team-project', name: 'Team', type: 'team' });
		await insert('project', { id: 'personal-project', name: 'Personal', type: 'personal' });

		await insertScope('instance-scope', null);
		await insertScope('team-scope', 'team-project');
		await insertScope('personal-scope', 'personal-project');

		await insertPolicy('instance-policy');
		await insertPolicy('team-policy');
		await insertPolicy('personal-policy');
		// Attached to the instance scope and to the personal scope.
		await insertPolicy('shared-policy');

		await attach('instance-scope', 'instance-policy');
		await attach('instance-scope', 'shared-policy', 1);
		await attach('team-scope', 'team-policy');
		await attach('personal-scope', 'personal-policy');
		await attach('personal-scope', 'shared-policy', 1);

		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);

		context = createTestMigrationContext(dataSource);

		expect(await ids(SCOPE_TABLE)).toEqual(['instance-scope', 'team-scope']);
		expect(await ids(POLICY_TABLE)).toEqual(['instance-policy', 'shared-policy', 'team-policy']);
		expect(await ids(ATTACHMENT_TABLE, 'scopeId')).toEqual([
			'instance-scope',
			'instance-scope',
			'team-scope',
		]);

		await context.queryRunner.release();
	});
});
