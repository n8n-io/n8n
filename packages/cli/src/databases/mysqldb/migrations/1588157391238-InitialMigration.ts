import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1588157391238 implements MigrationInterface {
	name = 'InitialMigration1588157391238';

	async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('CREATE TABLE IF NOT EXISTS `credentials_entity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(128) NOT NULL, `data` text NOT NULL, `type` varchar(32) NOT NULL, `nodesAccess` json NOT NULL, `createdAt` datetime NOT NULL, `updatedAt` datetime NOT NULL, INDEX `IDX_07fde106c0b471d8cc80a64fc8` (`type`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
		await queryRunner.query('CREATE TABLE IF NOT EXISTS `execution_entity` (`id` int NOT NULL AUTO_INCREMENT, `data` text NOT NULL, `finished` tinyint NOT NULL, `mode` varchar(255) NOT NULL, `retryOf` varchar(255) NULL, `retrySuccessId` varchar(255) NULL, `startedAt` datetime NOT NULL, `stoppedAt` datetime NOT NULL, `workflowData` json NOT NULL, `workflowId` varchar(255) NULL, INDEX `IDX_c4d999a5e90784e8caccf5589d` (`workflowId`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
		await queryRunner.query('CREATE TABLE IF NOT EXISTS`workflow_entity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(128) NOT NULL, `active` tinyint NOT NULL, `nodes` json NOT NULL, `connections` json NOT NULL, `createdAt` datetime NOT NULL, `updatedAt` datetime NOT NULL, `settings` json NULL, `staticData` json NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE `workflow_entity`', undefined);
		await queryRunner.query('DROP INDEX `IDX_c4d999a5e90784e8caccf5589d` ON `execution_entity`', undefined);
		await queryRunner.query('DROP TABLE `execution_entity`', undefined);
		await queryRunner.query('DROP INDEX `IDX_07fde106c0b471d8cc80a64fc8` ON `credentials_entity`', undefined);
		await queryRunner.query('DROP TABLE `credentials_entity`', undefined);
	}

}
