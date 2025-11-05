import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateTelemetryEventTable1730804400000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS \`${tablePrefix}telemetry_event\` (
				\`id\` int NOT NULL AUTO_INCREMENT,
				\`eventName\` varchar(255) NOT NULL,
				\`properties\` json NOT NULL,
				\`userId\` varchar(36) NULL,
				\`sessionId\` varchar(255) NULL,
				\`workflowId\` varchar(36) NULL,
				\`source\` varchar(50) NOT NULL,
				\`instanceId\` varchar(255) NULL,
				\`workspaceId\` varchar(36) NULL,
				\`tenantId\` varchar(36) NULL,
				\`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				INDEX \`IDX_${tablePrefix}telemetry_event_eventName\` (\`eventName\`),
				INDEX \`IDX_${tablePrefix}telemetry_event_userId\` (\`userId\`),
				INDEX \`IDX_${tablePrefix}telemetry_event_workspaceId\` (\`workspaceId\`),
				PRIMARY KEY (\`id\`)
			) ENGINE=InnoDB`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE IF EXISTS \`${tablePrefix}telemetry_event\``);
	}
}
