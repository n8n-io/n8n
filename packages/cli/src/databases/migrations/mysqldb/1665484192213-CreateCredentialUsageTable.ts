import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class CreateCredentialUsageTable1665484192213 implements MigrationInterface {
	name = 'CreateCredentialUsageTable1665484192213';

	async up(queryRunner: QueryRunner) {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}credential_usage\` (` +
				'`workflowId` int NOT NULL,' +
				'`nodeId` char(200) NOT NULL,' +
				"`credentialId` int NOT NULL DEFAULT '1'," +
				`\`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,` +
				`\`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,` +
				'PRIMARY KEY (`workflowId`, `nodeId`, `credentialId`)' +
				") ENGINE='InnoDB';",
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}credential_usage\` ADD CONSTRAINT \`FK_${tablePrefix}518e1ece107b859ca6ce9ed2487f7e23\` FOREIGN KEY (\`workflowId\`) REFERENCES \`${tablePrefix}workflow_entity\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}credential_usage\` ADD CONSTRAINT \`FK_${tablePrefix}7ce200a20ade7ae89fa7901da896993f\` FOREIGN KEY (\`credentialId\`) REFERENCES \`${tablePrefix}credentials_entity\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner) {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`
			DELETE FROM ${tablePrefix}role WHERE name='user' AND scope='workflow';
		`);
	}
}
