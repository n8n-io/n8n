import type { MigrationContext, ReversibleMigration } from '../migration-types';

const aiPreferenceTable = 'ai_preference';
const sourceColumn = 'source';
const sourceLabels: Record<string, string> = {
	ui: 'ui (settings)',
	aia: 'aia (assistant)',
	mcp: 'mcp (client)',
	api: 'api (public API)',
};

export class AllowApiSourceOnAiPreference1795100170853 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.setSources(context, ['ui', 'aia', 'mcp', 'api']);
	}

	async down(context: MigrationContext) {
		await this.relabelApiRowsAsSettings(context);
		await this.setSources(context, ['ui', 'aia', 'mcp']);
	}

	private async relabelApiRowsAsSettings({ escape, runQuery }: MigrationContext) {
		const source = escape.columnName(sourceColumn);
		await runQuery(
			`UPDATE ${escape.tableName(aiPreferenceTable)} SET ${source} = 'ui' WHERE ${source} = 'api'`,
		);
	}

	private async setSources(
		{ escape, runQuery, isPostgres, schemaBuilder }: MigrationContext,
		sources: string[],
	) {
		if (isPostgres) {
			await runQuery(
				`COMMENT ON COLUMN ${escape.tableName(aiPreferenceTable)}.${escape.columnName(sourceColumn)}
				 IS 'Surface that wrote the row: ${sources.map((source) => sourceLabels[source]).join(', ')}'`,
			);
		}
		await schemaBuilder.dropEnumCheck(aiPreferenceTable, sourceColumn, {
			recreatesOnSqlite: true,
		});
		await schemaBuilder.addEnumCheck(aiPreferenceTable, sourceColumn, sources, {
			recreatesOnSqlite: true,
		});
	}
}
