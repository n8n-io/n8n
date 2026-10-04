import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const versionTable = 'node_contract_version';
const statusTable = 'node_contract_status';

/**
 * Adds the `origin` column and the `node_contract_status` table where they are missing.
 *
 * CreateNodeContractVersionTable1791043488290 got both after some databases had run it, so those
 * databases have neither. A database that ran its last version already has both, so each step
 * checks first. Stored versions of unknown origin get `private`, the lowest trust: they run in
 * the sandbox until they are admitted again.
 */
export class RepairNodeContractTables1791095842352 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix, schemaBuilder }: MigrationContext) {
		const { addColumns, column, createTable } = schemaBuilder;
		if (!(await queryRunner.hasColumn(`${tablePrefix}${versionTable}`, 'origin'))) {
			await addColumns(
				versionTable,
				[
					column('origin')
						.varchar(16)
						.notNull.default("'private'")
						.withEnumCheck(['first-party', 'community', 'private'])
						.comment('Who vouches for the version, from the signing key at admission'),
				],
				{ recreatesOnSqlite: true },
			);
		}
		if (!(await queryRunner.hasTable(`${tablePrefix}${statusTable}`))) {
			await createTable(statusTable)
				.withColumns(
					column('digest')
						.varchar(71)
						.primary.comment('sha256:<hex> of the line. It identifies the status line'),
					column('contractId')
						.varchar(255)
						.notNull.comment('Contract or credential id, e.g. notion.databasePage.getAll'),
					column('line').text.notNull.comment(
						'The JSON status line: a yank, a revoke or a deprecation of versions',
					),
				)
				.withCreatedAt.withIndexOn('contractId');
		}
	}
}
