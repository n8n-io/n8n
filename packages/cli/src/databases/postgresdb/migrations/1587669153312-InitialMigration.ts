import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1587669153312 implements MigrationInterface {
	name = 'InitialMigration1587669153312';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS credentials_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "data" text NOT NULL, "type" character varying(32) NOT NULL, "nodesAccess" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT PK_814c3d3c36e8a27fa8edb761b0e PRIMARY KEY ("id"))`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_07fde106c0b471d8cc80a64fc8 ON credentials_entity (type) `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS execution_entity ("id" SERIAL NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" character varying NOT NULL, "retryOf" character varying, "retrySuccessId" character varying, "startedAt" TIMESTAMP NOT NULL, "stoppedAt" TIMESTAMP NOT NULL, "workflowData" json NOT NULL, "workflowId" character varying, CONSTRAINT PK_e3e63bbf986767844bbe1166d4e PRIMARY KEY ("id"))`, undefined);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_c4d999a5e90784e8caccf5589d ON execution_entity ("workflowId") `, undefined);
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS workflow_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "active" boolean NOT NULL, "nodes" json NOT NULL, "connections" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "settings" json, "staticData" json, CONSTRAINT PK_eded7d72664448da7745d551207 PRIMARY KEY ("id"))`, undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE workflow_entity`, undefined);
		await queryRunner.query(`DROP INDEX IDX_c4d999a5e90784e8caccf5589d`, undefined);
		await queryRunner.query(`DROP TABLE execution_entity`, undefined);
		await queryRunner.query(`DROP INDEX IDX_07fde106c0b471d8cc80a64fc8`, undefined);
		await queryRunner.query(`DROP TABLE credentials_entity`, undefined);
	}

}
