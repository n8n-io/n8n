import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class SetDefaultDates1620313300228 implements MigrationInterface {
	name = 'SetDefaultDates1620313300228';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `createdAt` `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `updatedAt` `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "workflow_entity` CHANGE `createdAt` `createdAt` datetime(0) NOT NULL");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "tag_entity` CHANGE `createdAt` `createdAt` datetime(0) NOT NULL");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `updatedAt` `updatedAt` datetime(0) NOT NULL");
		await queryRunner.query("ALTER TABLE `" + tablePrefix + "credentials_entity` CHANGE `createdAt` `createdAt` datetime(0) NOT NULL");
	}
}
