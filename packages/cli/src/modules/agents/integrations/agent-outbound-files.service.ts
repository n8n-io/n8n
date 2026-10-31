import { Service } from '@n8n/di';
import type { Attachment, PostableCard, PostableMarkdown, PostableRaw, Thread } from 'chat';
import { OperationalError } from 'n8n-workflow';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import {
	type AgentChatIntegration,
	ChatIntegrationRegistry,
	MAX_CHANNEL_SEND_FILE_BYTES,
	MAX_FILE_MESSAGES_PER_SEND,
} from './agent-chat-integration';
import { splitMessage } from './message-split';
import { INTEGRATION_ERROR_CODES } from './integration-error-codes';
import {
	outboundAttachmentType,
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

/** Loads the files of one message. Only one group is in memory at a time. */
export type OutboundFileGroup = () => Promise<OutboundFileFields>;

/**
 * Post a message with its files, one message for each file group. The text
 * or card goes with the first group. Text longer than `maxCaptionLength` or
 * `maxMessageLength` is posted on its own before the files, split at
 * `maxMessageLength`, so the platform does not cut it. Return the result of
 * the first post.
 */
export async function postWithFileGroups<T>(
	post: (message: OutboundPostable) => Promise<T>,
	message: OutboundPostable,
	groups: OutboundFileGroup[],
	limits: { maxCaptionLength?: number; maxMessageLength?: number } = {},
): Promise<T> {
	const [loadFirstGroup, ...otherGroups] = groups;
	if (!loadFirstGroup) return await post(message);
	const text = postableText(message);
	const { maxCaptionLength, maxMessageLength } = limits;
	const captionLimit = Math.min(maxCaptionLength ?? Infinity, maxMessageLength ?? Infinity);
	if (text !== undefined && text.length > captionLimit) {
		const parts = maxMessageLength === undefined ? [text] : splitMessage(text, maxMessageLength);
		let first: T | undefined;
		for (const part of parts) {
			const sent = await post(withText(message, part));
			first ??= sent;
		}
		const firstFiles = await post({ raw: '', ...(await loadFirstGroup()) });
		for (const loadGroup of otherGroups) await post({ raw: '', ...(await loadGroup()) });
		return first ?? firstFiles;
	}
	const firstGroup = await loadFirstGroup();
	const first = await post(
		typeof message === 'string' ? { raw: message, ...firstGroup } : { ...message, ...firstGroup },
	);
	for (const loadGroup of otherGroups) await post({ raw: '', ...(await loadGroup()) });
	return first;
}

function postableText(message: OutboundPostable): string | undefined {
	if (typeof message === 'string') return message;
	if ('raw' in message) return message.raw;
	if ('markdown' in message) return message.markdown;
	return undefined;
}

function withText(message: OutboundPostable, text: string): OutboundPostable {
	if (typeof message === 'string') return text;
	if ('markdown' in message) return { markdown: text };
	return { raw: text };
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
		const messages = this.group(platform, attachments).length;
		if (messages > MAX_FILE_MESSAGES_PER_SEND) {
			return integrationError(
				INTEGRATION_ERROR_CODES.FILE_UPLOAD_LIMIT_EXCEEDED,
				`The ${platform} integration needs ${messages} messages for these files, and one action sends files in up to ${MAX_FILE_MESSAGES_PER_SEND} messages. Send the other files with another action.`,
			);
		}
		return attachments;
	}

	/** Split files into the groups that the platform can send in one message. */
	private group(platform: string, attachments: AgentChatAttachment[]): AgentChatAttachment[][] {
		const integration = this.integrationRegistry.get(platform);
		const maxFiles = integration?.fileUploadLimits?.maxFiles ?? attachments.length;
		return (integration?.groupOutboundFiles?.(attachments) ?? [attachments]).flatMap((group) =>
			chunk(group, maxFiles),
		);
	}

	/**
	 * Split checked files into the groups that the platform can send in one
	 * message. Each group loads its files only when it is posted.
	 */
	groups(platform: string, attachments: AgentChatAttachment[]): OutboundFileGroup[] {
		const integration = this.integrationRegistry.get(platform);
		return this.group(platform, attachments).map((group) => async () => {
			// Each file is loaded into memory. MAX_CHANNEL_SEND_FILE_BYTES caps the size.
			const loaded = await Promise.all(
				group.map(async (attachment) => ({
					attachment,
					data: await this.attachmentService.getBuffer(attachment),
				})),
			);
			if (!integration?.sendFilesAsAttachments) {
				return {
					files: loaded.map(({ attachment, data }) => ({
						data,
						filename: attachment.fileName,
						mimeType: attachment.mimeType,
					})),
				};
			}
			const maxImageBytes = integration.fileUploadLimits?.maxImageBytes;
			return {
				attachments: loaded.map(({ attachment, data }) => ({
					type: outboundAttachmentType(attachment, maxImageBytes),
					data,
					name: attachment.fileName,
					mimeType: attachment.mimeType,
				})),
			};
		});
	}

	/**
	 * Post the files that a run queued for its final reply. The read check
	 * runs again, because the files were checked when the tool ran.
	 */
	async postReplyFiles(
		thread: Thread<unknown, unknown>,
		platform: string,
		params: {
			fileIds: string[];
			scope: OutboundFileScope;
			caption: string;
			/** Called after each message that is posted. The first one carries the caption. */
			onPosted?: () => void;
		},
	): Promise<void> {
		const checked = await this.check(platform, params.fileIds, params.scope);
		if (!Array.isArray(checked)) throw new OperationalError(checked.error.message);
		const caption: PostableMarkdown = { markdown: params.caption };
		await postWithFileGroups(
			async (message) => {
				const sent = await thread.post(message);
				params.onPosted?.();
				return sent;
			},
			caption,
			this.groups(platform, checked),
			captionLimits(this.integrationRegistry.get(platform)),
		);
	}
}

export function captionLimits(integration: AgentChatIntegration | undefined) {
	return {
		maxCaptionLength: integration?.fileUploadLimits?.maxCaptionLength,
		maxMessageLength: integration?.maxMessageLength,
	};
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
