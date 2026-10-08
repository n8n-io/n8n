import type { MigrationContext, ReversibleMigration } from '../migration-types';

const TABLE_NAME = 'linked_instance';
const COLUMN_NAMES = ['defaultRemoteProjectId', 'defaultRemoteProjectName'];

// No other table refers to `linked_instance`, so the table copy on SQLite deletes no rows elsewhere.
export class AddDefaultRemoteProjectToLinkedInstance1791416459011 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			TABLE_NAME,
			[
				column('defaultRemoteProjectId')
					.varchar(36)
					.comment(
						'Id of the project on the linked instance that gets new automations. NULL when the instance listed no project.',
					),
				column('defaultRemoteProjectName')
					.varchar(255)
					.comment('Name of that project when it was last read from the linked instance'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns(TABLE_NAME, COLUMN_NAMES, { recreatesOnSqlite: true });
	}
}
