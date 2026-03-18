import * as fs from 'node:fs/promises';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { resolveSafePath } from './fs-utils';

const MAX_FILE_SIZE = 512 * 1024; // 512 KB
const DEFAULT_MAX_LINES = 200;
const BINARY_CHECK_SIZE = 8192;

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	startLine: z.number().int().optional().describe('Starting line number (1-based, default: 1)'),
	maxLines: z.number().int().optional().describe('Maximum number of lines (default: 200)'),
});

export const readFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'read_file',
	description: 'Read the contents of a file',
	inputSchema,
	annotations: { defaultPermission: 'allow', readOnlyHint: true },
	async execute({ filePath, startLine, maxLines }, { dir }) {
		const resolvedPath = resolveSafePath(dir, filePath);

		const stat = await fs.stat(resolvedPath);
		if (stat.size > MAX_FILE_SIZE) {
			throw new Error(
				`File too large: ${stat.size} bytes (max ${MAX_FILE_SIZE} bytes). Use searchFiles for specific content.`,
			);
		}

		const buffer = await fs.readFile(resolvedPath);

		// Binary detection: check first 8KB for null bytes
		const checkSlice = buffer.subarray(0, Math.min(BINARY_CHECK_SIZE, buffer.length));
		if (checkSlice.includes(0)) {
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
