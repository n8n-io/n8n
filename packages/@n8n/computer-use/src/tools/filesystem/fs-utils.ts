import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { isProtectedSettingsPath } from '../../config';
import type { AffectedResource } from '../types';

const MAX_ENTRIES = 10_000;
const DEFAULT_MAX_DEPTH = 8;

export const EXCLUDED_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'coverage',
	'__pycache__',
	'.venv',
	'venv',
	'.vscode',
	'.idea',
	'.next',
	'.nuxt',
	'.cache',
	'.turbo',
	'.output',
	'.svelte-kit',
]);

export interface TreeEntry {
	path: string;
	type: 'file' | 'directory';
	sizeBytes?: number;
}

export interface ScanResult {
	rootPath: string;
	tree: TreeEntry[];
	truncated: boolean;
}

/**
 * Scan a directory using breadth-first traversal with a depth limit.
 * Breadth-first ensures broad coverage of top-level structure before
 * descending into deeply nested paths.
 */
export async function scanDirectory(
	dirPath: string,
	maxDepth: number = DEFAULT_MAX_DEPTH,
): Promise<ScanResult> {
	const rootName = path.resolve(dirPath);
	const entries: TreeEntry[] = [];
	let truncated = false;

	// BFS queue: [absolutePath, relativePath, depth]
	const queue: Array<[string, string, number]> = [[dirPath, '', 0]];

	while (queue.length > 0) {
		if (entries.length >= MAX_ENTRIES) {
			truncated = true;
			break;
		}

		const [fullPath, relativePath, depth] = queue.shift()!;

		let dirEntries;
		try {
			dirEntries = await fs.readdir(fullPath, { withFileTypes: true });
		} catch {
			continue;
		}

		// Sort: directories first, then files, both alphabetical
		const sorted = dirEntries.sort((a, b) => {
			if (a.isDirectory() && !b.isDirectory()) return -1;
			if (!a.isDirectory() && b.isDirectory()) return 1;
			return a.name.localeCompare(b.name);
		});

		for (const entry of sorted) {
			if (entries.length >= MAX_ENTRIES) {
				truncated = true;
				break;
			}

			if (EXCLUDED_DIRS.has(entry.name) && entry.isDirectory()) continue;
			if (entry.name.startsWith('.') && !isAllowedDotFile(entry.name)) continue;

			const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

			if (entry.isDirectory()) {
				entries.push({ path: entryRelPath, type: 'directory' });
				if (depth < maxDepth) {
					queue.push([path.join(fullPath, entry.name), entryRelPath, depth + 1]);
				} else {
					truncated = true;
				}
			} else if (entry.isFile()) {
				try {
					const fullEntryPath = path.join(fullPath, entry.name);
					const stat = await fs.stat(fullEntryPath);
					entries.push({ path: entryRelPath, type: 'file', sizeBytes: stat.size });
				} catch {
					entries.push({ path: entryRelPath, type: 'file' });
				}
			}
		}
	}

	return { rootPath: rootName, tree: entries, truncated };
}

function isAllowedDotFile(name: string): boolean {
	const allowed = new Set([
		'.env',
		'.env.example',
		'.eslintrc',
		'.eslintrc.js',
		'.eslintrc.json',
		'.prettierrc',
		'.prettierrc.js',
		'.prettierrc.json',
		'.editorconfig',
		'.gitignore',
		'.dockerignore',
		'.nvmrc',
		'.node-version',
		'.npmrc',
		'.babelrc',
		'.browserslistrc',
	]);
	return allowed.has(name);
}

/**
 * Resolve a path safely within the base directory.
 *
 * Walks each component of the path individually using `fs.realpath` so that
 * symlinks are resolved at every level during the *security check*. This
 * prevents a symlink inside the root from redirecting reads or writes to a
 * location outside the root.
 *
 * For path components that do not yet exist (e.g. the target of a write
 * operation), the remaining components are appended as plain strings once the
 * deepest existing ancestor has been resolved.
 *
 * Dangling symlinks (a symlink whose target does not exist) are followed
 * manually via `fs.lstat` + `fs.readlink` so that they are subject to the
 * same bounds check as regular symlinks.
 *
 * Returns the logical absolute path (without resolving symlinks), so the
 * caller never needs to know that a symlink is involved.
 */
export async function resolveSafePath(basePath: string, relativePath: string): Promise<string> {
	const realBase = await fs.realpath(basePath);
	const absolute = path.resolve(basePath, relativePath);

	// Walk from the filesystem root, resolving each component in turn.
	const root = path.parse(absolute).root;
	const parts = path.relative(root, absolute).split(path.sep).filter(Boolean);

	let current = root;

	for (let i = 0; i < parts.length; i++) {
		const next = path.join(current, parts[i]);

		try {
			// Happy path: follows all existing symlinks and returns the real path.
			current = await fs.realpath(next);
		} catch (realpathError) {
			if ((realpathError as NodeJS.ErrnoException).code !== 'ENOENT') throw realpathError;

			// ENOENT can mean the path is absent OR it is a dangling symlink whose
			// target does not exist. Check with lstat (which does not follow symlinks).
			try {
				const lstat = await fs.lstat(next);
				if (lstat.isSymbolicLink()) {
					// Dangling symlink — follow it manually and continue the walk.
					const target = await fs.readlink(next);
					current = path.resolve(current, target);
					continue;
				}
			} catch {
				// lstat also failed — the path truly does not exist.
			}

			// Path does not exist and is not a symlink; append remaining parts as-is.
			current = path.join(current, ...parts.slice(i));
			break;
		}
	}

	if (!current.startsWith(realBase + path.sep) && current !== realBase) {
		throw new Error(`Path "${relativePath}" escapes the base directory`);
	}

	// Check if the resolved real path targets a protected path (e.g. settings directory).
	// This catches symlink-based bypasses since `current` has all symlinks resolved.
	if (isProtectedSettingsPath(current)) {
		throw new Error(`Access denied: cannot access "${relativePath}"`);
	}

	return absolute;
}

/**
 * Resolve a path safely within the base directory and return an AffectedResource.
 * Throws if the path escapes the base directory — propagates as a tool failure
 * before any permission prompt is shown.
 */
export async function buildFilesystemResource(
	dir: string,
	inputPath: string,
	toolGroup: 'filesystemRead' | 'filesystemWrite',
	description: string,
): Promise<AffectedResource> {
	const absolutePath = await resolveSafePath(dir, inputPath);

	return { toolGroup, resource: absolutePath, description };
}
