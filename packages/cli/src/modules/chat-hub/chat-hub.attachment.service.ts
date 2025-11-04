import { Service } from '@n8n/di';
import { BINARY_ENCODING, type IBinaryData } from 'n8n-workflow';
import { BinaryDataService } from 'n8n-core';
import { Not, IsNull } from '@n8n/typeorm';
import { ChatHubMessageRepository } from './chat-message.repository';
import type { ChatMessageId, ChatSessionId } from '@n8n/api-types';
import type { ChatHubMessage } from './chat-hub-message.entity';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type Stream from 'node:stream';

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
	async store(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		attachments: IBinaryData[],
	): Promise<IBinaryData[]> {
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
					await this.binaryDataService.store(
						{ type: 'chat-hub-message-attachment', sessionId, messageId },
						buffer,
						attachment,
					),
			),
		);
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
				| { type: 'buffer'; buffer: Buffer<ArrayBufferLike> }
				| { type: 'stream'; stream: Stream.Readable }
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
			const stream = await this.binaryDataService.getAsStream(attachment.id);

			return [attachment, { type: 'stream', stream }];
		}

		if (attachment.data) {
			const buffer = await this.binaryDataService.getAsBuffer(attachment);

			return [attachment, { type: 'buffer', buffer }];
		}

		throw new NotFoundError('Attachment has no stored file');
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
				attachments: Not(IsNull()),
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
