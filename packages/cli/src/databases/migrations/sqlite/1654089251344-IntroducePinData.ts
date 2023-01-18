import { MigrationInterface, QueryRunner } from 'typeorm';
import { logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class IntroducePinData1654089251344 implements MigrationInterface {
	name = 'IntroducePinData1654089251344';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN "pinData" text`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` RENAME TO "temporary_workflow_entity"`,
		);
		await queryRunner.query(
			`CREATE TABLE \`${tablePrefix}workflow_entity\` (
				"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(128) NOT NULL, "active" boolean NOT NULL, "nodes" text NOT NULL, "connections" text NOT NULL, "createdAt" datetime NOT NULL, "updatedAt" datetime NOT NULL, "settings" text, "staticData" text`,
		);
		await queryRunner.query(
			`INSERT INTO \`${tablePrefix}workflow_entity\` ("id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData") SELECT "id", "name", "active", "nodes", "connections", "createdAt", "updatedAt", "settings", "staticData" FROM "temporary_workflow_entity"`,
		);
		await queryRunner.query(`DROP TABLE "temporary_workflow_entity"`);
	}
}
