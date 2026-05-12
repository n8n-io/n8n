import { TextEditorDocument } from '@n8n/ai-utilities/text-editor';
import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceFilesystem } from '../types';

const inputSchema = z.object({
	path: z.string().describe('Path to the file to edit'),
	old_str: z.string().describe('Exact text to replace. Must match exactly and be unique.'),
	new_str: z.string().describe('Replacement text to write in place of old_str.'),
});

const outputSchema = z.object({
	success: z.boolean().describe('Whether the edit was applied'),
	result: z.string().optional().describe('Success message'),
	error: z.string().optional().describe('Error message when the edit could not be applied'),
});

type StrReplaceFileOutput = z.infer<typeof outputSchema>;

function createErrorOutput(error: unknown): StrReplaceFileOutput {
	return {
		success: false,
		error: error instanceof Error ? error.message : 'Unknown workspace edit error.',
	};
}

export function createStrReplaceFileTool(filesystem: WorkspaceFilesystem): BuiltTool {
	return new Tool('workspace_str_replace_file')
		.description(
			'Replace one exact, unique text match in a workspace file without rewriting the whole file.',
		)
		.input(inputSchema)
		.output(outputSchema)
		.handler(async (input) => {
			try {
				const content = await filesystem.readFile(input.path, { encoding: 'utf-8' });
				const editor = new TextEditorDocument({ initialText: content.toString() });
				const result = editor.execute({
					command: 'str_replace',
					path: input.path,
					old_str: input.old_str,
					new_str: input.new_str,
				});
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
