import { MigrationInterface, QueryRunner } from 'typeorm';
import * as config from '../../../../config';
import { logMigrationEnd, logMigrationStart } from '../../utils/migrationHelpers';

export class ProcessedData1657969159557 implements MigrationInterface {
	name = 'ProcessedData1657969159557';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = config.getEnv('database.tablePrefix');

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}processed_data" ("value" varchar NOT NULL, "context" varchar NOT NULL, "workflowId" varchar NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), PRIMARY KEY ("value", "context", "workflowId"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}2ee85375a902774232874d314e" ON "${tablePrefix}processed_data" ("workflowId", "context", "value") `,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.getEnv('database.tablePrefix');
		await queryRunner.query(`DROP TABLE "${tablePrefix}processed_data"`);
	}
}
