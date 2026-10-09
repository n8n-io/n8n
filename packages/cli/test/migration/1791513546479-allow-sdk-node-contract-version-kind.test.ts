import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'AllowSdkNodeContractVersionKind1791513546479';

describe('AllowSdkNodeContractVersionKind Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertVersion(kind: string) {
		const context = createTestMigrationContext(dataSource);
		try {
			await context.runQuery(
				`INSERT INTO ${context.escape.tableName('node_contract_version')} ("digest", "contractId", "version", "kind", "manifest", "signatures", "origin") VALUES (:digest, :contractId, '1.0.0', :kind, '{}', '[]', 'private')`,
				{ digest: `sha256:${kind}`, contractId: `${kind}.id`, kind },
			);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function kinds() {
		const context = createTestMigrationContext(dataSource);
		try {
			const rows = await context.runQuery<Array<{ kind: string }>>(
				`SELECT "kind" FROM ${context.escape.tableName('node_contract_version')}`,
			);
			return rows.map(({ kind }) => kind).sort();
		} finally {
			await context.queryRunner.release();
		}
	}

	it('rejects an sdk row before the migration and accepts one after', async () => {
		await insertVersion('action');
		await expect(insertVersion('sdk')).rejects.toThrow();

		await runSingleMigration(MIGRATION_NAME);

		await insertVersion('sdk');
		await expect(insertVersion('other')).rejects.toThrow();
		expect(await kinds()).toEqual(['action', 'sdk']);
	});

	it('removes the sdk rows on revert, keeps the others, and can be applied again', async () => {
		await undoLastSingleMigration();

		expect(await kinds()).toEqual(['action']);
		await expect(insertVersion('sdk')).rejects.toThrow();

		await runSingleMigration(MIGRATION_NAME);

		await insertVersion('sdk');
		expect(await kinds()).toEqual(['action', 'sdk']);
	});
});
