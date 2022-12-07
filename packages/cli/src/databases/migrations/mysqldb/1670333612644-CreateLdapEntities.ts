import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateLdapEntities1670333612644 implements MigrationInterface {
	name = 'CreateLdapEntities1670333612644';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}user ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}auth_identity (
				\`userId\` VARCHAR(36) REFERENCES ${tablePrefix}user (id),
				\`providerId\` VARCHAR(60) NOT NULL,
				\`providerType\` VARCHAR(20) NOT NULL,
				\`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(\`providerId\`, \`providerType\`)
			) ENGINE='InnoDB';`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}feature_config (
				\`name\` VARCHAR(30),
				\`data\` json NOT NULL DEFAULT ('{}'),
				PRIMARY KEY (\`name\`)
			) ENGINE='InnoDB';`,
		);

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}feature_config(name, data)
			VALUES ('ldap', '${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}');
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ${tablePrefix}ldap_sync_history (
				\`id\` INTEGER NOT NULL AUTO_INCREMENT,
				\`startedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`endedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`created\`	INTEGER NOT NULL,
				\`updated\`	INTEGER NOT NULL,
				\`disabled\`	INTEGER NOT NULL,
				\`scanned\`	INTEGER NOT NULL,
				\`status\`	TEXT NOT NULL,
				\`runMode\` TEXT NOT NULL,
				\`error\` TEXT,
				PRIMARY KEY (\`id\`)
			) ENGINE='InnoDB';`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE ${tablePrefix}ldap_sync_history`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}feature_config`);
		await queryRunner.query(`DROP TABLE ${tablePrefix}auth_identity`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}user DROP COLUMN disabled`);
	}
}
