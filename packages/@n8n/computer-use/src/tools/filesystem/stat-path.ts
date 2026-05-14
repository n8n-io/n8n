import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveReadablePath } from './fs-utils';

const inputSchema = z.object({
	path: z.string().describe('Path relative to root'),
});

export const statPathTool: ToolDefinition<typeof inputSchema> = {
	name: 'stat_path',
	description: 'Return metadata for a file or directory',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources({ path }, { dir }) {
		return [await buildFilesystemResource(dir, path, 'filesystemRead', `Inspect path: ${path}`)];
	},
	async execute({ path }, { dir }) {
		const resolvedPath = await resolveReadablePath(dir, path);
		const stat = await fs.stat(resolvedPath);

		return formatCallToolResult({
			path,
			type: stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other',
			sizeBytes: stat.size,
			mtimeMs: stat.mtimeMs,
			ctimeMs: stat.ctimeMs,
			mode: stat.mode,
		});
	},
};
