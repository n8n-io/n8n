import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Not } from '@n8n/typeorm';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';

class AgentChatAttachmentTable extends BaseRepository<AgentChatAttachment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentChatAttachment, dataSource.manager, transactionRunner);
	}
}

type InboundAttachment = Pick<
	AgentChatAttachment,
	| 'agentId'
	| 'projectId'
	| 'threadId'
	| 'createdByThreadId'
	| 'resourceId'
	| 'binaryDataId'
	| 'fileName'
	| 'mimeType'
	| 'fileSizeBytes'
	| 'source'
> & { id?: string; contentHash?: string | null };

@Service()
export class AgentChatAttachmentRepository {
	private readonly table: AgentChatAttachmentTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AgentChatAttachmentTable(dataSource, transactionRunner);
	}

	async saveInboundAttachment(
		params: InboundAttachment,
		ctx: OperationContext,
	): Promise<AgentChatAttachment> {
		const manager = this.table.managerFor(ctx);
		const attachment = manager.create(AgentChatAttachment, params);
		return await manager.save(AgentChatAttachment, attachment);
	}

	/** Scoped lookup for hydration: the reference must belong to the requesting conversation. */
	async findByIdInThread(
		id: string,
		scope: { projectId: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment | null> {
		return await this.table.managerFor(ctx).findOneBy(AgentChatAttachment, {
			id,
			projectId: scope.projectId,
			threadId: scope.threadId,
		});
	}

	async findByIdsInThread(
		ids: string[],
		scope: { projectId: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).findBy(AgentChatAttachment, {
			id: In(ids),
			projectId: scope.projectId,
			threadId: scope.threadId,
		});
	}

	/** Scoped lookup for downloads: authorization checked at the agent/project level. */
	async findByIdForAgent(
		id: string,
		scope: { agentId: string; projectId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment | null> {
		return await this.table.managerFor(ctx).findOneBy(AgentChatAttachment, {
			id,
			agentId: scope.agentId,
			projectId: scope.projectId,
		});
	}

	/**
	 * An attachment that a system chat stored for one memory resource. The
	 * caller checks access to its thread.
	 */
	async findByIdForSystemAgent(
		id: string,
		scope: { agentId: string; resourceId: string; source: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment | null> {
		return await this.table.managerFor(ctx).findOneBy(AgentChatAttachment, { id, ...scope });
	}

	/**
	 * Thread lookup scoped to a project or agent — the scope carries the
	 * caller's authorization and lets the matching composite index
	 * ((projectId, threadId) or (agentId, threadId)) serve the query.
	 */
	async findByThread(
		threadId: string,
		scope: { projectId: string } | { agentId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).findBy(AgentChatAttachment, { threadId, ...scope });
	}

	/** Files of one delegation tree that one thread made. */
	async findCreatedByThread(
		createdByThreadId: string,
		scope: { projectId: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		return await this.table
			.managerFor(ctx)
			.findBy(AgentChatAttachment, { createdByThreadId, ...scope });
	}

	/** Files of one delegation tree with one of the given content hashes, newest first. */
	async findByHashesInThread(
		hashes: string[],
		scope: { projectId: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		if (hashes.length === 0) return [];
		return await this.table.managerFor(ctx).find(AgentChatAttachment, {
			where: { contentHash: In(hashes), ...scope },
			order: { createdAt: 'DESC' },
		});
	}

	/** File count and bytes of one delegation tree, in total and for the given sources. */
	async sumUsageInThread(
		scope: { projectId: string; threadId: string },
		sources: string[],
		ctx: OperationContext,
	): Promise<{ totalBytes: number; sourceCount: number; sourceBytes: number }> {
		const raw = await this.table
			.managerFor(ctx)
			.createQueryBuilder(AgentChatAttachment, 'file')
			.select('COALESCE(SUM(file.fileSizeBytes), 0)', 'totalBytes')
			.addSelect('COUNT(CASE WHEN file.source IN (:...sources) THEN 1 END)', 'sourceCount')
			.addSelect(
				'COALESCE(SUM(CASE WHEN file.source IN (:...sources) THEN file.fileSizeBytes END), 0)',
				'sourceBytes',
			)
			.where('file.projectId = :projectId AND file.threadId = :threadId', scope)
			.setParameter('sources', sources)
			.getRawOne<{ totalBytes: unknown; sourceCount: unknown; sourceBytes: unknown }>();
		return {
			totalBytes: Number(raw?.totalBytes ?? 0),
			sourceCount: Number(raw?.sourceCount ?? 0),
			sourceBytes: Number(raw?.sourceBytes ?? 0),
		};
	}

	/** Files of one delegation tree, newest first, without the given source. */
	async findInThreadNewestFirst(
		scope: { projectId: string; threadId: string },
		excludeSource: string,
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).find(AgentChatAttachment, {
			where: { ...scope, source: Not(excludeSource) },
			order: { createdAt: 'DESC' },
		});
	}

	async findByIds(ids: string[], ctx: OperationContext): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).findBy(AgentChatAttachment, { id: In(ids) });
	}

	async findByAgent(agentId: string, ctx: OperationContext): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).findBy(AgentChatAttachment, { agentId });
	}

	async deleteByIds(ids: string[], ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(AgentChatAttachment, ids);
	}

	/** Oldest first, so a capped batch always removes the files most overdue. */
	async findFromSourceCreatedBefore(
		scope: { agentId: string; source: string },
		before: Date,
		limit: number,
		ctx: OperationContext,
	): Promise<AgentChatAttachment[]> {
		return await this.table.managerFor(ctx).find(AgentChatAttachment, {
			where: { agentId: scope.agentId, source: scope.source, createdAt: LessThan(before) },
			order: { createdAt: 'ASC' },
			take: limit,
		});
	}
}
