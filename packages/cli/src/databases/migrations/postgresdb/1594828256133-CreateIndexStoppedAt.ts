import type { MigrationContext, ReversibleMigration } from '@db/types';

export class CreateIndexStoppedAt1594828256133 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}33228da131bb1112247cf52a42 ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}33228da131bb1112247cf52a42`);
	}
}
