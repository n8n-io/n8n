import type { MigrationContext, ReversibleMigration } from '../migration-types';

const tableName = 'idempotency_key';

export class CreateIdempotencyKeyTable1791321358882 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column }, escape, tablePrefix }: MigrationContext) {
		const status = escape.columnName('status');
		const responseStatus = escape.columnName('responseStatus');

		await createTable(tableName)
			.withColumns(
				column('id').varchar(16).primary.comment('Application-generated n8n nano ID'),
				column('userId').uuid.notNull,
				column('idempotencyKey')
					.varchar(128)
					.notNull.comment('Client Idempotency-Key header. Opaque ASCII, length 1 to 128'),
				column('fingerprint').text.notNull.comment('Hash of the request method, path, and body'),
				column('status')
					.varchar(16)
					.notNull.default("'processing'")
					.withEnumCheck(['processing', 'completed'])
					.comment('processing while the handler runs. completed after the response is stored'),
				column('responseStatus').smallint.comment(
					'HTTP status of the stored response. NULL while processing, required once completed',
				),
				column('responseBody').json.comment(
					'Stored response body. NULL while status is processing',
				),
			)
			.withIndexOn(['userId', 'idempotencyKey'], true)
			.withIndexOn('createdAt')
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
				name: `FK_${tablePrefix}idempotency_key_userId`,
			})
			.withCheck(
				`CHK_${tablePrefix}idempotency_key_responseStatus`,
				`(${status} = 'processing' AND ${responseStatus} IS NULL) OR (${status} = 'completed' AND ${responseStatus} IS NOT NULL)`,
			).withTimestamps;
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(tableName);
	}
}
