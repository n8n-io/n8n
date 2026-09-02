import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from '../../../../src';

export class AddAuthorIdColumn1656939646470 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			'post',
			new TableColumn({
				name: 'authorId',
				type: 'integer',
			}),
		);
		await queryRunner.createForeignKey(
			'post',
			new TableForeignKey({
				columnNames: ['authorId'],
				referencedTableName: 'author',
				referencedColumnNames: ['id'],
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropForeignKey(
			'post',
			new TableForeignKey({
				columnNames: ['authorId'],
				referencedTableName: 'author',
				referencedColumnNames: ['id'],
			}),
		);
		await queryRunner.dropColumn('post', 'authorId');
	}
}
