import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Repository } from '@n8n/typeorm';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';

@Service()
export class AgentChatAttachmentRepository extends Repository<AgentChatAttachment> {
	constructor(dataSource: DataSource) {
		super(AgentChatAttachment, dataSource.manager);
	}

	/** Scoped lookup for hydration: the reference must belong to the requesting conversation. */
	async findByIdInThread(
		id: string,
		scope: { projectId: string; threadId: string },
	): Promise<AgentChatAttachment | null> {
		return await this.findOneBy({ id, projectId: scope.projectId, threadId: scope.threadId });
	}

	async findByIdsInThread(
		ids: string[],
		scope: { projectId: string; threadId: string },
	): Promise<AgentChatAttachment[]> {
		return await this.findBy({ id: In(ids), projectId: scope.projectId, threadId: scope.threadId });
	}

	/** Scoped lookup for downloads: authorization checked at the agent/project level. */
	async findByIdForAgent(
		id: string,
		scope: { agentId: string; projectId: string },
	): Promise<AgentChatAttachment | null> {
		return await this.findOneBy({ id, agentId: scope.agentId, projectId: scope.projectId });
	}

	/**
	 * An attachment that a system chat stored for one memory resource. The
	 * caller checks access to its thread.
	 */
	async findByIdForSystemAgent(
		id: string,
		scope: { agentId: string; resourceId: string; source: string },
	): Promise<AgentChatAttachment | null> {
		return await this.findOneBy({ id, ...scope });
	}

	/**
	 * Thread lookup scoped to a project or agent — the scope carries the
	 * caller's authorization and lets the matching composite index
	 * ((projectId, threadId) or (agentId, threadId)) serve the query.
	 */
	async findByThread(
		threadId: string,
		scope: { projectId: string } | { agentId: string },
	): Promise<AgentChatAttachment[]> {
		return await this.findBy({ threadId, ...scope });
	}

	async findByIds(ids: string[]): Promise<AgentChatAttachment[]> {
		return await this.findBy({ id: In(ids) });
	}

	/** Oldest first, so a capped batch always removes the files most overdue. */
	async findFromSourceCreatedBefore(
		scope: { agentId: string; source: string },
		before: Date,
		limit: number,
	): Promise<AgentChatAttachment[]> {
		return await this.find({
			where: { agentId: scope.agentId, source: scope.source, createdAt: LessThan(before) },
			order: { createdAt: 'ASC' },
			take: limit,
		});
	}
}
