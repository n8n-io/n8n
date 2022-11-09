import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateLdapEntities1666304975928 implements MigrationInterface {
	name = 'CreateLdapEntities1666304975928';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}user
			ADD COLUMN "ldapId" VARCHAR(60) DEFAULT NULL,
			ADD COLUMN "signInType" VARCHAR(20) DEFAULT 'email',
			ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(
			`CREATE UNIQUE INDEX "UQ_${tablePrefix}1b8332f7a44b48c3805d43db5627542b" ON ${tablePrefix}user ("ldapId")`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}feature_config (
				"name"	TEXT,
				"data"	json NOT NULL DEFAULT '{}'::json,
				CONSTRAINT "PK_${tablePrefix}2cfdd5df74064c89b3455f35b14e0aa8" PRIMARY KEY ("name")
			);`,
		);

		await queryRunner.query(`
				INSERT INTO ${tablePrefix}feature_config (name, data) VALUES (
					'ldap',
					'${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}'
				)
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}ldap_sync_history (
				"id" serial NOT NULL,
				"startedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"endedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				"created"	INTEGER NOT NULL,
				"updated"	INTEGER NOT NULL,
				"disabled"	INTEGER NOT NULL,
				"scanned"	INTEGER NOT NULL,
				"status"	TEXT NOT NULL,
				"runMode" TEXT NOT NULL,
				"error" TEXT,
				CONSTRAINT "PK_${tablePrefix}59087782aef3473db531b7c1fa2fbc7f" PRIMARY KEY ("id")
			);`,
		);
		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
