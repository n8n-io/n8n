import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';

const inputSchema = z.object({
	sourcePath: z.string().describe('Source path relative to root (file or directory)'),
	destinationPath: z.string().describe('Destination path relative to root'),
});

export const moveFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'move',
	description:
		'Move or rename a file or directory. Overwrites the destination if it already exists. Parent directories at the destination are created automatically.',
	inputSchema,
	annotations: { destructiveHint: true },
	async getAffectedResources({ sourcePath, destinationPath }, { dir }) {
		return [
			await buildFilesystemResource(
				dir,
				sourcePath,
				'filesystemRead',
				`Move source: ${sourcePath}`,
			),
			await buildFilesystemResource(
				dir,
				destinationPath,
				'filesystemWrite',
				`Move destination: ${destinationPath}`,
			),
		];
	},
	async execute({ sourcePath, destinationPath }, { dir }) {
		const resolvedSrc = await resolveSafePath(dir, sourcePath);
		const resolvedDest = await resolveSafePath(dir, destinationPath);

		await fs.mkdir(path.dirname(resolvedDest), { recursive: true });
		await fs.rename(resolvedSrc, resolvedDest);

		return formatCallToolResult({ sourcePath, destinationPath });
	},
};
