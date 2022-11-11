import {MigrationInterface, QueryRunner} from "typeorm";
import config from '@/config';

export class CreateTagEntity1617268711084 implements MigrationInterface {
		name = 'CreateTagEntity1617268711084';

		async up(queryRunner: QueryRunner): Promise<void> {
			const tablePrefix = config.getEnv('database.tablePrefix');

			// create tags table + relationship with workflow entity

			await queryRunner.query('CREATE TABLE `' + tablePrefix + 'tag_entity` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(24) NOT NULL, `createdAt` datetime NOT NULL, `updatedAt` datetime NOT NULL, UNIQUE INDEX `IDX_' + tablePrefix + '8f949d7a3a984759044054e89b` (`name`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
			await queryRunner.query('CREATE TABLE `' + tablePrefix + 'workflows_tags` (`workflowId` int NOT NULL, `tagId` int NOT NULL, INDEX `IDX_' + tablePrefix + '54b2f0343d6a2078fa13744386` (`workflowId`), INDEX `IDX_' + tablePrefix + '77505b341625b0b4768082e217` (`tagId`), PRIMARY KEY (`workflowId`, `tagId`)) ENGINE=InnoDB');
			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflows_tags` ADD CONSTRAINT `FK_' + tablePrefix + '54b2f0343d6a2078fa137443869` FOREIGN KEY (`workflowId`) REFERENCES `' + tablePrefix + 'workflow_entity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflows_tags` ADD CONSTRAINT `FK_' + tablePrefix + '77505b341625b0b4768082e2171` FOREIGN KEY (`tagId`) REFERENCES `' + tablePrefix + 'tag_entity`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION');

			// set default dates for `createdAt` and `updatedAt`

			await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
		}

		async down(queryRunner: QueryRunner): Promise<void> {
			const tablePrefix = config.getEnv('database.tablePrefix');

			// `createdAt` and `updatedAt`

			await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `updatedAt` `updatedAt` datetime NOT NULL");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `createdAt` `createdAt` datetime NOT NULL");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `updatedAt` `updatedAt` datetime NOT NULL");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `createdAt` `createdAt` datetime NOT NULL");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `updatedAt` `updatedAt` datetime NOT NULL");
			await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `createdAt` `createdAt` datetime NOT NULL");

			// tags

			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflows_tags` DROP FOREIGN KEY `FK_' + tablePrefix + '77505b341625b0b4768082e2171`');
			await queryRunner.query('ALTER TABLE `' + tablePrefix + 'workflows_tags` DROP FOREIGN KEY `FK_' + tablePrefix + '54b2f0343d6a2078fa137443869`');
			await queryRunner.query('DROP INDEX `IDX_' + tablePrefix + '77505b341625b0b4768082e217` ON `' + tablePrefix + 'workflows_tags`');
			await queryRunner.query('DROP INDEX `IDX_' + tablePrefix + '54b2f0343d6a2078fa13744386` ON `' + tablePrefix + 'workflows_tags`');
			await queryRunner.query('DROP TABLE `' + tablePrefix + 'workflows_tags`');
			await queryRunner.query('DROP INDEX `IDX_' + tablePrefix + '8f949d7a3a984759044054e89b` ON `' + tablePrefix + 'tag_entity`');
			await queryRunner.query('DROP TABLE `' + tablePrefix + 'tag_entity`');
		}

}
