import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@db/utils/migrationHelpers';

export class MakeStoppedAtNullable1607431743768 implements MigrationInterface {
	name = 'MakeStoppedAtNullable1607431743768';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			'ALTER TABLE ' + tablePrefix + 'execution_entity ALTER COLUMN "stoppedAt" DROP NOT NULL',
			undefined,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// Cannot be undone as column might already have null values
	}
}
