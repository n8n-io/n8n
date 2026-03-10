import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { scanDirectory } from './tree-scanner';

const MAX_FILE_SIZE = 512 * 1024; // 512 KB
const DEFAULT_MAX_LINES = 200;
const BINARY_CHECK_SIZE = 8192;

export interface FileContent {
	path: string;
	content: string;
	truncated: boolean;
	totalLines: number;
}

export interface FileSearchMatch {
	path: string;
	lineNumber: number;
	line: string;
}

export interface FileSearchResult {
	query: string;
	matches: FileSearchMatch[];
	truncated: boolean;
	totalMatches: number;
}

/** Read a file from the local filesystem, with size and line limits. */
export async function readFile(
	basePath: string,
	filePath: string,
	opts?: { maxLines?: number; startLine?: number },
): Promise<FileContent> {
	const resolvedPath = resolveSafePath(basePath, filePath);

	const stat = await fs.stat(resolvedPath);
	if (stat.size > MAX_FILE_SIZE) {
		throw new Error(
			`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE} bytes). Use searchFiles for specific content.`,
		);
	}

	const buffer = await fs.readFile(resolvedPath);

	// Binary detection: check first 8KB for null bytes
	const checkSlice = buffer.subarray(0, Math.min(BINARY_CHECK_SIZE, buffer.length));
	if (checkSlice.includes(0)) {
		throw new Error('Binary file detected — cannot read binary files');
	}

	const fullContent = buffer.toString('utf-8');
	const allLines = fullContent.split('\n');
	const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES;
	const startLine = opts?.startLine ?? 1;
	const startIndex = Math.max(0, startLine - 1);
	const slicedLines = allLines.slice(startIndex, startIndex + maxLines);
	const truncated = allLines.length > startIndex + maxLines;

	return {
		path: filePath,
		content: slicedLines.join('\n'),
		truncated,
		totalLines: allLines.length,
	};
}

/** Search files for a text pattern. */
export async function searchFiles(
	basePath: string,
	dirPath: string,
	opts: {
		query: string;
		filePattern?: string;
		ignoreCase?: boolean;
		maxResults?: number;
	},
): Promise<FileSearchResult> {
	const resolvedDir = resolveSafePath(basePath, dirPath);
	const maxResults = opts.maxResults ?? 50;
	const flags = opts.ignoreCase ? 'gi' : 'g';
	const regex = new RegExp(escapeRegex(opts.query), flags);

	const matches: FileSearchMatch[] = [];
	let totalMatches = 0;

	const filePaths = await collectFiles(resolvedDir, basePath, opts.filePattern);

	for (const fp of filePaths) {
		if (matches.length >= maxResults) break;

		try {
			const fullPath = path.join(basePath, fp);
			const stat = await fs.stat(fullPath);
			if (stat.size > MAX_FILE_SIZE) continue;

			const content = await fs.readFile(fullPath, 'utf-8');
			const lines = content.split('\n');

			for (let i = 0; i < lines.length; i++) {
				if (regex.test(lines[i])) {
					totalMatches++;
					if (matches.length < maxResults) {
						matches.push({
							path: fp,
							lineNumber: i + 1,
							line: lines[i].substring(0, 200),
						});
					}
				}
				regex.lastIndex = 0;
			}
		} catch {
			// Skip unreadable files
		}
	}

	return {
		query: opts.query,
		matches,
		truncated: totalMatches > maxResults,
		totalMatches,
	};
}

/** Resolve a file path safely within the base directory. */
function resolveSafePath(basePath: string, relativePath: string): string {
	const resolved = path.resolve(basePath, relativePath);
	if (!resolved.startsWith(basePath + path.sep) && resolved !== basePath) {
		throw new Error(`Path "${relativePath}" escapes the base directory`);
	}
	return resolved;
}

/** Recursively collect file paths under a directory. */
async function collectFiles(
	dir: string,
	basePath: string,
	pattern?: string,
	collected: string[] = [],
	depth = 0,
): Promise<string[]> {
	if (depth > 10 || collected.length > 5000) return collected;

	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (EXCLUDED_DIRS.has(entry.name) && entry.isDirectory()) continue;

		const fullPath = path.join(dir, entry.name);
		const relativePath = path.relative(basePath, fullPath);

		if (entry.isDirectory()) {
			await collectFiles(fullPath, basePath, pattern, collected, depth + 1);
		} else if (entry.isFile()) {
			if (pattern) {
				const regex = globToRegex(pattern);
				if (!regex.test(entry.name) && !regex.test(relativePath)) continue;
			}
			collected.push(relativePath);
		}
	}

	return collected;
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegex(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/\{\{GLOBSTAR\}\}/g, '.*');
	return new RegExp(`^${escaped}$`);
}

/** Get an indented directory tree as text. */
export async function getFileTree(
	basePath: string,
	dirPath: string,
	opts?: { maxDepth?: number },
): Promise<string> {
	const resolvedDir = resolveSafePath(basePath, dirPath || '.');
	const maxDepth = opts?.maxDepth ?? 2;
	const { rootPath, tree, truncated } = await scanDirectory(resolvedDir, maxDepth);

	const lines: string[] = [`${rootPath}/`];
	for (const entry of tree) {
		const depth = entry.path.split('/').length;
		const indent = '  '.repeat(depth);
		const name = entry.path.split('/').pop() ?? entry.path;
		lines.push(`${indent}${name}${entry.type === 'directory' ? '/' : ''}`);
	}

	const parts = [lines.join('\n')];
	if (truncated) {
		parts.push('(Tree truncated — increase maxDepth or explore subdirectories)');
	}
	return parts.join('\n\n');
}

/** List immediate children of a directory. */
export async function listFiles(
	basePath: string,
	dirPath: string,
	opts?: { type?: 'file' | 'directory' | 'all'; maxResults?: number },
): Promise<Array<{ path: string; type: 'file' | 'directory'; sizeBytes?: number }>> {
	const resolvedDir = resolveSafePath(basePath, dirPath || '.');
	// maxDepth=0 → immediate children only, no recursion
	const { tree } = await scanDirectory(resolvedDir, 0);

	const typeFilter = opts?.type ?? 'all';
	const filtered = typeFilter === 'all' ? tree : tree.filter((e) => e.type === typeFilter);
	const limit = opts?.maxResults ?? 200;

	// Make paths relative to basePath (consistent with the rest of the local-reader API)
	const relativeDir = path.relative(basePath, resolvedDir);
	return filtered.slice(0, limit).map((e) => ({
		path: relativeDir ? `${relativeDir}/${e.path}` : e.path,
		type: e.type,
		sizeBytes: e.sizeBytes,
	}));
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
