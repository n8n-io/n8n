import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { EXCLUDED_DIRS, buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	dirPath: z.string().describe('Directory to search in'),
	query: z.string().describe('Text pattern to search for (literal match, not regex)'),
	filePattern: z.string().optional().describe('Glob pattern to filter files (e.g. "**/*.ts")'),
	ignoreCase: z.boolean().optional().describe('Case-insensitive search (default: false)'),
	maxResults: z.number().int().optional().describe('Maximum number of results (default: 50)'),
});

export const searchFilesTool: ToolDefinition<typeof inputSchema> = {
	name: 'search_files',
	description: 'Search for text patterns across files using a literal text query',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources({ dirPath }, { dir }) {
		return [
			await buildFilesystemResource(dir, dirPath, 'filesystemRead', `Search files in: ${dirPath}`),
		];
	},
	async execute({ dirPath, query, filePattern, ignoreCase, maxResults }, { dir }) {
		const resolvedDir = await resolveSafePath(dir, dirPath);
		const limit = maxResults ?? 50;
		const flags = ignoreCase ? 'gi' : 'g';
		const regex = new RegExp(escapeRegex(query), flags);

		const matches: Array<{ path: string; lineNumber: number; line: string }> = [];
		let totalMatches = 0;

		const filePaths = await collectFiles(resolvedDir, dir, filePattern);

		for (const fp of filePaths) {
			if (matches.length >= limit) break;

			try {
				const fullPath = path.join(dir, fp);
				const stat = await fs.stat(fullPath);
				if (stat.size > MAX_FILE_SIZE) continue;

				const content = await fs.readFile(fullPath, 'utf-8');
				const lines = content.split('\n');

				for (let i = 0; i < lines.length; i++) {
					if (regex.test(lines[i])) {
						totalMatches++;
						if (matches.length < limit) {
							matches.push({ path: fp, lineNumber: i + 1, line: lines[i].substring(0, 200) });
						}
					}
					regex.lastIndex = 0;
				}
			} catch {
				// Skip unreadable files
			}
		}

		return formatCallToolResult({ query, matches, truncated: totalMatches > limit, totalMatches });
	},
};

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
		.replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')
		.replace(/\*\*/g, '{{GLOBSTAR}}')
		.replace(/\*/g, '[^/]*')
		.replace(/\{\{GLOBSTAR_SLASH\}\}/g, '(.*/)?')
		.replace(/\{\{GLOBSTAR\}\}/g, '.*');
	return new RegExp(`^${escaped}$`);
}
