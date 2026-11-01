import type { MigrationContext, ReversibleMigration } from '../migration-types';

const table = 'workflow_publication_outbox';
const column = 'reason';
const previousReasons = ['publish', 'startup', 'leadership-takeover', 'reconcile'];

export class AddWorkflowSettingsPublicationReason1793543367097 implements ReversibleMigration {
	async up({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, [...previousReasons, 'settings-update'], {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder, escape, runQuery }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName(table)} SET ${escape.columnName(column)} = 'publish'
			 WHERE ${escape.columnName(column)} = 'settings-update'`,
		);
		await schemaBuilder.dropEnumCheck(table, column, { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck(table, column, previousReasons, { recreatesOnSqlite: true });
	}
}
