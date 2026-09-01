// Fails when a PR adds a DB migration whose timestamp is not newer than the
// newest migration already on the base branch. Fresh installs run migrations
// in timestamp order, but upgraded installs run pending migrations after the
// ones already applied — an older timestamp makes the two orders diverge.
// Node builtins only: it runs before the monorepo's dependencies are installed.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = 'packages/@n8n/db/src/migrations';

// Same shape the index generator selects: <timestamp>-<Name>.ts in a DB folder.
const MIGRATION_PATH = new RegExp(
	`^${MIGRATIONS_DIR}/(?:common|sqlite|postgresdb)/(?<fileBase>(?<timestamp>\\d{10,16})-[A-Za-z][A-Za-z0-9]*)\\.ts$`,
);

export function parseMigrationPath(path) {
	const groups = MIGRATION_PATH.exec(path)?.groups;
	if (!groups) return null;
	return { path, fileBase: groups.fileBase, timestamp: Number(groups.timestamp) };
}

/**
 * Every added migration must be newer than every migration on the base branch.
 * Exception: an added file that re-uses an existing `<timestamp>-<Name>` keeps
 * its slot (a per-DB variant that shadows a common migration).
 *
 * @param {string[]} baseFiles migration file paths at the merge-base
 * @param {string[]} addedFiles file paths added by the PR
 */
export function findOutOfOrderMigrations(baseFiles, addedFiles) {
	const base = baseFiles.map(parseMigrationPath).filter((file) => file !== null);
	const added = addedFiles.map(parseMigrationPath).filter((file) => file !== null);
	if (base.length === 0 || added.length === 0) return [];

	const newestBase = base.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
	const baseFileBases = new Set(base.map(({ fileBase }) => fileBase));

	return added
		.filter((file) => file.timestamp <= newestBase.timestamp && !baseFileBases.has(file.fileBase))
		.map((file) => ({ ...file, newestBase }));
}

function gitLines(args) {
	return execFileSync('git', args, { encoding: 'utf-8' })
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

export function run(mergeBase) {
	if (!/^[0-9a-f]{40}$/.test(mergeBase ?? '')) {
		throw new Error(`MERGE_BASE must be a full commit SHA, got "${mergeBase}"`);
	}

	// --no-renames splits a rename into delete + add, so a re-timestamped file
	// is checked like a new one.
	const addedFiles = gitLines([
		'diff',
		'--name-only',
		'--no-renames',
		'--diff-filter=A',
		mergeBase,
		'HEAD',
		'--',
		MIGRATIONS_DIR,
	]);
	if (addedFiles.length === 0) {
		console.log('No migration files added.');
		return [];
	}

	const baseFiles = gitLines(['ls-tree', '-r', '--name-only', mergeBase, MIGRATIONS_DIR]);
	const violations = findOutOfOrderMigrations(baseFiles, addedFiles);

	for (const { path, timestamp, newestBase } of violations) {
		console.error(
			`${path}: timestamp ${timestamp} is not newer than ${newestBase.timestamp} ` +
				`(${newestBase.path}), the newest migration on the base branch.`,
		);
	}
	if (violations.length > 0) {
		console.error(
			'\nRe-timestamp the new migration: rename the file and its migration class ' +
				'so the timestamp is newer than every migration on the base branch.',
		);
	} else {
		console.log(`All ${addedFiles.length} added migration file(s) are newer than the base branch.`);
	}
	return violations;
}

// Skipped when imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const violations = run(process.env.MERGE_BASE || process.argv[2]);
	process.exitCode = violations.length > 0 ? 1 : 0;
}
