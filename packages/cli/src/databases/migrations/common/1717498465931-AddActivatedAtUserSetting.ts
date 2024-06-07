import type { MigrationContext, ReversibleMigration } from '@db/types';

export class AddActivatedAtUserSetting1717498465931 implements ReversibleMigration {
	async up({ queryRunner, tablePrefix }: MigrationContext) {
		const now = Date.now();
		await queryRunner.query(
			`UPDATE ${tablePrefix}user
			SET settings = jsonb_set(COALESCE(settings::jsonb, '{}'), '{userActivatedAt}', to_jsonb(${now}))
			WHERE settings IS NOT NULL AND (settings->>'userActivated')::boolean = true`,
		);
	}

	async down({ queryRunner, tablePrefix }: MigrationContext) {
		await queryRunner.query(
			`UPDATE ${tablePrefix}user SET settings = settings::jsonb - 'userActivatedAt' WHERE settings IS NOT NULL`,
		);
	}
}
