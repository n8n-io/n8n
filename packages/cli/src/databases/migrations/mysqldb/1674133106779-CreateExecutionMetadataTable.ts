import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { getTablePrefix, logMigrationEnd, logMigrationStart } from '@db/utils/migrationHelpers';
import config from '@/config';

export class CreateExecutionMetadataTable1674133106779 implements MigrationInterface {
	name = 'CreateExecutionMetadataTable1674133106779';

	public async up(queryRunner: QueryRunner): Promise<void> {
		logMigrationStart(this.name);
		const tablePrefix = getTablePrefix();

		await queryRunner.query(
			`CREATE TABLE ${tablePrefix}execution_metadata (
				id int(11) auto_increment NOT NULL PRIMARY KEY,
				executionId int(11) NOT NULL,
				\`key\` TEXT NOT NULL,
				value TEXT NOT NULL,
				CONSTRAINT \`${tablePrefix}execution_metadata_FK\` FOREIGN KEY (\`executionId\`) REFERENCES \`${tablePrefix}execution_entity\` (\`id\`) ON DELETE CASCADE,
				INDEX \`IDX_${tablePrefix}6d44376da6c1058b5e81ed8a154e1fee106046eb\` (\`executionId\` ASC)
			)
			ENGINE=InnoDB`,
		);

		logMigrationEnd(this.name);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = getTablePrefix();

		await queryRunner.query(`DROP TABLE "${tablePrefix}execution_metadata"`);
	}
}
