import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class MakeStoppedAtNullable1607431743768 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			'ALTER TABLE ' + tablePrefix + 'execution_entity ALTER COLUMN "stoppedAt" DROP NOT NULL',
		);
	}
}
