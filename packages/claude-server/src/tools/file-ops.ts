import { readFile, writeFile } from 'fs/promises';
import { join, isAbsolute } from 'path';
import type { ToolDefinition } from '../types';

/**
 * Creates file operation tools (Read, Write, Edit) for a given working directory
 */
export function createFileTools(workingDir: string): ToolDefinition[] {
	/**
	 * Resolves a file path relative to the working directory.
	 * Prevents path traversal attacks by ensuring paths stay within workingDir.
	 */
	function resolvePath(filePath: string): string {
		const resolved = isAbsolute(filePath) ? filePath : join(workingDir, filePath);
		// Basic security check - ensure path is within working directory
		if (!resolved.startsWith(workingDir)) {
			throw new Error('Path traversal detected - access denied');
		}
		return resolved;
	}

	/**
	 * Read tool - reads file contents
	 */
	const readTool: ToolDefinition = {
		name: 'Read',
		description: 'Reads a file from the filesystem. Returns file contents with line numbers.',
		input_schema: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description:
						'The path to the file to read (can be absolute or relative to working directory)',
				},
			},
			required: ['file_path'],
		},
		async execute(input: unknown) {
			const { file_path } = input as { file_path: string };
			const resolvedPath = resolvePath(file_path);

			try {
				const content = await readFile(resolvedPath, 'utf-8');
				// Add line numbers like cat -n
				const lines = content.split('\n');
				const numberedContent = lines
					.map((line, idx) => `${String(idx + 1).padStart(6)}→${line}`)
					.join('\n');
				return numberedContent;
			} catch (error) {
				const err = error as NodeJS.ErrnoException;
				if (err.code === 'ENOENT') {
					return `Error: File not found: ${file_path}`;
				}
				throw error;
			}
		},
	};

	/**
	 * Write tool - creates or overwrites a file
	 */
	const writeTool: ToolDefinition = {
		name: 'Write',
		description:
			'Writes content to a file, creating it if it does not exist or overwriting if it does.',
		input_schema: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'The path to the file to write',
				},
				content: {
					type: 'string',
					description: 'The content to write to the file',
				},
			},
			required: ['file_path', 'content'],
		},
		async execute(input: unknown) {
			const { file_path, content } = input as { file_path: string; content: string };
			const resolvedPath = resolvePath(file_path);

			await writeFile(resolvedPath, content, 'utf-8');
			return `Successfully wrote ${content.length} characters to ${file_path}`;
		},
	};

	/**
	 * Edit tool - performs string replacement in a file
	 */
	const editTool: ToolDefinition = {
		name: 'Edit',
		description:
			'Performs exact string replacement in a file. The old_string must match exactly (including whitespace).',
		input_schema: {
			type: 'object',
			properties: {
				file_path: {
					type: 'string',
					description: 'The path to the file to edit',
				},
				old_string: {
					type: 'string',
					description: 'The exact string to replace',
				},
				new_string: {
					type: 'string',
					description: 'The string to replace it with',
				},
			},
			required: ['file_path', 'old_string', 'new_string'],
		},
		async execute(input: unknown) {
			const { file_path, old_string, new_string } = input as {
				file_path: string;
				old_string: string;
				new_string: string;
			};
			const resolvedPath = resolvePath(file_path);

			const content = await readFile(resolvedPath, 'utf-8');

			// Check if old_string exists and is unique
			const occurrences = content.split(old_string).length - 1;
			if (occurrences === 0) {
				return `Error: Could not find the specified string in ${file_path}`;
			}
			if (occurrences > 1) {
				return `Error: Found ${occurrences} occurrences of the string. Please provide a more specific string that appears only once.`;
			}

			const newContent = content.replace(old_string, new_string);
			await writeFile(resolvedPath, newContent, 'utf-8');

			return `Successfully edited ${file_path}`;
		},
	};

	return [readTool, writeTool, editTool];
}
