import type { MigrationContext, ReversibleMigration } from '../migration-types';

const aiPreferenceTable = 'ai_preference';
const sourceColumn = 'source';
const sourceLabels: Record<string, string> = {
	ui: 'ui (settings)',
	aia: 'aia (assistant)',
	mcp: 'mcp (client)',
	api: 'api (public API)',
	import: 'import (package import)',
};

export class AllowImportSourceOnAiPreference1795524706285 implements ReversibleMigration {
	async up(context: MigrationContext) {
		await this.setSources(context, ['ui', 'aia', 'mcp', 'api', 'import']);
	}

	async down(context: MigrationContext) {
		const { escape, runQuery } = context;
		const source = escape.columnName(sourceColumn);
		// Preserve imported rows as settings rows before restoring the old constraint.
		await runQuery(
			`UPDATE ${escape.tableName(aiPreferenceTable)} SET ${source} = 'ui' WHERE ${source} = 'import'`,
		);
		await this.setSources(context, ['ui', 'aia', 'mcp', 'api']);
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
