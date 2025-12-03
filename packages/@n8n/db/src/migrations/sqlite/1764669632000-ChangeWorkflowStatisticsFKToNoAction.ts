import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * SQLite does not support ALTER TABLE to modify foreign key constraints or primary keys.
 * We need to recreate the table with the new structure:
 * - Add auto-incrementing id as primary key
 * - Make workflowId nullable for SET NULL to work
 * - Add unique index on (workflowId, name)
 */
export class ChangeWorkflowStatisticsFKToNoAction1764669632000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Create new table with id primary key, workflowName column, and SET NULL foreign key
		await queryRunner.query(`
			CREATE TABLE "${tablePrefix}TMP_workflow_statistics" (
				"id" INTEGER PRIMARY KEY AUTOINCREMENT,
				"count" INTEGER DEFAULT 0,
				"latestEvent" DATETIME,
				"name" VARCHAR(128) NOT NULL,
				"workflowId" VARCHAR(36),
				"workflowName" VARCHAR(128),
				"rootCount" INTEGER DEFAULT 0,
				FOREIGN KEY("workflowId") REFERENCES "${tablePrefix}workflow_entity"("id") ON DELETE SET NULL
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
		// Delete any orphaned statistics rows (workflowId IS NULL) before restoring composite primary key
		await queryRunner.query(
			`DELETE FROM "${tablePrefix}workflow_statistics" WHERE "workflowId" IS NULL`,
		);

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

		// Copy data from old table (excluding orphaned rows already deleted)
		await queryRunner.query(`
			INSERT INTO "${tablePrefix}TMP_workflow_statistics" ("count", "latestEvent", "name", "workflowId", "rootCount")
			SELECT "count", "latestEvent", "name", "workflowId", "rootCount"
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
