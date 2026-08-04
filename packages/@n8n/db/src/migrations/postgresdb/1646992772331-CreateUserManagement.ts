import { v4 as uuid } from 'uuid';

import type { InsertResult, MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateUserManagement1646992772331 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, loadSurveyFromDisk }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}role (
				"id" serial NOT NULL,
				"name" VARCHAR(32) NOT NULL,
				"scope" VARCHAR(255) NOT NULL,
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT "PK_${tablePrefix}e853ce24e8200abe5721d2c6ac552b73" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_${tablePrefix}5b49d0f504f7ef31045a1fb2eb8" UNIQUE ("scope", "name")
			);`,
		);

		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}user" (
				"id" UUID NOT NULL DEFAULT uuid_in(overlay(overlay(md5(random()::text || ':' || clock_timestamp()::text) placing '4' from 13) placing to_hex(floor(random()*(11-8+1) + 8)::int)::text from 17)::cstring),
				"email" VARCHAR(255),
				"firstName" VARCHAR(32),
				"lastName" VARCHAR(32),
				"password" VARCHAR(255),
				"resetPasswordToken" VARCHAR(255),
				"resetPasswordTokenExpiration" int,
				"personalizationAnswers" text,
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"globalRoleId" int NOT NULL,
				CONSTRAINT "PK_${tablePrefix}ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_${tablePrefix}e12875dfb3b1d92d7d7c5377e2" UNIQUE (email),
				CONSTRAINT "FK_${tablePrefix}f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES ${tablePrefix}role (id)
			);`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}shared_workflow (
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"roleId" INT NOT NULL,
				"userId" UUID NOT NULL,
				"workflowId" INT NOT NULL,
				CONSTRAINT "PK_${tablePrefix}cc5d5a71c7b2591f5154ffb0c785e85e" PRIMARY KEY ("userId", "workflowId"),
				CONSTRAINT "FK_${tablePrefix}3540da03964527aa24ae014b780" FOREIGN KEY ("roleId") REFERENCES ${tablePrefix}role ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
				CONSTRAINT "FK_${tablePrefix}82b2fd9ec4e3e24209af8160282" FOREIGN KEY ("userId") REFERENCES "${tablePrefix}user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				CONSTRAINT "FK_${tablePrefix}b83f8d2530884b66a9c848c8b88" FOREIGN KEY ("workflowId") REFERENCES
				${tablePrefix}workflow_entity ("id") ON DELETE CASCADE ON UPDATE NO ACTION
			);`,
		);

		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}65a0933c0f19d278881653bf81d35064" ON ${tablePrefix}shared_workflow ("workflowId");`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}shared_credentials (
				"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"roleId" INT NOT NULL,
				"userId" UUID NOT NULL,
				"credentialsId" INT NOT NULL,
				CONSTRAINT "PK_${tablePrefix}10dd1527ffb639609be7aadd98f628c6" PRIMARY KEY ("userId", "credentialsId"),
				CONSTRAINT "FK_${tablePrefix}c68e056637562000b68f480815a" FOREIGN KEY ("roleId") REFERENCES ${tablePrefix}role ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
				CONSTRAINT "FK_${tablePrefix}484f0327e778648dd04f1d70493" FOREIGN KEY ("userId") REFERENCES "${tablePrefix}user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
				CONSTRAINT "FK_${tablePrefix}68661def1d4bcf2451ac8dbd949" FOREIGN KEY ("credentialsId") REFERENCES ${tablePrefix}credentials_entity ("id") ON DELETE CASCADE ON UPDATE NO ACTION
			);`,
		);

		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}829d16efa0e265cb076d50eca8d21733" ON ${tablePrefix}shared_credentials ("credentialsId");`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}settings (
				"key" VARCHAR(255) NOT NULL,
				"value" TEXT NOT NULL,
				"loadOnStartup" boolean NOT NULL DEFAULT false,
				CONSTRAINT "PK_${tablePrefix}dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY ("key")
			);`,
		);

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}a252c527c4c89237221fe2c0ab"`);

		// Insert initial roles
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'global');`,
		);

		const instanceOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('member', 'global');`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'workflow');`,
		);

		const workflowOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ('owner', 'credential');`,
		);

		const credentialOwnerRole = (await queryRunner.query(
			'SELECT lastval() as "insertId"',
		)) as InsertResult;

		const survey = loadSurveyFromDisk();

		const ownerUserId = uuid();

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}user" ("id", "globalRoleId", "personalizationAnswers") values ($1, $2, $3)`,
			[ownerUserId, instanceOwnerRole[0].insertId, survey],
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_workflow ("createdAt", "updatedAt", "roleId", "userId", "workflowId") select
				NOW(), NOW(), '${workflowOwnerRole[0].insertId}', '${ownerUserId}', "id" FROM ${tablePrefix}workflow_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_credentials ("createdAt", "updatedAt", "roleId", "userId", "credentialsId")   SELECT NOW(), NOW(), '${credentialOwnerRole[0].insertId}', '${ownerUserId}', "id" FROM ${tablePrefix}credentials_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings ("key", "value", "loadOnStartup") VALUES ('userManagement.isInstanceOwnerSetUp', 'false', true), ('userManagement.skipInstanceOwnerSetup', 'false', true)`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings ("key", "value", "loadOnStartup") VALUES ($1, $2, $3)`,
			['ui.banners.dismissed', '["V1"]', true],
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}a252c527c4c89237221fe2c0ab" ON ${tablePrefix}workflow_entity ("name")`,
		);

		await queryRunner.query(`DROP TABLE ${tablePrefix}shared_credentials`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}shared_workflow`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}user"`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}role`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}settings`);
	}
}
