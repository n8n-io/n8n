import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class SeparateExecutionData1690000000010 implements ReversibleMigration {
	pruneAndVacuum = true;

	async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_data" (
				"executionId" int PRIMARY KEY NOT NULL,
				"workflowData" text NOT NULL,
				"data" text NOT NULL,
				FOREIGN KEY("executionId") REFERENCES "${tablePrefix}execution_entity" ("id") ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`INSERT INTO "${tablePrefix}execution_data" (
				"executionId",
				"workflowData",
				"data")
				SELECT "id", "workflowData", "data" FROM "${tablePrefix}execution_entity"
			`,
		);

		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN "workflowData"`,
		);
		await queryRunner.query(`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN "data"`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` ADD COLUMN "workflowData" text NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` ADD COLUMN "data" text NULL`,
		);

		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "workflowData" = (SELECT "workflowData" FROM "${tablePrefix}execution_data" WHERE "${tablePrefix}execution_data"."executionId" = "${tablePrefix}execution_entity"."id")`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "data" = (SELECT "data" FROM "${tablePrefix}execution_data" WHERE "${tablePrefix}execution_data"."executionId" = "${tablePrefix}execution_entity"."id")`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_data"`);
	}
}
