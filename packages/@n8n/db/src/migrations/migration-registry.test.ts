import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { assertMigrationIndexInSync } from './migration-index-sync';

/**
 * The generated migration indexes can't drift from the files on disk, but
 * generation can't rule out two parallel PRs adding migration files that
 * share a timestamp and merging cleanly — that invariant is asserted here.
 */

const MIGRATION_FILE = /^(?<timestamp>\d{10,16})-(?<name>[A-Za-z][A-Za-z0-9]*)\.ts$/;

// Historical pairs that already shipped sharing a timestamp. Never extend this list.
const LEGACY_DUPLICATE_TIMESTAMPS = new Set([1750252139166, 1770000000000]);

function listMigrationFiles(folder: string) {
	return readdirSync(join(__dirname, folder)).flatMap((fileName) => {
		const groups = MIGRATION_FILE.exec(fileName)?.groups;
		if (!groups) return [];
		return { name: groups.name, timestamp: Number(groups.timestamp), fileName };
	});
}

describe.each(['sqlite', 'postgresdb'])('%s migration set', (folder) => {
	test('every migration has a unique timestamp', () => {
		// Same selection rule as the generator: common/ plus the DB folder,
		// with a DB-specific file shadowing a common one of the same name.
		const dbFiles = listMigrationFiles(folder);
		const dbNames = new Set(dbFiles.map(({ name }) => name));
		const selected = [
			...listMigrationFiles('common').filter(({ name }) => !dbNames.has(name)),
			...dbFiles,
		];
		expect(selected.length).toBeGreaterThan(200);

		const byTimestamp = new Map<number, string[]>();
		for (const { timestamp, fileName } of selected) {
			byTimestamp.set(timestamp, [...(byTimestamp.get(timestamp) ?? []), fileName]);
		}
		const duplicates = [...byTimestamp.entries()].filter(
			([timestamp, fileNames]) =>
				fileNames.length > 1 && !LEGACY_DUPLICATE_TIMESTAMPS.has(timestamp),
		);
		expect(duplicates).toEqual([]);
	});
});

test('a stale generated index is rejected at import time', () => {
	expect(() =>
		assertMigrationIndexInSync(join(__dirname, 'sqlite'), 'not-the-current-input-hash'),
	).toThrow('out of sync');
});
