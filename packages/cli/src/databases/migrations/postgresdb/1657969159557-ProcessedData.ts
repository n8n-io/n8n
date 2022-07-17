import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../../../config';

export class ProcessedData1657969159557 implements MigrationInterface {
	name = 'ProcessedData1657969159557';

	public async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}processed_data ("value" character varying NOT NULL, "context" character varying NOT NULL, "workflowId" character varying NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT ('now'::text)::timestamp(3) with time zone, CONSTRAINT "PK_2ee85375a902774232874d314e4" PRIMARY KEY ("value", "context", "workflowId"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}2ee85375a902774232874d314e" ON ${tablePrefix}processed_data ("workflowId", "context", "value") `,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query(`DROP TABLE ${tablePrefix}processed_data`);
	}
}
