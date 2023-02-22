import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class IncreaseTypeVarcharLimit1646834195327 implements MigrationInterface {
	name = 'IncreaseTypeVarcharLimit1646834195327';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`ALTER TABLE ${tablePrefix}credentials_entity ALTER COLUMN "type" TYPE VARCHAR(128)`,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {}
}
