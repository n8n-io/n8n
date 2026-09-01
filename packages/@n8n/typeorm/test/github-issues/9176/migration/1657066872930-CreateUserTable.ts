import { MigrationInterface, QueryRunner, Table } from '../../../../src';

export class CreateUserTable1657066872930 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createTable(
			new Table({
				name: 'user',
				columns: [
					{
						name: 'id',
						type: 'integer',
						isPrimary: true,
						isGenerated: true,
						generationStrategy: 'increment',
					},
					{
						name: 'firstName',
						type: 'varchar',
					},
					{
						name: 'lastName',
						type: 'varchar',
					},
					{
						name: 'middleName',
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
		await queryRunner.dropTable('user');
	}
}
