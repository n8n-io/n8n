import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddActivatedAtUserSetting1717498465931 implements ReversibleMigration {
	transaction = false as const;

	async up({ queryRunner, escape }: MigrationContext) {
		const now = Date.now();
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')}
			SET settings = JSON_SET(settings, '$.userActivatedAt', ${now})
			WHERE JSON_EXTRACT(settings, '$.userActivated') = true;`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')} SET settings = JSON_REMOVE(settings, '$.userActivatedAt')`,
		);
	}
}
