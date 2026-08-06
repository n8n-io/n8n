import { readdirSync, readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';

/**
 * Guards the hand-maintained migration index files. Migrations created in
 * parallel PRs can merge cleanly while sharing a timestamp, or lose their
 * index registration in a conflict resolution — neither is caught by
 * typecheck, so we assert the registry invariants here.
 *
 * Use `pnpm --filter=@n8n/db migration:new <Name>` to create migrations;
 * it picks a fresh timestamp and wires up the index files.
 */

const MIGRATION_FOLDERS = ['common', 'sqlite', 'postgresdb'];
const INDEX_FOLDERS = ['sqlite', 'postgresdb'];

// Historical pairs that already shipped sharing a timestamp. Never extend this list.
const LEGACY_DUPLICATE_TIMESTAMPS = new Set(['1750252139166', '1770000000000']);

const IMPORT_PATTERN = /^import \{ (?<className>\w+) \} from '(?<specifier>\.[^']+)';$/gm;
const ARRAY_ENTRY_PATTERN = /^\t(?<className>\w+),$/gm;
const TIMESTAMP_PATTERN = /(?<timestamp>\d{10,16})-[^/]+$/;

function parseIndexFile(folder: string) {
	const source = readFileSync(join(__dirname, folder, 'index.ts'), 'utf8');
	const imports = [...source.matchAll(IMPORT_PATTERN)].map((match) => {
		const { className, specifier } = match.groups!;
		const timestamp = TIMESTAMP_PATTERN.exec(specifier)?.groups?.timestamp;
		if (!timestamp) {
			throw new Error(
				`No timestamp found in import specifier '${specifier}' in ${folder}/index.ts`,
			);
		}
		return {
			className,
			timestamp,
			filePath: normalize(join(__dirname, folder, `${specifier}.ts`)),
		};
	});
	if (imports.length === 0) {
		throw new Error(`No migration imports matched in ${folder}/index.ts — did its format change?`);
	}
	const arraySection = source.slice(source.indexOf('= ['));
	const arrayEntries = [...arraySection.matchAll(ARRAY_ENTRY_PATTERN)].map(
		(match) => match.groups!.className,
	);
	if (arrayEntries.length === 0) {
		throw new Error(
			`No migrations array entries matched in ${folder}/index.ts — did its format change?`,
		);
	}
	return { imports, arrayEntries };
}

const parsedIndexes = new Map(INDEX_FOLDERS.map((folder) => [folder, parseIndexFile(folder)]));

describe.each(INDEX_FOLDERS)('%s migrations index', (folder) => {
	const { imports, arrayEntries } = parsedIndexes.get(folder)!;

	test('every imported migration is in the migrations array exactly once, and vice versa', () => {
		const importedNames = imports.map(({ className }) => className);
		expect([...arrayEntries].sort()).toEqual([...importedNames].sort());
		expect(new Set(arrayEntries).size).toBe(arrayEntries.length);
	});

	test('every registered migration has a unique timestamp', () => {
		const byTimestamp = new Map<string, string[]>();
		for (const { className, timestamp } of imports) {
			byTimestamp.set(timestamp, [...(byTimestamp.get(timestamp) ?? []), className]);
		}
		const duplicates = [...byTimestamp.entries()].filter(
			([timestamp, classNames]) =>
				classNames.length > 1 && !LEGACY_DUPLICATE_TIMESTAMPS.has(timestamp),
		);
		expect(duplicates).toEqual([]);
	});
});

test('every migration file is registered in at least one index', () => {
	const registeredFiles = new Set(
		[...parsedIndexes.values()].flatMap(({ imports }) => imports.map(({ filePath }) => filePath)),
	);
	const orphans = MIGRATION_FOLDERS.flatMap((folder) =>
		readdirSync(join(__dirname, folder))
			.filter((fileName) => /^\d+-.+\.ts$/.test(fileName))
			.map((fileName) => join(folder, fileName))
			.filter((relativePath) => !registeredFiles.has(normalize(join(__dirname, relativePath)))),
	);
	expect(orphans).toEqual([]);
});
