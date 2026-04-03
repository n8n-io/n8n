import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSdkAgentTable1774100000000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}sdk_agent" (
				"id" VARCHAR(36) PRIMARY KEY NOT NULL,
				"name" VARCHAR(128) NOT NULL,
				"code" TEXT NOT NULL,
				"description" VARCHAR NULL,
				"projectId" VARCHAR NOT NULL,
				"credentialId" VARCHAR NULL,
				"provider" VARCHAR NULL,
				"model" VARCHAR NULL,
				"integrations" TEXT NOT NULL DEFAULT '[]',
				"schema" TEXT NULL DEFAULT NULL,
				"createdAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				"updatedAt" DATETIME(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
				FOREIGN KEY ("projectId") REFERENCES "${tablePrefix}project"("id") ON DELETE CASCADE
			)
		`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE IF EXISTS "${tablePrefix}sdk_agent"`);
	}
}
