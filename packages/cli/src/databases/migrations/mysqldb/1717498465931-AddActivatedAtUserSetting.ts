import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddActivatedAtUserSetting1717498465931 implements ReversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const now = Date.now();
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')}
			SET settings = JSON_SET(COALESCE(settings, '{}'), '$.userActivatedAt', CAST('${now}' AS JSON))
			WHERE settings IS NOT NULL AND JSON_EXTRACT(settings, '$.userActivated') = true`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')}
			SET settings = JSON_REMOVE(CAST(settings AS JSON), '$.userActivatedAt')
			WHERE settings IS NOT NULL`,
		);
	}
}
