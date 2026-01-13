import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatMemory } from './chat-memory.entity';
import { ChatMemorySession } from './chat-memory-session.entity';

export interface CreateMemorySessionData {
	sessionKey: string;
	chatHubSessionId?: string | null;
	workflowId?: string | null;
}

@Service()
export class ChatMemorySessionRepository extends Repository<ChatMemorySession> {
	constructor(dataSource: DataSource) {
		super(ChatMemorySession, dataSource.manager);
	}

	/**
	 * Create a new memory session.
	 */
	async createSession(data: CreateMemorySessionData, trx?: EntityManager): Promise<void> {
		const em = trx ?? this.manager;
		await em.insert(ChatMemorySession, {
			sessionKey: data.sessionKey,
			chatHubSessionId: data.chatHubSessionId ?? null,
			workflowId: data.workflowId ?? null,
		});
	}

	/**
	 * Get a memory session by session key.
	 */
	async getBySessionKey(
		sessionKey: string,
		trx?: EntityManager,
	): Promise<ChatMemorySession | null> {
		const em = trx ?? this.manager;
		return await em.findOne(ChatMemorySession, {
			where: { sessionKey },
		});
	}

	/**
	 * Check if a memory session exists.
	 */
	async existsBySessionKey(sessionKey: string, trx?: EntityManager): Promise<boolean> {
		const em = trx ?? this.manager;
		const count = await em.count(ChatMemorySession, { where: { sessionKey } });
		return count > 0;
	}

	/**
	 * Delete a memory session by session key.
	 * Note: This will cascade delete all memory entries.
	 */
	async deleteBySessionKey(sessionKey: string, trx?: EntityManager): Promise<void> {
		const em = trx ?? this.manager;
		await em.delete(ChatMemorySession, { sessionKey });
	}

	/**
	 * Delete orphaned memory sessions (sessions that have no memory entries).
	 * @returns The number of deleted sessions
	 */
	async deleteOrphanedSessions(trx?: EntityManager): Promise<number> {
		const em = trx ?? this.manager;

		// Subquery for sessions that have memory entries
		const sessionsWithMemory = em
			.createQueryBuilder()
			.select('mem.sessionKey')
			.from(ChatMemory, 'mem')
			.getQuery();

		// Delete sessions that have no memory entries
		const result = await em
			.createQueryBuilder()
			.delete()
			.from(ChatMemorySession)
			.where(`sessionKey NOT IN (${sessionsWithMemory})`)
			.execute();

		return result.affected ?? 0;
	}
}
