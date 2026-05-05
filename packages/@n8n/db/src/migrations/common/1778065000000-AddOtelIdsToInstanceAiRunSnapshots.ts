import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddOtelIdsToInstanceAiRunSnapshots1778065000000 implements ReversibleMigration {
	async up({ schemaBuilder: { addColumns, column } }: MigrationContext) {
		await addColumns('instance_ai_run_snapshots', [
			column('traceId').varchar(32).comment('OpenTelemetry trace ID for the product root span.'),
			column('spanId').varchar(16).comment('OpenTelemetry span ID for the product root span.'),
		]);
	}

	async down({ schemaBuilder: { dropColumns } }: MigrationContext) {
		await dropColumns('instance_ai_run_snapshots', ['traceId', 'spanId']);
	}
}
