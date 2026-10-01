import { MigrationInterface, QueryRunner, Table } from '../../../../src';

export class CreatePostTable1656926770819 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'post',
				columns: [
					{
						name: 'id',
						type: 'integer',
						isPrimary: true,
						isGenerated: true,
						generationStrategy: 'increment',
					},
					{
						name: 'title',
						type: 'varchar',
					},
					{
						name: 'text',
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
		await queryRunner.dropTable('post');
	}
}
