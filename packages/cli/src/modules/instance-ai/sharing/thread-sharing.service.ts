import type {
	InstanceAiThreadHistoryQuery,
	InstanceAiThreadHistoryResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';

import { AgentExecutionThreadRepository } from '../../agents/repositories/agent-execution-thread.repository';
import { isSharedThread } from '../../agents/utils/agent-thread-access';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { SharedThreadFields } from './shared-thread-fields';
import { SharedThreadPolicy } from './shared-thread-policy';
import { isThreadOwner } from './thread-access';

/**
 * Shares Assistant threads with their team project, and lists and reads them for the owner
 * and the teammates. `SharedThreadPolicy` decides who can do what.
 */
@Service()
export class ThreadSharingService {
	constructor(
		private readonly threads: AgentExecutionThreadRepository,
		private readonly memory: InstanceAiMemoryService,
		private readonly policy: SharedThreadPolicy,
		private readonly fields: SharedThreadFields,
	) {}

	/**
	 * Share the owner's chat with its team project. Sharing a shared chat again changes
	 * nothing. A child session of a chat is not a chat, so it is not found.
	 */
	async share(user: User, threadId: string): Promise<InstanceAiThreadInfo> {
		const thread = await this.threads.findOneBy({ id: threadId, agentId: ASSISTANT_AGENT_ID });
		if (!thread || thread.parentThreadId !== null) throw new NotFoundError('Thread not found');
		await this.policy.assertCanShare(user, thread);
		if (thread.accessScope === 'user' && !(await this.threads.shareWithProject(thread.id, user.id))) {
			await this.assertSharedBy(user, thread.id);
		}
		return await this.getThreadInfo(user, thread.id);
	}

	/**
	 * After a share that changed no row. Another request can have shared the chat at the same
	 * time, which is the result that the user wants. Any other change makes the share fail.
	 */
	private async assertSharedBy(user: User, threadId: string): Promise<void> {
		const current = await this.threads.findOneBy({ id: threadId });
		if (!current || !isSharedThread(current) || !isThreadOwner(user, current)) {
			throw new ConflictError('This chat changed while it was shared. Try again.');
		}
	}

	/** Throws NotFoundError unless the user owns the thread or can read it as a teammate. */
	async assertCanRead(
		user: User,
		threadId: string,
		options: { allowNew?: boolean } = {},
	): Promise<void> {
		const thread = await this.threads.findOneBy({ id: threadId });
		if (!thread && options.allowNew) return;
		if (thread?.agentId === ASSISTANT_AGENT_ID && (await this.policy.canRead(user, thread))) return;
		throw new NotFoundError('Thread not found');
	}

	/** The thread summary for `viewer`, with the sharing fields when the thread is shared. */
	async getThreadInfo(viewer: User, threadId: string): Promise<InstanceAiThreadInfo> {
		const [thread] = await this.fields.addTo(viewer, [await this.memory.getThreadInfo(threadId)]);
		return thread;
	}

	/** The user's threads and the threads shared in the user's team projects. */
	async listThreads(user: User): Promise<InstanceAiThreadListResponse> {
		const projectIds = await this.policy.readableProjectIds(user);
		const list = await this.memory.listThreads(user.id, 0, 100, projectIds);
		return { ...list, threads: await this.fields.addTo(user, list.threads) };
	}

	async listThreadHistory(
		user: User,
		query: InstanceAiThreadHistoryQuery,
	): Promise<InstanceAiThreadHistoryResponse> {
		const projectIds = await this.policy.readableProjectIds(user);
		const page = await this.memory.listThreadHistory(user.id, query, projectIds);
		return { ...page, threads: await this.fields.addTo(user, page.threads) };
	}
}
