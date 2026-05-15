import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'webauthn_credential';

export class CreateWebauthnCredentialTable1770500000000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(tableName)
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('userId').varchar(36).notNull,
				column('credentialId').text.notNull,
				column('publicKey').binary.notNull,
				column('counter').int.default(0).notNull,
				column('deviceType').varchar(32),
				column('backedUp').bool.default(false).notNull,
				column('transports').text,
				column('aaguid').varchar(36),
				column('label').varchar(255).notNull,
				column('lastUsedAt').timestamp(),
			)
			.withTimestamps.withIndexOn('credentialId', true)
			.withIndexOn('userId')
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			});
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
