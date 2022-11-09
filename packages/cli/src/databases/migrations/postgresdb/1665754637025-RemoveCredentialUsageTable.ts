import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class RemoveCredentialUsageTable1665754637025 implements MigrationInterface {
	name = 'RemoveCredentialUsageTable1665754637025';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE ${tablePrefix}credential_usage`);
		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}credential_usage (` +
				'"workflowId" int NOT NULL,' +
				'"nodeId" UUID NOT NULL,' +
				'"credentialId" int NULL,' +
				'"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				`CONSTRAINT "PK_${tablePrefix}feb7a6545aa714ac6e7f6b14825f0efc9353dd3a" PRIMARY KEY ("workflowId", "nodeId", "credentialId"), ` +
				`CONSTRAINT "FK_${tablePrefix}518e1ece107b859ca6ce9ed2487f7e23" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity ("id") ON DELETE CASCADE ON UPDATE CASCADE, ` +
				`CONSTRAINT "FK_${tablePrefix}7ce200a20ade7ae89fa7901da896993f" FOREIGN KEY ("credentialId") REFERENCES ${tablePrefix}credentials_entity ("id") ON DELETE CASCADE ON UPDATE CASCADE ` +
				');',
		);
	}
}
