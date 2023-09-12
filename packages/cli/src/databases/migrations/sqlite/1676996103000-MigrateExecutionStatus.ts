import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class MigrateExecutionStatus1676996103000 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'waiting' WHERE "status" IS NULL AND "waitTill" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'failed' WHERE "status" IS NULL AND "finished"=0 AND "stoppedAt" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'success' WHERE "status" IS NULL AND "finished"=1 AND "stoppedAt" IS NOT NULL;`,
		);
		await queryRunner.query(
			`UPDATE "${tablePrefix}execution_entity" SET "status" = 'crashed' WHERE "status" IS NULL;`,
		);
	}
}
