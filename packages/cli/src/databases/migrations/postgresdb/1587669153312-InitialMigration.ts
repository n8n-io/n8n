import {
	MigrationInterface, QueryRunner } from 'typeorm';

import config from '@/config';

export class InitialMigration1587669153312 implements MigrationInterface {
	name = 'InitialMigration1587669153312';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixIndex = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}credentials_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "data" text NOT NULL, "type" character varying(32) NOT NULL, "nodesAccess" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT PK_${tablePrefixIndex}814c3d3c36e8a27fa8edb761b0e PRIMARY KEY ("id"))`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixIndex}07fde106c0b471d8cc80a64fc8 ON ${tablePrefix}credentials_entity (type) `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}execution_entity ("id" SERIAL NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" character varying NOT NULL, "retryOf" character varying, "retrySuccessId" character varying, "startedAt" TIMESTAMP NOT NULL, "stoppedAt" TIMESTAMP NOT NULL, "workflowData" json NOT NULL, "workflowId" character varying, CONSTRAINT PK_${tablePrefixIndex}e3e63bbf986767844bbe1166d4e PRIMARY KEY ("id"))`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixIndex}c4d999a5e90784e8caccf5589d ON ${tablePrefix}execution_entity ("workflowId") `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}workflow_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "active" boolean NOT NULL, "nodes" json NOT NULL, "connections" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "settings" json, "staticData" json, CONSTRAINT PK_${tablePrefixIndex}eded7d72664448da7745d551207 PRIMARY KEY ("id"))`, undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.getEnv('database.tablePrefix');
		const tablePrefixIndex = tablePrefix;
		const schema = config.getEnv('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`SET search_path TO ${schema};`);

		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_entity`, undefined);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefixIndex}c4d999a5e90784e8caccf5589d`, undefined);
		await queryRunner.query(`DROP TABLE ${tablePrefix}execution_entity`, undefined);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefixIndex}07fde106c0b471d8cc80a64fc8`, undefined);
		await queryRunner.query(`DROP TABLE ${tablePrefix}credentials_entity`, undefined);
	}

}
