import { Logger } from '@n8n/backend-common';
import { type User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import {
	AgentChatAttachmentService,
	type StoredAttachmentRef,
} from './agent-chat-attachment.service';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import {
	AgentThreadQueueFullError,
	MAX_AGENT_THREAD_WAITERS,
} from './agent-thread-turn-coordinator';
import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import {
	AgentExecutionRepository,
	type AgentExecutionUserTurn,
} from './repositories/agent-execution.repository';
import {
	draftChatMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';

export interface EnqueueChatMessageParams {
	agentId: string;
	agentName: string;
	projectId: string;
	threadId: string;
	message: string;
	attachments?: StoredAttachmentRef[];
	/** Memory resource id of the sender (`draft-chat:<userId>`). */
	resourceId: string;
}

/** Scopes a queued row to the sender and to the agent named in the request. */
export interface QueuedMessageRef {
	executionId: string;
	agentId: string;
	projectId: string;
	resourceId: string;
}

/**
 * Preview-chat messages sent while the thread's turn runs. Each waits as a
 * `queued` execution row and runs as its own turn, oldest first, once the
 * thread is idle. Every tab sees the rows through the usual execution update
 * push, and the sender can edit or remove them until the drain picks them up.
 */
@Service()
export class AgentChatQueueService {
	/** Threads with a drain in this process; `again` reruns it once the current pass ends. */
	private readonly drains = new Map<string, { again: boolean }>();

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly executionService: AgentExecutionService,
		private readonly attachmentService: AgentChatAttachmentService,
		private readonly broadcaster: AgentExecutionUpdateBroadcaster,
		private readonly userRepository: UserRepository,
		private readonly orchestrator: AgentExecutionOrchestratorService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/** Store a message for the thread. Answers 409 when the thread has its maximum of waiting messages. */
	async enqueue(params: EnqueueChatMessageParams): Promise<string> {
		const { message, ...scope } = params;
		const waiting = await this.executionRepository.countQueuedByThread(scope.threadId);
		if (waiting >= MAX_AGENT_THREAD_WAITERS) {
			throw new ConflictError(new AgentThreadQueueFullError().message);
		}
		const executionId = await this.executionService.recordQueuedExecution({
			...scope,
			userMessage: message,
		});
		this.requestDrain(scope.threadId);
		return executionId;
	}

	/** Replace the text of a waiting message. 404 for an unknown or foreign row, 409 once it started. */
	async editQueued(ref: QueuedMessageRef, message: string): Promise<void> {
		const { row, thread } = await this.findOwnQueued(ref);
		if (!(await this.executionRepository.updateQueuedMessage(row.id, message))) {
			throw new ConflictError('This message has already started');
		}
		this.notify(thread, row.id);
	}

	/** Remove a waiting message and its attachments. 404 for an unknown or foreign row, 409 once it started. */
	async removeQueued(ref: QueuedMessageRef): Promise<void> {
		const { row, thread } = await this.findOwnQueued(ref);
		if (!(await this.executionRepository.deleteQueued(row.id))) {
			throw new ConflictError('This message has already started');
		}
		if (row.attachments?.length) {
			await this.attachmentService.deleteByIds(row.attachments.map(({ id }) => id));
		}
		this.notify(thread, row.id);
	}

	/** Run the thread's waiting messages in the background, oldest first. Cheap to call often. */
	requestDrain(threadId: string): void {
		const active = this.drains.get(threadId);
		if (active) {
			active.again = true;
			return;
		}
		const state = { again: true };
		this.drains.set(threadId, state);
		void (async () => {
			while (state.again) {
				state.again = false;
				await this.drain(threadId);
			}
		})()
			.catch((error: unknown) => {
				this.logger.warn('Failed to run queued agent chat messages', { threadId, error });
			})
			.finally(() => this.drains.delete(threadId));
	}

	/** Restart the drains of every thread with waiting messages, e.g. after a main restarted. */
	async drainAll(): Promise<void> {
		for (const threadId of await this.executionRepository.findThreadIdsWithQueued()) {
			this.requestDrain(threadId);
		}
	}

	private async drain(threadId: string): Promise<void> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		if (!thread) return;
		for (;;) {
			const row = await this.executionRepository.findOldestQueuedByThread(threadId);
			if (!row) return;
			if ((await this.runQueued(row, thread)) === 'deferred') return;
		}
	}

	private async runQueued(
		row: AgentExecutionUserTurn,
		thread: AgentExecutionThread,
	): Promise<'ran' | 'skipped' | 'deferred'> {
		let user: User;
		try {
			user = await this.resolveSender(row.resourceId, thread.projectId);
		} catch (error) {
			// Without a runnable sender the row can never start; end it so the drain moves on.
			await this.executionService.failQueuedExecution(
				{
					id: row.id,
					threadId: row.threadId,
					agentId: thread.agentId,
					projectId: thread.projectId,
				},
				error,
			);
			return 'skipped';
		}
		return await this.orchestrator.executeForQueued({
			agentId: thread.agentId,
			projectId: thread.projectId,
			executionId: row.id,
			threadId: row.threadId,
			user,
			resourceId: draftChatMemoryResourceId(user.id),
		});
	}

	/** The sender must still be able to run the agent; the drain has no request that checked that. */
	private async resolveSender(resourceId: string | null, projectId: string): Promise<User> {
		const userId = resourceId ? userIdFromDraftChatMemoryResourceId(resourceId) : undefined;
		const user = userId ? await this.userRepository.findByIdWithRole(userId) : null;
		if (!user || user.disabled) {
			throw new OperationalError('The user who sent this message is no longer active');
		}
		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
			throw new OperationalError('The user who sent this message can no longer run this agent');
		}
		return user;
	}

	private async findOwnQueued(
		ref: QueuedMessageRef,
	): Promise<{ row: AgentExecutionUserTurn; thread: AgentExecutionThread }> {
		const row = await this.executionRepository.findUserTurnById(ref.executionId);
		const thread = row ? await this.threadRepository.findOneBy({ id: row.threadId }) : null;
		if (
			!row ||
			!thread ||
			row.resourceId !== ref.resourceId ||
			!threadBelongsTo(thread, ref.projectId, ref.agentId)
		) {
			throw new NotFoundError(`Queued message "${ref.executionId}" not found`);
		}
		if (row.status !== 'queued') throw new ConflictError('This message has already started');
		return { row, thread };
	}

	private notify(thread: AgentExecutionThread, executionId: string): void {
		this.broadcaster.notify({
			projectId: thread.projectId,
			agentId: thread.agentId,
			threadId: thread.id,
			executionId,
		});
	}
}
