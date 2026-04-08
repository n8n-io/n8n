import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	dirPath: z.string().describe('Directory path relative to root'),
});

export const createDirectoryTool: ToolDefinition<typeof inputSchema> = {
	name: 'create_directory',
	description:
		'Create a new directory. Idempotent: does nothing if the directory already exists. Parent directories are created automatically.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ dirPath }, { dir }) {
		return [
			await buildFilesystemResource(
				dir,
				dirPath,
				'filesystemWrite',
				`Create directory: ${dirPath}`,
			),
		];
	},
	async execute({ dirPath }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, dirPath);

		await fs.mkdir(resolvedPath, { recursive: true });

		return formatCallToolResult({ path: dirPath });
	},
};
