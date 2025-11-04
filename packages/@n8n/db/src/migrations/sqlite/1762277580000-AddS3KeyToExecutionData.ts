import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddS3KeyToExecutionData1762277580000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
		// First, create a new table with nullable data column
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_data_new" (
				"executionId" int PRIMARY KEY NOT NULL,
				"workflowData" text NOT NULL,
				"data" text NULL,
				"s3Key" varchar NULL,
				"storageMode" varchar NOT NULL DEFAULT 'database',
				FOREIGN KEY("executionId") REFERENCES "${tablePrefix}execution_entity" ("id") ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}execution_data_new" ("executionId", "workflowData", "data", "s3Key", "storageMode")
			SELECT "executionId", "workflowData", "data", NULL, 'database' FROM "${tablePrefix}execution_data"`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_data"`);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data_new" RENAME TO "${tablePrefix}execution_data"`,
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

		// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
		// Create a new table with NOT NULL data column
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_data_new" (
				"executionId" int PRIMARY KEY NOT NULL,
				"workflowData" text NOT NULL,
				"data" text NOT NULL,
				FOREIGN KEY("executionId") REFERENCES "${tablePrefix}execution_entity" ("id") ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}execution_data_new" ("executionId", "workflowData", "data")
			SELECT "executionId", "workflowData", "data" FROM "${tablePrefix}execution_data" WHERE "data" IS NOT NULL`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_data"`);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_data_new" RENAME TO "${tablePrefix}execution_data"`,
		);
	}
}
