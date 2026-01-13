import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * SQLite does not support ALTER TABLE to modify foreign key constraints or primary keys.
 * We need to recreate the table with the new structure:
 * - Add auto-incrementing id as primary key
 * - Add workflowName to preserve workflow identity after deletion
 * - Remove foreign key constraint to allow keeping statistics for deleted workflows
 * - Add unique index on (workflowId, name)
 */
export class ChangeWorkflowStatisticsFKToNoAction1767018516000 implements ReversibleMigration {
	transaction = false as const; // Disable FK checks for table recreation

	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Create new table with id primary key, workflowName column, and no foreign key constraint
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}TMP_workflow_statistics" (
				"id" INTEGER PRIMARY KEY AUTOINCREMENT,
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATETIME,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" VARCHAR(36) NOT NULL,
				"workflowName" VARCHAR(128),
				"rootCount" INTEGER DEFAULT 0
			)
		`);

		// Copy data from old table and populate workflowName from workflow_entity
		await queryRunner.query(`
			INSERT INTO "${tablePrefix}TMP_workflow_statistics" ("count", "latestEvent", "name", "workflowId", "workflowName", "rootCount")
			SELECT ws."count", ws."latestEvent", ws."name", ws."workflowId", we."name", ws."rootCount"
			FROM "${tablePrefix}workflow_statistics" ws
			LEFT JOIN "${tablePrefix}workflow_entity" we ON ws."workflowId" = we."id"
		`);

		// Drop old table
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_statistics"`);

		// Rename new table
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_workflow_statistics" RENAME TO "${tablePrefix}workflow_statistics"`,
		);

		// Create unique index on (workflowId, name) to maintain data integrity
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}workflow_statistics_workflow_name" ON "${tablePrefix}workflow_statistics" ("workflowId", "name")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Create new table with original composite primary key and CASCADE foreign key
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}TMP_workflow_statistics" (
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATETIME,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" VARCHAR(36) NOT NULL,
				"rootCount" INTEGER DEFAULT 0,
				PRIMARY KEY("workflowId", "name"),
				FOREIGN KEY("workflowId") REFERENCES "${tablePrefix}workflow_entity"("id") ON DELETE CASCADE
			)
		`);

		// Delete orphaned statistics before table recreation
		await queryRunner.query(`
			DELETE FROM "${tablePrefix}workflow_statistics"
			WHERE "workflowId" NOT IN (SELECT "id" FROM "${tablePrefix}workflow_entity")
		`);

		// Copy data from old table (orphaned rows already deleted above)
		await queryRunner.query(`
			INSERT INTO "${tablePrefix}TMP_workflow_statistics" ("count", "latestEvent", "name", "workflowId", "rootCount")
			SELECT
				"count",
				"latestEvent",
				"name",
				"workflowId",
				"rootCount"
			FROM "${tablePrefix}workflow_statistics"
		`);

		// Drop old table (this also drops the unique index)
		await queryRunner.query(`DROP TABLE "${tablePrefix}workflow_statistics"`);

		// Rename new table
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}TMP_workflow_statistics" RENAME TO "${tablePrefix}workflow_statistics"`,
		);
	}
}
