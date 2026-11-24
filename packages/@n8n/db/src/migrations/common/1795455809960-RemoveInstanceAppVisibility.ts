import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Apps are visible only to the members of their project. An app that was visible to the
 * whole instance becomes visible to the members of its project.
 */
export class RemoveInstanceAppVisibility1795455809960 implements IrreversibleMigration {
	async up({ escape, runQuery, schemaBuilder }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName('app')} SET ${escape.columnName('visibility')} = 'project' WHERE ${escape.columnName('visibility')} = 'instance'`,
		);
		await schemaBuilder.dropEnumCheck('app', 'visibility', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck('app', 'visibility', ['project'], {
			recreatesOnSqlite: true,
		});
	}
}
