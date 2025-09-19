import type { MigrationContext, IrreversibleMigration } from '../migration-types';

export class UpdateRunningExecutionStatus1677237073720 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'failed' WHERE "status" = 'running' AND "finished"=0 AND "stoppedAt" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'success' WHERE "status" = 'running' AND "finished"=1 AND "stoppedAt" IS NOT NULL;`,
		);
	}
}
