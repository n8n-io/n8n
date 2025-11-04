import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTelemetryTables1762233800000 implements ReversibleMigration {
	async up({ schemaBuilder: { createTable, column } }: MigrationContext) {
		// Create telemetry_event table
		await createTable('telemetry_event')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('eventName').varchar(255).notNull,
				column('properties').json.default('{}'),
				column('userId').varchar(36),
				column('sessionId').varchar(255),
				column('workflowId').varchar(36),
				column('source').varchar(50).notNull,
				column('instanceId').varchar(255),
				column('workspaceId').varchar(36).comment('Reserved for multi-tenant architecture'),
				column('tenantId').varchar(36).comment('Reserved for multi-tenant architecture'),
			)
			.withTimestamps
			.withIndexOn(['eventName'])
			.withIndexOn(['userId'])
			.withIndexOn(['createdAt'])
			.withIndexOn(['workspaceId']);

		// Create telemetry_session table
		await createTable('telemetry_session')
			.withColumns(
				column('id').int.primary.autoGenerate2,
				column('userId').varchar(36),
				column('endedAt').timestamp(),
				column('metadata').json.default('{}'),
				column('workspaceId').varchar(36).comment('Reserved for multi-tenant architecture'),
			)
			.withTimestamps
			.withIndexOn(['userId']);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable('telemetry_event');
		await dropTable('telemetry_session');
	}
}
