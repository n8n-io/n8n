import type { MigrationContext, MigrationInterface } from '@db/types';

export class LowerCaseUserEmail1648740597343 implements MigrationInterface {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			UPDATE "${tablePrefix}user"
			SET email = LOWER(email);
		`);
	}
}
