import { TextEditorDocument, type BatchReplaceResult } from '@n8n/ai-utilities/text-editor';
import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

const strReplacementSchema = z.object({
	old_str: z.string().describe('Exact text to replace. Must match exactly and be unique.'),
	new_str: z.string().describe('Replacement text to write in place of old_str.'),
});

const inputSchema = z.object({
	path: z.string().describe('Path to the file to edit'),
	replacements: z
		.array(strReplacementSchema)
		.describe('Ordered exact string replacements applied atomically.'),
});

const batchReplaceResultSchema = z.object({
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
		.array(batchReplaceResultSchema)
		.optional()
		.describe('Per-replacement statuses for a failed batch edit'),
});

type BatchStrReplaceFileOutput = z.infer<typeof outputSchema>;

function createErrorOutput(error: unknown): BatchStrReplaceFileOutput {
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

export function createBatchStrReplaceFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_batch_str_replace_file')
		.description(
			'Apply multiple exact text replacements to a workspace file atomically. If any replacement fails, no changes are written.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input) => {
			try {
				const content = await filesystem.readFile(input.path, { encoding: 'utf-8' });
				const editor = new TextEditorDocument({ initialText: content.toString() });
				const result = editor.executeBatch(input.replacements);

				if (isBatchReplaceResult(result)) {
					return { success: false, error: 'Batch replacement failed.', results: result };
				}

				const editedContent = editor.getText();
				if (editedContent === null) {
					throw new Error(`File "${input.path}" is not loaded.`);
				}

				await filesystem.writeFile(input.path, editedContent, { overwrite: true });
				return { success: true, result };
			} catch (error) {
				return createErrorOutput(error);
			}
		})
		.build();
}
