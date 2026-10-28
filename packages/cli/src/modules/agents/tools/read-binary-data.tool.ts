import { text } from 'node:stream/consumers';

import { isTextMediaType } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	isAttachmentMediaTypeSupported,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
} from '@n8n/api-types';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';

export const READ_BINARY_DATA_TOOL_NAME = 'read_binary_data';

// ponytail: a fixed cap keeps one text file inside the tool result budget; page through text if larger files are needed.
export const MAX_TEXT_FILE_BYTES = 200_000;

const DESCRIPTION =
	'Read a file by its fileId, such as a file from a tool result or a user upload. ' +
	'Images and PDFs are attached for you to see. Text files are returned as text. ' +
	'Do not read a file that is already attached in the conversation. ' +
	'If a file is not attached now, read it again with this tool to see it.';

const outputSchema = z.object({
	fileId: z.string(),
	fileName: z.string(),
	mimeType: z.string(),
	sizeBytes: z.number(),
	/** The content of a text file. Images and PDFs have no text. */
	text: z.string().optional(),
});

export function createReadBinaryDataTool({
	projectId,
	provider,
	attachmentService,
}: {
	projectId: string;
	/** The model provider. It decides which file types the model can see. */
	provider: string;
	attachmentService: AgentChatAttachmentService;
}) {
	// File content comes from users and tools, so the model must treat it as data.
	return new Tool(READ_BINARY_DATA_TOOL_NAME)
		.description(DESCRIPTION)
		.input(z.object({ fileId: z.string().trim().min(1) }))
		.output(outputSchema)
		.untrustedOutput()
		.handler(async ({ fileId }, ctx) => {
			const threadId = ctx.persistence?.threadId;
			if (!threadId) throw new UserError('Files can only be read in a conversation');
			const file = await attachmentService.getReadable(fileId, { projectId, threadId });
			if (!file) throw new UserError(`File "${fileId}" not found in this conversation`);
			if (!(await attachmentService.hasStoredData(file))) {
				throw new UserError(`File "${fileId}" is no longer available`);
			}

			const { mimeType } = file;
			const metadata = {
				fileId: file.id,
				fileName: file.fileName,
				mimeType,
				sizeBytes: file.fileSizeBytes,
			};
			if (isTextMediaType(mimeType)) {
				if (file.fileSizeBytes > MAX_TEXT_FILE_BYTES) {
					throw new UserError(
						`File "${fileId}" is too large to read as text. The limit is ${MAX_TEXT_FILE_BYTES} bytes`,
					);
				}
				// Text goes into the tool result one time, so the tool result guard limits it and later model calls do not load it again.
				return { ...metadata, text: await text(await attachmentService.getStream(file)) };
			}
			if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
				if (!isAttachmentMediaTypeSupported(provider, mimeType)) {
					throw new UserError(`This model cannot read files of type "${mimeType}"`);
				}
				// A read file stays attached, so a file that is too large makes every later model call fail.
				if (file.fileSizeBytes > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
					throw new UserError(
						`File "${fileId}" is too large to read. The limit is ${MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES} bytes`,
					);
				}
			} else {
				throw new UserError(
					`Cannot read files of type "${mimeType}". This tool reads images, PDFs and text files`,
				);
			}

			return metadata;
		})
		.toModelOutput(({ text: content, ...output }) => ({
			type: 'content',
			value: [
				{ type: 'text', text: JSON.stringify(output) },
				content !== undefined
					? { type: 'text', text: content }
					: // The runtime loads the bytes before each model call.
						{
							type: 'file',
							mediaType: output.mimeType,
							fileRef: {
								id: output.fileId,
								fileName: output.fileName,
								sizeBytes: output.sizeBytes,
							},
						},
			],
		}));
}
