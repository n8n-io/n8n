import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { buildFilesystemResource, resolveSafePath, scanDirectory } from './fs-utils';

const inputSchema = z.object({
	dirPath: z.string().describe('Directory path relative to root (use "." for root)'),
	maxDepth: z.number().int().min(0).optional().describe('Maximum depth to traverse (default: 2)'),
});

export const getFileTreeTool: ToolDefinition<typeof inputSchema> = {
	name: 'get_file_tree',
	description: 'Get an indented directory tree',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources({ dirPath }, { dir }) {
		return [
			await buildFilesystemResource(
				dir,
				dirPath ?? '.',
				'filesystemRead',
				`List directory tree: ${dirPath ?? '.'}`,
			),
		];
	},
	async execute({ dirPath, maxDepth }, { dir }) {
		const resolvedDir = await resolveSafePath(dir, dirPath || '.');
		const depth = maxDepth ?? 2;
		const { rootPath, tree, truncated } = await scanDirectory(resolvedDir, depth);

		const lines: string[] = [`${rootPath}/`];
		for (const entry of tree) {
			const entryDepth = entry.path.split('/').length;
			const indent = '  '.repeat(entryDepth);
			const name = entry.path.split('/').pop() ?? entry.path;
			lines.push(`${indent}${name}${entry.type === 'directory' ? '/' : ''}`);
		}

		const parts = [lines.join('\n')];
		if (truncated) {
			parts.push('(Tree truncated — increase maxDepth or explore subdirectories)');
		}

		return { content: [{ type: 'text', text: parts.join('\n\n') }] };
	},
};
