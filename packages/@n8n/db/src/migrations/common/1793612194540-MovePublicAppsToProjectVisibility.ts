import type { IrreversibleMigration, MigrationContext } from '../migration-types';

/** Apps are no longer public. A public app becomes visible to the members of its project. */
export class MovePublicAppsToProjectVisibility1793612194540 implements IrreversibleMigration {
	async up({ escape, runQuery }: MigrationContext) {
		await runQuery(
			`UPDATE ${escape.tableName('app')} SET ${escape.columnName('visibility')} = 'project' WHERE ${escape.columnName('visibility')} = 'public'`,
		);
	}
}
