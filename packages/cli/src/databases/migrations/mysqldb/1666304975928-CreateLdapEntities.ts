import { MigrationInterface, QueryRunner } from 'typeorm';
import { LDAP_DEFAULT_CONFIGURATION } from '@/Ldap/constants';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';

export class CreateLdapEntities1666304975928 implements MigrationInterface {
	name = 'CreateLdapEntities1666304975928';

	async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\`
			ADD COLUMN \`ldapId\` varchar(60) DEFAULT null,
			ADD COLUMN \`signInType\` varchar(20) DEFAULT \'email'\,
			ADD COLUMN \`disabled\` boolean NOT NULL DEFAULT false;`,
		);

		await queryRunner.query(
			`CREATE UNIQUE INDEX \`UQ_${tablePrefix}1b8332f7a44b48c3805d43db5627542b\` ON \`${tablePrefix}user\` (\`ldapId\`)`,
		);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS feature_config (
				\`name\`	TEXT,
				\`data\` json NOT NULL DEFAULT ('{}'),
				CONSTRAINT \`PK_2cfdd5df74064c89b3455f35b14e0aa8\` PRIMARY KEY (\`name\`(20))
			) ENGINE='InnoDB';`,
		);

		await queryRunner.query(`
			INSERT INTO feature_config(name, data)
			VALUES (\'ldap\', \'${JSON.stringify(LDAP_DEFAULT_CONFIGURATION)}\');
		`);

		await queryRunner.query(
			`CREATE TABLE IF NOT EXISTS ldap_sync_history (
				\`id\` int NOT NULL AUTO_INCREMENT,
				\`startedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`endedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`created\`	INTEGER NOT NULL,
				\`updated\`	INTEGER NOT NULL,
				\`disabled\`	INTEGER NOT NULL,
				\`scanned\`	INTEGER NOT NULL,
				\`status\`	TEXT NOT NULL,
				\`runMode\` TEXT NOT NULL,
				\`error\` TEXT,
				CONSTRAINT \`PK_59087782aef3473db531b7c1fa2fbc7f\` PRIMARY KEY (\`id\`)
			) ENGINE='InnoDB';`,
		);

		logMigrationEnd(this.name);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
