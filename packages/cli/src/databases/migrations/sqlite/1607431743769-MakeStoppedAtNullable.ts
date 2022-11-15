import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class MakeStoppedAtNullable1607431743769 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DELETE FROM "${tablePrefix}execution_entity"`);
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1"`);
		await queryRunner.query(`ALTER TABLE "${tablePrefix}execution_entity" DROP COLUMN "stoppedAt"`);
		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}execution_entity" ADD COLUMN "stoppedAt" datetime`,
		);
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt") `,
		);
	}
}
