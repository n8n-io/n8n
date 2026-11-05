import type { MigrationContext, ReversibleMigration } from '../migration-types';

const AI_PREFERENCE_TABLE = 'ai_preference';
const SOURCE_COLUMN = 'source';
const SOURCE_VALUES = ['ui', 'aia', 'mcp'];

/**
 * Records which surface wrote a preference. The assistant and the MCP server each write
 * rows with their own `source`, and the telemetry, the settings list and the rules around
 * an assistant write all need to tell those rows from a person's own.
 *
 * Added nullable, backfilled, then made NOT NULL, and deliberately without a default:
 * every write path names its surface or fails, so a forgotten path cannot quietly record
 * `ui`. The enum check goes on last, after the NOT NULL change has recreated the table on
 * SQLite. No table points a foreign key at `ai_preference`, so that recreation carries no
 * cascade risk.
 */
export class AddSourceToAiPreference1789479099132 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { schemaBuilder } = context;

		await schemaBuilder.addColumns(
			AI_PREFERENCE_TABLE,
			[
				schemaBuilder
					.column(SOURCE_COLUMN)
					.varchar(16)
					.comment('Surface that wrote the row: ui (settings), aia (assistant), mcp (client)'),
			],
			{ recreatesOnSqlite: true },
		);

		await this.backfillExistingRows(context);

		await schemaBuilder.addNotNull(AI_PREFERENCE_TABLE, SOURCE_COLUMN, {
			recreatesOnSqlite: true,
		});

		await schemaBuilder.addEnumCheck(AI_PREFERENCE_TABLE, SOURCE_COLUMN, SOURCE_VALUES, {
			recreatesOnSqlite: true,
		});
	}

	async down({ schemaBuilder }: MigrationContext) {
		await schemaBuilder.dropEnumCheck(AI_PREFERENCE_TABLE, SOURCE_COLUMN, {
			recreatesOnSqlite: true,
		});

		await schemaBuilder.dropColumns(AI_PREFERENCE_TABLE, [SOURCE_COLUMN], {
			recreatesOnSqlite: true,
		});
	}

	/** Only the settings UI could write a preference before this column existed. */
	private async backfillExistingRows({ escape, runQuery }: MigrationContext) {
		const table = escape.tableName(AI_PREFERENCE_TABLE);
		const source = escape.columnName(SOURCE_COLUMN);

		await runQuery(`UPDATE ${table} SET ${source} = 'ui' WHERE ${source} IS NULL`);
	}
}
