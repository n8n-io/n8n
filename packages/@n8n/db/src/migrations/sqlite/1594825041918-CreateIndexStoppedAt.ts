import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class CreateIndexStoppedAt1594825041918 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1" ON "${tablePrefix}execution_entity" ("stoppedAt") `,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX "IDX_${tablePrefix}cefb067df2402f6aed0638a6c1"`);
	}
}
