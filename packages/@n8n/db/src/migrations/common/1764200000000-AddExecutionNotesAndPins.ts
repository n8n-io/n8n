import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddExecutionNotesAndPins1764200000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('execution_entity', [
			column('note').text,
			column('noteUpdatedAt').timestampTimezone(),
			column('noteUpdatedBy').varchar(36),
			column('pinned').bool.notNull.default(false),
			column('pinnedAt').timestampTimezone(),
			column('pinnedBy').varchar(36),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('execution_entity', [
			'note',
			'noteUpdatedAt',
			'noteUpdatedBy',
			'pinned',
			'pinnedAt',
			'pinnedBy',
		]);
	}
}
