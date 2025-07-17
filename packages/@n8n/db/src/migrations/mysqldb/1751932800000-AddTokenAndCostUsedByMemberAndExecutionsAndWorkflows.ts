import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1751932800000
	implements ReversibleMigration
{
	name = 'AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1751932800000';

	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if columns exist before dropping them
		const userTable = await queryRunner.getTable(`${tablePrefix}user`);
		const tokensConsumedColumnExistsInUserTable = userTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInUserTable = userTable?.findColumnByName('costIncurred');

		const executionEntityTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		const tokensConsumedColumnExistsInExecutionEntityTable =
			executionEntityTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInExecutionEntityTable =
			executionEntityTable?.findColumnByName('costIncurred');

		const workflowEntityTable = await queryRunner.getTable(`${tablePrefix}workflow_entity`);
		const tokensConsumedColumnExistsInWorkflowEntityTable =
			workflowEntityTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInWorkflowEntityTable =
			workflowEntityTable?.findColumnByName('costIncurred');

		// Drop columns if they exist first
		if (tokensConsumedColumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`tokensConsumed\``);
		}
		if (costIncurredColumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`costIncurred\``);
		}
		if (tokensConsumedColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN \`tokensConsumed\``,
			);
		}
		if (costIncurredColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN \`costIncurred\``,
			);
		}
		if (tokensConsumedColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN \`tokensConsumed\``,
			);
		}
		if (costIncurredColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN \`costIncurred\``,
			);
		}

		// Add columns back with correct types
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`tokensConsumed\` BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}user\` ADD COLUMN \`costIncurred\` DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` ADD COLUMN \`tokensConsumed\` BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}execution_entity\` ADD COLUMN \`costIncurred\` DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN \`tokensConsumed\` BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE \`${tablePrefix}workflow_entity\` ADD COLUMN \`costIncurred\` DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if the columns exist before trying to drop them
		const userTable = await queryRunner.getTable(`${tablePrefix}user`);
		const tokensConsumedColumnExistsInUserTable = userTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInUserTable = userTable?.findColumnByName('costIncurred');

		const executionEntityTable = await queryRunner.getTable(`${tablePrefix}execution_entity`);
		const tokensConsumedColumnExistsInExecutionEntityTable =
			executionEntityTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInExecutionEntityTable =
			executionEntityTable?.findColumnByName('costIncurred');

		const workflowEntityTable = await queryRunner.getTable(`${tablePrefix}workflow_entity`);
		const tokensConsumedColumnExistsInWorkflowEntityTable =
			workflowEntityTable?.findColumnByName('tokensConsumed');
		const costIncurredColumnExistsInWorkflowEntityTable =
			workflowEntityTable?.findColumnByName('costIncurred');

		if (tokensConsumedColumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`tokensConsumed\``);
		}
		if (costIncurredColumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE \`${tablePrefix}user\` DROP COLUMN \`costIncurred\``);
		}
		if (tokensConsumedColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN \`tokensConsumed\``,
			);
		}
		if (costIncurredColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}execution_entity\` DROP COLUMN \`costIncurred\``,
			);
		}
		if (tokensConsumedColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN \`tokensConsumed\``,
			);
		}
		if (costIncurredColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE \`${tablePrefix}workflow_entity\` DROP COLUMN \`costIncurred\``,
			);
		}
	}
}
