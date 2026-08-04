import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AddActivatedAtUserSetting1717498465931 implements ReversibleMigration {
	async up({ queryRunner, escape }: MigrationContext) {
		const now = Date.now();
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')}
			SET settings = jsonb_set(COALESCE(settings::jsonb, '{}'), '{userActivatedAt}', to_jsonb(${now}))
			WHERE settings IS NOT NULL AND (settings->>'userActivated')::boolean = true`,
		);
	}

	async down({ queryRunner, escape }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${escape.tableName('user')} SET settings = settings::jsonb - 'userActivatedAt' WHERE settings IS NOT NULL`,
		);
	}
}
