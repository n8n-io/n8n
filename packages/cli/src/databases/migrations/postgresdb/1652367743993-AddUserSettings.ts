import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddUserSettings1652367743993 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" ADD COLUMN settings json`);

		await queryRunner.query(
			`ALTER TABLE "${tablePrefix}user" ALTER COLUMN "personalizationAnswers" TYPE json USING to_jsonb("personalizationAnswers")::json;`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(`ALTER TABLE "${tablePrefix}user" DROP COLUMN settings`);
	}
}
