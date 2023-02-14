import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class CreateExecutionMetadataTable1674133106778 implements MigrationInterface {
	name = 'CreateExecutionMetadataTable1674133106778';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}execution_metadata (
				"id" serial4 NOT NULL PRIMARY KEY,
				"executionId" int4 NOT NULL,
				"key" text NOT NULL,
				"value" text NOT NULL,
				CONSTRAINT ${tablePrefix}execution_metadata_fk FOREIGN KEY ("executionId") REFERENCES ${tablePrefix}execution_entity(id) ON DELETE CASCADE
			)`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_metadata"`);
	}
}
