import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddLangsmithIdsToInstanceAiRunSnapshots1777100000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('instance_ai_run_snapshots', [
			column('langsmithRunId').varchar(36),
			column('langsmithTraceId').varchar(36),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('instance_ai_run_snapshots', ['langsmithRunId', 'langsmithTraceId']);
	}
}
