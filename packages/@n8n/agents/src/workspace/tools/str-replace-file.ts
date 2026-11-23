import { TextEditorDocument, type BatchReplaceResult } from '@n8n/ai-utilities/generic-text-editor';
import { z } from 'zod';

import { isAbortError } from '../../sdk/abort';
import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

const strReplacementSchema = z.object({
	old_str: z.string().describe('Exact text to replace. Must match exactly and be unique.'),
	new_str: z.string().describe('Replacement text to write in place of old_str.'),
});

export const strReplaceFileInputSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file to edit, relative to the workspace root (absolute paths must be under it)',
		),
	replacements: z
		.array(strReplacementSchema)
		.min(1)
		.describe('Ordered exact string replacements applied atomically.'),
});

const replaceResultSchema = z.object({
	index: z.number().int(),
	old_str: z.string(),
	status: z.enum(['success', 'failed', 'not_attempted']),
	error: z.string().optional(),
});

const outputSchema = z.object({
	success: z.boolean().describe('Whether all replacements were applied'),
	result: z.string().optional().describe('Success message'),
	error: z.string().optional().describe('Error message when replacements could not be applied'),
	results: z
		.array(replaceResultSchema)
		.optional()
		.describe('Per-replacement statuses for a failed edit'),
});

type StrReplaceFileOutput = z.infer<typeof outputSchema>;

function createErrorOutput(error: unknown): StrReplaceFileOutput {
	return {
		success: false,
		error: error instanceof Error ? error.message : 'Unknown workspace edit error.',
	};
}

function isBatchReplaceResult(
	result: string | BatchReplaceResult[],
): result is BatchReplaceResult[] {
	return Array.isArray(result);
}

/** Apply the replacements of one file. Shared by `workspace_str_replace_file` and `workspace_edit_files`. */
export async function strReplaceFile(
	filesystem: WorkspaceFilesystem,
	input: z.infer<typeof strReplaceFileInputSchema>,
	abortSignal?: AbortSignal,
): Promise<StrReplaceFileOutput> {
	try {
		const content = await filesystem.readFile(input.path, { encoding: 'utf-8', abortSignal });
		const editor = new TextEditorDocument({ initialText: content.toString() });
		const result = editor.executeBatch(input.replacements);

		if (isBatchReplaceResult(result)) {
			return { success: false, error: 'String replacement failed.', results: result };
		}

		const editedContent = editor.getText();
		if (editedContent === null) {
			throw new Error(`File "${input.path}" is not loaded.`);
		}

		await filesystem.writeFile(input.path, editedContent, { overwrite: true, abortSignal });
		return { success: true, result };
	} catch (error) {
		if (isAbortError(error)) throw error;
		return createErrorOutput(error);
	}
}

export function createStrReplaceFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_str_replace_file')
		.description(
			'Apply one or more exact text replacements to a workspace file atomically. If any replacement fails, no changes are written.',
		)
		.input(strReplaceFileInputSchema)
		.output(outputSchema)
		.handler(async (input, ctx) => await strReplaceFile(filesystem, input, ctx.abortSignal))
		.build();
}
