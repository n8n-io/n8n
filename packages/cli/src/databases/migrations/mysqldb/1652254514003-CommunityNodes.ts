import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '@/config';

export class CommunityNodes1652254514003 implements MigrationInterface {
	name = 'CommunityNodes1652254514003';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}installed_packages\` (` +
				'`packageName` char(214) NOT NULL,' +
				'`installedVersion` char(50) NOT NULL,' +
				'`authorName` char(70) NULL,' +
				'`authorEmail` char(70) NULL,' +
				'`createdAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,' +
				'`updatedAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,' +
				'PRIMARY KEY (`packageName`)' +
				') ENGINE=InnoDB;',
		);

		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}installed_nodes\` (` +
				'`name` char(200) NOT NULL,' +
				'`type` char(200) NOT NULL,' +
				"`latestVersion` int NOT NULL DEFAULT '1'," +
				'`package` char(214) NOT NULL,' +
				'PRIMARY KEY (`name`),' +
				`INDEX \`FK_${tablePrefix}73f857fc5dce682cef8a99c11dbddbc969618951\` (\`package\` ASC)` +
				") ENGINE='InnoDB';",
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}installed_nodes\` ADD CONSTRAINT \`FK_${tablePrefix}73f857fc5dce682cef8a99c11dbddbc969618951\` FOREIGN KEY (\`package\`) REFERENCES \`${tablePrefix}installed_packages\`(\`packageName\`) ON DELETE CASCADE ON UPDATE CASCADE`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD UNIQUE INDEX \`IDX_${tablePrefix}943d8f922be094eb507cb9a7f9\` (\`name\`)`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_nodes"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}installed_packages"`);
	}
}
