import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	sourcePath: z.string().describe('Source file path relative to root'),
	destinationPath: z.string().describe('Destination file path relative to root'),
});

export const copyFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'copy_file',
	description:
		'Copy a file to a new path. Overwrites the destination if it already exists. Parent directories at the destination are created automatically.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ sourcePath, destinationPath }, { dir }) {
		return [
			await buildFilesystemResource(
				dir,
				sourcePath,
				'filesystemRead',
				`Copy source: ${sourcePath}`,
			),
			await buildFilesystemResource(
				dir,
				destinationPath,
				'filesystemWrite',
				`Copy destination: ${destinationPath}`,
			),
		];
	},
	async execute({ sourcePath, destinationPath }, { dir }) {
		const resolvedSrc = await resolveSafePath(dir, sourcePath);
		const resolvedDest = await resolveSafePath(dir, destinationPath);

		await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
		await fs.copyFile(resolvedSrc, resolvedDest);

		return formatCallToolResult({ sourcePath, destinationPath });
	},
};
