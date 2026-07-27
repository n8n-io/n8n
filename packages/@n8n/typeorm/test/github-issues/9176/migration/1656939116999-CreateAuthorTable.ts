import { MigrationInterface, QueryRunner, Table } from '../../../../src';

export class CreateAuthorTable1656939116999 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'author',
				columns: [
					{
						name: 'id',
						type: 'integer',
						isPrimary: true,
						isGenerated: true,
						generationStrategy: 'increment',
					},
					{
						name: 'name',
						type: 'varchar',
					},
				],
			}),
			true,
			true,
			true,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('author');
	}
}
