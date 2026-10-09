import type { AgentDbMessage, Thread } from '@n8n/agents';
import {
	BaseRepository,
	Project,
	TransactionRunner,
	escapeLike,
	LIKE_ESCAPE_CLAUSE,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, Not, Raw } from '@n8n/typeorm';

import { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

@Service()
export class InstanceAiThreadRepository extends BaseRepository<InstanceAiThread> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiThread, dataSource.manager, transactionRunner);
	}

	async getPersonalProjectForChat(userId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneByOrFail(Project, {
			type: 'personal',
			creatorId: userId,
		});
	}

	async findSelfHealingChat(resultId: string, userId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOneBy(InstanceAiThread, {
			selfHealingResultId: resultId,
			resourceId: userId,
		});
	}

	async findOwnedSelfHealingChat(threadId: string, userId: string) {
		return await this.findOneBy({
			id: threadId,
			resourceId: userId,
			selfHealingResultId: Not(IsNull()),
		});
	}

	async createSelfHealingChat(
		input: Pick<
			InstanceAiThread,
			'id' | 'resourceId' | 'projectId' | 'selfHealingResultId' | 'title' | 'metadata'
		>,
		openingMessage: AgentDbMessage & { type: 'llm'; role: 'user' },
		ctx: OperationContext,
	) {
		const manager = this.managerFor(ctx);
		const thread = await manager.save(manager.create(InstanceAiThread, input));
		await manager.save(
			manager.create(InstanceAiMessage, {
				id: openingMessage.id,
				threadId: thread.id,
				resourceId: thread.resourceId,
				role: 'user',
				type: 'llm',
				content: JSON.stringify(openingMessage),
				createdAt: openingMessage.createdAt,
				updatedAt: openingMessage.createdAt,
			}),
		);
		return thread;
	}

	async hasUserTurnAfterOpening(threadId: string) {
		const messages = await this.managerFor({}).find(InstanceAiMessage, {
			where: { threadId, role: 'user' },
			select: { id: true },
			take: 2,
		});
		return messages.length > 1;
	}

	/** Apply decisions to the locked row so sibling mains cannot claim the same state. */
	async updateThread(args: {
		threadId: string;
		update: (
			current: Thread,
		) => Partial<Pick<Thread, 'title' | 'metadata' | 'resourceId'>> | null | undefined;
	}): Promise<Thread | null> {
		return await this.runInTransaction({}, async (manager) => {
			const repository = manager.getRepository(InstanceAiThread);
			const row = await repository.findOne({
				where: { id: args.threadId },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			if (!row) return null;
			const current: Thread = {
				id: row.id,
				resourceId: row.resourceId,
				title: row.title || undefined,
				metadata: row.metadata ?? undefined,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			};
			const patch = args.update(current);
			if (!patch) return current;
			if (patch.title !== undefined) row.title = patch.title;
			if (patch.metadata !== undefined) row.metadata = patch.metadata;
			if (patch.resourceId !== undefined) row.resourceId = patch.resourceId;
			const saved = await repository.save(row);
			return { ...current, ...patch, title: saved.title || undefined, updatedAt: saved.updatedAt };
		});
	}

	/**
	 * One page of a user's threads, newest activity first, plus one lookahead row so the
	 * caller can tell whether another page exists. `before` is the last row of the previous
	 * page: keyset pagination on (updatedAt, id) stays stable while threads get reordered.
	 */
	async listHistoryPage(
		resourceId: string,
		limit: number,
		search?: string,
		before?: { updatedAt: Date; id: string },
	) {
		const base = {
			resourceId,
			...(search
				? {
						title: Raw((alias) => `LOWER(${alias}) LIKE :search ${LIKE_ESCAPE_CLAUSE}`, {
							search: `%${escapeLike(search.toLowerCase())}%`,
						}),
					}
				: {}),
		};
		return await this.find({
			where: before
				? [
						{ ...base, updatedAt: LessThan(before.updatedAt) },
						{ ...base, updatedAt: before.updatedAt, id: LessThan(before.id) },
					]
				: base,
			order: { updatedAt: 'DESC', id: 'DESC' },
			take: limit + 1,
		});
	}
}
