import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1750636800000
	implements ReversibleMigration
{
	name = 'AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1750636800000';

	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if the column already exists in usertable and execution_entity table
		const userTable = await queryRunner.getTable(`${tablePrefix}user`);
		const tokensConsumedCollumnExistsInUserTable = userTable?.findColumnByName('tokensConsumed');
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

		if (!tokensConsumedCollumnExistsInUserTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}user" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
			);
		}
		if (!costIncurredColumnExistsInUserTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}user" ADD COLUMN "costIncurred" BIGINT DEFAULT 0 NOT NULL`,
			);
		}
		if (!tokensConsumedColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}execution_entity" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
			);
		}
		if (!costIncurredColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}execution_entity" ADD COLUMN "costIncurred" BIGINT DEFAULT 0 NOT NULL`,
			);
		}

		if (!tokensConsumedColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}workflow_entity" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
			);
		}

		if (!costIncurredColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}workflow_entity" ADD COLUMN "costIncurred" BIGINT DEFAULT 0 NOT NULL`,
			);
		}
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		// Check if the column exists before trying to drop it
		const userTable = await queryRunner.getTable(`${tablePrefix}user`);
		const tokensConsumedCollumnExistsInUserTable = userTable?.findColumnByName('tokensConsumed');
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

		if (tokensConsumedCollumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "tokensConsumed"`);
		}
		if (costIncurredColumnExistsInUserTable) {
			await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "costIncurred"`);
		}
		if (tokensConsumedColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}execution_entity" DROP COLUMN "tokensConsumed"`,
			);
		}
		if (costIncurredColumnExistsInExecutionEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}execution_entity" DROP COLUMN "costIncurred"`,
			);
		}
		if (tokensConsumedColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}workflow_entity" DROP COLUMN "tokensConsumed"`,
			);
		}
		if (costIncurredColumnExistsInWorkflowEntityTable) {
			await queryRunner.query(
				`ALTER TABLE "${tablePrefix}workflow_entity" DROP COLUMN "costIncurred"`,
			);
		}
	}
}
