import type {
	AssistantUsageDay,
	AssistantUsageSummary,
	AssistantUsageUser,
	AssistantUsageUsersSortBy,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { BaseRepository, OperationContext, Person, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, LessThan, type SelectQueryBuilder } from '@n8n/typeorm';
import { DateTime } from 'luxon';

import { AssistantUsageEvent } from './assistant-usage-event.entity';

class AssistantUsageEventTable extends BaseRepository<AssistantUsageEvent> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AssistantUsageEvent, dataSource.manager, transactionRunner);
	}
}

export type AssistantUsageRange = {
	startDate: Date;
	endDate: Date;
	/** Only the usage in this project. See the `projectId` column of the event. */
	projectId?: string;
};

export type NewAssistantUsageEvent = Pick<
	AssistantUsageEvent,
	'userId' | 'threadId' | 'projectId' | 'resourceId'
>;

export type AssistantUsageUsersPage = {
	skip: number;
	take: number;
	sortBy: AssistantUsageUsersSortBy;
};

type CreatedResourceType = Exclude<AssistantUsageEvent['type'], 'message'>;

type Counts = Pick<
	AssistantUsageSummary,
	'conversations' | 'messages' | 'workflowsCreated' | 'agentsCreated' | 'dataTablesCreated'
>;

/** Counts are `bigint` strings on Postgres and numbers on SQLite. */
function toCount(value: unknown): number {
	const count = Number(value ?? 0);
	return Number.isFinite(count) ? count : 0;
}

/** Postgres returns a `Date`. SQLite returns a UTC datetime string without a zone. */
function toDate(value: unknown): Date | null {
	if (value instanceof Date) return value;
	if (typeof value !== 'string' || value === '') return null;
	const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
	const date = new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

function toText(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

function toCounts(row: Record<string, unknown> | undefined): Counts {
	return {
		conversations: toCount(row?.conversations),
		messages: toCount(row?.messages),
		workflowsCreated: toCount(row?.workflowsCreated),
		agentsCreated: toCount(row?.agentsCreated),
		dataTablesCreated: toCount(row?.dataTablesCreated),
	};
}

/** Adds the counts of {@link Counts} to a query over the events. */
function selectCounts<T extends object>(query: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
	const createdOf = (type: CreatedResourceType) =>
		`SUM(CASE WHEN event.type = '${type}' THEN 1 ELSE 0 END)`;
	return query
		.addSelect(
			"COUNT(DISTINCT CASE WHEN event.type = 'message' THEN event.threadId END)",
			'conversations',
		)
		.addSelect("SUM(CASE WHEN event.type = 'message' THEN 1 ELSE 0 END)", 'messages')
		.addSelect(createdOf('workflow-created'), 'workflowsCreated')
		.addSelect(createdOf('agent-created'), 'agentsCreated')
		.addSelect(createdOf('data-table-created'), 'dataTablesCreated');
}

@Service()
export class AssistantUsageRepository {
	private readonly table: AssistantUsageEventTable;

	private readonly isPostgres: boolean;

	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		globalConfig: GlobalConfig,
	) {
		this.table = new AssistantUsageEventTable(dataSource, transactionRunner);
		this.isPostgres = globalConfig.database.type === 'postgresdb';
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
			.values(row)
			.orIgnore()
			.execute();
	}

	async summarize(range: AssistantUsageRange, ctx: OperationContext) {
		const query = this.eventsIn(range, ctx).select(
			"COUNT(DISTINCT CASE WHEN event.type = 'message' THEN event.userId END)",
			'activeUsers',
		);
		const row = await selectCounts(query).getRawOne<Record<string, unknown>>();
		return { ...toCounts(row), activeUsers: toCount(row?.activeUsers) };
	}

	/** The days with usage, as ISO dates in the time zone, oldest first. */
	async countByDay(
		range: AssistantUsageRange,
		timeZone: string,
		ctx: OperationContext,
	): Promise<AssistantUsageDay[]> {
		const query = this.eventsIn(range, ctx);
		if (this.isPostgres) {
			query
				.select(
					"TO_CHAR(event.createdAt AT TIME ZONE CAST(:timeZone AS text), 'YYYY-MM-DD')",
					'day',
				)
				.setParameter('timeZone', timeZone);
		} else {
			// SQLite has no time zone database, so this uses the offset at the end of the range.
			// Near a daylight saving change, a message can land on the day before or after.
			const offsetMinutes = DateTime.fromJSDate(range.endDate).setZone(timeZone).offset;
			query
				.select("strftime('%Y-%m-%d', event.createdAt, :offset)", 'day')
				.setParameter('offset', `${offsetMinutes} minutes`);
		}
		const rows = await selectCounts(query)
			.groupBy('day')
			.orderBy('day', 'ASC')
			.getRawMany<Record<string, unknown>>();
		return rows.flatMap((row) => {
			const date = toText(row.day);
			return date ? [{ date, ...toCounts(row) }] : [];
		});
	}

	/** One page of the users with usage in the range, and how many such users there are. */
	async countByUser(
		range: AssistantUsageRange,
		page: AssistantUsageUsersPage,
		ctx: OperationContext,
	): Promise<{ count: number; data: AssistantUsageUser[] }> {
		const [column, direction] = page.sortBy.split(':');
		const escape = (name: string) => this.table.managerFor(ctx).connection.driver.escape(name);

		// Deleted users share the `null` group, so they add one row to the distinct users.
		const totals = this.eventsIn(range, ctx)
			.select('COUNT(DISTINCT event.userId)', 'users')
			.addSelect('MAX(CASE WHEN event.userId IS NULL THEN 1 ELSE 0 END)', 'deletedUsers')
			.getRawOne<Record<string, unknown>>();

		const query = this.eventsIn(range, ctx)
			.leftJoin(Person, 'person', 'person.id = event.userId')
			.select('event.userId', 'userId')
			.addSelect('person.firstName', 'firstName')
			.addSelect('person.lastName', 'lastName')
			.addSelect('person.email', 'email');
		const rows = selectCounts(query)
			.addSelect("MAX(CASE WHEN event.type = 'message' THEN event.createdAt END)", 'lastUsedAt')
			.groupBy('event.userId')
			.addGroupBy('person.firstName')
			.addGroupBy('person.lastName')
			.addGroupBy('person.email')
			.orderBy(escape(column), direction === 'asc' ? 'ASC' : 'DESC')
			.addOrderBy('event.userId', 'ASC')
			.offset(page.skip)
			.limit(page.take)
			.getRawMany<Record<string, unknown>>();

		const [total, data] = await Promise.all([totals, rows]);
		return {
			count: toCount(total?.users) + toCount(total?.deletedUsers),
			data: data.map((row) => ({
				userId: toText(row.userId),
				firstName: toText(row.firstName),
				lastName: toText(row.lastName),
				email: toText(row.email),
				...toCounts(row),
				lastUsedAt: toDate(row.lastUsedAt)?.toISOString() ?? null,
			})),
		};
	}

	/** Deletes the events created before the date, and returns how many it deleted. */
	async deleteCreatedBefore(date: Date, ctx: OperationContext): Promise<number> {
		const result = await this.table
			.managerFor(ctx)
			.delete(AssistantUsageEvent, { createdAt: LessThan(date) });
		return result.affected ?? 0;
	}

	private eventsIn(
		range: AssistantUsageRange,
		ctx: OperationContext,
	): SelectQueryBuilder<AssistantUsageEvent> {
		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(AssistantUsageEvent, 'event')
			.where('event.createdAt >= :startDate', { startDate: range.startDate })
			.andWhere('event.createdAt <= :endDate', { endDate: range.endDate });
		if (range.projectId) {
			query.andWhere('event.projectId = :projectId', { projectId: range.projectId });
		}
		return query;
	}
}
