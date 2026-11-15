import type { MigrationContext, ReversibleMigration } from '../migration-types';

/** `firstAuthenticatedAt` is stamped once, by the first request a trusted source authenticated. */
export class AddFirstAuthenticatedAtToTrustedSource1793354377949 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('trusted_source', [column('firstAuthenticatedAt').timestampTimezone(3)], {
			recreatesOnSqlite: true,
		});
	}
	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('trusted_source', ['firstAuthenticatedAt'], { recreatesOnSqlite: true });
	}
}
