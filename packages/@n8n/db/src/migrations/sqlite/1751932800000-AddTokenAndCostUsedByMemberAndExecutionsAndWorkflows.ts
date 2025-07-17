import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1751932800000
	implements ReversibleMigration
{
	name = 'AddTokenAndCostUsedByMemberAndExecutionsAndWorkflows1751932800000';

	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}user" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}user" ADD COLUMN "costIncurred" DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_entity" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_entity" ADD COLUMN "costIncurred" DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" ADD COLUMN "tokensConsumed" BIGINT DEFAULT 0 NOT NULL`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" ADD COLUMN "costIncurred" DECIMAL(20,10) DEFAULT 0 NOT NULL`,
		);
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "tokensConsumed"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN "costIncurred"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_entity" DROP COLUMN "tokensConsumed"`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_entity" DROP COLUMN "costIncurred"`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" DROP COLUMN "tokensConsumed"`,
		);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}workflow_entity" DROP COLUMN "costIncurred"`,
		);
	}
}
