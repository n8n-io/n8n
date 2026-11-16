import type { MigrationContext, ReversibleMigration } from '../migration-types';

// Both cursor tables are leaf tables: no other table references them, so the
// SQLite table recreation of addColumns cannot cascade into other rows.
const cursorTables = ['instance_ai_observation_cursors', 'agents_observation_cursors'];

const resumeColumns = [
	'resumeFromMessageId',
	'resumeFromAt',
	'resumeNotes',
	'lastRequestTokens',
	'lastModelId',
];

export class AddObservationResumeState1794346847057 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		for (const table of cursorTables) {
			await addColumns(
				table,
				[
					column('resumeFromMessageId')
						.varchar(36)
						.comment('Last message replaced by resumeNotes; later requests start after it'),
					column('resumeFromAt')
						.timestampTimezone()
						.comment('Creation time of resumeFromMessageId'),
					column('resumeNotes').text.comment(
						'Observation notes as sent to the model at the resume point',
					),
					column('lastRequestTokens').int.comment(
						'Input tokens the provider reported for the last model request',
					),
					column('lastModelId').varchar(255).comment('Model id of the last model request'),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		for (const table of cursorTables) {
			await dropColumns(table, resumeColumns, { recreatesOnSqlite: true });
		}
	}
}
