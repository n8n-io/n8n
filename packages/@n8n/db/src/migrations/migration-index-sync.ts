import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATION_FILE = /^(?<base>\d{10,16}-[A-Za-z][A-Za-z0-9]*)\.ts$/;

/**
 * Verifies that a generated migrations index matches the migration files on
 * disk, so loading src without a build (e.g. Vitest) fails loudly on a stale
 * index instead of silently skipping a migration. The hash covers file names
 * only — content edits don't require regeneration — and must stay in sync
 * with scripts/generate-migration-index.mjs.
 */
export function assertMigrationIndexInSync(indexDir: string, expectedHash: string) {
	// Skip in dist: builds always emit a fresh index, and tsc leaves compiled
	// output of deleted migrations behind, which would false-positive here.
	if (__filename.endsWith('.js')) return;

	const hash = createHash('sha256');
	const keys: string[] = [];
	for (const dir of [join(indexDir, '..', 'common'), indexDir]) {
		const folder = dir.split(/[\\/]/).pop();
		for (const fileName of readdirSync(dir)) {
			const base = MIGRATION_FILE.exec(fileName)?.groups?.base;
			if (base) keys.push(`${folder}/${base}`);
		}
	}
	for (const key of keys.sort()) hash.update(`${key}\n`);

	if (hash.digest('hex') !== expectedHash) {
		throw new Error(
			`The generated migrations index in ${indexDir} is out of sync with the migration files on disk. ` +
				'Regenerate it with: pnpm --filter=@n8n/db gen:migration-index',
		);
	}
}
