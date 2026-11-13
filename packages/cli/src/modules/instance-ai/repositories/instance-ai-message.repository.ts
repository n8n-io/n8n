import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Equal, In, LessThan, MoreThan } from '@n8n/typeorm';

import { InstanceAiMessage } from '../entities/instance-ai-message.entity';

class InstanceAiMessageTable extends BaseRepository<InstanceAiMessage> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiMessage, dataSource.manager, transactionRunner);
	}
}

type MessageRow = Pick<
	InstanceAiMessage,
	'id' | 'threadId' | 'content' | 'role' | 'type' | 'resourceId' | 'createdAt' | 'updatedAt'
>;

@Service()
export class InstanceAiMessageRepository {
	private readonly table: InstanceAiMessageTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new InstanceAiMessageTable(dataSource, transactionRunner);
	}

	async findForThreadMemory(
		threadId: string,
		opts: { limit?: number; before?: Date } | undefined,
		ctx: OperationContext,
	): Promise<InstanceAiMessage[]> {
		return await this.table.managerFor(ctx).find(InstanceAiMessage, {
			where: opts?.before ? { threadId, createdAt: LessThan(opts.before) } : { threadId },
			order: opts?.limit ? { createdAt: 'DESC', id: 'DESC' } : { createdAt: 'ASC', id: 'ASC' },
			...(opts?.limit ? { take: opts.limit } : {}),
		});
	}

	async findThreadMessagePage(
		args: {
			threadId: string;
			limit: number;
			page?: number;
			before?: { createdAt: Date; id: string };
		},
		ctx: OperationContext,
	): Promise<InstanceAiMessage[]> {
		const { threadId, limit, before } = args;
		return await this.table.managerFor(ctx).find(InstanceAiMessage, {
			where: before
				? [
						{ threadId, createdAt: LessThan(before.createdAt) },
						{ threadId, createdAt: before.createdAt, id: LessThan(before.id) },
					]
				: { threadId },
			order: { createdAt: 'DESC', id: 'DESC' },
			take: limit + 1,
			skip: before ? 0 : (args.page ?? 0) * limit,
		});
	}

	async findForObservationScope(
		observationScopeId: string,
		since: { sinceCreatedAt: Date; sinceMessageId: string } | undefined,
		ctx: OperationContext,
	): Promise<InstanceAiMessage[]> {
		const baseWhere = { threadId: observationScopeId };
		return await this.table.managerFor(ctx).find(InstanceAiMessage, {
			where: since
				? [
						{ ...baseWhere, createdAt: MoreThan(since.sinceCreatedAt) },
						{
							...baseWhere,
							createdAt: Equal(since.sinceCreatedAt),
							id: MoreThan(since.sinceMessageId),
						},
					]
				: [baseWhere],
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async saveMessageBatch(rows: MessageRow[], ctx: OperationContext): Promise<void> {
		const manager = this.table.managerFor(ctx);
		const entities = rows.map((row) => manager.create(InstanceAiMessage, row));
		await manager.save(InstanceAiMessage, entities);
	}

	async deleteByIds(messageIds: string[], ctx: OperationContext): Promise<void> {
		await this.table.managerFor(ctx).delete(InstanceAiMessage, { id: In(messageIds) });
	}
}
