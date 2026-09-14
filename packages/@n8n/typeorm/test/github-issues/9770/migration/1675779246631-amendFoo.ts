import { MigrationInterface, QueryRunner, TableColumn } from '../../../../src';

export class amendFoo1675779246631 implements MigrationInterface {
	public async up(q: QueryRunner): Promise<void> {
		await q.addColumn(
			'foo',
			new TableColumn({
				name: 'comment',
				type: 'varchar',
				isNullable: true,
				default: null,
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn('foo', 'comment');
	}
}
