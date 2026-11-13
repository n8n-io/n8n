import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddIsArchivedToAgents1794419301361 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('isArchived')
					.bool.notNull.default(false)
					.comment('Whether the agent is archived: hidden, unpublished and read-only'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['isArchived'], { recreatesOnSqlite: true });
	}
}
