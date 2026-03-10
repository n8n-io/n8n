import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const MAX_ENTRIES = 10_000;
const DEFAULT_MAX_DEPTH = 8;

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

const EXCLUDED_DIRS = new Set([
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
