import { v4 as uuid } from 'uuid';

import type { InsertResult, MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateUserManagement1646992772331 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix, loadSurveyFromDisk }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}role (
				\`id\` int NOT NULL AUTO_INCREMENT,
				\`name\` varchar(32) NOT NULL,
				\`scope\` varchar(255) NOT NULL,
				\`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (\`id\`),
				UNIQUE KEY \`UQ_${tablePrefix}5b49d0f504f7ef31045a1fb2eb8\` (\`scope\`,\`name\`)
			) ENGINE=InnoDB;`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}user (
				\`id\` VARCHAR(36) NOT NULL,
				\`email\` VARCHAR(255) NULL DEFAULT NULL,
				\`firstName\` VARCHAR(32) NULL DEFAULT NULL,
				\`lastName\` VARCHAR(32) NULL DEFAULT NULL,
				\`password\` VARCHAR(255) NULL DEFAULT NULL,
				\`resetPasswordToken\` VARCHAR(255) NULL DEFAULT NULL,
				\`resetPasswordTokenExpiration\` INT NULL DEFAULT NULL,
				\`personalizationAnswers\` TEXT NULL DEFAULT NULL,
				\`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`globalRoleId\` INT NOT NULL,
				PRIMARY KEY (\`id\`),
				UNIQUE INDEX \`IDX_${tablePrefix}e12875dfb3b1d92d7d7c5377e2\` (\`email\` ASC),
				INDEX \`FK_${tablePrefix}f0609be844f9200ff4365b1bb3d\` (\`globalRoleId\` ASC)
			) ENGINE=InnoDB;`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD CONSTRAINT \`FK_${tablePrefix}f0609be844f9200ff4365b1bb3d\` FOREIGN KEY (\`globalRoleId\`) REFERENCES \`${tablePrefix}role\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}shared_workflow (
				\`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`roleId\` INT NOT NULL,
				\`userId\` VARCHAR(36) NOT NULL,
				\`workflowId\` INT NOT NULL,
				INDEX \`FK_${tablePrefix}3540da03964527aa24ae014b780x\` (\`roleId\` ASC),
				INDEX \`FK_${tablePrefix}82b2fd9ec4e3e24209af8160282x\` (\`userId\` ASC),
				INDEX \`FK_${tablePrefix}b83f8d2530884b66a9c848c8b88x\` (\`workflowId\` ASC),
				PRIMARY KEY (\`userId\`, \`workflowId\`)
			) ENGINE=InnoDB;`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_workflow\` ADD CONSTRAINT \`FK_${tablePrefix}3540da03964527aa24ae014b780\` FOREIGN KEY (\`roleId\`) REFERENCES \`${tablePrefix}role\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_workflow\` ADD CONSTRAINT \`FK_${tablePrefix}82b2fd9ec4e3e24209af8160282\` FOREIGN KEY (\`userId\`) REFERENCES \`${tablePrefix}user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_workflow\` ADD CONSTRAINT \`FK_${tablePrefix}b83f8d2530884b66a9c848c8b88\` FOREIGN KEY (\`workflowId\`) REFERENCES \`${tablePrefix}workflow_entity\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}shared_credentials (
				\`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				\`roleId\` INT NOT NULL,
				\`userId\` VARCHAR(36) NOT NULL,
				\`credentialsId\` INT NOT NULL,
				INDEX \`FK_${tablePrefix}c68e056637562000b68f480815a\` (\`roleId\` ASC),
				INDEX \`FK_${tablePrefix}484f0327e778648dd04f1d70493\` (\`userId\` ASC),
				INDEX \`FK_${tablePrefix}68661def1d4bcf2451ac8dbd949\` (\`credentialsId\` ASC),
				PRIMARY KEY (\`userId\`, \`credentialsId\`)
			) ENGINE=InnoDB;`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_credentials\` ADD CONSTRAINT \`FK_${tablePrefix}484f0327e778648dd04f1d70493\` FOREIGN KEY (\`userId\`) REFERENCES \`${tablePrefix}user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_credentials\` ADD CONSTRAINT \`FK_${tablePrefix}68661def1d4bcf2451ac8dbd949\` FOREIGN KEY (\`credentialsId\`) REFERENCES \`${tablePrefix}credentials_entity\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}shared_credentials\` ADD CONSTRAINT \`FK_${tablePrefix}c68e056637562000b68f480815a\` FOREIGN KEY (\`roleId\`) REFERENCES \`${tablePrefix}role\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
		);

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}settings (
				\`key\` VARCHAR(255) NOT NULL,
				\`value\` TEXT NOT NULL,
				\`loadOnStartup\` TINYINT(1) NOT NULL DEFAULT 0,
				PRIMARY KEY (\`key\`)
			) ENGINE=InnoDB;`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity DROP INDEX IDX_${tablePrefix}943d8f922be094eb507cb9a7f9`,
		);

		// Insert initial roles
		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ("owner", "global");`,
		);

		const instanceOwnerRole = (await queryRunner.query(
			'SELECT LAST_INSERT_ID() as insertId',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ("member", "global");`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ("owner", "workflow");`,
		);

		const workflowOwnerRole = (await queryRunner.query(
			'SELECT LAST_INSERT_ID() as insertId',
		)) as InsertResult;

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}role (name, scope) VALUES ("owner", "credential");`,
		);

		const credentialOwnerRole = (await queryRunner.query(
			'SELECT LAST_INSERT_ID() as insertId',
		)) as InsertResult;

		const survey = loadSurveyFromDisk();

		const ownerUserId = uuid();

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}user (id, globalRoleId, personalizationAnswers) values (?, ?, ?)`,
			[ownerUserId, instanceOwnerRole[0].insertId, survey],
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_workflow (createdAt, updatedAt, roleId, userId, workflowId) select
				NOW(), NOW(), '${workflowOwnerRole[0].insertId}', '${ownerUserId}', id FROM ${tablePrefix}workflow_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}shared_credentials (createdAt, updatedAt, roleId, userId, credentialsId)   SELECT NOW(), NOW(), '${credentialOwnerRole[0].insertId}', '${ownerUserId}', id FROM ${tablePrefix}credentials_entity`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings (\`key\`, value, loadOnStartup) VALUES ("userManagement.isInstanceOwnerSetUp", "false", 1), ("userManagement.skipInstanceOwnerSetup", "false", 1)`,
		);

		await queryRunner.query(
			`INSERT INTO ${tablePrefix}settings (\`key\`, value, loadOnStartup) VALUES ("ui.banners.dismissed", JSON_ARRAY('V1'), 1)`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_entity ADD UNIQUE INDEX \`IDX_${tablePrefix}943d8f922be094eb507cb9a7f9\` (\`name\`)`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}shared_credentials"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}shared_workflow"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}user"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}role"`);
		await queryRunner.query(`DROP TABLE "${tablePrefix}settings"`);
	}
}
