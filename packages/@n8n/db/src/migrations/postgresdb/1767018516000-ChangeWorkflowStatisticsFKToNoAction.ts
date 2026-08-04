import type { MigrationContext, ReversibleMigration } from '../migration-types';

/**
 * Removes the foreign key constraint from workflow_statistics to allow keeping
 * statistics for deleted workflows. The workflowId becomes an orphaned reference,
 * and workflowName preserves the workflow identity.
 *
 * Also changes count and rootCount columns from INTEGER to BIGINT to prevent overflow.
 *
 * Note: The down migration will reset any count values exceeding INTEGER max (2,147,483,647) to 0
 * before converting back to INTEGER. This is acceptable as the system handles statistics resets.
 */
export class ChangeWorkflowStatisticsFKToNoAction1767018516000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Drop existing foreign key constraint and primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "fk_${tablePrefix}workflow_statistics_workflow_id"`,
		);

		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "pk_${tablePrefix}workflow_statistics"`,
		);

		// Add a new auto-generated id column as primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "id" SERIAL PRIMARY KEY`,
		);

		// Add workflowName column to preserve workflow identity after deletion
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "workflowName" VARCHAR(128)`,
		);

		// Populate workflowName from existing workflows
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics ws SET "workflowName" = we."name" FROM ${tablePrefix}workflow_entity we WHERE ws."workflowId" = we."id"`,
		);

		// Add unique constraint on (workflowId, name) to maintain data integrity
		// Note: Must be a regular unique index (not partial) for ON CONFLICT to work in upsertWorkflowStatistics
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}workflow_statistics_workflow_name" ON ${tablePrefix}workflow_statistics ("workflowId", "name")`,
		);

		// Change count and rootCount columns to BIGINT for large cumulative values
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "count" TYPE BIGINT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "rootCount" TYPE BIGINT`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Reset overflowing values to 0 before converting BIGINT to INTEGER
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics SET "count" = 0 WHERE "count" > 2147483647`,
		);
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics SET "rootCount" = 0 WHERE "rootCount" > 2147483647`,
		);

		// Change count and rootCount columns back to INTEGER
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "count" TYPE INTEGER`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "rootCount" TYPE INTEGER`,
		);

		// Drop the unique index
		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_${tablePrefix}workflow_statistics_workflow_name"`,
		);

		// Delete orphaned statistics (where workflow has been deleted) before restoring FK constraint
		await queryRunner.query(
			`DELETE FROM ${tablePrefix}workflow_statistics WHERE "workflowId" NOT IN (SELECT "id" FROM ${tablePrefix}workflow_entity)`,
		);

		// Drop the workflowName column
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "workflowName"`,
		);

		// Drop the id column
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "id"`);

		// Restore composite primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD PRIMARY KEY ("workflowId", "name")`,
		);

		// Restore the CASCADE foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT "fk_${tablePrefix}workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE`,
		);
	}
}
