import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddActivatedAtUserSetting1717498465931 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const now = Date.now();
		await queryRunner.query(
			`UPDATE ${tablePrefix}user
			SET settings = JSON_SET(settings, '$.userActivatedAt', ${now})
			WHERE JSON_EXTRACT(settings, '$.userActivated') = true;`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${tablePrefix}user SET settings = JSON_REMOVE(settings, '$.userActivatedAt')`,
		);
	}
}
