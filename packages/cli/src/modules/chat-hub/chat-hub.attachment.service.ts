import type { ChatMessageId, ChatSessionId, ChatAttachment } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Not, IsNull } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import { sanitizeFilename } from '@n8n/utils';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { BINARY_ENCODING, type IBinaryData } from 'n8n-workflow';
import type Stream from 'node:stream';

import { ChatHubMessageRepository } from './chat-message.repository';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ChatHubAttachmentService {
	private readonly maxTotalSizeBytes = 200 * 1024 * 1024; // 200 MB

	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly messageRepository: ChatHubMessageRepository,
	) {}

	/**
	 * Stores attachments through BinaryDataService.
	 * This populates the 'id' and other metadata for attachments. When external storage is used,
	 * BinaryDataService replaces base64 data with the storage mode string (e.g., "filesystem-v2").
	 */
	async store(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachments: ChatAttachment[],
	): Promise<IBinaryData[]> {
		let totalSize = 0;
		const storedAttachments: IBinaryData[] = [];

		for (const attachment of attachments) {
			const buffer = Buffer.from(attachment.data, BINARY_ENCODING);
			totalSize += buffer.length;

			if (totalSize > this.maxTotalSizeBytes) {
				const maxSizeMB = Math.floor(this.maxTotalSizeBytes / (1024 * 1024));

				throw new BadRequestError(
					`Total size of attachments exceeds maximum size of ${maxSizeMB} MB`,
				);
			}

			const stored = await this.processAttachment(sessionId, messageId, attachment, buffer);
			storedAttachments.push(stored);
		}

		return storedAttachments;
	}

	/*
	 * Gets a specific attachment from a message by index and returns it as either buffer or stream
	 */
	async getAttachment(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachmentIndex: number,
	): Promise<
		[
			IBinaryData,
			(
				| { type: 'buffer'; buffer: Buffer<ArrayBufferLike>; fileSize: number }
				| { type: 'stream'; stream: Stream.Readable; fileSize: number }
			),
		]
	> {
		const message = await this.messageRepository.getOneById(messageId, sessionId, []);

		if (!message) {
			throw new NotFoundError('Message not found');
		}

		const attachment = message.attachments?.[attachmentIndex];

		if (!attachment) {
			throw new NotFoundError('Attachment not found');
		}

		if (attachment.id) {
			const metadata = await this.binaryDataService.getMetadata(attachment.id);
			const stream = await this.binaryDataService.getAsStream(attachment.id);

			return [attachment, { type: 'stream', stream, fileSize: metadata.fileSize }];
		}

		if (attachment.data) {
			const buffer = await this.binaryDataService.getAsBuffer(attachment);

			return [attachment, { type: 'buffer', buffer, fileSize: buffer.length }];
		}

		throw new NotFoundError('Attachment has no stored file');
	}

	/**
	 * Deletes all files attached to messages in the session
	 */
	async deleteAllBySessionId(sessionId: string, trx?: EntityManager): Promise<void> {
		const messages = await this.messageRepository.getManyBySessionId(sessionId, trx);
		// Attachment deletion cannot be rolled back, and the transaction doesn't cover it.
		await this.deleteAttachments(messages.flatMap((message) => message.attachments ?? []));
	}

	/**
	 * Deletes all chat attachment files.
	 */
	async deleteAll(): Promise<void> {
		const messages = await this.messageRepository.find({
			where: {
				attachments: Not(IsNull()),
			},
			select: ['attachments'],
		});

		await this.deleteAttachments(messages.flatMap((message) => message.attachments ?? []));
	}

	/**
	 * Deletes attachments by their binary data directly (used for rollback when message wasn't saved)
	 */
	async deleteAttachments(attachments: IBinaryData[]): Promise<void> {
		await this.binaryDataService.deleteManyByBinaryDataId(
			attachments.flatMap((attachment) => (attachment.id ? [attachment.id] : [])),
		);
	}

	async getDataUrl(binaryData: IBinaryData): Promise<string> {
		if (binaryData.data.startsWith('data:')) {
			return binaryData.data;
		}

		const buffer = await this.binaryDataService.getAsBuffer(binaryData);
		const base64Data = buffer.toString(BINARY_ENCODING);
		const mimeType = binaryData.mimeType || 'application/octet-stream';

		return `data:${mimeType};base64,${base64Data}`;
	}

	async getAsBuffer(binaryData: IBinaryData): Promise<Buffer<ArrayBufferLike>> {
		return await this.binaryDataService.getAsBuffer(binaryData);
	}

	/**
	 * Processes a single attachment by populating metadata and storing it.
	 */
	private async processAttachment(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachment: ChatAttachment,
		buffer: Buffer,
	): Promise<IBinaryData> {
		const sanitizedFileName = sanitizeFilename(attachment.fileName);

		// Construct IBinaryData with all required fields
		const binaryData: IBinaryData = {
			data: attachment.data,
			mimeType: attachment.mimeType,
			fileName: sanitizedFileName,
			fileSize: `${buffer.length}`,
			fileExtension: sanitizedFileName?.split('.').pop(),
		};

		return await this.binaryDataService.store(
			FileLocation.ofCustom({
				sourceType: 'chat_message_attachment',
				pathSegments: ['chat-hub', 'sessions', sessionId, 'messages', messageId],
				sourceId: messageId,
			}),
			buffer,
			binaryData,
		);
	}
}
