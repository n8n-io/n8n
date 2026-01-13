import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';

import { ChatHubMessage } from './chat-hub-message.entity';
import { ChatHubSession, IChatHubSession } from './chat-hub-session.entity';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class ChatHubSessionRepository extends Repository<ChatHubSession> {
	constructor(dataSource: DataSource) {
		super(ChatHubSession, dataSource.manager);
	}

	async createChatSession(
		session: Partial<IChatHubSession> & Pick<IChatHubSession, 'id'>,
		trx?: EntityManager,
	) {
		const em = trx ?? this.manager;
		await em.insert(ChatHubSession, session);
		return await em.findOneOrFail(ChatHubSession, {
			where: { id: session.id },
			relations: ['messages'],
		});
	}

	async updateChatSession(id: string, updates: Partial<IChatHubSession>, trx?: EntityManager) {
		const em = trx ?? this.manager;
		await em.update(ChatHubSession, { id }, updates);
	}

	async deleteChatHubSession(id: string, trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.delete(ChatHubSession, { id });
	}

	async getManyByUserId(userId: string, limit: number, cursor?: string) {
		const queryBuilder = this.createQueryBuilder('session')
			.leftJoinAndSelect('session.agent', 'agent')
			.leftJoinAndSelect('session.workflow', 'workflow')
			.leftJoinAndSelect('workflow.activeVersion', 'activeVersion')
			.where('session.ownerId = :userId', { userId })
			// Only show sessions that have at least one message
			// (excludes sessions created by manual workflow executions with MemoryChatHub that only have memory entries)
			.andWhere((qb) => {
				const subQuery = qb
					.subQuery()
					.select('1')
					.from(ChatHubMessage, 'msg')
					.where('msg.sessionId = session.id')
					.getQuery();
				return `EXISTS ${subQuery}`;
			})
			.orderBy('session.lastMessageAt', 'DESC')
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

	async existsById(id: string, userId: string | undefined, trx?: EntityManager): Promise<boolean> {
		const em = trx ?? this.manager;
		const session = await em.findOne(ChatHubSession, {
			where: { id },
			select: ['id', 'ownerId'],
		});

		if (!session) return false;

		// If session has an owner, require userId to match
		if (session.ownerId !== null) {
			return session.ownerId === userId;
		}

		// Anonymous session - accessible by sessionId alone
		return true;
	}

	async getOneById(id: string, userId: string | undefined, trx?: EntityManager) {
		const em = trx ?? this.manager;
		const session = await em.findOne(ChatHubSession, {
			where: { id },
			relations: {
				messages: true,
				agent: true,
				workflow: {
					activeVersion: true,
				},
			},
		});

		if (!session) return null;

		// If session has an owner, require userId to match
		if (session.ownerId !== null && session.ownerId !== userId) {
			return null;
		}

		return session;
	}

	async deleteAll(trx?: EntityManager) {
		const em = trx ?? this.manager;
		return await em.createQueryBuilder().delete().from(ChatHubSession).execute();
	}
}
