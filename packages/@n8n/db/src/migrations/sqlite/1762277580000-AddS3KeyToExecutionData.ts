import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddS3KeyToExecutionData1762277580000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" ADD COLUMN "s3Key" varchar NULL`,
		);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" ADD COLUMN "storageMode" varchar NOT NULL DEFAULT 'database'`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}execution_data_s3Key" ON "${tablePrefix}execution_data" ("s3Key")`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}execution_data_storageMode" ON "${tablePrefix}execution_data" ("storageMode")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}execution_data_s3Key"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}execution_data_storageMode"`);
	}
}
