import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateProcessedDataTable1721319360300 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}processed_data" ("value" varchar NOT NULL, "context" varchar NOT NULL, "workflowId" varchar NOT NULL, "createdAt" datetime(3), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), PRIMARY KEY ("value", "context", "workflowId"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}2ee85375a902774232874d314e" ON "${tablePrefix}processed_data" ("workflowId", "context", "value") `,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}processed_data"`);
	}
}
