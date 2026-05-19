import * as fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

import type { CallToolResult, ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { type SupportedBinaryFile, detectSupportedBinaryFile } from './file-type';
import { buildFilesystemResource, isLikelyBinaryContent, resolveReadablePath } from './fs-utils';
const DEFAULT_MAX_LINES = 200;

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	startLine: z
		.number()
		.int()
		.optional()
		.describe('Starting line number (1-based, default: 1). Text files only.'),
	maxLines: z
		.number()
		.int()
		.optional()
		.describe('Maximum number of lines (default: 200). Text files only.'),
});

export const readFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'read_file',
	description:
		'Read a file. Text is returned line-by-line; supported binaries (PNG, JPEG, GIF, WebP, PDF, MP3, WAV) are returned as base64 content the model can consume directly.',
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

		const binaryType = detectSupportedBinaryFile(filePath);
		if (binaryType) {
			return buildBinaryResult(resolvedPath, buffer, binaryType);
		}

		if (isLikelyBinaryContent(buffer)) {
			throw new Error(
				'Unsupported binary file — only PNG, JPEG, GIF, WebP, PDF, MP3 and WAV are readable',
			);
		}

		return buildTextResult(filePath, buffer.toString('utf-8'), startLine, maxLines);
	},
};

function buildTextResult(
	filePath: string,
	content: string,
	startLine: number | undefined,
	maxLines: number | undefined,
): CallToolResult {
	const allLines = content.split('\n');
	const lines = maxLines ?? DEFAULT_MAX_LINES;
	const start = startLine ?? 1;
	const startIndex = Math.max(0, start - 1);
	const slicedLines = allLines.slice(startIndex, startIndex + lines);
	const truncated = allLines.length > startIndex + lines;

	return formatCallToolResult({
		path: filePath,
		content: slicedLines.join('\n'),
		truncated,
		totalLines: allLines.length,
	});
}

function buildBinaryResult(
	resolvedPath: string,
	buffer: Buffer,
	type: SupportedBinaryFile,
): CallToolResult {
	const data = buffer.toString('base64');

	if (type.kind === 'image') {
		return { content: [{ type: 'image', data, mimeType: type.mimeType }] };
	}
	if (type.kind === 'audio') {
		return { content: [{ type: 'audio', data, mimeType: type.mimeType }] };
	}
	return {
		content: [
			{
				type: 'resource',
				resource: {
					uri: pathToFileURL(resolvedPath).toString(),
					mimeType: type.mimeType,
					blob: data,
				},
			},
		],
	};
}
