import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class ChangeWorkflowStatisticsFKToNoAction1764669632000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Step 1: Drop existing foreign key constraint and primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "fk_${tablePrefix}workflow_statistics_workflow_id"`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "${tablePrefix}workflow_statistics_workflowId_fkey"`,
		);
		// Primary key constraint name varies: pk_ (from MigrateIntegerKeysToString) or _pkey (auto-generated)
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "pk_${tablePrefix}workflow_statistics"`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "${tablePrefix}workflow_statistics_pkey"`,
		);

		// Step 2: Add a new auto-generated id column as primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "id" SERIAL PRIMARY KEY`,
		);

		// Step 3: Make workflowId column nullable
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "workflowId" DROP NOT NULL`,
		);

		// Step 4: Add workflowName column to preserve workflow identity after deletion
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN "workflowName" VARCHAR(128)`,
		);

		// Step 5: Populate workflowName from existing workflows
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics ws SET "workflowName" = we."name" FROM ${tablePrefix}workflow_entity we WHERE ws."workflowId" = we."id"`,
		);

		// Step 6: Add unique constraint on (workflowId, name) to maintain data integrity
		// Note: Must be a regular unique index (not partial) for ON CONFLICT to work in upsertWorkflowStatistics
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}workflow_statistics_workflow_name" ON ${tablePrefix}workflow_statistics ("workflowId", "name")`,
		);

		// Step 7: Add foreign key with SET NULL (keeps statistics when workflow is deleted)
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT "fk_${tablePrefix}workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE SET NULL`,
		);

		// Step 8: Change count and rootCount columns to BIGINT for large cumulative values
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "count" TYPE BIGINT`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "rootCount" TYPE BIGINT`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Step 1: Change count and rootCount columns back to INTEGER
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "count" TYPE INTEGER`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "rootCount" TYPE INTEGER`,
		);

		// Step 2: Drop the SET NULL foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP CONSTRAINT IF EXISTS "fk_${tablePrefix}workflow_statistics_workflow_id"`,
		);

		// Step 3: Drop the unique index
		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_${tablePrefix}workflow_statistics_workflow_name"`,
		);

		// Step 4: Delete any orphaned statistics rows (workflowId IS NULL)
		await queryRunner.query(
			`DELETE FROM ${tablePrefix}workflow_statistics WHERE "workflowId" IS NULL`,
		);

		// Step 5: Drop the workflowName column
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "workflowName"`,
		);

		// Step 6: Restore NOT NULL constraint on workflowId
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ALTER COLUMN "workflowId" SET NOT NULL`,
		);

		// Step 7: Drop the id column
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN "id"`);

		// Step 8: Restore composite primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD PRIMARY KEY ("workflowId", "name")`,
		);

		// Step 9: Restore the CASCADE foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT "fk_${tablePrefix}workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES ${tablePrefix}workflow_entity(id) ON DELETE CASCADE`,
		);
	}
}
