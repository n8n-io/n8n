import { MigrationInterface, QueryRunner, TableUnique } from '../../../../src';

export class CreateUniqueConstraintToUser1657067039714 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createUniqueConstraint(
			'user',
			new TableUnique({
				columnNames: ['firstName', 'lastName', 'middleName'],
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropUniqueConstraint(
			'user',
			new TableUnique({
				columnNames: ['firstName', 'lastName', 'middleName'],
			}),
		);
	}
}
