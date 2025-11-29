import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateSortIndexForExecutions1757105063613 implements ReversibleMigration {
	public async up({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_${tablePrefix}executions_sort"
        ON ${tablePrefix}execution_entity"
        (
          "workflowId",
          (COALESCE("startedAt","createdAt")) DESC
        )
        WHERE "deletedAt" IS NULL
      `);
	}

	public async down({ queryRunner, tablePrefix }: MigrationContext): Promise<void> {
		await queryRunner.query(
			`DROP INDEX CONCURRENTLY IF EXISTS "idx_${tablePrefix}executions_sort"`,
		);
	}
}
