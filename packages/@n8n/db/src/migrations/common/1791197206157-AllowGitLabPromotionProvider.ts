import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AllowGitLabPromotionProvider1791197206157 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.setProviderTypes(context, ['git', 'gitlab']);
	}

	async down(context: MigrationContext) {
		const { escape, runQuery } = context;
		// Both types use the same Git credentials and remote targets. Keep their connections on downgrade.
		await runQuery(
			`UPDATE ${escape.tableName('promotion_provider')}
			 SET ${escape.columnName('type')} = 'git', ${escape.columnName('config')} = :config
			 WHERE ${escape.columnName('type')} = 'gitlab'`,
			{ config: JSON.stringify({ schemaVersion: 1 }) },
		);
		await this.setProviderTypes(context, ['git']);
	}

	private async setProviderTypes(
		{ escape, runQuery, isPostgres, schemaBuilder }: MigrationContext,
		types: string[],
	) {
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName('promotion_provider')}.${escape.columnName('type')}
				 IS 'PromotionProviderType enum: ${types.map((type) => `"${type}"`).join(', ')}'`,
			);
		}
		await schemaBuilder.dropEnumCheck('promotion_provider', 'type', { recreatesOnSqlite: true });
		await schemaBuilder.addEnumCheck('promotion_provider', 'type', types, {
			recreatesOnSqlite: true,
		});
	}
}
