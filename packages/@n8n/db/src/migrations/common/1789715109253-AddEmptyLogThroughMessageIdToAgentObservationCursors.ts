import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddEmptyLogThroughMessageIdToAgentObservationCursors1789715109253
	implements ReversibleMigration
{
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agents_observation_cursors',
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

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents_observation_cursors', ['emptyLogThroughMessageId'], {
			recreatesOnSqlite: true,
		});
	}
}
