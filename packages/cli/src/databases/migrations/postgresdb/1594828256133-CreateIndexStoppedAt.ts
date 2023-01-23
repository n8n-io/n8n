import { MigrationInterface, QueryRunner } from 'typeorm';
import { getTablePrefix } from '@/databases/utils/migrationHelpers';

export class CreateIndexStoppedAt1594828256133 implements MigrationInterface {
	name = 'CreateIndexStoppedAt1594828256133';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(
			`CREATE INDEX IF NOT EXISTS IDX_${tablePrefix}33228da131bb1112247cf52a42 ON ${tablePrefix}execution_entity ("stoppedAt") `,
		);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();
		await queryRunner.query(`DROP INDEX IDX_${tablePrefix}33228da131bb1112247cf52a42`);
	}
}
