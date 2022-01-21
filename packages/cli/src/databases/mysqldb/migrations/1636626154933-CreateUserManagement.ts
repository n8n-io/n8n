import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 as uuid } from 'uuid';
import config = require('../../../../config');

export class CreateUserManagement1636626154933 implements MigrationInterface {
	name = 'CreateUserManagement1636626154932';

	public async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(
			'CREATE TABLE `' + tablePrefix + 'role` ( ' +
				'`id` int NOT NULL AUTO_INCREMENT, ' +
				'`name` varchar(32) NOT NULL, ' +
				'`scope` varchar(250) NOT NULL, ' +
				'`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'PRIMARY KEY (`id`), ' +
				'UNIQUE KEY `UQ_5b49d0f504f7ef31045a1fb2eb8` (`scope`,`name`) ' +
			');'
		);

		await queryRunner.query(
			'CREATE TABLE `' + tablePrefix + 'user` ( ' +
				'`id` VARCHAR(100) NOT NULL, ' +
				'`email` VARCHAR(254) NULL DEFAULT NULL, ' +
				'`firstName` VARCHAR(32) NULL DEFAULT NULL, ' +
				'`lastName` VARCHAR(32) NULL DEFAULT NULL, ' +
				'`password` VARCHAR(200) NULL DEFAULT NULL, ' +
				'`resetPasswordToken` VARCHAR(200) NULL DEFAULT NULL, ' +
				'`personalizationAnswers` VARCHAR(200) NULL DEFAULT NULL, ' +
				'`createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`globalRoleId` INT NOT NULL, ' +
				'PRIMARY KEY (`id`), ' +
				'UNIQUE INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` (`email` ASC) VISIBLE, ' +
				'INDEX `FK_f0609be844f9200ff4365b1bb3d_idx` (`globalRoleId` ASC) VISIBLE, ' +
				'CONSTRAINT `FK_f0609be844f9200ff4365b1bb3d` ' +
					'FOREIGN KEY (`globalRoleId`) ' +
					'REFERENCES `n8n`.`role` (`id`) ' +
					'ON DELETE NO ACTION ' +
					'ON UPDATE NO ACTION);'
		);

		await queryRunner.query(
		  'CREATE TABLE `' + tablePrefix + 'shared_workflow` ( ' +
				'`createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
				'`roleId` INT NOT NULL, ' +
				'`userId` VARCHAR(100) NOT NULL, ' +
				'`workflowId` INT NOT NULL, ' +
				'INDEX `FK_3540da03964527aa24ae014b780_idx` (`roleId` ASC) VISIBLE, ' +
				'INDEX `FK_82b2fd9ec4e3e24209af8160282_idx` (`userId` ASC) VISIBLE, ' +
				'INDEX `FK_b83f8d2530884b66a9c848c8b88_idx` (`workflowId` ASC) VISIBLE, ' +
				'PRIMARY KEY (`userId`, `workflowId`), ' +
				'CONSTRAINT `FK_3540da03964527aa24ae014b780` ' +
					'FOREIGN KEY (`roleId`) ' +
					'REFERENCES `' + tablePrefix + 'role` (`id`) ' +
					'ON DELETE NO ACTION ' +
					'ON UPDATE NO ACTION, ' +
				'CONSTRAINT `FK_82b2fd9ec4e3e24209af8160282` ' +
					'FOREIGN KEY (`userId`) ' +
					'REFERENCES `' + tablePrefix + 'user` (`id`) ' +
					'ON DELETE CASCADE ' +
					'ON UPDATE NO ACTION, ' +
				'CONSTRAINT `FK_b83f8d2530884b66a9c848c8b88` ' +
					'FOREIGN KEY (`workflowId`) ' +
					'REFERENCES `' + tablePrefix + 'workflow_entity` (`id`) ' +
					'ON DELETE CASCADE ' +
					'ON UPDATE NO ACTION);'
		);

		await queryRunner.query(
			'CREATE TABLE `' + tablePrefix + 'shared_credentials` ( ' +
			'`createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
			'`updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
			'`roleId` INT NOT NULL, ' +
			'`userId` VARCHAR(100) NOT NULL, ' +
			'`credentialsId` INT NOT NULL, ' +
			'INDEX `FK_c68e056637562000b68f480815a_idx` (`roleId` ASC) VISIBLE, ' +
			'INDEX `FK_484f0327e778648dd04f1d70493_idx` (`userId` ASC) VISIBLE, ' +
			'PRIMARY KEY (`userId`, `credentialsId`), ' +
			'CONSTRAINT `FK_c68e056637562000b68f480815a` ' +
			  'FOREIGN KEY (`roleId`) ' +
			  'REFERENCES `' + tablePrefix + 'role` (`id`) ' +
			  'ON DELETE NO ACTION ' +
			  'ON UPDATE NO ACTION, ' +
			'CONSTRAINT `FK_484f0327e778648dd04f1d70493` ' +
			  'FOREIGN KEY (`userId`) ' +
			  'REFERENCES `' + tablePrefix + 'user` (`id`) ' +
			  'ON DELETE CASCADE ' +
			  'ON UPDATE NO ACTION, ' +
			'CONSTRAINT `FK_68661def1d4bcf2451ac8dbd949` ' +
			  'FOREIGN KEY (`credentialsId`) ' +
			  'REFERENCES `' + tablePrefix + 'credentials_entity` (`id`) ' +
			  'ON DELETE NO ACTION ' +
			  'ON UPDATE NO ACTION);'
		);

		await queryRunner.query(
			'CREATE TABLE `' + tablePrefix + 'settings` ( ' +
				'`key` VARCHAR(250) NOT NULL, ' +
				'`value` TEXT(10000) NOT NULL, ' +
				'`loadOnStartup` TINYINT(1) NOT NULL DEFAULT 0, ' +
				'PRIMARY KEY (`key`));'
		);

		// Insert initial roles
		await queryRunner.query('INSERT INTO `' + tablePrefix + 'role` (name, scope) VALUES ("owner", "global");');

		const instanceOwnerRole = await queryRunner.query('SELECT LAST_INSERT_ID() as insertId');

		await queryRunner.query('INSERT INTO `' + tablePrefix + 'role` (name, scope) VALUES ("member", "global");');

		await queryRunner.query('INSERT INTO `' + tablePrefix + 'role` (name, scope) VALUES ("owner", "workflow");');

		const workflowOwnerRole = await queryRunner.query('SELECT LAST_INSERT_ID() as insertId');

		await queryRunner.query('INSERT INTO `' + tablePrefix + 'role` (name, scope) VALUES ("owner", "credential");');

		const credentialOwnerRole = await queryRunner.query('SELECT LAST_INSERT_ID() as insertId');

		const ownerUserId = uuid();
		await queryRunner.query(
			'INSERT INTO `' + tablePrefix + 'user` ' +
			  '(id, firstName, lastName, createdAt, updatedAt, globalRoleId) values  ' +
				'("' +  ownerUserId + '", "default", "default", NOW(), NOW(), ' + instanceOwnerRole[0].insertId + ')'
		);

		await queryRunner.query(
			'INSERT INTO `' + tablePrefix + 'shared_workflow` (createdAt, updatedAt, roleId, userId, workflowId)  ' +
			' select NOW(), NOW(), "' + workflowOwnerRole[0].insertId + '", "' + ownerUserId + '", id from `' + tablePrefix + 'workflow_entity`'
		);

		await queryRunner.query(
			'INSERT INTO `' + tablePrefix + 'shared_credentials` (createdAt, updatedAt, roleId, userId, credentialsId)  ' +
			' select NOW(), NOW(), "' + credentialOwnerRole[0].insertId + '", "' + ownerUserId + '", id from `' + tablePrefix + 'credentials_entity`'
		);

		await queryRunner.query(
			'INSERT INTO `' + tablePrefix + 'settings` (`key`, value, loadOnStartup) values  ' +
			'("userManagement.hasOwner", "false", 1)'
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
