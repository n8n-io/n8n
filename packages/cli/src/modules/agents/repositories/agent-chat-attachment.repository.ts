import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

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

	/** Scoped lookup for downloads: authorization checked at the agent/project level. */
	async findByIdForAgent(
		id: string,
		scope: { agentId: string; projectId: string },
	): Promise<AgentChatAttachment | null> {
		return await this.findOneBy({ id, agentId: scope.agentId, projectId: scope.projectId });
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
}
