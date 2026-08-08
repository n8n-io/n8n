import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	path: z.string().describe('Path relative to root (file or directory)'),
});

export const deleteTool: ToolDefinition<typeof inputSchema> = {
	name: 'delete',
	description:
		'Delete a file or directory. Deleting a directory removes it and all of its contents recursively.',
	inputSchema,
	annotations: { destructiveHint: true },
	async getAffectedResources({ path: relPath }, { dir }) {
		return [await buildFilesystemResource(dir, relPath, 'filesystemWrite', `Delete: ${relPath}`)];
	},
	async execute({ path: relPath }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, relPath);

		const stat = await fs.stat(resolvedPath);

		if (stat.isDirectory()) {
			await fs.rm(resolvedPath, { recursive: true, force: false });
		} else {
			await fs.unlink(resolvedPath);
		}

		return formatCallToolResult({ path: relPath });
	},
};
