import {MigrationInterface, QueryRunner} from "typeorm";

export class SetDefaultDates1620313300228 implements MigrationInterface {
		name = 'SetDefaultDates1620313300228';

		async up(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query("ALTER TABLE `credentials_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
				await queryRunner.query("ALTER TABLE `execution_entity` DROP COLUMN `data`");
				await queryRunner.query("ALTER TABLE `execution_entity` ADD `data` text NOT NULL");
				await queryRunner.query("ALTER TABLE `tag_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
				await queryRunner.query("ALTER TABLE `tag_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `nodes` `nodes` json NULL");
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
		}

		async down(queryRunner: QueryRunner): Promise<void> {
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `createdAt` `createdAt` datetime(0) NOT NULL");
				await queryRunner.query("ALTER TABLE `workflow_entity` CHANGE `nodes` `nodes` json NOT NULL");
				await queryRunner.query("ALTER TABLE `tag_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
				await queryRunner.query("ALTER TABLE `tag_entity` CHANGE `createdAt` `createdAt` datetime(0) NOT NULL");
				await queryRunner.query("ALTER TABLE `execution_entity` DROP COLUMN `data`");
				await queryRunner.query("ALTER TABLE `execution_entity` ADD `data` mediumtext NOT NULL");
				await queryRunner.query("ALTER TABLE `credentials_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
		}

}
