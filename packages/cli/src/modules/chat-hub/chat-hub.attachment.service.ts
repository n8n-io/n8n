import { Service } from '@n8n/di';
import { BINARY_ENCODING, type IBinaryData } from 'n8n-workflow';
import { BinaryDataService, TEMP_EXECUTION_ID } from 'n8n-core';
import { Not } from '@n8n/typeorm';
import { ChatHubMessageRepository } from './chat-message.repository';
import type { ChatMessageId, ChatSessionId } from '@n8n/api-types';
import { replaceTempExecutionId } from '@/execution-lifecycle/restore-binary-data-id';
import type { ChatHubMessage } from './chat-hub-message.entity';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@Service()
export class ChatHubAttachmentService {
	private readonly maxTotalSizeBytes = 200 * 1024 * 1024; // 200 MB

	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly messageRepository: ChatHubMessageRepository,
	) {}

	/**
	 * Stores attachments through BinaryDataService.
	 * This populates the 'id' field for attachments. When external storage is used,
	 * BinaryDataService replaces base64 data with the storage mode string (e.g., "filesystem-v2").
	 */
	async store(attachments: IBinaryData[], workflowId: string): Promise<IBinaryData[]> {
		let totalSize = 0;
		const attachmentsWithBuffer: Array<[IBinaryData, Buffer<ArrayBuffer>]> = [];

		for (const attachment of attachments) {
			if (attachment.id || !attachment.data) {
				continue;
			}

			const buffer = Buffer.from(attachment.data, BINARY_ENCODING);
			totalSize += buffer.length;

			if (totalSize > this.maxTotalSizeBytes) {
				const maxSizeMB = Math.floor(this.maxTotalSizeBytes / (1024 * 1024));

				throw new BadRequestError(
					`Total size of attachments exceeds maximum size of ${maxSizeMB} MB`,
				);
			}

			attachmentsWithBuffer.push([attachment, buffer]);
		}

		return await Promise.all(
			attachmentsWithBuffer.map(
				async ([attachment, buffer]) =>
					await this.binaryDataService.store(workflowId, TEMP_EXECUTION_ID, buffer, attachment),
			),
		);
	}

	/**
	 * Gets a specific attachment from a message by index and returns it as a buffer
	 */
	async getAttachment(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachmentIndex: number,
	): Promise<{ buffer: Buffer; attachment: IBinaryData }> {
		const message = await this.messageRepository.getOneById(messageId, sessionId, []);

		if (!message) {
			throw new NotFoundError('Message not found');
		}

		const attachment = message.attachments?.[attachmentIndex];

		if (!attachment) {
			throw new NotFoundError('Attachment not found');
		}

		const buffer = await this.binaryDataService.getAsBuffer(attachment);

		return { buffer, attachment };
	}

	/**
	 * Updates chat attachment paths by replacing /temp/ execution ID with the actual execution ID.
	 * This is called after workflow execution completes and binary data files have been renamed.
	 */
	async updateAttachmentPaths(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		executionId: string,
	): Promise<void> {
		const message = await this.messageRepository.getOneById(messageId, sessionId, []);

		if (!message || !message.attachments || message.attachments.length === 0) {
			return;
		}

		const updatedAttachments = message.attachments.map((attachment) => {
			if (!attachment.id) {
				return attachment;
			}

			const result = replaceTempExecutionId(executionId, attachment.id);

			return result ? { ...attachment, id: result.resolvedId } : attachment;
		});

		await this.messageRepository.updateChatMessage(messageId, {
			attachments: updatedAttachments,
		});
	}

	/**
	 * Deletes all files attached to messages in the session
	 */
	async deleteAllBySessionId(sessionId: string): Promise<void> {
		const messages = await this.messageRepository.getManyBySessionId(sessionId);

		await this.deleteByMessages(messages);
	}

	/**
	 * Deletes all chat attachment files.
	 */
	async deleteAll(): Promise<void> {
		const messages = await this.messageRepository.find({
			where: {
				attachments: Not(null),
			},
			select: ['attachments'],
		});

		await this.deleteByMessages(messages);
	}

	private async deleteByMessages(messages: ChatHubMessage[]) {
		const attachmentIds = new Set<string>();

		for (const message of messages) {
			for (const attachment of message.attachments ?? []) {
				if (attachment.id) {
					attachmentIds.add(attachment.id);
				}
			}
		}

		if (attachmentIds.size === 0) {
			return;
		}

		await this.binaryDataService.deleteManyByBinaryDataId(Array.from(attachmentIds.values()));
	}
}
