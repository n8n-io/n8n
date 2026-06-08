import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { buildFilesystemResource, isLikelyBinaryContent, resolveReadablePath } from './fs-utils';
const DEFAULT_MAX_LINES = 200;

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	startLine: z.number().int().optional().describe('Starting line number (1-based, default: 1)'),
	maxLines: z.number().int().optional().describe('Maximum number of lines (default: 200)'),
});

export const readFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'read_file',
	description: 'Read the contents of a file',
	inputSchema,
	annotations: { readOnlyHint: true },
	async getAffectedResources({ filePath }, { dir }) {
		return [
			await buildFilesystemResource(dir, filePath, 'filesystemRead', `Read file: ${filePath}`),
		];
	},
	async execute({ filePath, startLine, maxLines }, { dir }) {
		const resolvedPath = await resolveReadablePath(dir, filePath);

		const stat = await fs.stat(resolvedPath);
		if (stat.size > MAX_FILE_SIZE) {
			throw new Error(
				`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE} bytes). Use searchFiles for specific content.`,
			);
		}

		const fileContent = await fs.readFile(resolvedPath);
		const buffer = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent);

		if (isLikelyBinaryContent(buffer)) {
			throw new Error('Binary file detected — cannot read binary files');
		}

		const fullContent = buffer.toString('utf-8');
		const allLines = fullContent.split('\n');
		const lines = maxLines ?? DEFAULT_MAX_LINES;
		const start = startLine ?? 1;
		const startIndex = Math.max(0, start - 1);
		const slicedLines = allLines.slice(startIndex, startIndex + lines);
		const truncated = allLines.length > startIndex + lines;

		const result = {
			path: filePath,
			content: slicedLines.join('\n'),
			truncated,
			totalLines: allLines.length,
		};

		return formatCallToolResult(result);
	},
};
