import { jsonParse } from 'n8n-workflow';

import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const REDACTION_ENFORCEMENT_KEY = 'redaction.enforcement';

type RedactionFloor = 'off' | 'production' | 'all';

const FLOORS: readonly RedactionFloor[] = ['off', 'production', 'all'];

interface BooleanSettings {
	enforced: boolean;
	manual: boolean;
	production: boolean;
}

/**
 * Migrates the stored redaction enforcement setting from the boolean triple
 * `{ enforced, manual, production }` to the floor enum `'off' | 'production' | 'all'`.
 *
 * Only the three combinations the API could produce map to a floor; every other
 * (impossible) combination normalises up to the strictest `'all'` — never weaker
 * than what was stored:
 *   - `enforced: false`                                  -> 'off'
 *   - `{ enforced: true, manual: false, production: true }` -> 'production'
 *   - `{ enforced: true, manual: true,  production: true }` -> 'all'
 *   - anything else (impossible tuple, unparseable, malformed) -> 'all'
 *
 * The value is stored as a JSON-encoded string (e.g. the literal `"off"`), matching
 * how the service serialises it, so the read path stays unchanged.
 *
 * Irreversible: collapsing three booleans into one enum is lossy, so there is no
 * faithful `down()`.
 *
 * Compatible with SQLite and PostgreSQL.
 */
export class MigrateRedactionEnforcementToFloor1784000000025 implements IrreversibleMigration {
	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const settingsTable = escape.tableName('settings');
		const keyCol = escape.columnName('key');
		const valueCol = escape.columnName('value');

		const rows: Array<{ value: string }> = await runQuery(
			`SELECT ${valueCol} AS value FROM ${settingsTable} WHERE ${keyCol} = :key;`,
			{ key: REDACTION_ENFORCEMENT_KEY },
		);

		if (rows.length === 0) {
			logger.info(
				`[${migrationName}] No stored redaction enforcement setting found, nothing to migrate`,
			);
			return;
		}

		const floor = this.toFloor(rows[0].value);
		const serialized = JSON.stringify(floor);

		await runQuery(`UPDATE ${settingsTable} SET ${valueCol} = :value WHERE ${keyCol} = :key;`, {
			value: serialized,
			key: REDACTION_ENFORCEMENT_KEY,
		});

		logger.info(`[${migrationName}] Migrated redaction enforcement setting to floor='${floor}'`);
	}

	private toFloor(raw: string): RedactionFloor {
		let parsed: unknown;
		try {
			parsed = jsonParse<unknown>(raw);
		} catch {
			// Unparseable value — fall back to the strictest floor.
			return 'all';
		}

		// Already migrated (e.g. a re-run): leave the existing floor untouched.
		if (typeof parsed === 'string' && FLOORS.includes(parsed as RedactionFloor)) {
			return parsed as RedactionFloor;
		}

		if (!this.isBooleanSettings(parsed)) return 'all';

		// Map only the API-producible combinations; every other (impossible)
		// enforced combination — including `{ manual: false, production: false }`
		// and `{ manual: true, production: false }` — normalises up to 'all'.
		if (!parsed.enforced) return 'off';
		if (!parsed.manual && parsed.production) return 'production';
		return 'all';
	}

	private isBooleanSettings(value: unknown): value is BooleanSettings {
		if (value === null || typeof value !== 'object') return false;
		const candidate = value as Record<string, unknown>;
		return (
			typeof candidate.enforced === 'boolean' &&
			typeof candidate.manual === 'boolean' &&
			typeof candidate.production === 'boolean'
		);
	}
}
