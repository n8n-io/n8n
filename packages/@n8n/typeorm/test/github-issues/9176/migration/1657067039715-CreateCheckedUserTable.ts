import { MigrationInterface, QueryRunner, Table } from '../../../../src';

export class CreateCheckedUserTable1657067039715 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'checked_user',
				columns: [
					{
						name: 'id',
						type: 'integer',
						isPrimary: true,
						isGenerated: true,
						generationStrategy: 'increment',
					},
					{
						name: 'age',
						type: 'integer',
					},
				],
			}),
			true,
			true,
			true,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropTable('checked_user');
	}
}
