import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddS3KeyToExecutionData1762277580000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" ALTER COLUMN "data" DROP NOT NULL`,
		);

		// Add new columns to execution_data table
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" 
			ADD COLUMN "s3Key" varchar NULL,
			ADD COLUMN "storageMode" varchar NOT NULL DEFAULT 'database'`,
		);

		// Create index on s3Key for faster lookups
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}execution_data_s3Key" ON "${tablePrefix}execution_data" ("s3Key")`,
		);

		// Create index on storageMode for faster filtering
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}execution_data_storageMode" ON "${tablePrefix}execution_data" ("storageMode")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}execution_data_s3Key"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}execution_data_storageMode"`);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" 
			DROP COLUMN "s3Key",
			DROP COLUMN "storageMode"`,
		);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data" ALTER COLUMN "data" SET NOT NULL`,
		);
	}
}
