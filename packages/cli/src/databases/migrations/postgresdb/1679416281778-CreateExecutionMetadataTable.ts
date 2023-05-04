import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateExecutionMetadataTable1679416281778 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}execution_metadata (
				"id" serial4 NOT NULL PRIMARY KEY,
				"executionId" int4 NOT NULL,
				"key" text NOT NULL,
				"value" text NOT NULL,
				CONSTRAINT ${tablePrefix}execution_metadata_fk FOREIGN KEY ("executionId") REFERENCES ${tablePrefix}execution_entity(id) ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}6d44376da6c1058b5e81ed8a154e1fee106046eb" ON "${tablePrefix}execution_metadata" ("executionId");`,
		);

		// Remove indices that are no longer needed since the addition of the status column
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}33228da131bb1112247cf52a42"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}72ffaaab9f04c2c1f1ea86e662"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}58154df94c686818c99fb754ce"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "IDX_${tablePrefix}4f474ac92be81610439aaad61e"`);

		// Create new index for status
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584" ON "${tablePrefix}execution_entity" ("status", "workflowId");`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		// Re-add removed indices
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}33228da131bb1112247cf52a42" ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}72ffaaab9f04c2c1f1ea86e662" ON ${tablePrefix}execution_entity ("finished", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}58154df94c686818c99fb754ce" ON ${tablePrefix}execution_entity ("workflowId", "waitTill", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}4f474ac92be81610439aaad61e" ON ${tablePrefix}execution_entity ("workflowId", "finished", "id") `,
		);

		await queryRunner.query(
			`DROP INDEX IF EXISTS "IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584"`,
		);

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_metadata"`);
	}
}
