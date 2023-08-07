import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddwaitTill1626176912946 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE ${tablePrefix}execution_entity ADD "waitTill" TIMESTAMP`);
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2 ON ${tablePrefix}execution_entity ("waitTill")`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}ca4a71b47f28ac6ea88293a8e2`);
		await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "waitTill"`);
	}
}
