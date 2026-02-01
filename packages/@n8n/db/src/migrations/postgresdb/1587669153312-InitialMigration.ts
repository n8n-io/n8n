import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class InitialMigration1587669153312 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}credentials_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "data" text NOT NULL, "type" character varying(32) NOT NULL, "nodesAccess" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT PK_${tablePrefix}814c3d3c36e8a27fa8edb761b0e PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8 ON ${tablePrefix}credentials_entity (type) `,
		);
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}execution_entity ("id" SERIAL NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" character varying NOT NULL, "retryOf" character varying, "retrySuccessId" character varying, "startedAt" TIMESTAMP NOT NULL, "stoppedAt" TIMESTAMP NOT NULL, "workflowData" json NOT NULL, "workflowId" character varying, CONSTRAINT PK_${tablePrefix}e3e63bbf986767844bbe1166d4e PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}c4d999a5e90784e8caccf5589d ON ${tablePrefix}execution_entity ("workflowId") `,
		);
		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}workflow_entity ("id" SERIAL NOT NULL, "name" character varying(128) NOT NULL, "active" boolean NOT NULL, "nodes" json NOT NULL, "connections" json NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, "settings" json, "staticData" json, CONSTRAINT PK_${tablePrefix}eded7d72664448da7745d551207 PRIMARY KEY ("id"))`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}workflow_entity`);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}c4d999a5e90784e8caccf5589d`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}execution_entity`);
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}07fde106c0b471d8cc80a64fc8`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}credentials_entity`);
	}
}
