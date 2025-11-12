import { readFile } from 'fs/promises';
import { join } from 'path';
import glob from 'fast-glob';
import type { ToolDefinition } from '../types';

/**
 * Creates search tools (Glob, Grep) for finding files and searching content
 */
export function createSearchTools(workingDir: string): ToolDefinition[] {
	/**
	 * Glob tool - finds files matching a pattern
	 */
	const globTool: ToolDefinition = {
		name: 'Glob',
		description: 'Finds files matching a glob pattern (e.g., "**/*.ts" for all TypeScript files)',
		input_schema: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description: 'The glob pattern to match files against (e.g., "src/**/*.ts")',
				},
				path: {
					type: 'string',
					description: 'Optional: directory to search in (defaults to working directory)',
				},
			},
			required: ['pattern'],
		},
		async execute(input: unknown) {
			const { pattern, path } = input as { pattern: string; path?: string };
			const searchDir = path ? join(workingDir, path) : workingDir;

			try {
				const files = await glob(pattern, {
					cwd: searchDir,
					absolute: false,
					onlyFiles: true,
					ignore: ['node_modules/**', 'dist/**', '.git/**'],
				});

				if (files.length === 0) {
					return `No files found matching pattern: ${pattern}`;
				}

				return files.join('\n');
			} catch (error) {
				const err = error as Error;
				return `Error: ${err.message}`;
			}
		},
	};

	/**
	 * Grep tool - searches file contents for a pattern
	 */
	const grepTool: ToolDefinition = {
		name: 'Grep',
		description: 'Searches for a pattern in file contents. Supports regex patterns.',
		input_schema: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					description: 'The pattern to search for (supports regex)',
				},
				glob: {
					type: 'string',
					description: 'Optional: glob pattern to filter files (e.g., "*.ts")',
				},
				path: {
					type: 'string',
					description: 'Optional: directory to search in (defaults to working directory)',
				},
				output_mode: {
					type: 'string',
					enum: ['content', 'files_with_matches'],
					description:
						'Output mode: "content" shows matching lines, "files_with_matches" shows only file paths',
				},
			},
			required: ['pattern'],
		},
		async execute(input: unknown) {
			const {
				pattern,
				glob: globPattern = '**/*',
				path,
				output_mode = 'files_with_matches',
			} = input as {
				pattern: string;
				glob?: string;
				path?: string;
				output_mode?: 'content' | 'files_with_matches';
			};

			const searchDir = path ? join(workingDir, path) : workingDir;

			try {
				// Find files to search
				const files = await glob(globPattern, {
					cwd: searchDir,
					absolute: true,
					onlyFiles: true,
					ignore: ['node_modules/**', 'dist/**', '.git/**', '*.log'],
				});

				const regex = new RegExp(pattern);
				const results: Array<{ file: string; matches: Array<{ line: number; content: string }> }> =
					[];

				// Search each file
				for (const file of files) {
					try {
						const content = await readFile(file, 'utf-8');
						const lines = content.split('\n');
						const matches: Array<{ line: number; content: string }> = [];

						lines.forEach((line, idx) => {
							if (regex.test(line)) {
								matches.push({ line: idx + 1, content: line });
							}
						});

						if (matches.length > 0) {
							results.push({
								file: file.replace(searchDir + '/', ''),
								matches,
							});
						}
					} catch {
						// Skip files that can't be read (binary, permissions, etc.)
						continue;
					}
				}

				if (results.length === 0) {
					return `No matches found for pattern: ${pattern}`;
				}

				// Format output based on mode
				if (output_mode === 'files_with_matches') {
					return results.map((r) => r.file).join('\n');
				} else {
					// content mode
					return results
						.map((r) => {
							const matchLines = r.matches.map((m) => `  ${m.line}: ${m.content}`).join('\n');
							return `${r.file}:\n${matchLines}`;
						})
						.join('\n\n');
				}
			} catch (error) {
				const err = error as Error;
				return `Error: ${err.message}`;
			}
		},
	};

	return [globTool, grepTool];
}
