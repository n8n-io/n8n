import type { MigrationContext, MigrationInterface } from '@db/types';

export class IncreaseTypeVarcharLimit1646834195327 implements MigrationInterface {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "type" TYPE VARCHAR(128)`,
		);
	}
}
