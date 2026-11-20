import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/** Apps are no longer public. A public app becomes visible to the members of its project. */
export class RemovePublicAppVisibility1793612194540 implements IrreversibleMigration {
	async up({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName('app')} SET ${escape.columnName('visibility')} = 'project' WHERE ${escape.columnName('visibility')} = 'public'`,
		);
		await schemaBuilder.dropEnumCheck('app', 'visibility', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck('app', 'visibility', ['project', 'instance'], {
			recreatesOnSqlite: true,
		});
	}
}
