import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '../../agents/integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from '../../agents/repositories/agent-execution.repository';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';
import {
	toServerThreadFacts,
	toThreadOverview,
	type ServerThreadFacts,
	type ThreadOverviewFields,
} from './server-thread-state';

/** The thread list gets facts for this many threads at most, so the cost of a page stays fixed. */
export const THREAD_FACTS_LIMIT = 50;

/** The session fields that the facts need. */
export type ThreadFactsSession = Pick<AgentExecutionThread, 'id' | 'updatedAt'>;

/**
 * Reads what each Assistant thread needs from its owner, for a page of the thread list.
 * It uses the same rules as the live thread status, in two queries for the whole page.
 */
@Service()
export class ThreadFactsService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/**
	 * Returns the list fields of the first 50 sessions of a page, keyed by thread id.
	 * The fields are extras: a failed read logs a warning and returns none, so the list still loads.
	 */
	async getOverviews(
		sessions: readonly ThreadFactsSession[],
	): Promise<Map<string, ThreadOverviewFields>> {
		try {
			const facts = await this.getFacts(sessions.slice(0, THREAD_FACTS_LIMIT));
			return new Map([...facts].map(([threadId, fact]) => [threadId, toThreadOverview(fact)]));
		} catch (error) {
			this.logger.warn('Failed to read the states of Assistant threads', {
				error: getErrorMessage(error),
			});
			return new Map();
		}
	}

	/**
	 * Returns the facts of each given session, keyed by thread id.
	 * A message that waits in the queue before its turn starts does not count as running,
	 * because the queue has no batch read. The next list refresh shows the running turn.
	 */
	async getFacts(sessions: readonly ThreadFactsSession[]): Promise<Map<string, ServerThreadFacts>> {
		if (sessions.length === 0) return new Map();
		if (sessions.length > THREAD_FACTS_LIMIT) {
			throw new UnexpectedError('Too many threads for one thread facts read', {
				extra: { count: sessions.length, limit: THREAD_FACTS_LIMIT },
			});
		}

		const threadIds = [...new Set(sessions.map(({ id }) => id))];
		const [suspendedIds, runs] = await Promise.all([
			this.checkpointStorage.findSuspendedThreadIds(ASSISTANT_AGENT_ID, threadIds),
			this.executionRepository.findRunSummariesByThreadIds(threadIds),
		]);

		return new Map(
			sessions.map(({ id, updatedAt }) => [
				id,
				toServerThreadFacts({
					needsInput: suspendedIds.has(id),
					run: runs.get(id),
					sessionUpdatedAt: updatedAt,
				}),
			]),
		);
	}
}
