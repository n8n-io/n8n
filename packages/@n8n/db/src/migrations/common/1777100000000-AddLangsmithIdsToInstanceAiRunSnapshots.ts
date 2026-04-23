import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLangsmithIdsToInstanceAiRunSnapshots1777100000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('instance_ai_run_snapshots', [
			column('langsmithRunId')
				.varchar(36)
				.comment('LangSmith run ID (UUID v4, e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479").'),
			column('langsmithTraceId')
				.varchar(36)
				.comment('LangSmith trace ID (UUID v4, e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479").'),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('instance_ai_run_snapshots', ['langsmithRunId', 'langsmithTraceId']);
	}
}
