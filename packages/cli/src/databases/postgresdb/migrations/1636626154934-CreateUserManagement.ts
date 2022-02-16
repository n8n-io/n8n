import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuid } from 'uuid';
import config = require('../../../../config');
import { loadSurveyFromDisk } from '../../utils/migrationHelpers';

export class CreateUserManagement1636626154934 implements MigrationInterface {
	name = 'CreateUserManagement1636626154934';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(
			'CREATE TABLE "' + tablePrefix + 'role" (' +
				'"id" serial NOT NULL,' +
				'PRIMARY KEY ("id"),' +
				'"name" VARCHAR(32) NOT NULL,' +
				'"scope" VARCHAR(250) NOT NULL,' +
				'"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'CONSTRAINT "UQ_' + tablePrefix + '5b49d0f504f7ef31045a1fb2eb8" UNIQUE ("scope", "name")' +
			');'
		);

		await queryRunner.query(
			'CREATE TABLE "' + tablePrefix + 'user" (' +
				'"id" UUID NOT NULL DEFAULT gen_random_uuid(),' +
				'"email" VARCHAR(254) NULL DEFAULT null,' +
				'"firstName" VARCHAR(32) NULL DEFAULT null,' +
				'"lastName" VARCHAR(32) NULL DEFAULT null,' +
				'"password" VARCHAR(200) NULL DEFAULT null,' +
				'"resetPasswordToken" VARCHAR(200) NULL DEFAULT null,' +
				'"resetPasswordTokenExpiration" int NULL DEFAULT null,' +
				'"personalizationAnswers" text NULL DEFAULT null,' +
				'"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
				'"globalRoleId" int NOT NULL,' +
				'CONSTRAINT "userId" PRIMARY KEY (id),' +
				'CONSTRAINT "IDX_' + tablePrefix + 'e12875dfb3b1d92d7d7c5377e2" UNIQUE (email),' +
				'CONSTRAINT "FK_' + tablePrefix + 'f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "role"(id)' +
			');'
		);

		await queryRunner.query(
		  'CREATE TABLE "' + tablePrefix + 'shared_workflow" ( ' +
				'"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'"roleId" INT NOT NULL, ' +
				'"userId" UUID NOT NULL, ' +
				'"workflowId" INT NOT NULL, ' +
				'CONSTRAINT "PK_userIdWorkflowId" PRIMARY KEY ("userId", "workflowId"), ' +
				'CONSTRAINT "FK_' + tablePrefix + '3540da03964527aa24ae014b780" ' +
					'FOREIGN KEY ("roleId") ' +
					'REFERENCES "' + tablePrefix + 'role" ("id") ' +
					'ON DELETE NO ACTION ' +
					'ON UPDATE NO ACTION, ' +
				'CONSTRAINT "FK_' + tablePrefix + '82b2fd9ec4e3e24209af8160282" ' +
					'FOREIGN KEY ("userId") ' +
					'REFERENCES "' + tablePrefix + 'user" ("id") ' +
					'ON DELETE CASCADE ' +
					'ON UPDATE NO ACTION, ' +
				'CONSTRAINT "FK_' + tablePrefix + 'b83f8d2530884b66a9c848c8b88" ' +
					'FOREIGN KEY ("workflowId") ' +
					'REFERENCES "' + tablePrefix + 'workflow_entity" ("id") ' +
					'ON DELETE CASCADE ' +
					'ON UPDATE NO ACTION);'
		);

		await queryRunner.query(
			'CREATE TABLE "' + tablePrefix + 'shared_credentials" ( ' +
			'"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
			'"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
			'"roleId" INT NOT NULL, ' +
			'"userId" UUID NOT NULL, ' +
			'"credentialsId" INT NOT NULL, ' +
			'CONSTRAINT "PK_userIdCredentialsId" PRIMARY KEY ("userId", "credentialsId"), ' +
			'CONSTRAINT "FK_' + tablePrefix + 'c68e056637562000b68f480815a" ' +
			  'FOREIGN KEY ("roleId") ' +
			  'REFERENCES "' + tablePrefix + 'role" ("id") ' +
			  'ON DELETE NO ACTION ' +
			  'ON UPDATE NO ACTION, ' +
			'CONSTRAINT "FK_' + tablePrefix + '484f0327e778648dd04f1d70493" ' +
			  'FOREIGN KEY ("userId") ' +
			  'REFERENCES "' + tablePrefix + 'user" ("id") ' +
			  'ON DELETE CASCADE ' +
			  'ON UPDATE NO ACTION, ' +
			'CONSTRAINT "FK_' + tablePrefix + '68661def1d4bcf2451ac8dbd949" ' +
			  'FOREIGN KEY ("credentialsId") ' +
			  'REFERENCES "' + tablePrefix + 'credentials_entity" ("id") ' +
			  'ON DELETE NO ACTION ' +
			  'ON UPDATE NO ACTION);'
		);

		await queryRunner.query(
			'CREATE TABLE "' + tablePrefix + 'settings" ( ' +
				'"key" VARCHAR(250) NOT NULL, ' +
				'"value" TEXT NOT NULL, ' +
				'"loadOnStartup" boolean NOT NULL DEFAULT false, ' +
				'CONSTRAINT "PK_key" PRIMARY KEY ("key"));'
		);

		// Insert initial roles
		await queryRunner.query('INSERT INTO "' + tablePrefix + 'role" (name, scope) VALUES (\'owner\', \'global\');');

		const instanceOwnerRole = await queryRunner.query('SELECT lastval() as "insertId"');

		await queryRunner.query('INSERT INTO "' + tablePrefix + 'role" (name, scope) VALUES (\'member\', \'global\');');

		await queryRunner.query('INSERT INTO "' + tablePrefix + 'role" (name, scope) VALUES (\'owner\', \'workflow\');');

		const workflowOwnerRole = await queryRunner.query('SELECT lastval() as "insertId"');

		await queryRunner.query('INSERT INTO "' + tablePrefix + 'role" (name, scope) VALUES (\'owner\', \'credential\');');

		const credentialOwnerRole = await queryRunner.query('SELECT lastval() as "insertId"');

		const survey = loadSurveyFromDisk();

		const ownerUserId = uuid();
		await queryRunner.query(
			'INSERT INTO "' + tablePrefix + 'user" ' +
			  '("id", "globalRoleId", "personalizationAnswers") values ($1, $2, $3)',
				[ownerUserId, instanceOwnerRole[0].insertId, survey ?? null]
		);
				await queryRunner.query(
			'INSERT INTO "' + tablePrefix + 'shared_workflow" ("createdAt", "updatedAt", "roleId", "userId", "workflowId")  ' +
			' select NOW(), NOW(), \'' + workflowOwnerRole[0].insertId + '\', \'' + ownerUserId + '\', "id" from "' + tablePrefix + 'workflow_entity"'
		);

		await queryRunner.query(
			'INSERT INTO "' + tablePrefix + 'shared_credentials" ("createdAt", "updatedAt", "roleId", "userId", "credentialsId")  ' +
			' select NOW(), NOW(), \'' + credentialOwnerRole[0].insertId + '\', \'' + ownerUserId + '\', "id" from "' + tablePrefix + 'credentials_entity"'
		);

		await queryRunner.query(
			'INSERT INTO "' + tablePrefix + 'settings" ("key", "value", "loadOnStartup") values  ' +
			'(\'userManagement.hasOwner\', \'false\', true)'
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "shared_credentials"`);
		await queryRunner.query(`DROP TABLE "shared_workflow"`);
		await queryRunner.query(`DROP TABLE "user"`);
		await queryRunner.query(`DROP TABLE "role"`);
		await queryRunner.query(`DROP TABLE "settings"`);
	}
}
