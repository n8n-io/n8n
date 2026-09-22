import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { assertSessionAccess, type AgentSessionAccess } from '../utils/agent-thread-access';

@Service()
export class AgentChatAttachmentRepository extends BaseRepository<AgentChatAttachment> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentChatAttachment, dataSource.manager, transactionRunner);
	}

	async saveForSession(
		attachment: AgentChatAttachment,
		session: AgentSessionAccess,
		ctx: OperationContext,
	): Promise<AgentChatAttachment> {
		const manager = this.managerFor(ctx);
		const thread = await manager.findOneBy(AgentExecutionThread, { id: session.threadId });
		assertSessionAccess(thread, session);
		return await manager.save(attachment);
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
