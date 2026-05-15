#!/usr/bin/env node
// @ts-check
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(PKG_ROOT, 'src', 'migrations');
const FOLDERS = ['common', 'postgresdb', 'sqlite'];
const TIMESTAMP_PATTERN = /^(\d{10,16})-([A-Za-z][A-Za-z0-9]*)\.ts$/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

function parseArgs(argv) {
	const args = { name: null, folder: 'common' };
	for (const arg of argv) {
		if (arg.startsWith('--folder=')) args.folder = arg.slice('--folder='.length);
		else if (!arg.startsWith('--') && !args.name) args.name = arg;
	}
	return args;
}

function fail(msg) {
	console.error(`error: ${msg}`);
	process.exit(1);
}

function listExistingTimestamps() {
	const timestamps = [];
	for (const folder of FOLDERS) {
		const dir = join(MIGRATIONS_DIR, folder);
		if (!existsSync(dir)) continue;
		for (const entry of readdirSync(dir)) {
			const match = TIMESTAMP_PATTERN.exec(entry);
			if (match) timestamps.push(Number(match[1]));
		}
	}
	return timestamps;
}

function pickTimestamp(existing) {
	const max = existing.length === 0 ? 0 : Math.max(...existing);
	const now = Date.now();
	if (now > max) return { timestamp: now, source: 'Date.now()' };
	return {
		timestamp: max + 1,
		source: `max + 1 (existing head ${max} is in the future — see AGENTS.md)`,
	};
}

function migrationTemplate(className) {
	return `import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class ${className} implements ReversibleMigration {
	async up({ schemaBuilder: _schemaBuilder }: MigrationContext) {
		// TODO: implement up
	}

	async down({ schemaBuilder: _schemaBuilder }: MigrationContext) {
		// TODO: implement down
	}
}
`;
}

function indexFilesForFolder(folder) {
	if (folder === 'common') return ['postgresdb', 'sqlite'];
	if (folder === 'postgresdb') return ['postgresdb'];
	if (folder === 'sqlite') return ['sqlite'];
	return [];
}

function insertIntoIndex(indexPath, className, importPath) {
	const original = readFileSync(indexPath, 'utf8');

	if (original.includes(`{ ${className} }`)) {
		fail(`${relative(PKG_ROOT, indexPath)} already references ${className}`);
	}

	const importLine = `import { ${className} } from '${importPath}';`;
	const lines = original.split('\n');

	let lastImportIdx = -1;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith('import ')) lastImportIdx = i;
	}
	if (lastImportIdx === -1) fail(`could not find import block in ${indexPath}`);
	lines.splice(lastImportIdx + 1, 0, importLine);

	let arrayCloseIdx = -1;
	for (let i = lines.length - 1; i >= 0; i--) {
		if (lines[i].trim() === '];') {
			arrayCloseIdx = i;
			break;
		}
	}
	if (arrayCloseIdx === -1) fail(`could not find array close in ${indexPath}`);
	lines.splice(arrayCloseIdx, 0, `\t${className},`);

	writeFileSync(indexPath, lines.join('\n'));
}

function main() {
	const args = parseArgs(process.argv.slice(2));

	if (!args.name) {
		console.error(
			'usage: pnpm --filter=@n8n/db migration:new <Name> [--folder=common|postgresdb|sqlite]',
		);
		process.exit(1);
	}
	if (!PASCAL_CASE.test(args.name)) {
		fail(`name must be PascalCase (got "${args.name}")`);
	}
	if (!FOLDERS.includes(args.folder)) {
		fail(`--folder must be one of ${FOLDERS.join(', ')} (got "${args.folder}")`);
	}

	const existing = listExistingTimestamps();
	const { timestamp, source } = pickTimestamp(existing);
	const className = `${args.name}${timestamp}`;
	const fileBase = `${timestamp}-${args.name}`;
	const targetDir = join(MIGRATIONS_DIR, args.folder);
	const targetFile = join(targetDir, `${fileBase}.ts`);

	if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
	if (existsSync(targetFile)) fail(`${relative(PKG_ROOT, targetFile)} already exists`);

	writeFileSync(targetFile, migrationTemplate(className));

	const importPath = args.folder === 'common' ? `../common/${fileBase}` : `./${fileBase}`;
	for (const indexFolder of indexFilesForFolder(args.folder)) {
		insertIntoIndex(join(MIGRATIONS_DIR, indexFolder, 'index.ts'), className, importPath);
	}

	console.log(`created ${relative(PKG_ROOT, targetFile)}`);
	console.log(`timestamp ${timestamp} (${source})`);
	console.log(
		`registered ${className} in ${indexFilesForFolder(args.folder)
			.map((f) => `${f}/index.ts`)
			.join(', ')}`,
	);
}

main();
