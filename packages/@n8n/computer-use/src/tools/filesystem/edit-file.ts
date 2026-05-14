import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { buildFilesystemResource, resolveReadablePath, resolveSafePath } from './fs-utils';
import { buildDiffPreview } from './preview-utils';

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	oldString: z.string().min(1).describe('Exact string to find and replace (first occurrence)'),
	newString: z.string().describe('Replacement string'),
	expectedSha256: z
		.string()
		.optional()
		.describe('Expected SHA-256 of the existing file. When provided, edit fails if it changed.'),
});

export const editFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'edit_file',
	description:
		'Apply a targeted search-and-replace to a file. Replaces the first occurrence of oldString with newString. Fails if oldString is not found.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ filePath, oldString, newString }, { dir }) {
		const resolvedPath = await resolveReadablePath(dir, filePath);
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
		const preview = buildDiffPreview(filePath, content, content.replace(oldString, newString));

		return [
			await buildFilesystemResource(dir, filePath, 'filesystemRead', `Read file: ${filePath}`),
			{
				...(await buildFilesystemResource(
					dir,
					filePath,
					'filesystemWrite',
					`Edit file: ${filePath}`,
				)),
				preview,
			},
		];
	},
	async execute({ filePath, oldString, newString, expectedSha256 }, { dir }) {
		const resolvedReadablePath = await resolveReadablePath(dir, filePath);
		const resolvedWritablePath = await resolveSafePath(dir, filePath);

		const stat = await fs.stat(resolvedReadablePath);
		if (stat.size > MAX_FILE_SIZE) {
			throw new Error(
				`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE} bytes). Use write_file to replace the entire content.`,
			);
		}

		const fileBuffer = await fs.readFile(resolvedReadablePath);
		if (expectedSha256) {
			const actualSha256 = createHash('sha256').update(fileBuffer).digest('hex');
			if (actualSha256 !== expectedSha256) {
				throw new Error(`File changed since it was last read: ${filePath}`);
			}
		}
		const content = fileBuffer.toString('utf-8');

		if (!content.includes(oldString)) {
			throw new Error(`oldString not found in file: ${filePath}`);
		}

		await fs.writeFile(resolvedWritablePath, content.replace(oldString, newString), 'utf-8');

		return formatCallToolResult({ path: filePath });
	},
};
