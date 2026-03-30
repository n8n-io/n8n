import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type {
	InstanceAiFilesystemService,
	FileEntry,
	FileContent,
	FileSearchResult,
	FileSearchMatch,
} from '@n8n/instance-ai';

const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_LINES = 200;
const DEFAULT_MAX_RESULTS = 100;
const DEFAULT_SEARCH_MAX_RESULTS = 50;
const MAX_FILE_SIZE_BYTES = 512 * 1024; // 512 KB
const BINARY_CHECK_BYTES = 8192;
const MAX_ENTRY_COUNT = 200;

const EXCLUDED_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'.next',
	'__pycache__',
	'.cache',
	'.turbo',
	'coverage',
	'.venv',
	'venv',
	'.idea',
	'.vscode',
]);

/**
 * Server-side filesystem provider that reads files directly from disk
 * using Node.js `fs/promises`. Replaces the browser-mediated bridge
 * when local filesystem access is auto-detected as available.
 *
 * Security model:
 * - No basePath (default): agent reads any path the n8n process can access
 * - With basePath: path.resolve() + fs.realpath() containment check prevents
 *   traversal and symlink escape
 */
export class LocalFilesystemProvider implements InstanceAiFilesystemService {
	private readonly basePath: string | undefined;

	constructor(basePath?: string) {
		this.basePath = basePath && basePath.trim() !== '' ? basePath : undefined;
	}

	async getFileTree(
		dirPath: string,
		opts?: { maxDepth?: number; exclude?: string[] },
	): Promise<string> {
		const resolvedDir = await this.resolve(dirPath);
		const maxDepth = opts?.maxDepth ?? DEFAULT_MAX_DEPTH;
		const exclude = new Set([...EXCLUDED_DIRS, ...(opts?.exclude ?? [])]);
		const lines: string[] = [];
		let entryCount = 0;

		const walk = async (dir: string, prefix: string, depth: number): Promise<void> => {
			if (depth > maxDepth || entryCount >= MAX_ENTRY_COUNT) return;

			let entries: Dirent[];
			try {
				entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
			} catch {
				return;
			}

			entries.sort((a, b) => {
				// Directories first, then alphabetical
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			});

			for (const entry of entries) {
				if (entryCount >= MAX_ENTRY_COUNT) break;

				if (exclude.has(entry.name)) continue;

				entryCount++;
				if (entry.isDirectory()) {
					lines.push(`${prefix}${entry.name}/`);
					await walk(path.join(dir, entry.name), `${prefix}  `, depth + 1);
				} else {
					lines.push(`${prefix}${entry.name}`);
				}
			}
		};

		const dirName = path.basename(resolvedDir) || resolvedDir;
		lines.push(`${dirName}/`);
		await walk(resolvedDir, '  ', 1);

		if (entryCount >= MAX_ENTRY_COUNT) {
			lines.push(`  ... (truncated at ${MAX_ENTRY_COUNT} entries)`);
		}

		return lines.join('\n');
	}

	async listFiles(
		dirPath: string,
		opts?: {
			pattern?: string;
			maxResults?: number;
			type?: 'file' | 'directory' | 'all';
			recursive?: boolean;
		},
	): Promise<FileEntry[]> {
		const resolvedDir = await this.resolve(dirPath);
		const maxResults = opts?.maxResults ?? DEFAULT_MAX_RESULTS;
		const regex = opts?.pattern ? globToRegex(opts.pattern) : undefined;
		const typeFilter = opts?.type ?? 'all';
		const recursive = opts?.recursive ?? true;
		const results: FileEntry[] = [];

		const walk = async (dir: string): Promise<void> => {
			if (results.length >= maxResults) return;

			let entries: Dirent[];
			try {
				entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
			} catch {
				return;
			}

			for (const entry of entries) {
				if (results.length >= maxResults) break;

				if (EXCLUDED_DIRS.has(entry.name)) continue;

				const fullPath = path.join(dir, entry.name);
				const relativePath = path.relative(resolvedDir, fullPath);

				if (entry.isDirectory()) {
					if (typeFilter !== 'file') {
						if (!regex || regex.test(relativePath)) {
							results.push({ path: relativePath, type: 'directory' });
						}
					}
					if (recursive) {
						await walk(fullPath);
					}
				} else {
					if (typeFilter !== 'directory') {
						if (regex && !regex.test(relativePath)) continue;

						let sizeBytes: number | undefined;
						try {
							const stat = await fs.stat(fullPath);
							sizeBytes = stat.size;
						} catch {
							// skip inaccessible files
						}

						results.push({ path: relativePath, type: 'file', sizeBytes });
					}
				}
			}
		};

		await walk(resolvedDir);
		return results;
	}

	async readFile(
		filePath: string,
		opts?: { maxLines?: number; startLine?: number },
	): Promise<FileContent> {
		const resolvedPath = await this.resolve(filePath);

		const stat = await fs.stat(resolvedPath);
		if (stat.size > MAX_FILE_SIZE_BYTES) {
			return {
				path: filePath,
				content: `[File too large: ${Math.round(stat.size / 1024)}KB exceeds ${MAX_FILE_SIZE_BYTES / 1024}KB limit]`,
				truncated: true,
				totalLines: 0,
			};
		}

		// Binary detection: check first 8KB for null bytes
		const checkBuffer = Buffer.alloc(Math.min(BINARY_CHECK_BYTES, stat.size));
		const fh = await fs.open(resolvedPath, 'r');
		try {
			await fh.read(checkBuffer, 0, checkBuffer.length, 0);
		} finally {
			await fh.close();
		}

		if (checkBuffer.includes(0)) {
			return {
				path: filePath,
				content: '[Binary file — cannot display]',
				truncated: false,
				totalLines: 0,
			};
		}

		const raw = await fs.readFile(resolvedPath, 'utf-8');
		const allLines = raw.split('\n');
		const totalLines = allLines.length;

		const startLine = opts?.startLine ?? 1;
		const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES;
		const startIdx = Math.max(0, startLine - 1);
		const sliced = allLines.slice(startIdx, startIdx + maxLines);
		const truncated = startIdx + maxLines < totalLines;

		return {
			path: filePath,
			content: sliced.join('\n'),
			truncated,
			totalLines,
		};
	}

	async searchFiles(
		dirPath: string,
		opts: {
			query: string;
			filePattern?: string;
			ignoreCase?: boolean;
			maxResults?: number;
		},
	): Promise<FileSearchResult> {
		const resolvedDir = await this.resolve(dirPath);
		const maxResults = opts.maxResults ?? DEFAULT_SEARCH_MAX_RESULTS;
		const flags = opts.ignoreCase ? 'i' : '';

		let regex: RegExp;
		try {
			regex = new RegExp(opts.query, flags);
		} catch {
			// Treat as literal if invalid regex
			regex = new RegExp(escapeRegex(opts.query), flags);
		}

		const filePatternRegex = opts.filePattern ? globToRegex(opts.filePattern) : undefined;
		const matches: FileSearchMatch[] = [];
		let totalMatches = 0;

		const walk = async (dir: string): Promise<void> => {
			if (matches.length >= maxResults) return;

			let entries: Dirent[];
			try {
				entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf-8' });
			} catch {
				return;
			}

			for (const entry of entries) {
				if (matches.length >= maxResults) break;

				if (EXCLUDED_DIRS.has(entry.name)) continue;

				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					await walk(fullPath);
					continue;
				}

				const relativePath = path.relative(resolvedDir, fullPath);
				if (filePatternRegex && !filePatternRegex.test(relativePath)) continue;

				let content: string;
				try {
					const stat = await fs.stat(fullPath);
					if (stat.size > MAX_FILE_SIZE_BYTES) continue;
					content = await fs.readFile(fullPath, 'utf-8');
				} catch {
					continue;
				}

				// Skip binary files
				if (content.includes('\0')) continue;

				const lines = content.split('\n');
				for (let i = 0; i < lines.length; i++) {
					if (regex.test(lines[i])) {
						totalMatches++;
						if (matches.length < maxResults) {
							matches.push({
								path: relativePath,
								lineNumber: i + 1,
								line: lines[i].substring(0, 500),
							});
						}
					}
				}
			}
		};

		await walk(resolvedDir);

		return {
			query: opts.query,
			matches,
			truncated: totalMatches > maxResults,
			totalMatches,
		};
	}

	// ── Path resolution & containment ────────────────────────────────────

	private async resolve(inputPath: string): Promise<string> {
		const expanded = expandTilde(inputPath);

		if (!this.basePath) {
			return path.resolve(expanded);
		}

		const resolved = path.resolve(this.basePath, expanded);

		// Use realpath to resolve symlinks, then check containment
		let real: string;
		try {
			real = await fs.realpath(resolved);
		} catch {
			// Path doesn't exist yet — verify the resolved path is still under basePath
			if (!resolved.startsWith(this.basePath + path.sep) && resolved !== this.basePath) {
				throw new Error(`Path "${inputPath}" is outside the allowed directory`);
			}
			return resolved;
		}

		const realBase = await fs.realpath(this.basePath);
		if (!real.startsWith(realBase + path.sep) && real !== realBase) {
			throw new Error(`Path "${inputPath}" is outside the allowed directory`);
		}

		return real;
	}
}

/** Convert a simple glob pattern to a regex (supports * and **). */
function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/\{\{GLOBSTAR\}\}/g, '.*');
	return new RegExp(`^${escaped}$`);
}

/** Escape special regex characters in a string. */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Expand leading `~` or `~/` to the current user's home directory. */
function expandTilde(p: string): string {
	if (p === '~') return os.homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) {
		return path.join(os.homedir(), p.slice(2));
	}
	return p;
}
