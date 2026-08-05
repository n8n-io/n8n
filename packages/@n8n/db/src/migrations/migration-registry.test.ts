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
		return {
			className,
			timestamp: TIMESTAMP_PATTERN.exec(specifier)?.groups?.timestamp,
			filePath: normalize(join(__dirname, folder, `${specifier}.ts`)),
		};
	});
	const arraySection = source.slice(source.indexOf('= ['));
	const arrayEntries = [...arraySection.matchAll(ARRAY_ENTRY_PATTERN)].map(
		(match) => match.groups!.className,
	);
	return { imports, arrayEntries };
}

describe.each(INDEX_FOLDERS)('%s migrations index', (folder) => {
	const { imports, arrayEntries } = parseIndexFile(folder);

	test('every imported migration is in the migrations array exactly once, and vice versa', () => {
		const importedNames = imports.map(({ className }) => className);
		expect(importedNames.length).toBeGreaterThan(0);
		expect([...arrayEntries].sort()).toEqual([...importedNames].sort());
		expect(new Set(arrayEntries).size).toBe(arrayEntries.length);
	});

	test('every registered migration has a unique timestamp', () => {
		const byTimestamp = new Map<string, string[]>();
		for (const { className, timestamp } of imports) {
			expect(timestamp).toBeDefined();
			byTimestamp.set(timestamp!, [...(byTimestamp.get(timestamp!) ?? []), className]);
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
		INDEX_FOLDERS.flatMap((folder) =>
			parseIndexFile(folder).imports.map(({ filePath }) => filePath),
		),
	);
	const orphans = MIGRATION_FOLDERS.flatMap((folder) =>
		readdirSync(join(__dirname, folder))
			.filter((fileName) => /^\d+-.+\.ts$/.test(fileName))
			.map((fileName) => join(folder, fileName))
			.filter((relativePath) => !registeredFiles.has(normalize(join(__dirname, relativePath)))),
	);
	expect(orphans).toEqual([]);
});
