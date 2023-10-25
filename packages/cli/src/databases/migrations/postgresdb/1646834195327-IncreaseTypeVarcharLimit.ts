import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class IncreaseTypeVarcharLimit1646834195327 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "type" TYPE VARCHAR(128)`,
		);
	}
}
