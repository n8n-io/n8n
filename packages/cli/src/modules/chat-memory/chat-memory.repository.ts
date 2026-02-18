import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, In, LessThan, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { StoredMessage, UnexpectedError } from 'n8n-workflow';

import { ChatMemory, type ChatMemoryRole } from './chat-memory.entity';

export interface CreateMemoryEntryData {
	id: string;
	sessionKey: string;
	turnId: string | null;
	role: ChatMemoryRole;
	content: StoredMessage;
	name: string;
	expiresAt?: Date | null;
}

@Service()
export class ChatMemoryRepository extends Repository<ChatMemory> {
	constructor(
		dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {
		super(ChatMemory, dataSource.manager);
	}

	async createMemoryEntry(entry: CreateMemoryEntryData, trx?: EntityManager) {
		const em = trx ?? this.manager;

		if (!entry.id) {
			throw new UnexpectedError('Memory entry ID is required');
		}

		if (!entry.sessionKey) {
			throw new UnexpectedError('Session key is required');
		}

		await em.insert(ChatMemory, entry as QueryDeepPartialEntity<ChatMemory>);
		return entry.id;
	}

	/**
	 * Get memory entries for the session, filtered by turn IDs (for branching support).
	 * Turn IDs are correlation IDs linking memory entries to AI messages.
	 */
	async getMemoryByTurnIds(
		sessionKey: string,
		turnIds: string[],
		trx?: EntityManager,
	): Promise<ChatMemory[]> {
		const em = trx ?? this.manager;

		if (turnIds.length === 0) {
			return [];
		}

		return await em.find(ChatMemory, {
			where: {
				sessionKey,
				turnId: In(turnIds),
			},
			order: { createdAt: 'ASC' },
		});
	}

	/**
	 * Get all memory entries for a session and memory node.
	 * Used when turnId is not available (e.g., manual executions).
	 */
	async getAllMemoryForNode(sessionKey: string, trx?: EntityManager): Promise<ChatMemory[]> {
		const em = trx ?? this.manager;

		return await em.find(ChatMemory, {
			where: {
				sessionKey,
			},
			order: { createdAt: 'ASC' },
		});
	}

	/**
	 * Delete all memory entries for a session.
	 */
	async deleteBySessionKey(sessionKey: string, trx?: EntityManager): Promise<void> {
		const em = trx ?? this.manager;
		await em.delete(ChatMemory, { sessionKey });
	}

	/**
	 * Delete all expired memory entries (where expiresAt < NOW).
	 * @returns The number of deleted entries
	 */
	async deleteExpiredEntries(trx?: EntityManager): Promise<number> {
		const em = trx ?? this.manager;
		const result = await em.delete(ChatMemory, {
			expiresAt: LessThan(new Date()),
		});
		return result.affected ?? 0;
	}

	/**
	 * Get the total size in bytes of the chat_memory table.
	 */
	async findChatMemorySize(): Promise<{ totalBytes: number }> {
		const dbType = this.globalConfig.database.type;
		let sql: string;

		switch (dbType) {
			case 'sqlite':
				sql =
					"SELECT COALESCE(SUM(pgsize), 0) AS table_bytes FROM dbstat WHERE name = 'chat_memory'";
				break;

			case 'postgresdb': {
				const schemaName = this.globalConfig.database.postgresdb?.schema ?? 'public';
				sql = `SELECT pg_total_relation_size('"${schemaName}"."chat_memory"') AS table_bytes`;
				break;
			}

			default:
				return { totalBytes: 0 };
		}

		const result = (await this.query(sql)) as Array<{ table_bytes: number | string | null }>;
		const totalBytes = Number(result[0]?.table_bytes ?? 0);

		return { totalBytes };
	}
}
