import { withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubSession } from './chat-hub-session.entity';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ChatHubSessionRepository extends Repository<ChatHubSession> {
	constructor(dataSource: DataSource) {
		super(ChatHubSession, dataSource.manager);
	}

	async createChatSession(session: Partial<ChatHubSession>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.insert(ChatHubSession, session);
			return await em.findOneOrFail(ChatHubSession, {
				where: { id: session.id },
				relations: ['messages'],
			});
		});
	}

	async updateLastMessageAt(id: string, lastMessageAt: Date, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, { lastMessageAt });
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async updateChatTitle(id: string, title: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, { title });
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async updateChatSession(id: string, updates: Partial<ChatHubSession>, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.update(ChatHubSession, { id }, updates);
			return await em.findOneOrFail(ChatHubSession, {
				where: { id },
				relations: ['messages'],
			});
		});
	}

	async deleteChatHubSession(id: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.delete(ChatHubSession, { id });
		});
	}

	async getManyByUserId(userId: string, limit: number, cursor?: string) {
		const queryBuilder = this.createQueryBuilder('session')
			.where('session.ownerId = :userId', { userId })
			.orderBy("COALESCE(session.lastMessageAt, '1970-01-01')", 'DESC')
			.addOrderBy('session.id', 'ASC');

		if (cursor) {
			const cursorSession = await this.findOne({
				where: { id: cursor, ownerId: userId },
			});

			if (!cursorSession) {
				throw new NotFoundError('Cursor session not found');
			}

			queryBuilder.andWhere(
				'(session.lastMessageAt < :lastMessageAt OR (session.lastMessageAt = :lastMessageAt AND session.id > :id))',
				{
					lastMessageAt: cursorSession.lastMessageAt,
					id: cursorSession.id,
				},
			);
		}

		queryBuilder.take(limit);

		return await queryBuilder.getMany();
	}

	async getOneById(id: string, userId: string, trx?: EntityManager) {
		return await withTransaction(
			this.manager,
			trx,
			async (em) => {
				return await em.findOne(ChatHubSession, {
					where: { id, ownerId: userId },
					relations: ['messages'],
				});
			},
			false,
		);
	}

	async deleteAll(trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			return await em.createQueryBuilder().delete().from(ChatHubSession).execute();
		});
	}
}
