import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { MAX_FILE_SIZE } from './constants';
import { buildFilesystemResource, resolveSafePath } from './fs-utils';
import { buildDiffPreview, buildTextPreview } from './preview-utils';

const inputSchema = z.object({
	filePath: z.string().describe('File path relative to root'),
	content: z.string().describe('Text content to write'),
	expectedSha256: z
		.string()
		.optional()
		.describe('Expected SHA-256 of the existing file. When provided, write fails if it changed.'),
});

export const writeFileTool: ToolDefinition<typeof inputSchema> = {
	name: 'write_file',
	description:
		'Create a new file with the given content. Overwrites if the file already exists. Content must not exceed 512 KB.',
	inputSchema,
	annotations: {},
	async getAffectedResources({ filePath, content }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, filePath);
		const existingStat = await fs.stat(resolvedPath).catch((error: unknown) => {
			if (isNotFoundError(error)) return null;
			throw error;
		});
		let preview = buildTextPreview(`Create file: ${filePath}`, content);

		if (existingStat !== null) {
			preview =
				existingStat.size > MAX_FILE_SIZE
					? buildTextPreview(`Replace file: ${filePath} (existing file too large to diff)`, content)
					: buildDiffPreview(filePath, await fs.readFile(resolvedPath, 'utf-8'), content);
		}

		return [
			{
				...(await buildFilesystemResource(
					dir,
					filePath,
					'filesystemWrite',
					`Write file: ${filePath}`,
				)),
				preview,
			},
		];
	},
	async execute({ filePath, content, expectedSha256 }, { dir }) {
		const resolvedPath = await resolveSafePath(dir, filePath);

		const byteSize = Buffer.byteLength(content, 'utf-8');
		if (byteSize > MAX_FILE_SIZE) {
			throw new Error(`Content too large: ${byteSize} bytes (max ${MAX_FILE_SIZE} bytes).`);
		}

		if (expectedSha256) {
			const existing = await fs.readFile(resolvedPath);
			const actualSha256 = createHash('sha256').update(existing).digest('hex');
			if (actualSha256 !== expectedSha256) {
				throw new Error(`File changed since it was last read: ${filePath}`);
			}
		}

		await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
		await fs.writeFile(resolvedPath, content, 'utf-8');

		return formatCallToolResult({ path: filePath });
	},
};

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: unknown }).code === 'ENOENT'
	);
}
