import type { MigrationContext, ReversibleMigration } from '../migration-types';

const sourceTable = 'trusted_source';
const identityTable = 'trusted_source_identity';
const userTable = 'user';
const identitySourceFk = 'trusted_source_identity_sourceId_foreign';
const identityUserFk = 'trusted_source_identity_userId_foreign';

export class CreateTrustedSourceTables1790342955595 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(sourceTable)
			.withColumns(
				column('id').varchar(36).primary,
				column('name').varchar(128).notNull,
				column('type').varchar(32).notNull,
				column('issuer').varchar().notNull,
				column('managedBy').varchar(16).notNull,
				column('status').varchar(16).notNull,
				column('lastError').text,
				column('lastCheckedAt').timestampTimezone(3),
				column('configVersion').int.notNull,
				column('config').text.notNull,
			)
			.withTimestamps.withIndexOn('name', true)
			.withIndexOn('issuer', true);

		await createTable(identityTable)
			.withColumns(
				column('sourceId').varchar(36).primary,
				column('subject').varchar().primary,
				column('userId').uuid.notNull,
				column('provenance').varchar(32).notNull,
				column('status').varchar(16).notNull,
				column('lastSeenAt').timestampTimezone(3),
			)
			.withTimestamps.withIndexOn('userId')
			.withForeignKey('sourceId', {
				tableName: sourceTable,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: identitySourceFk,
			})
			.withForeignKey('userId', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'CASCADE',
				name: identityUserFk,
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(identityTable);
		await dropTable(sourceTable);
	}
}
