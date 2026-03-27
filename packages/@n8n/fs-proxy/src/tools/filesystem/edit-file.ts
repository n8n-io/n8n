import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	oldString: z.string().min(1).describe('Exact string to find and replace (first occurrence)'),
	newString: z.string().describe('Replacement string'),
});

export const editFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'edit_file',
	description:
		'Apply a targeted search-and-replace to a file. Replaces the first occurrence of oldString with newString. Fails if oldString is not found.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ filePath }, { dir }) {
		return [
			await buildFilesystemResource(dir, filePath, 'filesystemWrite', `Edit file: ${filePath}`),
		];
	},
	async execute({ filePath, oldString, newString }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, filePath);

		const stat = await fs.stat(resolvedPath);
		if (stat.size > MAX_FILE_SIZE) {
			throw new Error(
				`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE} bytes). Use write_file to replace the entire content.`,
			);
		}

		const content = await fs.readFile(resolvedPath, 'utf-8');

		if (!content.includes(oldString)) {
			throw new Error(`oldString not found in file: ${filePath}`);
		}

		await fs.writeFile(resolvedPath, content.replace(oldString, newString), 'utf-8');

		return formatCallToolResult({ path: filePath });
	},
};
