import { z } from 'zod';

import { isAbortError } from '../../sdk/abort';
import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

const MAX_FILES = 20;
const MAX_LINES = 500;

const fileSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file to read, relative to the workspace root (absolute paths must be under it)',
		),
	startLine: z.number().int().positive().optional().describe('First line to read (default: 1)'),
	endLine: z.number().int().positive().optional().describe('Last line to read (default: end)'),
});

async function readLines(
	filesystem: WorkspaceFilesystem,
	{ path, startLine = 1, endLine }: z.infer<typeof fileSchema>,
	abortSignal?: AbortSignal,
) {
	if (endLine !== undefined && endLine < startLine) {
		return { path, error: '`endLine` must not be less than `startLine`.' };
	}
	try {
		const content = await filesystem.readFile(path, { encoding: 'utf-8', abortSignal });
		const lines = content.toString().split('\n');
		if (startLine > lines.length) {
			return { path, error: `The file has only ${lines.length} lines.` };
		}
		const requestedEnd = Math.min(endLine ?? lines.length, lines.length);
		const end = Math.min(requestedEnd, startLine + MAX_LINES - 1);
		return {
			path,
			content: lines.slice(startLine - 1, end).join('\n'),
			startLine,
			endLine: end,
			totalLines: lines.length,
			...(end < requestedEnd && { truncated: true }),
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		return {
			path,
			error: error instanceof Error ? error.message : 'Unknown workspace read error.',
		};
	}
}

export function createReadFilesTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_read_files')
		.description(
			`Read several workspace files, or line ranges of them, in one call. Returns at most ${MAX_LINES} ` +
				'lines of each file; `truncated` marks a cut read, so read the rest with a later `startLine`. ' +
				'A file that cannot be read returns an `error` and does not stop the others.',
		)
		.input(z.object({ files: z.array(fileSchema).min(1).max(MAX_FILES) }))
		.handler(async ({ files }, ctx) => ({
			files: await Promise.all(
				files.map(async (file) => await readLines(filesystem, file, ctx.abortSignal)),
			),
		}))
		.build();
}
