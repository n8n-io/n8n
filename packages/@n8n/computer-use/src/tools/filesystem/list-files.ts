import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { buildFilesystemResource, resolveSafePath, scanDirectory } from './fs-utils';

const inputSchema = z.object({
	dirPath: z.string().describe('Directory path relative to root'),
	type: z
		.enum(['file', 'directory', 'all'])
		.optional()
		.describe('Filter by entry type (default: all)'),
	maxResults: z.number().int().optional().describe('Maximum number of results (default: 200)'),
});

export const listFilesTool: ToolDefinition<typeof inputSchema> = {
	name: 'list_files',
	description: 'List immediate children of a directory',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources({ dirPath }, { dir }) {
		return [
			await buildFilesystemResource(
				dir,
				dirPath ?? '.',
				'filesystemRead',
				`List files: ${dirPath ?? '.'}`,
			),
		];
	},
	async execute({ dirPath, type, maxResults }, { dir }) {
		const resolvedDir = await resolveSafePath(dir, dirPath || '.');
		// maxDepth=0 → immediate children only, no recursion
		const { tree } = await scanDirectory(resolvedDir, 0);

		const typeFilter = type ?? 'all';
		const filtered = typeFilter === 'all' ? tree : tree.filter((e) => e.type === typeFilter);
		const limit = maxResults ?? 200;

		// Make paths relative to the base dir (consistent with other tools)
		const relativeDir = path.relative(dir, resolvedDir);
		const entries = filtered.slice(0, limit).map((e) => ({
			path: relativeDir ? `${relativeDir}/${e.path}` : e.path,
			type: e.type,
			sizeBytes: e.sizeBytes,
		}));

		return {
			content: [{ type: 'text', text: JSON.stringify(entries) }],
			structuredContent: { entries },
		};
	},
};
