/**
 * list-files tool: lists the files of the thread, newest first. These are the
 * uploads of every turn and the files that came from `outputs/` of the sandbox.
 * The model learns a fileId from the label of the message that carried the
 * file, and memory drops that label when it compacts older messages. With this
 * tool, the model can still find a file of an earlier turn.
 *
 * The registry adds the tool only when the host sets `list` on
 * `context.storedFiles`. Only the Assistant agent on the Agents runtime sets
 * it, and only when the sandbox files feature is on.
 */

import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { InstanceAiListedFile, InstanceAiStoredFileReader } from '../../types';

/** Most files that one call returns, so that a long thread cannot flood the context. */
export const MAX_LISTED_FILES = 50;

export const listFilesInputSchema = z.object({});

const listedFileSchema = z.object({
	fileId: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	origin: z.enum(['upload', 'sandbox']),
	createdAt: z.string(),
});

// Not `files`: the chat shows the `files` of a tool result as new files.
export const listFilesOutputSchema = z.object({
	conversationFiles: z.array(listedFileSchema),
	/** The number of older files that the list leaves out. */
	omitted: z.number().optional(),
});

type ListFilesOutput = z.infer<typeof listFilesOutputSchema>;

const DESCRIPTION =
	'List the files of this conversation, newest first: the files that the user attached in any turn ' +
	'(`origin: "upload"`) and the files from `outputs/` of your sandbox (`origin: "sandbox"`). ' +
	'Use it to find the fileId of a file from an earlier turn, for example to import it again with `import-files` ' +
	'or to read it with `parse-file`. ' +
	`Returns up to ${MAX_LISTED_FILES} files.`;

function toListedFile({
	fileId,
	fileName,
	mimeType,
	sizeBytes,
	origin,
	createdAt,
}: InstanceAiListedFile): ListFilesOutput['conversationFiles'][number] {
	return { fileId, fileName, mimeType, sizeBytes, origin, createdAt };
}

export function createListFilesTool(list: NonNullable<InstanceAiStoredFileReader['list']>) {
	return new Tool('list-files')
		.description(DESCRIPTION)
		.input(listFilesInputSchema)
		.output(listFilesOutputSchema)
		.handler(async (): Promise<ListFilesOutput> => {
			const files = await list();
			const conversationFiles = files.slice(0, MAX_LISTED_FILES).map(toListedFile);
			const omitted = files.length - conversationFiles.length;
			return omitted > 0 ? { conversationFiles, omitted } : { conversationFiles };
		})
		.build();
}
