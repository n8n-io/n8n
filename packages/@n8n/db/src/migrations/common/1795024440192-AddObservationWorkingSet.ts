import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Both cursor tables are leaf tables: no other table references them, so the
// SQLite table recreation of addColumns cannot cascade into other rows.
const cursorTables = ['instance_ai_observation_cursors', 'agents_observation_cursors'];

export class AddObservationWorkingSet1795024440192 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		for (const table of cursorTables) {
			await addColumns(
				table,
				[
					column('workingSet').text.comment(
						'Plan checklist and working commands the Observer last wrote; each write replaces it',
					),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		for (const table of cursorTables) {
			await dropColumns(table, ['workingSet'], { recreatesOnSqlite: true });
		}
	}
}
