import type { MigrationContext, ReversibleMigration } from '@/databases/types';

export class CreateProcessedDataTable1721319360300 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}processed_data ("value" character varying NOT NULL, "context" character varying NOT NULL, "workflowId" character varying NOT NULL, "createdAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT ('now'::text)::timestamp(3) with time zone, CONSTRAINT "PK_2ee85375a902774232874d314e4" PRIMARY KEY ("value", "context", "workflowId"))`,
		);
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}2ee85375a902774232874d314e" ON ${tablePrefix}processed_data ("workflowId", "context", "value") `,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE ${tablePrefix}processed_data`);
	}
}
