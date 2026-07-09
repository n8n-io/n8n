import fastGlob from 'fast-glob';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import {
	EXCLUDED_DIRS,
	buildFilesystemResource,
	isLikelyBinaryContent,
	resolveReadablePath,
} from './fs-utils';

const inputSchema = z
	.object({
		name: z
			.string()
			.describe(
				'REQUIRED. Glob pattern for the file path(s) to find, relative to the base directory. ' +
					'Use `**/` to match at any depth. ' +
					'Examples: `**/joke.txt` finds joke.txt anywhere; ' +
					'`src/**/*.ts` finds every .ts file under src/; ' +
					'`README.md` matches only README.md at the root.',
			),
		query: z
			.string()
			.optional()
			.describe(
				'OPTIONAL. Literal text (not regex) to search for INSIDE the contents of the files matched by `name`. ' +
					'Omit this to only list the matching files without opening them.',
			),
		ignoreCase: z
			.boolean()
			.optional()
			.describe('Case-insensitive `query` search (default: false). Has no effect without `query`.'),
		maxResults: z.number().int().optional().describe('Maximum number of results (default: 50)'),
	})
	.describe(
		'Find files by name (glob pattern), and optionally grep inside their contents. ' +
			'Pass `name` alone to locate a file by its name. ' +
			'Pass `name` + `query` to also search for a literal text string inside the matching files.',
	);

const IGNORE_PATTERNS = [...EXCLUDED_DIRS].map((segment) => `**/${segment}/**`);

export const searchFilesTool: ToolDefinition<typeof inputSchema> = {
	name: 'search_files',
	description:
		'Find files by name (glob pattern), and optionally search a literal text string inside the matched files. ' +
		'To locate a file by name, pass only `name` (e.g. `{ name: "**/joke.txt" }`). ' +
		'To grep file contents, pass `name` + `query` (e.g. `{ name: "**/*.ts", query: "TODO" }`).',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources(_args, { dir }) {
		return [await buildFilesystemResource(dir, '.', 'filesystemRead', 'Search files')];
	},
	async execute({ name, query, ignoreCase, maxResults }, { dir }) {
		assertPatternStaysInside(name);

		const resolvedDir = await resolveReadablePath(dir, '.');
		const limit = maxResults ?? 50;

		const files = await fastGlob(name, {
			cwd: resolvedDir,
			ignore: IGNORE_PATTERNS,
			onlyFiles: true,
			followSymbolicLinks: false,
			suppressErrors: true,
		});

		if (!query) {
			const matches = files.slice(0, limit).map((p) => ({ path: p }));
			return formatCallToolResult({
				name,
				matches,
				truncated: files.length > limit,
				totalMatches: files.length,
			});
		}

		const regex = new RegExp(escapeRegex(query), ignoreCase ? 'gi' : 'g');
		const matches: Array<{ path: string; lineNumber: number; line: string }> = [];
		let totalMatches = 0;

		for (const fp of files) {
			if (matches.length >= limit) break;

			try {
				const fullPath = path.join(resolvedDir, fp);
				const stat = await fs.stat(fullPath);
				if (stat.size > MAX_FILE_SIZE) continue;

				const fileContent = await fs.readFile(fullPath);
				const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);
				if (isLikelyBinaryContent(buffer)) continue;

				const lines = buffer.toString('utf-8').split('\n');
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

		return formatCallToolResult({
			name,
			query,
			matches,
			truncated: totalMatches > limit,
			totalMatches,
		});
	},
};

function assertPatternStaysInside(pattern: string): void {
	if (pattern.startsWith('/') || pattern.split('/').includes('..')) {
		throw new Error(`Pattern "${pattern}" escapes the base directory`);
	}
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
