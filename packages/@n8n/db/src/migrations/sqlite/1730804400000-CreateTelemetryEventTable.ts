import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTelemetryEventTable1730804400000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS "${tablePrefix}telemetry_event" (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
				"eventName" varchar(255) NOT NULL,
				"properties" text NOT NULL,
				"userId" varchar(36),
				"sessionId" varchar(255),
				"workflowId" varchar(36),
				"source" varchar(50) NOT NULL,
				"instanceId" varchar(255),
				"workspaceId" varchar(36),
				"tenantId" varchar(36),
				"createdAt" datetime NOT NULL DEFAULT (datetime('now')),
				"updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
			)`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}telemetry_event_eventName" ON "${tablePrefix}telemetry_event" ("eventName")`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}telemetry_event_userId" ON "${tablePrefix}telemetry_event" ("userId")`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}telemetry_event_workspaceId" ON "${tablePrefix}telemetry_event" ("workspaceId")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}telemetry_event_workspaceId"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}telemetry_event_userId"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}telemetry_event_eventName"`);
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}telemetry_event"`);
	}
}
