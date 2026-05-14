import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';
import { buildTextPreview } from './preview-utils';

const TRASH_DIR = '.n8n-computer-use-trash';

const inputSchema = z.object({
	path: z.string().describe('Path relative to root (file or directory)'),
});

function safeTrashName(inputPath: string): string {
	const baseName = path.basename(inputPath) || 'item';
	const sanitized = baseName.replace(/[^A-Za-z0-9._-]/g, '_');
	return `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitized}`;
}

export const deleteToTrashTool: ToolDefinition<typeof inputSchema> = {
	name: 'delete_to_trash',
	description: 'Move a file or directory into the workspace trash folder',
	inputSchema,
	annotations: { destructiveHint: true },
	async getAffectedResources({ path: relPath }, { dir }) {
		return [
			{
				...(await buildFilesystemResource(
					dir,
					relPath,
					'filesystemWrite',
					`Move to trash: ${relPath}`,
				)),
				preview: buildTextPreview('Move to trash', relPath),
			},
		];
	},
	async execute({ path: relPath }, { dir }) {
		const sourcePath = await resolveSafePath(dir, relPath);
		await fs.stat(sourcePath);

		const trashRoot = await resolveSafePath(dir, TRASH_DIR);
		await fs.mkdir(trashRoot, { recursive: true });
		const trashPath = path.join(trashRoot, safeTrashName(relPath));

		await fs.rename(sourcePath, trashPath);

		return formatCallToolResult({
			path: relPath,
			trashPath: path.relative(dir, trashPath),
		});
	},
};
