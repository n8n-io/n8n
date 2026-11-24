import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/**
 * Apps are visible only to the members of their project. An app that was visible to the
 * whole instance becomes visible to the members of its project.
 */
export class RemoveInstanceAppVisibility1795455809960 implements IrreversibleMigration {
	async up(context: MigrationContext) {
		const { escape, runQuery, schemaBuilder, isPostgres } = context;
		await runQuery(
			`UPDATE ${escape.tableName('app')} SET ${escape.columnName('visibility')} = 'project' WHERE ${escape.columnName('visibility')} = 'instance'`,
		);

		if (isPostgres) {
			await this.replaceCheckOnPostgres(context);
			return;
		}

		await schemaBuilder.dropEnumCheck('app', 'visibility', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck('app', 'visibility', ['project'], {
			recreatesOnSqlite: true,
		});
	}

	/** `NOT VALID` skips the scan of existing rows. The update above made all of them valid. */
	private async replaceCheckOnPostgres({ escape, runQuery, tablePrefix }: MigrationContext) {
		const table = escape.tableName('app');
		// The name that the DSL gives an enum check, so later migrations can find it.
		const checkName = escape.columnName(`CHK_${tablePrefix}app_visibility`);
		await runQuery(`ALTER TABLE ${table} DROP CONSTRAINT ${checkName}`);
		await runQuery(
			`ALTER TABLE ${table} ADD CONSTRAINT ${checkName} CHECK (${escape.columnName('visibility')} IN ('project')) NOT VALID`,
		);
	}
}
