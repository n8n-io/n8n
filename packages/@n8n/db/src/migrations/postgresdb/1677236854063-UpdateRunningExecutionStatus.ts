import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class UpdateRunningExecutionStatus1677236854063 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'failed' WHERE "status" = 'running' AND "finished"=false AND "stoppedAt" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'success' WHERE "status" = 'running' AND "finished"=true AND "stoppedAt" IS NOT NULL;`,
		);
	}
}
