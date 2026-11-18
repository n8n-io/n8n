/**
 * view-file tool: attaches an image or a PDF of the thread for the model to
 * see. It finds a file that the user attached in any turn, or a file that
 * `share-files` stored from `outputs/` of the sandbox. With it, the model can
 * check an image that it made, or look again at an upload of an earlier turn.
 *
 * The tool output has a file reference, not the bytes. The runtime loads the
 * bytes before each model call, with its own caps for attached files.
 *
 * The host decides which file types the model can see (`canView`), because
 * the runtime attaches only the types that the model's provider supports.
 *
 * The registry adds the tool only when the host sets `list` and `canView` on
 * `context.storedFiles`, that is, when the sandbox files feature is on.
 */

import { Tool } from '@n8n/agents';
import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { z } from 'zod';

import type { InstanceAiStoredFileReader } from '../../types';

export const viewFileInputSchema = z.object({
	fileId: z.string().trim().min(1).describe('The fileId of a file of this conversation'),
});

// Not `files`: the chat shows the `files` of a tool result as new files.
export const viewFileOutputSchema = z.object({
	viewedFile: z
		.object({
			fileId: z.string(),
			fileName: z.string(),
			mimeType: z.string(),
			sizeBytes: z.number(),
		})
		.optional(),
	error: z.string().optional(),
});

type ViewFileOutput = z.infer<typeof viewFileOutputSchema>;

const DESCRIPTION =
	'Look at an image or a PDF of this conversation by its fileId: a file that the user attached in any turn, ' +
	'or a file that `share-files` returned. The file is attached for you to see. ' +
	'Use it to check an image that you made before you describe it, or to look again at a file of an earlier turn ' +
	'that is no longer attached. Do not view a file that is already attached in the conversation. ' +
	'Some models cannot see PDFs or images; the tool then gives an error. ' +
	'For other file types, use `parse-file`.';

const MAX_MB = MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES / 1024 / 1024;

export function createViewFileTool(
	storedFiles: Required<Pick<InstanceAiStoredFileReader, 'read' | 'canView'>>,
) {
	// File content comes from users and tools, so the model must treat it as data.
	return new Tool('view-file')
		.description(DESCRIPTION)
		.input(viewFileInputSchema)
		.output(viewFileOutputSchema)
		.untrustedOutput()
		.handler(async ({ fileId }): Promise<ViewFileOutput> => {
			const file = await storedFiles.read(fileId);
			if (!file) return { error: `File "${fileId}" not found in this conversation` };
			// Otherwise the runtime does not attach the file, and the model sees only its name.
			if (!storedFiles.canView(file.mimeType)) {
				return {
					error: `This model cannot view files of type "${file.mimeType}". To read the text of a PDF or another document, use parse-file`,
				};
			}
			// A viewed file stays attached, so a file that is too large makes every later model call fail.
			if (file.sizeBytes > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
				return {
					error: `File "${file.fileName}" is larger than ${MAX_MB} MB and cannot be viewed`,
				};
			}
			// Storage can prune the bytes while the file record stays.
			if (!(await file.hasContent())) {
				return { error: `File "${file.fileName}" is no longer available` };
			}
			return {
				viewedFile: {
					fileId,
					fileName: file.fileName,
					mimeType: file.mimeType,
					sizeBytes: file.sizeBytes,
				},
			};
		})
		.toModelOutput((output: ViewFileOutput) => {
			const { viewedFile } = output;
			if (!viewedFile) return { type: 'text', value: JSON.stringify(output) };
			return {
				type: 'content',
				value: [
					{ type: 'text', text: JSON.stringify(output) },
					// The runtime loads the bytes before each model call.
					{
						type: 'file',
						mediaType: viewedFile.mimeType,
						fileRef: {
							id: viewedFile.fileId,
							fileName: viewedFile.fileName,
							sizeBytes: viewedFile.sizeBytes,
						},
					},
				],
			};
		})
		.build();
}
