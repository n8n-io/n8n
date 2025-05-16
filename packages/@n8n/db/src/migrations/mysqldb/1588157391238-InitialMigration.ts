import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class InitialMigration1588157391238 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'CREATE TABLE IF NOT EXISTS `' +
				tablePrefix +
				'credentials_entity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(128) NOT NULL, `data` text NOT NULL, `type` varchar(32) NOT NULL, `nodesAccess` json NOT NULL, `createdAt` datetime NOT NULL, `updatedAt` datetime NOT NULL, INDEX `IDX_' +
				tablePrefix +
				'07fde106c0b471d8cc80a64fc8` (`type`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
		);
		await queryRunner.query(
			'CREATE TABLE IF NOT EXISTS `' +
				tablePrefix +
				'execution_entity` (`id` int NOT NULL AUTO_INCREMENT, `data` text NOT NULL, `finished` tinyint NOT NULL, `mode` varchar(255) NOT NULL, `retryOf` varchar(255) NULL, `retrySuccessId` varchar(255) NULL, `startedAt` datetime NOT NULL, `stoppedAt` datetime NOT NULL, `workflowData` json NOT NULL, `workflowId` varchar(255) NULL, INDEX `IDX_' +
				tablePrefix +
				'c4d999a5e90784e8caccf5589d` (`workflowId`), PRIMARY KEY (`id`)) ENGINE=InnoDB',
		);
		await queryRunner.query(
			'CREATE TABLE IF NOT EXISTS`' +
				tablePrefix +
				'workflow_entity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(128) NOT NULL, `active` tinyint NOT NULL, `nodes` json NOT NULL, `connections` json NOT NULL, `createdAt` datetime NOT NULL, `updatedAt` datetime NOT NULL, `settings` json NULL, `staticData` json NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query('DROP TABLE `' + tablePrefix + 'workflow_entity`');
		await queryRunner.query(
			'DROP INDEX `IDX_' +
				tablePrefix +
				'c4d999a5e90784e8caccf5589d` ON `' +
				tablePrefix +
				'execution_entity`',
		);
		await queryRunner.query('DROP TABLE `' + tablePrefix + 'execution_entity`');
		await queryRunner.query(
			'DROP INDEX `IDX_' +
				tablePrefix +
				'07fde106c0b471d8cc80a64fc8` ON `' +
				tablePrefix +
				'credentials_entity`',
		);
		await queryRunner.query('DROP TABLE `' + tablePrefix + 'credentials_entity`');
	}
}
