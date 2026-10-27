import { Service } from '@n8n/di';
import type { Attachment, PostableCard, PostableMarkdown, PostableRaw, Thread } from 'chat';
import { OperationalError } from 'n8n-workflow';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import {
	ChatIntegrationRegistry,
	MAX_CHANNEL_SEND_FILE_BYTES,
	MAX_FILE_MESSAGES_PER_SEND,
} from './agent-chat-integration';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import {
	fileAttachmentType,
	integrationError,
	type IntegrationErrorResponse,
} from './integration-helpers';

/** An agent file loaded for a send. It is a valid chat SDK `FileUpload`. */
export interface OutboundFile {
	data: Buffer;
	filename: string;
	mimeType: string;
}

export type OutboundFileFields = { files: OutboundFile[] } | { attachments: Attachment[] };

/** A message that files can go with. The adapters read `attachments` from a card post too. */
export type OutboundPostable =
	| string
	| PostableRaw
	| PostableMarkdown
	| (PostableCard & { attachments?: Attachment[] });

/**
 * Post a message with its files, one message for each file group. The text
 * or card goes with the first group. Return the result of the first post.
 */
export async function postWithFileGroups<T>(
	post: (message: OutboundPostable) => Promise<T>,
	message: OutboundPostable,
	groups: OutboundFileFields[],
): Promise<T> {
	const [firstGroup, ...otherGroups] = groups;
	if (!firstGroup) return await post(message);
	const first = await post(
		typeof message === 'string' ? { raw: message, ...firstGroup } : { ...message, ...firstGroup },
	);
	for (const group of otherGroups) await post({ raw: '', ...group });
	return first;
}

export interface OutboundFileScope {
	projectId: string;
	/** Agent thread of the run that sends the files. */
	threadId: string;
}

/**
 * Checks, loads and maps the agent files that a chat channel message sends.
 * The integration action executor and the final reply of a run use it, so
 * both apply the same read check and platform limits.
 */
@Service()
export class AgentOutboundFiles {
	constructor(
		private readonly attachmentService: AgentChatAttachmentService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
	) {}

	/**
	 * Check the read access of the thread and the upload limits of the
	 * platform. No file is loaded. Return an error that the model can act on.
	 */
	async check(
		platform: string,
		fileIds: string[],
		scope: OutboundFileScope,
	): Promise<AgentChatAttachment[] | IntegrationErrorResponse> {
		const integration = this.integrationRegistry.get(platform);
		const limits = integration?.fileUploadLimits;
		if (!limits) {
			return integrationError(
				INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
				`The ${platform} integration can't send files. Send the message without fileIds.`,
			);
		}
		const maxFiles = limits.maxFiles * MAX_FILE_MESSAGES_PER_SEND;
		if (fileIds.length > maxFiles) {
			return integrationError(
				INTEGRATION_ERROR_CODES.FILE_UPLOAD_LIMIT_EXCEEDED,
				`The ${platform} integration sends up to ${maxFiles} files at a time. Send the other files with another action.`,
			);
		}

		const maxFileBytes = Math.min(limits.maxFileBytes, MAX_CHANNEL_SEND_FILE_BYTES);
		const attachments: AgentChatAttachment[] = [];
		for (const fileId of fileIds) {
			const attachment = await this.attachmentService.getReadable(fileId, scope);
			if (!attachment) {
				return integrationError(
					INTEGRATION_ERROR_CODES.FILE_NOT_FOUND,
					`File "${fileId}" not found in this conversation.`,
				);
			}
			if (attachment.fileSizeBytes > maxFileBytes) {
				return integrationError(
					INTEGRATION_ERROR_CODES.FILE_UPLOAD_LIMIT_EXCEEDED,
					`File "${attachment.fileName}" is ${formatMegabytes(attachment.fileSizeBytes)}. The ${platform} integration sends files up to ${formatMegabytes(maxFileBytes)}.`,
				);
			}
			attachments.push(attachment);
		}
		return attachments;
	}

	/**
	 * Load checked files and split them into the groups that the platform can
	 * send in one message. Each group has the post fields of the platform.
	 */
	async load(platform: string, attachments: AgentChatAttachment[]): Promise<OutboundFileFields[]> {
		const integration = this.integrationRegistry.get(platform);
		const maxFiles = integration?.fileUploadLimits?.maxFiles ?? attachments.length;
		const groups = (integration?.groupOutboundFiles?.(attachments) ?? [attachments]).flatMap(
			(group) => chunk(group, maxFiles),
		);
		return await Promise.all(
			groups.map(async (group) => {
				// Each file is loaded into memory. MAX_CHANNEL_SEND_FILE_BYTES caps the size.
				const files = await Promise.all(
					group.map(async (attachment) => ({
						data: await this.attachmentService.getBuffer(attachment),
						filename: attachment.fileName,
						mimeType: attachment.mimeType,
					})),
				);
				if (!integration?.sendFilesAsAttachments) return { files };
				return {
					attachments: files.map((file) => ({
						type: fileAttachmentType(file.mimeType),
						data: file.data,
						name: file.filename,
						mimeType: file.mimeType,
					})),
				};
			}),
		);
	}

	/**
	 * Post the files that a run queued for its final reply. The read check
	 * runs again, because the files were checked when the tool ran.
	 */
	async postReplyFiles(
		thread: Thread<unknown, unknown>,
		platform: string,
		params: { fileIds: string[]; scope: OutboundFileScope; caption: string },
	): Promise<void> {
		const checked = await this.check(platform, params.fileIds, params.scope);
		if (!Array.isArray(checked)) throw new OperationalError(checked.error.message);
		const groups = await this.load(platform, checked);
		const caption: PostableMarkdown = { markdown: params.caption };
		await postWithFileGroups(async (message) => await thread.post(message), caption, groups);
	}
}

function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let start = 0; start < items.length; start += size) {
		chunks.push(items.slice(start, start + size));
	}
	return chunks;
}

function formatMegabytes(bytes: number): string {
	return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
