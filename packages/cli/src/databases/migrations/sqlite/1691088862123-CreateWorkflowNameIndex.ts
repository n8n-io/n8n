import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateWorkflowNameIndex1691088862123 implements ReversibleMigration {
	indexName = '48f450ec4a8536fbd7d8e7d094';

	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE UNIQUE INDEX "IDX_${tablePrefix}${this.indexName}" ON "${tablePrefix}workflow_entity" ("name");`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}${this.indexName}";`);
	}
}
