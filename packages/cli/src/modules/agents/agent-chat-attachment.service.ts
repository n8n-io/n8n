import { isAttachmentMediaTypeSupported, type AgentToolOutputFile } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { isEntityNotFoundError, type SourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { BuiltFileStore, ContentFileRef } from '@n8n/agents';
import { BinaryDataService, FileLocation, FileNotFoundError } from 'n8n-core';
import { OperationalError, UserError, type IBinaryData } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import { AgentChatAttachmentRepository } from './repositories/agent-chat-attachment.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentFileGrantRepository } from './repositories/agent-file-grant.repository';
import {
	draftChatMemoryResourceId,
	isIntegrationMemoryResourceId,
	isTaskRunMemoryResourceId,
} from './utils/agent-memory-scope';
import { threadBelongsTo } from './utils/agent-thread-access';

// Typed against `SourceType` so a drift from the `binary_data` schema enum
// (see `packages/@n8n/db/src/entities/binary-data-file.ts`) is a compile error.
const ATTACHMENT_SOURCE_TYPE: SourceType = 'agent_chat_attachment';

const RETENTION_BATCH_SIZE = 500;

export interface StoreInboundAttachmentParams {
	/** Row ID for the file. A new ID is made when it is not set. */
	id?: string;
	/** Null for inline agents, which have no `agents` row. */
	agentId: string | null;
	projectId: string;
	/** Thread that makes the file. The root thread of its delegation tree owns it. */
	threadId: string;
	resourceId?: string;
	/** Surface the file arrived from, e.g. 'chat', 'slack', 'telegram'. */
	source: string;
	fileName: string;
	mimeType: string;
	data: Buffer;
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
 * Stores and resolves agent files. Bytes live in `BinaryDataService`; rows in
 * `agent_chat_attachments` carry the metadata and the authorization scope
 * (project + thread). Message content parts reference attachments by row id
 * (`ContentFileRef.id`), resolved back to bytes through the `BuiltFileStore`
 * adapter injected into the agent runtime.
 *
 * The root thread of a delegation tree owns every file of the tree and can
 * read all of them. A sub-agent thread can read the files that it made and
 * the files granted to it.
 */
@Service()
export class AgentChatAttachmentService {
	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly repository: AgentChatAttachmentRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly grantRepository: AgentFileGrantRepository,
	) {}

	async storeInbound(params: StoreInboundAttachmentParams): Promise<AgentChatAttachment> {
		const attachmentId = params.id ?? generateNanoId();
		const root = await this.findRootThread(params.threadId);
		// The download route authorizes by the owning agent, so a file that a
		// sub-agent makes takes the agent of the root thread.
		const agentId = root.id === params.threadId ? params.agentId : (root.agentId ?? params.agentId);

		const binaryData: IBinaryData = {
			data: '',
			mimeType: params.mimeType,
			fileName: params.fileName,
		};
		const stored = await this.binaryDataService.store(
			buildAttachmentFileLocation(agentId, attachmentId),
			params.data,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Agent chat attachments require a persisted binary data storage mode',
			);
		}

		try {
			return await this.repository.saveInboundAttachment(
				{
					id: attachmentId,
					agentId,
					projectId: params.projectId,
					threadId: root.id,
					createdByThreadId: params.threadId,
					resourceId: params.resourceId ?? null,
					binaryDataId: stored.id,
					fileName: params.fileName,
					mimeType: params.mimeType,
					fileSizeBytes: params.data.byteLength,
					source: params.source,
				},
				{},
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

	/**
	 * Return the file when the thread can read it: the root thread reads every
	 * file of its tree, a sub-agent thread reads the files that it made or got
	 * granted. Use this for every fileId that a run gives, such as tool input.
	 */
	async getReadable(
		attachmentId: string,
		scope: { projectId: string; threadId: string },
	): Promise<AgentChatAttachment | null> {
		const root = await this.findRootThread(scope.threadId);
		return await this.findReadable(attachmentId, scope, root.id);
	}

	/**
	 * Let a sub-agent thread read files of its parent. The parent must be able
	 * to read each file, so grants pass down the delegation chain one level at
	 * a time.
	 */
	async grantToSubAgent(
		attachmentIds: string[],
		scope: { projectId: string; parentThreadId: string; childThreadId: string },
	): Promise<void> {
		const chain = await this.threadRepository.findDelegationChain(scope.childThreadId);
		if (chain[1]?.id !== scope.parentThreadId) {
			throw new UserError('Files can only be granted to a sub-agent of this conversation');
		}
		const rootId = chain[chain.length - 1].id;
		const files = await this.repository.findByIdsInThread(
			attachmentIds,
			{ projectId: scope.projectId, threadId: rootId },
			{},
		);
		const creatorById = new Map(files.map((file) => [file.id, file.createdByThreadId]));
		const granted =
			scope.parentThreadId === rootId
				? new Set<string>()
				: await this.grantRepository.findGrantedIds(attachmentIds, scope.parentThreadId);
		for (const attachmentId of attachmentIds) {
			const readable =
				creatorById.has(attachmentId) &&
				(scope.parentThreadId === rootId ||
					creatorById.get(attachmentId) === scope.parentThreadId ||
					granted.has(attachmentId));
			if (!readable) throw new UserError(`File "${attachmentId}" not found in this conversation`);
		}
		await this.grantRepository.grant(attachmentIds, scope.childThreadId);
	}

	/**
	 * List the files that a sub-agent thread made and let its parent read them.
	 * The root thread reads them already, but a parent that is not the root
	 * cannot read them without this grant.
	 */
	async returnToParent(scope: {
		projectId: string;
		parentThreadId: string;
		childThreadId: string;
	}): Promise<AgentToolOutputFile[]> {
		const chain = await this.threadRepository.findDelegationChain(scope.childThreadId);
		if (chain[1]?.id !== scope.parentThreadId) {
			throw new UserError('Files can only be returned to the parent of a sub-agent');
		}
		const rootId = chain[chain.length - 1].id;
		const files = await this.repository.findCreatedByThread(
			scope.childThreadId,
			{ projectId: scope.projectId, threadId: rootId },
			{},
		);
		if (scope.parentThreadId !== rootId) {
			await this.grantRepository.grant(
				files.map((file) => file.id),
				scope.parentThreadId,
			);
		}
		return files.map((file) => ({
			fileId: file.id,
			fileName: file.fileName,
			mimeType: file.mimeType,
			sizeBytes: file.fileSizeBytes,
		}));
	}

	private async findRootThread(threadId: string) {
		const chain = await this.threadRepository.findDelegationChain(threadId);
		return chain[chain.length - 1];
	}

	private async findReadable(
		attachmentId: string,
		scope: { projectId: string; threadId: string },
		rootThreadId: string,
	): Promise<AgentChatAttachment | null> {
		const attachment = await this.repository.findByIdInThread(
			attachmentId,
			{ projectId: scope.projectId, threadId: rootThreadId },
			{},
		);
		if (!attachment) return null;
		if (scope.threadId === rootThreadId || attachment.createdByThreadId === scope.threadId) {
			return attachment;
		}
		return (await this.grantRepository.isGranted(attachment.id, scope.threadId))
			? attachment
			: null;
	}

	/**
	 * An attachment that a system chat stored for one memory resource. The
	 * caller checks access to its thread.
	 */
	async getForSystemAgent(
		attachmentId: string,
		scope: { agentId: string; resourceId: string; source: string },
	): Promise<AgentChatAttachment | null> {
		return await this.repository.findByIdForSystemAgent(attachmentId, scope, {});
	}

	/**
	 * Return metadata only when the caller can read the session. A file of a
	 * sub-agent session belongs to the agent of the root thread, so give
	 * `threadId` to check the read grants of that session instead.
	 */
	async getForAgent(
		attachmentId: string,
		scope: { agentId: string; projectId: string; userId: string; threadId?: string },
	): Promise<AgentChatAttachment | null> {
		const attachment = await this.repository.findByIdForAgent(attachmentId, scope, {});
		if (!attachment) {
			if (!scope.threadId) return null;
			const session = await this.threadRepository.findOneBy({ id: scope.threadId });
			if (!session || !threadBelongsTo(session, scope.projectId, scope.agentId, scope.userId)) {
				return null;
			}
			return await this.getReadable(attachmentId, {
				projectId: scope.projectId,
				threadId: scope.threadId,
			});
		}
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

	/** Whether the bytes of the file are still in storage. Retention can remove them. */
	async hasStoredData(attachment: AgentChatAttachment): Promise<boolean> {
		try {
			await this.binaryDataService.getMetadata(attachment.binaryDataId);
			return true;
		} catch (error) {
			// Filesystem, S3 and Azure throw FileNotFoundError. Database mode throws EntityNotFoundError.
			if (error instanceof FileNotFoundError || isEntityNotFoundError(error)) return false;
			throw error;
		}
	}

	async getBuffer(attachment: AgentChatAttachment): Promise<Buffer> {
		return await this.binaryDataService.getAsBuffer({
			id: attachment.binaryDataId,
			data: '',
			mimeType: attachment.mimeType,
		});
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
		await this.deleteAttachments(await this.repository.findByIds(attachmentIds, {}), {
			attachmentIds: attachmentIds.join(','),
		});
	}

	/** `scope` carries the caller's authorization (project or agent) and drives index use. */
	async deleteByThread(
		threadId: string,
		scope: { projectId: string } | { agentId: string },
	): Promise<void> {
		await this.deleteAttachments(await this.repository.findByThread(threadId, scope, {}), {
			threadId,
		});
	}

	/** Called before the agent row is removed, so bytes don't outlive the cascading rows. */
	async deleteByAgent(agentId: string): Promise<void> {
		await this.deleteAttachments(await this.repository.findByAgent(agentId, {}), { agentId });
	}

	/**
	 * Deletes the files an agent received from one channel before `before`, in
	 * batches, so a large backlog does not load into memory at once. Deletes
	 * bytes before rows so a storage failure leaves the rows for the next run.
	 */
	async deleteFromSourceCreatedBefore(
		scope: { agentId: string; source: string },
		before: Date,
		signal?: AbortSignal,
	): Promise<number> {
		let deleted = 0;
		while (!signal?.aborted) {
			const batch = await this.repository.findFromSourceCreatedBefore(
				scope,
				before,
				RETENTION_BATCH_SIZE,
				{},
			);
			if (batch.length === 0) break;
			await this.binaryDataService.deleteManyByBinaryDataId(
				batch.map((attachment) => attachment.binaryDataId),
			);
			await this.repository.deleteByIds(
				batch.map((attachment) => attachment.id),
				{},
			);
			deleted += batch.length;
			if (batch.length < RETENTION_BATCH_SIZE) break;
		}
		return deleted;
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

		await this.repository.deleteByIds(
			attachments.map((attachment) => attachment.id),
			{},
		);
		await this.deleteStoredData(
			attachments.map((attachment) => attachment.binaryDataId),
			logContext,
		);
	}

	/**
	 * `BuiltFileStore` for an agent runtime. Lookups check that the run's
	 * thread can read the file (see {@link getReadable}) when the runtime
	 * provides one, so a fileId from another conversation, or one not granted
	 * to a sub-agent, resolves to nothing; runs without a thread fall back to
	 * the agent + project scope. `provider` drives capability gating of
	 * hydration.
	 */
	getFileStore(scope: { agentId: string; projectId: string }, provider: string): BuiltFileStore {
		// Hydration loads many files for each model call. Find the root thread
		// one time for each thread. A thread never changes its parent, so the
		// value stays correct. Keep one entry, because a cached runtime can
		// live for a long time.
		let root: { threadId: string; id: Promise<string> } | undefined;
		const rootIdOf = async (threadId: string) => {
			if (root?.threadId !== threadId) {
				const id = this.findRootThread(threadId).then((thread) => thread.id);
				root = { threadId, id };
				// Do not keep a failed lookup.
				id.catch(() => {
					if (root?.id === id) root = undefined;
				});
			}
			return await root.id;
		};

		return {
			load: async (
				ref: ContentFileRef,
				runScope?: { threadId?: string },
			): Promise<Uint8Array | null> => {
				const threadId = runScope?.threadId;
				const attachment = threadId
					? await this.findReadable(
							ref.id,
							{ projectId: scope.projectId, threadId },
							await rootIdOf(threadId),
						)
					: await this.repository.findByIdForAgent(ref.id, scope, {});
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
