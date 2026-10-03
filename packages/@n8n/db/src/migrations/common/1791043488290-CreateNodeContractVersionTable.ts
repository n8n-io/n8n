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
				column('bundle').text.comment('The bundle code. A credential or native version has none'),
				column('fixtures').text.comment('The fixtures that publish replayed, as JSON'),
				column('signatures').json.notNull.comment(
					'Publisher signatures of the manifest bytes: [{ key, sig }]',
				),
				column('published').timestampTimezone().comment('When publish added the version'),
				column('origin')
					.varchar(16)
					.notNull.withEnumCheck(['first-party', 'community', 'private'])
					.comment('Who vouches for the version, from the signing key at admission'),
			)
			.withCreatedAt.withIndexOn(['contractId', 'version'], true);
		await createTable('node_contract_status')
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

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('node_contract_status');
		await dropTable('node_contract_version');
	}
}
