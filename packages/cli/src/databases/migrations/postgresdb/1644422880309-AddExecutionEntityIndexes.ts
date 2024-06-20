import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddExecutionEntityIndexes1644422880309 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IF EXISTS IDX_${tablePrefix}c4d999a5e90784e8caccf5589d`);
		await queryRunner.query(`DROP INDEX IF EXISTS IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2`);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}33228da131bb1112247cf52a42" ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}58154df94c686818c99fb754ce" ON ${tablePrefix}execution_entity ("workflowId", "waitTill", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}4f474ac92be81610439aaad61e" ON ${tablePrefix}execution_entity ("workflowId", "finished", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}72ffaaab9f04c2c1f1ea86e662" ON ${tablePrefix}execution_entity ("finished", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}85b981df7b444f905f8bf50747" ON ${tablePrefix}execution_entity ("waitTill", "id") `,
		);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS "IDX_${tablePrefix}d160d4771aba5a0d78943edbe3" ON ${tablePrefix}execution_entity ("workflowId", "id") `,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}d160d4771aba5a0d78943edbe3"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}85b981df7b444f905f8bf50747"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}72ffaaab9f04c2c1f1ea86e662"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}4f474ac92be81610439aaad61e"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}58154df94c686818c99fb754ce"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}33228da131bb1112247cf52a42"`);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2" ON ${tablePrefix}execution_entity ("waitTill") `,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}c4d999a5e90784e8caccf5589d" ON ${tablePrefix}execution_entity ("workflowId") `,
		);
	}
}
