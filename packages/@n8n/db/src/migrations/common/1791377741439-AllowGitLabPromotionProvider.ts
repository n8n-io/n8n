import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class AllowGitLabPromotionProvider1791377741439 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.setProviderTypes(context, ['git', 'gitlab']);
	}

	async down(context: MigrationContext) {
		const { escape, runQuery } = context;
		// Plain Git uses the same credentials and remote targets. Keep the connections on downgrade.
		await runQuery(
			`UPDATE ${escape.tableName('promotion_provider')}
			 SET ${escape.columnName('type')} = 'git', ${escape.columnName('config')} = '{"schemaVersion":1}'
			 WHERE ${escape.columnName('type')} = 'gitlab'`,
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
