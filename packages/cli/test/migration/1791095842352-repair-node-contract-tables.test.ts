import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'RepairNodeContractTables1791095842352';

describe('RepairNodeContractTables Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		await Container.get(DbConnection).close();
	});

	const tableOf = (name: string) => createTestMigrationContext(dataSource).escape.tableName(name);

	/** The shape that the first version of CreateNodeContractVersionTable1791043488290 made. */
	async function toFirstSchema() {
		const context = createTestMigrationContext(dataSource);
		await context.runQuery(`DROP TABLE ${tableOf('node_contract_status')}`);
		await context.runQuery(`DROP TABLE ${tableOf('node_contract_version')}`);
		await context.runQuery(
			`CREATE TABLE ${tableOf('node_contract_version')} ("digest" varchar(71) PRIMARY KEY NOT NULL, "contractId" varchar(255) NOT NULL, "version" varchar(32) NOT NULL, "kind" varchar(16) NOT NULL, "manifest" text NOT NULL, "bundle" text, "fixtures" text, "signatures" text NOT NULL, "published" varchar(32), "createdAt" varchar(32) NOT NULL DEFAULT '2026-01-01')`,
		);
		await context.runQuery(
			`INSERT INTO ${tableOf('node_contract_version')} ("digest", "contractId", "version", "kind", "manifest", "signatures") VALUES ('sha256:a', 'notion.page.get', '1.0.0', 'action', '{}', '[]')`,
		);
		await context.queryRunner.release();
	}

	it('adds the status table and the origin column to a database from the first table version', async () => {
		await toFirstSchema();

		await runSingleMigration(MIGRATION_NAME);

		const [row] = await dataSource.query(
			`SELECT "origin" FROM ${tableOf('node_contract_version')} WHERE "digest" = 'sha256:a'`,
		);
		expect(row.origin).toBe('private');
		await expect(
			dataSource.query(`SELECT COUNT(*) AS n FROM ${tableOf('node_contract_status')}`),
		).resolves.toHaveLength(1);
	});

	it('changes nothing in a database that has both already', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await expect(
			dataSource.query(`SELECT "origin" FROM ${tableOf('node_contract_version')}`),
		).resolves.toEqual([]);
		await expect(
			dataSource.query(`SELECT COUNT(*) AS n FROM ${tableOf('node_contract_status')}`),
		).resolves.toHaveLength(1);
	});
});
