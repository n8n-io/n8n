import {
	MAX_SESSION_ATTACHMENT_PERSIST_BYTES,
	toSessionFileDto,
	type SessionFileDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { SourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { OperationalError, UserError, type IBinaryData } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { InstanceAiChatAttachment } from './entities/instance-ai-chat-attachment.entity';
import { InstanceAiChatAttachmentRepository } from './repositories/instance-ai-chat-attachment.repository';

const ATTACHMENT_SOURCE_TYPE: SourceType = 'instance_ai_chat_attachment';

export interface StoreInboundInstanceAiAttachmentParams {
	threadId: string;
	messageId?: string;
	fileName: string;
	mimeType: string;
	data: Buffer;
}

function buildAttachmentFileLocation(threadId: string, attachmentId: string) {
	return FileLocation.ofCustom({
		pathSegments: ['instance-ai', threadId, 'attachments', attachmentId],
		sourceType: ATTACHMENT_SOURCE_TYPE,
		sourceId: attachmentId,
	});
}

@Service()
export class InstanceAiChatAttachmentService {
	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly repository: InstanceAiChatAttachmentRepository,
	) {}

	async sumFileSizeBytesByThread(threadId: string): Promise<number> {
		return await this.repository.sumFileSizeBytesByThread(threadId);
	}

	async storeInbound(
		params: StoreInboundInstanceAiAttachmentParams,
	): Promise<InstanceAiChatAttachment> {
		const existingBytes = await this.repository.sumFileSizeBytesByThread(params.threadId);
		if (existingBytes + params.data.byteLength > MAX_SESSION_ATTACHMENT_PERSIST_BYTES) {
			throw new UserError('Session Attachments exceed 1.5 GB');
		}

		const attachmentId = generateNanoId();
		const binaryData: IBinaryData = {
			data: '',
			mimeType: params.mimeType,
			fileName: params.fileName,
		};
		const stored = await this.binaryDataService.store(
			buildAttachmentFileLocation(params.threadId, attachmentId),
			params.data,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Instance AI chat attachments require a persisted binary data storage mode',
			);
		}

		try {
			const attachment = this.repository.create({
				id: attachmentId,
				threadId: params.threadId,
				messageId: params.messageId ?? null,
				binaryDataId: stored.id,
				fileName: params.fileName,
				mimeType: params.mimeType,
				fileSizeBytes: params.data.byteLength,
			});
			return await this.repository.save(attachment);
		} catch (error) {
			await this.binaryDataService
				.deleteManyByBinaryDataId([stored.id])
				.catch((cleanupError: unknown) =>
					this.logger.warn('Failed to delete Instance AI chat attachment bytes', {
						binaryDataId: stored.id,
						error: cleanupError,
					}),
				);
			throw error;
		}
	}

	async listSessionFiles(threadId: string): Promise<SessionFileDto[]> {
		const rows = await this.repository.findByThread(threadId);
		return rows.map((row) => toSessionFileDto(row));
	}

	async findByIdInThread(
		attachmentId: string,
		threadId: string,
	): Promise<InstanceAiChatAttachment | null> {
		return await this.repository.findByIdInThread(attachmentId, threadId);
	}

	async getStream(attachment: InstanceAiChatAttachment): Promise<Readable> {
		return await this.binaryDataService.getAsStream(attachment.binaryDataId);
	}

	async deleteByThread(threadId: string): Promise<void> {
		await this.deleteAttachments(await this.repository.findByThread(threadId), { threadId });
	}

	async deleteByThreadIds(threadIds: string[]): Promise<void> {
		if (threadIds.length === 0) return;
		await this.deleteAttachments(await this.repository.findByThreadIds(threadIds), {
			threadIds: threadIds.join(','),
		});
	}

	private async deleteAttachments(
		attachments: InstanceAiChatAttachment[],
		logContext: Record<string, string>,
	): Promise<void> {
		if (attachments.length === 0) return;

		await this.repository.delete(attachments.map((attachment) => attachment.id));
		await this.binaryDataService
			.deleteManyByBinaryDataId(attachments.map((attachment) => attachment.binaryDataId))
			.catch((error: unknown) =>
				this.logger.warn('Failed to delete Instance AI chat attachment bytes', {
					...logContext,
					error,
				}),
			);
	}
}
