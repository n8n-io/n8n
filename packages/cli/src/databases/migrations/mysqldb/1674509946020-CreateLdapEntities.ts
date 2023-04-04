import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION, LDAP_FEATURE_NAME } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateLdapEntities1674509946020 implements MigrationInterface {
	name = 'CreateLdapEntities1674509946020';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);

		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN disabled BOOLEAN NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(`
			INSERT INTO ${tablePrefix}settings(\`key\`, value, loadOnStartup)
			VALUES ('${LDAP_FEATURE_NAME}', '${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}', 1);
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS \`${tablePrefix}auth_identity\` (
				\`userId\` VARCHAR(36) REFERENCES \`${tablePrefix}user\` (id),
				\`providerId\` VARCHAR(64) NOT NULL,
				\`providerType\` VARCHAR(32) NOT NULL,
				\`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY(\`providerId\`, \`providerType\`)
			) ENGINE='InnoDB';`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS \`${tablePrefix}auth_provider_sync_history\` (
				\`id\` INTEGER NOT NULL AUTO_INCREMENT,
				\`providerType\` VARCHAR(32) NOT NULL,
				\`runMode\` TEXT NOT NULL,
				\`status\`	TEXT NOT NULL,
				\`startedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`endedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`scanned\`	INTEGER NOT NULL,
				\`created\`	INTEGER NOT NULL,
				\`updated\`	INTEGER NOT NULL,
				\`disabled\`	INTEGER NOT NULL,
				\`error\` TEXT,
				PRIMARY KEY (\`id\`)
			) ENGINE='InnoDB';`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP TABLE \`${tablePrefix}auth_provider_sync_history\``);
		await queryRunner.query(`DROP TABLE \`${tablePrefix}auth_identity\``);

		await queryRunner.query(
			`DELETE FROM ${tablePrefix}settings WHERE \`key\` = '${LDAP_FEATURE_NAME}'`,
		);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN disabled`);
	}
}
