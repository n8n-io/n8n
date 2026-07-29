import type { MigrationContext, ReversibleMigration } from '../migration-types';

const CHAT_ENABLED_KEY = 'chat.access.enabled';

/**
 * Turns Chat Hub off by default, keeping it on only for installs that have
 * already used it.
 *
 * Stores an explicit `chat.access.enabled` value for every install, so the
 * disabled-by-default state is recorded concretely and is auditable rather
 * than inferred from a missing row.
 *
 *   - row already present   -> leave untouched (deliberate admin choice, true or false)
 *   - any chat_hub_sessions -> store 'true' (Chat Hub is in use)
 *   - otherwise             -> store 'false' (disabled)
 *
 * The settings service treats a missing row as disabled too, so absence is a
 * safe fallback; this migration just removes the ambiguity for existing
 * installs.
 *
 * The value is stored as the bare string `'true'`/`'false'` to match how the
 * settings service reads (`row.value === 'true'`) and writes it.
 *
 * `down()` is intentionally a no-op: the stored value is left in place
 * and it is picked up again if the instance is upgraded later.
 */
export class SetChatHubEnabledFromUsage1784000000038 implements ReversibleMigration {
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
		const enabled = usage.length > 0;

		await runQuery(
			`INSERT INTO ${settingsTable} (${keyCol}, ${valueCol}, ${loadCol}) VALUES (:key, :value, true);`,
			{ key: CHAT_ENABLED_KEY, value: enabled ? 'true' : 'false' },
		);

		logger.info(`[${migrationName}] Persisted Chat Hub enabled=${enabled} based on existing usage`);
	}

	// No-op: the stored value is harmless and is reused on a later upgrade.
	async down() {}
}
