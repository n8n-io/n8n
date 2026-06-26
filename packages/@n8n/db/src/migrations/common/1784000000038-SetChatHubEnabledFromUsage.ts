import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const CHAT_ENABLED_KEY = 'chat.access.enabled';

/**
 * Persists an explicit `chat.access.enabled = 'true'` row for instances that
 * already have Chat Hub usage, so the new default (disabled when no row exists)
 * does not turn the feature off for active users on upgrade.
 *
 * Logic:
 *   - row already present  -> leave untouched (deliberate admin choice, true or false)
 *   - any chat_hub_sessions -> write 'true' to preserve the active install
 *   - otherwise             -> leave absent, so the default-off behaviour applies
 *
 * The value is stored as the bare string `'true'` to match how the settings
 * service reads (`row.value === 'true'`) and writes it.
 *
 * Irreversible: removing the row on `down()` could delete a value an admin set
 * by hand, so there is no faithful reverse.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class SetChatHubEnabledFromUsage1784000000038 implements IrreversibleMigration {
	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const settingsTable = escape.tableName('settings');
		const sessionsTable = escape.tableName('chat_hub_sessions');
		const keyCol = escape.columnName('key');
		const valueCol = escape.columnName('value');
		const loadCol = escape.columnName('loadOnStartup');

		const existing: Array<{ value: string }> = await runQuery(
			`SELECT ${valueCol} AS value FROM ${settingsTable} WHERE ${keyCol} = :key LIMIT 1;`,
			{ key: CHAT_ENABLED_KEY },
		);

		if (existing.length > 0) {
			logger.info(
				`[${migrationName}] Chat Hub enabled setting already present, leaving it untouched`,
			);
			return;
		}

		const usage: Array<{ used: number }> = await runQuery(
			`SELECT 1 AS used FROM ${sessionsTable} LIMIT 1;`,
		);

		if (usage.length === 0) {
			logger.info(`[${migrationName}] No Chat Hub usage found, leaving it disabled by default`);
			return;
		}

		await runQuery(
			`INSERT INTO ${settingsTable} (${keyCol}, ${valueCol}, ${loadCol}) VALUES (:key, :value, true);`,
			{ key: CHAT_ENABLED_KEY, value: 'true' },
		);

		logger.info(`[${migrationName}] Existing Chat Hub usage found, keeping the feature enabled`);
	}
}
