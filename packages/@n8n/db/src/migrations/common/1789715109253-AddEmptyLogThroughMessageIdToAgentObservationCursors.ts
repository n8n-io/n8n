import type { MigrationContext, ReversibleMigration } from '../migration-types';

const cursorTables = ['agents_observation_cursors', 'instance_ai_observation_cursors'] as const;

export class AddEmptyLogThroughMessageIdToAgentObservationCursors1789715109253
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		for (const tableName of cursorTables) {
			await addColumns(
				tableName,
				[
					column('emptyLogThroughMessageId')
						.varchar(36)
						.comment(
							'Certifies that the full history through this message needs no stored observations. NULL requires retained observations.',
						),
				],
				{ recreatesOnSqlite: true },
			);
		}
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		for (const tableName of cursorTables) {
			await dropColumns(tableName, ['emptyLogThroughMessageId'], {
				recreatesOnSqlite: true,
			});
		}
	}
}
