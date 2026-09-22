import { isAttachmentMediaTypeSupported } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { SourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { BuiltFileStore, ContentFileRef } from '@n8n/agents';
import { BinaryDataService, FileLocation, FileNotFoundError } from 'n8n-core';
import { OperationalError, type IBinaryData } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import type { AgentThreadAccess } from './entities/agent-execution-thread.entity';
import { AgentSessionLock } from './agent-session-lock.service';
import { AgentChatAttachmentRepository } from './repositories/agent-chat-attachment.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import {
	draftChatMemoryResourceId,
	isIntegrationMemoryResourceId,
	isTaskRunMemoryResourceId,
} from './utils/agent-memory-scope';
import { threadBelongsTo, type AgentSessionMode } from './utils/agent-thread-access';

// Typed against `SourceType` so a drift from the `binary_data` schema enum
// (see `packages/@n8n/db/src/entities/binary-data-file.ts`) is a compile error.
const ATTACHMENT_SOURCE_TYPE: SourceType = 'agent_chat_attachment';

export interface StoreInboundAttachmentParams {
	/** Null for inline agents, which have no `agents` row. */
	agentId: string | null;
	projectId: string;
	threadId: string;
	resourceId?: string;
	/** Surface the file arrived from, e.g. 'chat', 'slack', 'telegram'. */
	source: string;
	fileName: string;
	mimeType: string;
	data: Buffer;
	access: AgentThreadAccess;
	sessionMode: AgentSessionMode;
}

/** Reference passed from ingestion (controller/bridge) to the orchestrator. */
export interface StoredAttachmentRef {
	id: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
}

/**
 * One directory per attachment, so deleting a single file never touches
 * others. Inline agents share the `agents/inline/` directory (a real agent id
 * is a 16-char nano ID, so `inline` cannot collide).
 */
function buildAttachmentFileLocation(agentId: string | null, attachmentId: string) {
	return FileLocation.ofCustom({
		pathSegments: ['agents', agentId ?? 'inline', 'attachments', attachmentId],
		sourceType: ATTACHMENT_SOURCE_TYPE,
		sourceId: attachmentId,
	});
}

/**
 * Stores and resolves files users attach to agent conversations. Bytes live in
 * `BinaryDataService`; rows in `agent_chat_attachments` carry the metadata and
 * the authorization scope (project + thread). Message content parts reference
 * attachments by row id (`ContentFileRef.id`), resolved back to bytes through
 * the `BuiltFileStore` adapter injected into the agent runtime.
 */
@Service()
export class AgentChatAttachmentService {
	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly repository: AgentChatAttachmentRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly sessionLock: AgentSessionLock,
	) {}

	async storeInbound(params: StoreInboundAttachmentParams): Promise<AgentChatAttachment> {
		const attachmentId = generateNanoId();

		const binaryData: IBinaryData = {
			data: '',
			mimeType: params.mimeType,
			fileName: params.fileName,
		};
		const stored = await this.binaryDataService.store(
			buildAttachmentFileLocation(params.agentId, attachmentId),
			params.data,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Agent chat attachments require a persisted binary data storage mode',
			);
		}

		try {
			const attachment = this.repository.create({
				id: attachmentId,
				agentId: params.agentId,
				projectId: params.projectId,
				threadId: params.threadId,
				resourceId: params.resourceId ?? null,
				binaryDataId: stored.id,
				fileName: params.fileName,
				mimeType: params.mimeType,
				fileSizeBytes: params.data.byteLength,
				source: params.source,
			});
			return await this.sessionLock.run(
				params.threadId,
				async (ctx) =>
					await this.repository.saveForSession(
						attachment,
						{
							threadId: params.threadId,
							agentId: params.agentId,
							projectId: params.projectId,
							access: params.access,
							sessionMode: params.sessionMode,
						},
						ctx,
					),
			);
		} catch (error) {
			await this.binaryDataService
				.deleteManyByBinaryDataId([stored.id])
				.catch((cleanupError: unknown) =>
					this.logger.warn('Failed to delete agent chat attachment bytes', {
						binaryDataId: stored.id,
						error: cleanupError,
					}),
				);
			throw error;
		}
	}

	/** Return metadata only when the caller can read the session. */
	async getForAgent(
		attachmentId: string,
		scope: { agentId: string; projectId: string; userId: string },
	): Promise<AgentChatAttachment | null> {
		const attachment = await this.repository.findByIdForAgent(attachmentId, scope);
		if (!attachment) return null;
		const thread = await this.threadRepository.findOneBy({ id: attachment.threadId });
		if (thread) {
			return threadBelongsTo(thread, scope.projectId, scope.agentId, scope.userId)
				? attachment
				: null;
		}
		return attachment.resourceId === draftChatMemoryResourceId(scope.userId) ||
			isIntegrationMemoryResourceId(attachment.resourceId ?? undefined) ||
			isTaskRunMemoryResourceId(attachment.resourceId ?? undefined)
			? attachment
			: null;
	}

	async getStream(attachment: AgentChatAttachment): Promise<Readable> {
		return await this.binaryDataService.getAsStream(attachment.binaryDataId);
	}

	/**
	 * Compensating cleanup for a turn that failed before anything referenced its
	 * attachments — removes only the given rows, never the rest of the thread.
	 */
	async deleteByIds(attachmentIds: string[]): Promise<void> {
		if (attachmentIds.length === 0) return;
		await this.deleteAttachments(await this.repository.findByIds(attachmentIds), {
			attachmentIds: attachmentIds.join(','),
		});
	}

	/** `scope` carries the caller's authorization (project or agent) and drives index use. */
	async deleteByThread(
		threadId: string,
		scope: { projectId: string } | { agentId: string },
	): Promise<void> {
		await this.deleteAttachments(await this.repository.findByThread(threadId, scope), {
			threadId,
		});
	}

	/** Called before the agent row is removed, so bytes don't outlive the cascading rows. */
	async deleteByAgent(agentId: string): Promise<void> {
		await this.deleteAttachments(await this.repository.findBy({ agentId }), { agentId });
	}

	async deleteStoredData(
		binaryDataIds: string[],
		logContext: Record<string, string>,
	): Promise<void> {
		if (binaryDataIds.length === 0) return;
		await this.binaryDataService.deleteManyByBinaryDataId(binaryDataIds).catch((error: unknown) =>
			this.logger.warn('Failed to delete agent chat attachment bytes', {
				...logContext,
				error,
			}),
		);
	}

	private async deleteAttachments(
		attachments: AgentChatAttachment[],
		logContext: Record<string, string>,
	): Promise<void> {
		if (attachments.length === 0) return;

		await this.repository.delete(attachments.map((attachment) => attachment.id));
		await this.deleteStoredData(
			attachments.map((attachment) => attachment.binaryDataId),
			logContext,
		);
	}

	/**
	 * `BuiltFileStore` for an agent runtime. Lookups are scoped to the run's
	 * thread (+ project) when the runtime provides one, so a fileId from
	 * another conversation resolves to nothing; runs without a thread fall
	 * back to the agent + project scope. `provider` drives capability gating
	 * of hydration.
	 */
	getFileStore(scope: { agentId: string; projectId: string }, provider: string): BuiltFileStore {
		return {
			load: async (
				ref: ContentFileRef,
				runScope?: { threadId?: string },
			): Promise<Uint8Array | null> => {
				const attachment = runScope?.threadId
					? await this.repository.findByIdInThread(ref.id, {
							projectId: scope.projectId,
							threadId: runScope.threadId,
						})
					: await this.repository.findByIdForAgent(ref.id, scope);
				if (!attachment) return null;
				try {
					return await this.binaryDataService.getAsBuffer({
						id: attachment.binaryDataId,
						data: '',
						mimeType: attachment.mimeType,
					});
				} catch (error) {
					// Missing bytes are an expected lifecycle state (pruned or expired
					// storage) and recur on every turn of the thread, so they don't
					// warrant a warning; anything else is a real storage failure.
					if (error instanceof FileNotFoundError) {
						this.logger.debug('Agent chat attachment bytes no longer in storage', {
							attachmentId: ref.id,
						});
					} else {
						this.logger.warn('Failed to load agent chat attachment bytes', {
							attachmentId: ref.id,
							error,
						});
					}
					return null;
				}
			},
			isMediaTypeSupported: (mediaType) => isAttachmentMediaTypeSupported(provider, mediaType),
		};
	}
}
