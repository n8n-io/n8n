import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class ChangeWorkflowStatisticsFKToNoAction1764669632000 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		// Step 1: Drop the existing foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP FOREIGN KEY \`fk_${tablePrefix}workflow_statistics_workflow_id\``,
		);

		// Step 2: Drop the primary key (workflowId, name)
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_statistics DROP PRIMARY KEY`);

		// Step 3: Add a new auto-generated id column as primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN \`id\` INT AUTO_INCREMENT PRIMARY KEY FIRST`,
		);

		// Step 4: Make workflowId column nullable
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`workflowId\` varchar(36) NULL`,
		);

		// Step 5: Add workflowName column to preserve workflow identity after deletion
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD COLUMN \`workflowName\` VARCHAR(128)`,
		);

		// Step 6: Populate workflowName from existing workflows
		await queryRunner.query(
			`UPDATE ${tablePrefix}workflow_statistics ws JOIN ${tablePrefix}workflow_entity we ON ws.\`workflowId\` = we.\`id\` SET ws.\`workflowName\` = we.\`name\``,
		);

		// Step 7: Add unique index on (workflowId, name) to maintain data integrity
		await queryRunner.query(
			`CREATE UNIQUE INDEX \`IDX_${tablePrefix}workflow_statistics_workflow_name\` ON ${tablePrefix}workflow_statistics (\`workflowId\`, \`name\`)`,
		);

		// Step 8: Add foreign key with SET NULL (keeps statistics when workflow is deleted)
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT \`fk_${tablePrefix}workflow_statistics_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES ${tablePrefix}workflow_entity(\`id\`) ON DELETE SET NULL`,
		);

		// Step 9: Change count and rootCount columns to BIGINT for large cumulative values
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`count\` BIGINT DEFAULT 0`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`rootCount\` BIGINT DEFAULT 0`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Step 1: Change count and rootCount columns back to INT
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`count\` INT DEFAULT 0`,
		);
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`rootCount\` INT DEFAULT 0`,
		);

		// Step 2: Drop the SET NULL foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP FOREIGN KEY \`fk_${tablePrefix}workflow_statistics_workflow_id\``,
		);

		// Step 3: Drop the unique index
		await queryRunner.query(
			`DROP INDEX \`IDX_${tablePrefix}workflow_statistics_workflow_name\` ON ${tablePrefix}workflow_statistics`,
		);

		// Step 4: Delete any orphaned statistics rows (workflowId IS NULL)
		await queryRunner.query(
			`DELETE FROM ${tablePrefix}workflow_statistics WHERE \`workflowId\` IS NULL`,
		);

		// Step 5: Drop the workflowName column
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN \`workflowName\``,
		);

		// Step 6: Restore NOT NULL constraint on workflowId
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics MODIFY \`workflowId\` varchar(36) NOT NULL`,
		);

		// Step 7: Drop the id column and primary key
		await queryRunner.query(`ALTER TABLE ${tablePrefix}workflow_statistics DROP COLUMN \`id\``);

		// Step 8: Restore composite primary key
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD PRIMARY KEY (\`workflowId\`, \`name\`)`,
		);

		// Step 9: Restore the CASCADE foreign key constraint
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}workflow_statistics ADD CONSTRAINT \`fk_${tablePrefix}workflow_statistics_workflow_id\` FOREIGN KEY (\`workflowId\`) REFERENCES ${tablePrefix}workflow_entity(\`id\`) ON DELETE CASCADE`,
		);
	}
}
