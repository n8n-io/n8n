import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class SetDefaultDates1620312176933 implements MigrationInterface {
	name = 'SetDefaultDates1620312176933';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP(3)`);

	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}tag_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "updatedAt" TYPE TIMESTAMP(6)`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" DROP DEFAULT`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "createdAt" TYPE TIMESTAMP(6)`);
	}
}
