import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateNodeContractVersionTable1791043488290 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable('node_contract_version')
			.withColumns(
				column('digest')
					.varchar(71)
					.primary.comment('sha256:<hex> of the manifest bytes. It identifies the version'),
				column('contractId')
					.varchar(255)
					.notNull.comment('Contract or credential id, e.g. notion.databasePage.getAll'),
				column('version').varchar(32).notNull.comment('Semver major.minor.patch'),
				column('kind')
					.varchar(16)
					.notNull.withEnumCheck(['action', 'trigger', 'provider', 'credential'])
					.comment('What the manifest describes'),
				column('manifest').text.notNull.comment('The exact manifest bytes that the digest covers'),
				column('bundle').text.comment('The bundle code. A credential has none'),
				column('fixtures').text.comment('The fixtures that publish replayed, as JSON'),
				column('signatures').json.notNull.comment(
					'Publisher signatures of the manifest bytes: [{ key, sig }]',
				),
				column('published').timestampTimezone().comment('When publish added the version'),
			)
			.withCreatedAt.withIndexOn(['contractId', 'version'], true);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('node_contract_version');
	}
}
