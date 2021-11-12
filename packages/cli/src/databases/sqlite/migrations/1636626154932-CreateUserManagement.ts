import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserManagement1636626154932 implements MigrationInterface {
	name = 'CreateUserManagement1636626154932';

	public async up(queryRunner: QueryRunner): Promise<void> {
		console.log('Running User Management Migration');

		await queryRunner.query(
			`CREATE TABLE "role" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar(32) NOT NULL, "scope" varchar NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "UQ_5b49d0f504f7ef31045a1fb2eb8" UNIQUE ("scope", "name"))`,
		);

		await queryRunner.query(
			`CREATE TABLE "user" ("id" varchar PRIMARY KEY NOT NULL, "email" varchar(254) NOT NULL, "firstName" varchar(32) NOT NULL, "lastName" varchar(32) NOT NULL, "password" varchar NOT NULL, "resetPasswordToken" varchar, "personalizationAnswers" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "globalRoleId" integer NOT NULL, CONSTRAINT "FK_f0609be844f9200ff4365b1bb3d" FOREIGN KEY ("globalRoleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `,
		);

		await queryRunner.query(
			`CREATE TABLE "shared_workflow" ("createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "roleId" integer NOT NULL, "userId" varchar NOT NULL, "workflowId" integer NOT NULL, CONSTRAINT "FK_3540da03964527aa24ae014b780" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_82b2fd9ec4e3e24209af8160282" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_b83f8d2530884b66a9c848c8b88" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("userId", "workflowId"))`,
		);

		await queryRunner.query(
			`CREATE TABLE "shared_credentials" ("createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "roleId" integer NOT NULL, "userId" varchar NOT NULL, "credentialsId" integer NOT NULL, CONSTRAINT "FK_c68e056637562000b68f480815a" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_484f0327e778648dd04f1d70493" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_68661def1d4bcf2451ac8dbd949" FOREIGN KEY ("credentialsId") REFERENCES "credentials_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("userId", "credentialsId"))`,
		);

		// Insert initial roles
		await queryRunner.query(`
			INSERT INTO role (name, scope)
			VALUES ("owner", "global");
		`);

		await queryRunner.query(`
			INSERT INTO role (name, scope)
			VALUES ("member", "global");
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "shared_credentials"`);
		await queryRunner.query(`DROP TABLE "shared_workflow"`);
		await queryRunner.query(`DROP INDEX "IDX_e12875dfb3b1d92d7d7c5377e2"`);
		await queryRunner.query(`DROP TABLE "user"`);
		await queryRunner.query(`DROP TABLE "role"`);
	}
}
