import { MigrationInterface, QueryRunner, TableCheck } from '../../../../src';

export class CreateCheckConstraintToUser1657067039716 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.createCheckConstraint(
			'checked_user',
			new TableCheck({
				expression: `"age" > 18`,
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropCheckConstraint(
			'checked_user',
			new TableCheck({
				expression: `"age" > 18`,
			}),
		);
	}
}
