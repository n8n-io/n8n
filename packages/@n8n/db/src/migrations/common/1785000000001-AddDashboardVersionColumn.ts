import type { MigrationContext, ReversibleMigration } from '../migration-types';

const DASHBOARD_TABLE_NAME = 'dashboard';

export class AddDashboardVersionColumn1785000000001 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(DASHBOARD_TABLE_NAME, [column('version').int.default(1).notNull]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(DASHBOARD_TABLE_NAME, ['version']);
	}
}
