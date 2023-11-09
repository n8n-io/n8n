import type { MigrationContext, IrreversibleMigration } from '@db/types';

export class LowerCaseUserEmail1648740597343 implements IrreversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`
			UPDATE "${tablePrefix}user"
			SET email = LOWER(email);
		`);
	}
}
