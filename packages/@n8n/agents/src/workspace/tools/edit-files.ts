import { z } from 'zod';

import { isAbortError } from '../../sdk/abort';
import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';
import { strReplaceFile, strReplaceFileInputSchema } from './str-replace-file';
import { writeFile, writeFileInputSchema } from './write-file';

const MAX_OPERATIONS = 50;

const operationSchema = z.discriminatedUnion('type', [
	writeFileInputSchema.extend({ type: z.literal('write') }),
	strReplaceFileInputSchema.extend({ type: z.literal('replace') }),
]);

type Operation = z.infer<typeof operationSchema>;

async function runOperation(
	filesystem: WorkspaceFilesystem,
	operation: Operation,
	abortSignal?: AbortSignal,
) {
	if (operation.type === 'replace') {
		return await strReplaceFile(filesystem, operation, abortSignal);
	}
	try {
		return await writeFile(filesystem, operation, abortSignal);
	} catch (error) {
		if (isAbortError(error)) throw error;
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown workspace write error.',
		};
	}
}

export function createEditFilesTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_edit_files')
		.description(
			'Write or edit several workspace files in one call. Runs every operation, in order, and ' +
				'returns a result for each one. A `replace` operation is atomic for its file, like ' +
				'workspace_str_replace_file. A failed operation does not stop the others.',
		)
		.input(
			z.object({
				operations: z
					.array(operationSchema)
					.min(1)
					.max(MAX_OPERATIONS)
					.describe('`write` replaces a whole file. `replace` applies exact text replacements'),
			}),
		)
		.handler(async ({ operations }, ctx) => {
			const results = [];
			for (const operation of operations) {
				const result = await runOperation(filesystem, operation, ctx.abortSignal);
				results.push({ path: operation.path, type: operation.type, ...result });
			}
			return { success: results.every((result) => result.success), results };
		})
		.build();
}
