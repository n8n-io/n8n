import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	content: z.string().describe('Text content to write'),
});

export const writeFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'write_file',
	description:
		'Create a new file with the given content. Overwrites if the file already exists. Content must not exceed 512 KB.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ filePath }, { dir }) {
		return [
			await buildFilesystemResource(dir, filePath, 'filesystemWrite', `Write file: ${filePath}`),
		];
	},
	async execute({ filePath, content }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, filePath);

		const byteSize = Buffer.byteLength(content, 'utf-8');
		if (byteSize > MAX_FILE_SIZE) {
			throw new Error(`Content too large: ${byteSize} bytes (max ${MAX_FILE_SIZE} bytes).`);
		}

		await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
		await fs.writeFile(resolvedPath, content, 'utf-8');

		return formatCallToolResult({ path: filePath });
	},
};
