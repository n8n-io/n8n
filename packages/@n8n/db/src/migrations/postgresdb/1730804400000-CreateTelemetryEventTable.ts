import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTelemetryEventTable1730804400000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}telemetry_event (
				"id" SERIAL NOT NULL,
				"eventName" character varying(255) NOT NULL,
				"properties" json NOT NULL,
				"userId" character varying(36),
				"sessionId" character varying(255),
				"workflowId" character varying(36),
				"source" character varying(50) NOT NULL,
				"instanceId" character varying(255),
				"workspaceId" character varying(36),
				"tenantId" character varying(36),
				"createdAt" TIMESTAMP NOT NULL DEFAULT now(),
				"updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
				CONSTRAINT PK_${tablePrefix}telemetry_event PRIMARY KEY ("id")
			)`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}telemetry_event_eventName ON ${tablePrefix}telemetry_event ("eventName")`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}telemetry_event_userId ON ${tablePrefix}telemetry_event ("userId")`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}telemetry_event_workspaceId ON ${tablePrefix}telemetry_event ("workspaceId")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS IDX_${tablePrefix}telemetry_event_workspaceId`);
		await queryRunner.query(`DROP INDEX IF EXISTS IDX_${tablePrefix}telemetry_event_userId`);
		await queryRunner.query(`DROP INDEX IF EXISTS IDX_${tablePrefix}telemetry_event_eventName`);
		await queryRunner.query(`DROP TABLE IF EXISTS ${tablePrefix}telemetry_event`);
	}
}
