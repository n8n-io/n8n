import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateExecutionMetadataTable1679416281777 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE TABLE "${tablePrefix}execution_metadata" (
				id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
				executionId INTEGER NOT NULL,
				"key" TEXT NOT NULL,
				value TEXT NOT NULL,
				CONSTRAINT ${tablePrefix}execution_metadata_entity_FK FOREIGN KEY (executionId) REFERENCES ${tablePrefix}execution_entity(id) ON DELETE CASCADE
			)`,
		);

		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}6d44376da6c1058b5e81ed8a154e1fee106046eb" ON "${tablePrefix}execution_metadata" ("executionId");`,
		);

		// Re add some lost indices from migration DeleteExecutionsWithWorkflows.ts
		// that were part of AddExecutionEntityIndexes.ts
		// not all were needed since we added the `status` column to execution_entity
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9' ON '${tablePrefix}execution_entity' ('waitTill', 'id') `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}81fc04c8a17de15835713505e4' ON '${tablePrefix}execution_entity' ('workflowId', 'id') `,
		);

		// Also add index to the new status column
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS 'IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584' ON '${tablePrefix}execution_entity' ('status', 'workflowId') `,
		);

		// Remove no longer needed index to waitTill since it's already covered by the index b94b45ce2c73ce46c54f20b5f9 above
		await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2'`);
		// Remove index for stoppedAt since it's not used anymore
		await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}cefb067df2402f6aed0638a6c1'`);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_metadata"`);
		await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}b94b45ce2c73ce46c54f20b5f9'`);
		await queryRunner.query(`DROP INDEX IF EXISTS 'IDX_${tablePrefix}81fc04c8a17de15835713505e4'`);
		await queryRunner.query(
			`DROP INDEX IF EXISTS 'IDX_${tablePrefix}8b6f3f9ae234f137d707b98f3bf43584'`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON "${tablePrefix}execution_entity" ("waitTill")`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt")`,
		);
	}
}
