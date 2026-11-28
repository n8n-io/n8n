import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan } from '@n8n/typeorm';

import { AssistantUsageEvent } from './assistant-usage-event.entity';

class AssistantUsageEventTable extends BaseRepository<AssistantUsageEvent> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AssistantUsageEvent, dataSource.manager, transactionRunner);
	}
}

export type NewAssistantUsageEvent = Pick<
	AssistantUsageEvent,
	'userId' | 'threadId' | 'projectId' | 'resourceId'
>;

/** The tokens of the model calls of one model, in one thread. */
export type NewAssistantTokenUsage = Omit<NewAssistantUsageEvent, 'resourceId'> &
	Pick<AssistantUsageEvent, 'model'> & {
		inputTokens: number;
		outputTokens: number;
		cacheReadTokens: number;
		cacheWriteTokens: number;
	};

export type CreatedResourceType = Exclude<AssistantUsageEvent['type'], 'message' | 'token-usage'>;

@Service()
export class AssistantUsageRepository {
	private readonly table: AssistantUsageEventTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new AssistantUsageEventTable(dataSource, transactionRunner);
	}

	async addMessage(row: Omit<NewAssistantUsageEvent, 'resourceId'>, ctx: OperationContext) {
		await this.table
			.managerFor(ctx)
			.insert(AssistantUsageEvent, { ...row, type: 'message', resourceId: null });
	}

	/** Does nothing when the resource is already recorded. */
	async addCreatedResource(
		row: NewAssistantUsageEvent & { type: CreatedResourceType; resourceId: string },
		ctx: OperationContext,
	) {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(AssistantUsageEvent)
			// A copy, because the insert writes the generated ID back to the values.
			.values({ ...row })
			.orIgnore()
			.execute();
	}

	async addTokenUsage(rows: NewAssistantTokenUsage[], ctx: OperationContext) {
		if (rows.length === 0) return;
		await this.table.managerFor(ctx).insert(
			AssistantUsageEvent,
			rows.map((row) => ({ ...row, type: 'token-usage' as const, resourceId: null })),
		);
	}

	/** Deletes the events created before the date, and returns how many it deleted. */
	async deleteCreatedBefore(date: Date, ctx: OperationContext): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.delete(AssistantUsageEvent, { createdAt: LessThan(date) });
		return result.affected ?? 0;
	}
}
