import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddSetupCompletedAtToAgents1785500832626 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns(
			'agents',
			[
				column('setupCompletedAt')
					.timestampTimezone()
					.comment('When this agent first reached a complete, publishable setup'),
			],
			{ recreatesOnSqlite: true },
		);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('agents', ['setupCompletedAt'], { recreatesOnSqlite: true });
	}
}
