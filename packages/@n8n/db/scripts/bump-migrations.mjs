#!/usr/bin/env node
// @ts-check
// Moves the migrations that the current branch adds to after the newest migration on `--base` (default `origin/master`).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { pickTimestamp } from './migration-timestamps.mjs';

const MIGRATION_FOLDERS = ['common', 'sqlite', 'postgresdb'].map(
	(folder) => `packages/@n8n/db/src/migrations/${folder}`,
);
const MIGRATION_FILE = /^(?<timestamp>\d{10,16})-(?<name>[A-Za-z][A-Za-z0-9]*)\.ts$/;
const EXPORTED_CLASS = /^export class (?<base>[A-Za-z0-9]*?)(?<timestamp>\d{10,16})\b/m;

/**
 * @param {string} cwd
 * @param {string[]} args
 * @returns {string[]}
 */
function gitLines(cwd, args) {
	const output = execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
	return output === '' ? [] : output.split('\n');
}

/**
 * @param {string} path
 * @returns {{ path: string, timestamp: number, name: string, fileBase: string } | null}
 */
function parseMigration(path) {
	const groups = MIGRATION_FILE.exec(basename(path))?.groups;
	if (!groups) return null;
	return {
		path,
		timestamp: Number(groups.timestamp),
		name: groups.name,
		fileBase: `${groups.timestamp}-${groups.name}`,
	};
}

/**
 * The exported class name of a migration, which can differ from its file name, split into its base and timestamp.
 *
 * @param {string} root
 * @param {{ path: string, timestamp: number, name: string }} migration
 * @returns {{ base: string, timestamp: string }}
 */
function classOf(root, { path, timestamp, name }) {
	const groups = EXPORTED_CLASS.exec(readFileSync(join(root, path), 'utf8'))?.groups;
	return groups
		? { base: groups.base, timestamp: groups.timestamp }
		: { base: name, timestamp: String(timestamp) };
}

/**
 * @param {string[]} paths
 */
function migrationsIn(paths) {
	return paths.map(parseMigration).filter((migration) => migration !== null);
}

/**
 * Renames and rewrites every changed file that refers to the moved migration.
 *
 * @param {string} root
 * @param {string[]} originalPaths The changed paths before any move; renames match on these.
 * @param {string[]} changedPaths Updated in place when a file is renamed.
 * @param {{ name: string, from: number, to: number }} move
 * @param {{ base: string, timestamp: string }} migrationClass
 */
function applyMove(root, originalPaths, changedPaths, { name, from, to }, migrationClass) {
	const replacements = [
		[`${migrationClass.base}${migrationClass.timestamp}`, `${migrationClass.base}${to}`],
		[`${from}-${name}`, `${to}-${name}`],
	];
	changedPaths.forEach((path, index) => {
		const absolutePath = join(root, path);
		if (!existsSync(absolutePath)) return;

		const content = readFileSync(absolutePath, 'utf8');
		const rewritten = replacements.reduce(
			(text, [old, next]) => text.replaceAll(old, next),
			content,
		);
		if (rewritten !== content) writeFileSync(absolutePath, rewritten);

		const originalName = basename(originalPaths[index]);
		if (!originalName.startsWith(`${from}-`)) return;
		const movedPath = join(dirname(path), `${to}-${originalName.slice(`${from}-`.length)}`);
		renameSync(absolutePath, join(root, movedPath));
		changedPaths[index] = movedPath;
	});
}

/**
 * @param {{ cwd: string, base: string, now?: number }} options
 * @returns {Array<{ name: string, from: number, to: number }>}
 */
export function bumpMigrations({ cwd, base, now = Date.now() }) {
	const [root] = gitLines(cwd, ['rev-parse', '--show-toplevel']);
	const baseMigrations = migrationsIn(
		gitLines(root, ['ls-tree', '-r', '--name-only', base, '--', ...MIGRATION_FOLDERS]),
	);
	const baseFileBases = new Set(baseMigrations.map(({ fileBase }) => fileBase));
	const addedSlots = new Map(
		migrationsIn(
			gitLines(root, [
				'diff',
				'--name-only',
				'--diff-filter=A',
				'--merge-base',
				base,
				'HEAD',
				'--',
				...MIGRATION_FOLDERS,
			]),
		)
			.filter(({ fileBase }) => !baseFileBases.has(fileBase))
			.map((migration) => [migration.fileBase, migration]),
	);
	const slots = [...addedSlots.values()].sort(
		(a, b) => a.timestamp - b.timestamp || a.name.localeCompare(b.name),
	);
	const baseTimestamps = baseMigrations.map(({ timestamp }) => timestamp);
	const baseHead = Math.max(0, ...baseTimestamps);
	if (slots.every(({ timestamp }) => timestamp > baseHead)) return [];

	const { timestamp: first } = pickTimestamp(baseTimestamps, now);
	const moves = slots.map(({ name, timestamp }, index) => ({
		name,
		from: timestamp,
		to: first + index,
	}));
	const classes = slots.map((slot) => classOf(root, slot));
	const originalPaths = gitLines(root, ['diff', '--name-only', '--merge-base', base, 'HEAD']);
	const changedPaths = [...originalPaths];
	moves.forEach((move, index) =>
		applyMove(root, originalPaths, changedPaths, move, classes[index]),
	);
	return moves;
}

function main() {
	const baseArg = process.argv.slice(2).find((arg) => arg.startsWith('--base='));
	const moves = bumpMigrations({
		cwd: process.cwd(),
		base: baseArg?.slice('--base='.length) ?? 'origin/master',
	});
	if (moves.length === 0) console.log('Nothing to move');
	for (const { name, from, to } of moves) console.log(`${name}: ${from} -> ${to}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
