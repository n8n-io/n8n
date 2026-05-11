import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { AgentExecution } from './entities/agent-execution.entity';
import { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import type { MessageRecord } from './execution-recorder';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userMessage: string;
	record: MessageRecord;
	/** Set to 'suspended' or 'resumed' for HITL tool call flows. */
	hitlStatus?: 'suspended' | 'resumed';
	/** Where the message originated from, e.g. 'chat', 'slack'. */
	source?: string;
}

export interface ThreadDetail {
	thread: AgentExecutionThread;
	executions: AgentExecution[];
}

export interface ThreadListItem extends AgentExecutionThread {
	firstMessage: string | null;
}

@Service()
export class AgentExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentExecutionThreadRepository: AgentExecutionThreadRepository,
		private readonly n8nMemory: N8nMemory,
	) {}

	/**
	 * Record a single agent run within a thread.
	 * Creates or updates the thread, then inserts one row into agent_execution.
	 */
	async recordMessage(params: RecordMessageParams): Promise<string> {
		const { threadId, agentId, agentName, projectId, record, source, hitlStatus } = params;

		// Ensure the thread exists and bump its updatedAt
		const { thread, created } = await this.agentExecutionThreadRepository.findOrCreate(
			threadId,
			agentId,
			agentName,
			projectId,
		);
		if (!created) {
			await this.agentExecutionThreadRepository.bumpUpdatedAt(threadId);
			// Sync title from the SDK memory thread if we don't have one yet
			if (!thread.title) {
				await this.syncTitleFromMemory(threadId);
			}
		}

		// Replace platform mentions (e.g. Slack's <@U0ANB4K6611> or plain @U0ANB4K6611)
		const cleanedMessage = params.userMessage
			.replace(/<@[A-Z0-9]+>/gi, `@${agentName}`)
			.replace(/@[A-Z0-9]{8,}/gi, `@${agentName}`)
			.trim();

		const status: AgentExecution['status'] = record.error ? 'error' : 'success';
		const startedAt = new Date(record.startTime);
		const stoppedAt = new Date(record.startTime + record.duration);

		const inserted = await this.agentExecutionRepository.save(
			this.agentExecutionRepository.create({
				threadId,
				status,
				startedAt,
				stoppedAt,
				duration: record.duration,
				userMessage: cleanedMessage,
				assistantResponse: record.assistantResponse,
				model: record.model,
				promptTokens: record.usage?.promptTokens ?? null,
				completionTokens: record.usage?.completionTokens ?? null,
				totalTokens: record.usage?.totalTokens ?? null,
				cost: record.totalCost,
				toolCalls: record.toolCalls.length > 0 ? record.toolCalls : null,
				timeline: record.timeline.length > 0 ? record.timeline : null,
				error: record.error,
				hitlStatus: hitlStatus ?? null,
				workingMemory: record.workingMemory,
				source: source ?? null,
			}),
		);

		// When a resumed execution completes with usage data, backfill any
		// preceding suspended executions in the same thread that are missing it.
		if (hitlStatus === 'resumed' && record.model) {
			await this.backfillSuspendedExecutions(threadId, record.model);
		}

		// Atomically increment token/cost/duration counters on the thread
		if (record.usage) {
			await this.agentExecutionThreadRepository.incrementUsage(
				threadId,
				record.usage.promptTokens,
				record.usage.completionTokens,
				record.totalCost ?? 0,
				record.duration,
			);
		}

		this.logger.debug('Recorded agent execution', {
			executionId: inserted.id,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});

		// Title generation now runs synchronously (sync: true) before the stream
		// ends, so by this point the memory thread should have the title.
		// Sync it to our execution thread on the first message.
		if (created) {
			await this.syncTitleFromMemory(threadId);
		}

		return inserted.id;
	}

	/**
	 * Backfill `model` on suspended runs in a thread that don't yet have it.
	 * Called when the resumed run finishes — the model applies to the whole
	 * suspend/resume cycle but only arrives once the resume completes.
	 */
	private async backfillSuspendedExecutions(threadId: string, model: string): Promise<void> {
		const candidates = await this.agentExecutionRepository.findSuspendedWithoutModel(threadId);
		if (candidates.length === 0) return;
		await this.agentExecutionRepository.backfillModel(
			candidates.map((c) => c.id),
			model,
		);
	}

	/**
	 * Try to read the title from the SDK memory thread and sync it to our execution thread.
	 * The SDK's titleGeneration runs fire-and-forget after the first message,
	 * so the title is typically available by the second message.
	 */
	private async syncTitleFromMemory(threadId: string): Promise<void> {
		try {
			const memoryThread = await this.n8nMemory.getThread(threadId);
			if (memoryThread?.title) {
				const emoji =
					memoryThread.metadata && typeof memoryThread.metadata.emoji === 'string'
						? memoryThread.metadata.emoji
						: null;
				await this.agentExecutionThreadRepository.update(threadId, {
					title: memoryThread.title,
					...(emoji && { emoji }),
				});
			}
		} catch {
			// Memory thread may not exist (agent without memory configured) — ignore
		}
	}

	/**
	 * Delete a thread and all its associated runs. The FK on agent_execution
	 * cascades, so deleting the thread removes the runs in one statement.
	 */
	async deleteThread(projectId: string, threadId: string): Promise<boolean> {
		// Verify ownership before deleting anything
		const thread = await this.agentExecutionThreadRepository.findOneBy({
			id: threadId,
			projectId,
		});
		if (!thread) return false;

		await this.n8nMemory.deleteThread(threadId);
		await this.agentExecutionThreadRepository.delete({ id: threadId });
		return true;
	}

	/**
	 * Get paginated execution threads for a project.
	 * Optionally filtered by agentId. Each thread is annotated with the
	 * first non-empty user message for preview.
	 */
	async getThreads(
		projectId: string,
		limit: number,
		cursor?: string,
		agentId?: string,
	): Promise<{ threads: ThreadListItem[]; nextCursor: string | null }> {
		const page = await this.agentExecutionThreadRepository.findByProjectIdPaginated(
			projectId,
			limit,
			cursor,
			agentId,
		);

		if (page.threads.length === 0) {
			return { threads: [], nextCursor: page.nextCursor };
		}

		const messageMap = await this.agentExecutionRepository.findFirstUserMessageByThreadIds(
			page.threads.map((t) => t.id),
		);

		return {
			...page,
			threads: page.threads.map((t) => ({
				...t,
				firstMessage: messageMap.get(t.id) ?? null,
			})),
		};
	}

	/**
	 * Get a thread with all its executions.
	 * Validates projectId ownership. Optionally validates agentId.
	 */
	async getThreadDetail(
		threadId: string,
		projectId: string,
		agentId?: string,
	): Promise<ThreadDetail | null> {
		const thread = await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) return null;

		const executions = await this.agentExecutionRepository.findByThreadIdOrdered(threadId);
		return { thread, executions };
	}

	/**
	 * Fetch a thread by id without scoping. Callers accepting a client-supplied
	 * threadId MUST verify ownership with {@link threadBelongsTo} before use to
	 * prevent IDOR.
	 */
	async findThreadById(threadId: string): Promise<AgentExecutionThread | null> {
		return await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
	}
}

/**
 * True if `thread` belongs to the given project (and optionally agent).
 * Returns false for threads from a different project/agent so the caller can
 * reject the request instead of leaking/modifying unrelated thread data.
 */
export function threadBelongsTo(
	thread: AgentExecutionThread,
	projectId: string,
	agentId?: string,
): boolean {
	if (thread.projectId !== projectId) return false;
	if (agentId && thread.agentId !== agentId) return false;
	return true;
}
