import {MigrationInterface, QueryRunner} from "typeorm";
import * as config from '../../../../config';

export class SetDefaultDates1620312176933 implements MigrationInterface {
	name = 'SetDefaultDates1620312176933';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}07fde106c0b471d8cc80a64fc8"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}33228da131bb1112247cf52a42"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}c4d999a5e90784e8caccf5589d"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}812eb05f7451ca757fb98444ce"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}16f4436789e804e3e1c9eeb240"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}5e29bfe9e22c5d6567f509d4a4"`);
		await queryRunner.query(`DROP INDEX "idx_${tablePrefixPure}31140eb41f019805b40d008744"`);
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
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}a4f6efa0088dedeae40189fac7" ON ${tablePrefix}credentials_entity ("type") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}33228da131bb1112247cf52a42" ON ${tablePrefix}execution_entity ("stoppedAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}11738b290192b21e3dd6cbeae9" ON ${tablePrefix}execution_entity ("workflowId") `);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_${tablePrefixPure}812eb05f7451ca757fb98444ce" ON ${tablePrefix}tag_entity ("name") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240" ON ${tablePrefix}webhook_entity ("webhookId", "method", "pathLength") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}31140eb41f019805b40d008744" ON ${tablePrefix}workflows_tags ("workflowId") `);
		await queryRunner.query(`CREATE INDEX "IDX_${tablePrefixPure}5e29bfe9e22c5d6567f509d4a4" ON ${tablePrefix}workflows_tags ("tagId") `);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const tablePrefixPure = tablePrefix;
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}

		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}5e29bfe9e22c5d6567f509d4a4"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}31140eb41f019805b40d008744"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}812eb05f7451ca757fb98444ce"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}11738b290192b21e3dd6cbeae9"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}33228da131bb1112247cf52a42"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefixPure}a4f6efa0088dedeae40189fac7"`);
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
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}31140eb41f019805b40d008744" ON ${tablePrefix}workflows_tags ("workflowId") `);
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}5e29bfe9e22c5d6567f509d4a4" ON ${tablePrefix}workflows_tags ("tagId") `);
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}16f4436789e804e3e1c9eeb240" ON ${tablePrefix}webhook_entity ("method", "webhookId", "pathLength") `);
		await queryRunner.query(`CREATE UNIQUE INDEX "idx_${tablePrefixPure}812eb05f7451ca757fb98444ce" ON ${tablePrefix}tag_entity ("name") `);
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}c4d999a5e90784e8caccf5589d" ON ${tablePrefix}execution_entity ("workflowId") `);
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}33228da131bb1112247cf52a42" ON ${tablePrefix}execution_entity ("stoppedAt") `);
		await queryRunner.query(`CREATE INDEX "idx_${tablePrefixPure}07fde106c0b471d8cc80a64fc8" ON ${tablePrefix}credentials_entity ("type") `);
	}
}
