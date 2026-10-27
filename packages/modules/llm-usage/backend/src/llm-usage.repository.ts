import {
	LLM_BUDGET_DIMENSIONS,
	type LlmBudgetDimension,
	type LlmUsageCallSortKey,
	type LlmUsageDay,
	type LlmUsageGroup,
	type LlmUsageGroupBy,
	type LlmUsageTotals,
} from '@n8n/api-types';
import { CredentialsEntity, Project, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository, type BaseEntity, type SelectQueryBuilder } from '@n8n/typeorm';

import { LlmUsage } from './llm-usage.entity';

export interface LlmUsageTimeRange {
	from: Date;
	to: Date;
}

export type LlmUsageCall = Omit<LlmUsage, keyof BaseEntity> & {
	workflowName: string | null;
	agentName: string | null;
	threadTitle: string | null;
	projectName: string | null;
	userEmail: string | null;
	credentialName: string | null;
};

/** A UUID, so that Postgres can cast a thread ID to the uuid type without an error. */
const UUID_PATTERN =
	'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

/**
 * The column of each budget dimension, as text, so keys compare the same on SQLite and Postgres.
 * Gateway credits have no credential, so they count as `managed:<managedBy>`.
 */
const DIMENSION_COLUMNS: Record<LlmBudgetDimension, string> = {
	workflow: 'usage.workflowId',
	agent: 'usage.agentId',
	project: 'usage.projectId',
	user: 'CAST(usage.accountableUserId AS VARCHAR)',
	credential: "COALESCE(usage.credentialId, 'managed:' || usage.managedBy)",
};

/** The spend of one counter: the values of the call for each dimension of a budget. */
export interface LlmSpendRow {
	values: Partial<Record<LlmBudgetDimension, string>>;
	costUsd: number;
	/** Calls without a price, which count as 0. */
	unpriced: number;
}

/** Three parameters for each call keep a statement far below SQLite's parameter limit. */
const SET_PRICES_CHUNK = 200;
/** A row has 27 columns, so 500 rows stay below the parameter limits of SQLite and Postgres. */
const INSERT_CHUNK = 500;

/**
 * The query aliases of the tables that give names: `wf` workflows, `ag` agents, `proj`
 * projects, `usr` users and `cred` credentials. The calls list also joins the sessions of
 * n8n Assistant (`iat`) and of agents (`ats`).
 */
type NameTable = 'wf' | 'ag' | 'proj' | 'usr' | 'cred';

/**
 * How each group is keyed and labeled. `where` keeps only the calls that have the grouped
 * target, so a workflow or agent list holds no empty group. `names` is the table that gives
 * the label.
 */
const GROUP_COLUMNS: Record<
	LlmUsageGroupBy,
	{ key: string; label: string; where?: string; names?: NameTable }
> = {
	workflow: {
		key: 'usage.workflowId',
		label: 'wf.name',
		where: 'usage.workflowId IS NOT NULL',
		names: 'wf',
	},
	agent: {
		key: 'usage.agentId',
		label: 'ag.name',
		where: 'usage.agentId IS NOT NULL',
		names: 'ag',
	},
	caller: { key: 'usage.callerType', label: 'usage.callerType' },
	model: {
		key: "usage.provider || '/' || usage.model",
		label: "usage.provider || '/' || usage.model",
	},
	project: { key: 'usage.projectId', label: 'proj.name', names: 'proj' },
	user: { key: 'usage.userId', label: 'usr.email', names: 'usr' },
	mode: { key: 'usage.executionMode', label: 'usage.executionMode' },
};

const TOTAL_COLUMNS: Array<[keyof LlmUsageTotals, string]> = [
	['calls', 'COUNT(*)'],
	['unpricedCalls', 'SUM(CASE WHEN usage.priced THEN 0 ELSE 1 END)'],
	['inputTokens', 'SUM(usage.inputTokens)'],
	['outputTokens', 'SUM(usage.outputTokens)'],
	['cacheReadTokens', 'SUM(usage.cacheReadTokens)'],
	// COALESCE: Postgres sorts NULL first in DESC order, SQLite last.
	['costUsd', 'COALESCE(SUM(usage.estimatedCostUsd), 0)'],
];

/**
 * Columns that can be empty. They sort empty values last, in both directions and on both
 * databases. Only these: on a NOT NULL column, `NULLS LAST` keeps Postgres from using the index.
 */
const NULLABLE_SORT_KEYS: LlmUsageCallSortKey[] = ['estimatedCostUsd', 'durationMs'];

const CALL_SORT_COLUMNS: Record<LlmUsageCallSortKey, string> = {
	finishedAt: 'usage.finishedAt',
	// The name the table shows: the agent, the n8n Assistant session, else the workflow.
	name: "COALESCE(CASE usage.callerType WHEN 'agent' THEN ag.name WHEN 'instance-ai' THEN iat.title END, wf.name, '')",
	caller: 'usage.callerType',
	provider: 'usage.provider',
	model: 'usage.model',
	estimatedCostUsd: 'usage.estimatedCostUsd',
	durationMs: 'usage.durationMs',
	inputTokens: 'usage.inputTokens',
	outputTokens: 'usage.outputTokens',
};

const toTotals = (raw: Record<string, unknown>): LlmUsageTotals => ({
	calls: Number(raw.calls ?? 0),
	unpricedCalls: Number(raw.unpricedCalls ?? 0),
	inputTokens: Number(raw.inputTokens ?? 0),
	outputTokens: Number(raw.outputTokens ?? 0),
	cacheReadTokens: Number(raw.cacheReadTokens ?? 0),
	costUsd: Number(raw.costUsd ?? 0),
});

@Service()
export class LlmUsageRepository extends Repository<LlmUsage> {
	constructor(dataSource: DataSource) {
		super(LlmUsage, dataSource.manager);
	}

	/** Duplicates (same `callId`) are ignored, so a retried batch is safe. */
	async insertIgnoringDuplicates(rows: Array<Partial<LlmUsage>>) {
		for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
			const chunk = rows.slice(start, start + INSERT_CHUNK).map((row) => this.fitToColumns(row));
			// No read-back of the generated columns: nothing uses them, and on SQLite it is an
			// extra query inside the write.
			await this.createQueryBuilder()
				.insert()
				.values(chunk)
				.orIgnore()
				.updateEntity(false)
				.execute();
		}
	}

	/**
	 * One page of the calls stored without a price since `since`, with the fields that pricing
	 * needs, in call ID order. Pass the last call ID of a page to read the next one.
	 */
	async findUnpriced(since: Date, limit: number, afterCallId?: string) {
		const query = this.createQueryBuilder('usage')
			.select([
				'usage.callId',
				'usage.provider',
				'usage.model',
				'usage.inputTokens',
				'usage.outputTokens',
				'usage.cacheReadTokens',
				'usage.cacheWriteTokens',
			])
			// A literal, not a parameter: only then can the databases use the partial index on
			// unpriced calls. Without it, each page walks the whole table.
			.where('usage.priced = false')
			.andWhere('usage.finishedAt >= :since', { since })
			.orderBy('usage.callId', 'ASC')
			.limit(limit);
		if (afterCallId !== undefined) query.andWhere('usage.callId > :afterCallId', { afterCallId });
		return await query.getMany();
	}

	/**
	 * Stores the prices of calls stored without one, with one statement for each chunk.
	 * A priced call is never changed, also when another process prices it first.
	 */
	async setPrices(prices: Array<{ callId: string; estimatedCostUsd: number }>) {
		// An UPDATE has no alias, so the camelCase columns are quoted by hand.
		const callId = this.manager.connection.driver.escape('callId');
		const priced = this.manager.connection.driver.escape('priced');
		for (let start = 0; start < prices.length; start += SET_PRICES_CHUNK) {
			const chunk = prices.slice(start, start + SET_PRICES_CHUNK);
			// The cast types the parameters on Postgres, which would read them as text.
			const cases = chunk
				.map((_, index) => `WHEN :id${index} THEN CAST(:cost${index} AS DOUBLE PRECISION)`)
				.join(' ');
			const parameters = Object.fromEntries(
				chunk.flatMap((price, index) => [
					[`id${index}`, price.callId],
					[`cost${index}`, price.estimatedCostUsd],
				]),
			);
			await this.createQueryBuilder()
				.update()
				.set({ estimatedCostUsd: () => `CASE ${callId} ${cases} END`, priced: true })
				.where(`${callId} IN (:...callIds)`, { callIds: chunk.map((price) => price.callId) })
				.andWhere(`${priced} = :unpriced`, { unpriced: false })
				.setParameters(parameters)
				.execute();
		}
	}

	/** Totals per group, most expensive first. Names come from the joined tables at read time. */
	async totalsByGroup({
		groupBy,
		limit = 100,
		...range
	}: LlmUsageTimeRange & { groupBy: LlmUsageGroupBy; limit?: number }) {
		const { key, label, where, names } = GROUP_COLUMNS[groupBy];
		// Only the table that names this group: SQLite does not drop unused joins.
		const query = this.withTotals(this.withNames(this.inRange(range), names ? [names] : []));
		if (where) query.andWhere(where);
		const rows = await query
			// Cast first: `userId` is a uuid column on Postgres, and '' is not a valid uuid.
			.addSelect(`COALESCE(CAST(${key} AS VARCHAR), '')`, 'key')
			.addSelect(`COALESCE(${label}, '')`, 'label')
			.groupBy(key)
			.addGroupBy(label)
			// TypeORM does not quote a plain alias in ORDER BY; Postgres would lowercase it.
			.orderBy(this.manager.connection.driver.escape('costUsd'), 'DESC')
			.limit(limit)
			.getRawMany<Record<string, unknown>>();
		return rows.map(
			(raw): LlmUsageGroup => ({
				key: String(raw.key),
				label: String(raw.label),
				...(groupBy === 'caller' ? { caller: String(raw.key) } : {}),
				...toTotals(raw),
			}),
		);
	}

	/**
	 * Spend since `from` for each value of the given dimensions: `all`, or only the listed IDs.
	 * A call without a value for one of the dimensions does not count.
	 */
	async spendByKey({
		from,
		dimensions,
		callerTypes,
	}: {
		from: Date;
		dimensions: Partial<Record<LlmBudgetDimension, 'all' | string[]>>;
		callerTypes: string[];
	}): Promise<LlmSpendRow[]> {
		const query = this.createQueryBuilder('usage')
			.select('COALESCE(SUM(usage.estimatedCostUsd), 0)', 'costUsd')
			.addSelect('SUM(CASE WHEN usage.priced THEN 0 ELSE 1 END)', 'unpriced')
			.where('usage.finishedAt >= :from', { from })
			.andWhere('usage.callerType IN (:...callerTypes)', { callerTypes });
		const names = LLM_BUDGET_DIMENSIONS.filter((name) => dimensions[name] !== undefined);
		for (const name of names) {
			const column = DIMENSION_COLUMNS[name];
			const filter = dimensions[name];
			query.addSelect(column, `d_${name}`).addGroupBy(column).andWhere(`${column} IS NOT NULL`);
			if (Array.isArray(filter))
				query.andWhere(`${column} IN (:...${name}Ids)`, { [`${name}Ids`]: filter });
		}
		const rows = await query.getRawMany<Record<string, unknown>>();
		return rows.map((raw) => ({
			values: Object.fromEntries(names.map((name) => [name, String(raw[`d_${name}`])])),
			costUsd: Number(raw.costUsd),
			unpriced: Number(raw.unpriced),
		}));
	}

	/** The totals of each UTC day with calls, oldest first. Their sum is the range total. */
	async dailyTotals(
		range: LlmUsageTimeRange,
	): Promise<Array<LlmUsageTotals & Pick<LlmUsageDay, 'date'>>> {
		// Postgres reads a timestamptz in the session time zone, so the day is taken in UTC.
		const finishedAt = this.isPostgres ? "usage.finishedAt AT TIME ZONE 'UTC'" : 'usage.finishedAt';
		const day = `CAST(DATE(${finishedAt}) AS VARCHAR)`;
		const rows = await this.withTotals(this.inRange(range))
			.addSelect(day, 'date')
			.groupBy(day)
			.orderBy(day, 'ASC')
			.getRawMany<Record<string, unknown>>();
		return rows.map((raw) => ({ date: String(raw.date), ...toTotals(raw) }));
	}

	/**
	 * One page of calls, with the names of their workflow, agent, session, project, user and
	 * credential. The page is chosen first, from the `llm_usage` columns alone, and the names
	 * are joined for that page only. Only a sort by name needs the names for the whole range.
	 */
	async listCalls({
		skip,
		take,
		sortBy,
		sortOrder,
		...range
	}: LlmUsageTimeRange & {
		skip: number;
		take: number;
		sortBy: LlmUsageCallSortKey;
		sortOrder: 'asc' | 'desc';
	}) {
		const pageQuery = this.inRange(range).select('usage.callId', 'callId');
		if (sortBy === 'name') this.withThreads(this.withNames(pageQuery, ['wf', 'ag']));
		const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
		const nulls = NULLABLE_SORT_KEYS.includes(sortBy) ? 'NULLS LAST' : undefined;
		const [count, page] = await Promise.all([
			this.inRange(range).getCount(),
			pageQuery
				.orderBy(CALL_SORT_COLUMNS[sortBy], order, nulls)
				// A stable order, so a page never repeats or skips a call.
				.addOrderBy('usage.callId', 'DESC')
				.offset(skip)
				.limit(take)
				.getRawMany<{ callId: string }>(),
		]);
		const callIds = page.map((row) => row.callId);
		if (callIds.length === 0) return { count, items: [] };

		const { entities, raw } = await this.withThreads(
			this.withNames(this.createQueryBuilder('usage')),
		)
			.where('usage.callId IN (:...callIds)', { callIds })
			.addSelect('wf.name', 'workflowName')
			.addSelect('ag.name', 'agentName')
			.addSelect('COALESCE(iat.title, ats.title)', 'threadTitle')
			.addSelect('proj.name', 'projectName')
			.addSelect('usr.email', 'userEmail')
			.addSelect('cred.name', 'credentialName')
			.getRawAndEntities<Record<string, string | null>>();
		const callsById = new Map(
			entities.map((call, index): [string, LlmUsageCall] => [
				call.callId,
				{
					...call,
					workflowName: raw[index]?.workflowName ?? null,
					agentName: raw[index]?.agentName ?? null,
					threadTitle: raw[index]?.threadTitle ?? null,
					projectName: raw[index]?.projectName ?? null,
					userEmail: raw[index]?.userEmail ?? null,
					credentialName: raw[index]?.credentialName ?? null,
				},
			]),
		);
		// The name query has no order: the page keeps the order of the page query.
		const items = callIds.flatMap((callId) => callsById.get(callId) ?? []);
		return { count, items };
	}

	private inRange({ from, to }: LlmUsageTimeRange) {
		return this.createQueryBuilder('usage').where(
			'usage.finishedAt >= :from AND usage.finishedAt < :to',
			{ from, to },
		);
	}

	private get isPostgres() {
		return this.manager.connection.options.type === 'postgres';
	}

	/** Joins the tables that give names, all of them unless `tables` limits them. */
	private withNames(
		query: SelectQueryBuilder<LlmUsage>,
		tables: NameTable[] = ['wf', 'ag', 'proj', 'usr', 'cred'],
	) {
		if (tables.includes('wf')) query.leftJoin(WorkflowEntity, 'wf', 'wf.id = usage.workflowId');
		if (tables.includes('ag')) {
			query.leftJoin(this.moduleTable('agents', ['id', 'name']), 'ag', 'ag.id = usage.agentId');
		}
		if (tables.includes('proj')) query.leftJoin(Project, 'proj', 'proj.id = usage.projectId');
		if (tables.includes('usr')) query.leftJoin(User, 'usr', 'usr.id = usage.userId');
		if (tables.includes('cred')) {
			query.leftJoin(CredentialsEntity, 'cred', 'cred.id = usage.credentialId');
		}
		return query;
	}

	/**
	 * Joins the session tables of agents (`ats`) and n8n Assistant (`iat`). The join compares
	 * the thread table's own key, so its index is used: on Postgres the Assistant key is a uuid,
	 * so the call's thread ID is cast, and only when it has the shape of one.
	 */
	private withThreads(query: SelectQueryBuilder<LlmUsage>) {
		const assistantThreadId = this.isPostgres
			? `CASE WHEN usage.threadId ~ '${UUID_PATTERN}' THEN CAST(usage.threadId AS UUID) END`
			: 'usage.threadId';
		return query
			.leftJoin(
				this.moduleTable('instance_ai_threads', ['id', 'title']),
				'iat',
				`usage.callerType = 'instance-ai' AND iat.id = ${assistantThreadId}`,
			)
			.leftJoin(
				this.moduleTable('agent_execution_threads', ['id', 'title']),
				'ats',
				"usage.callerType = 'agent' AND ats.id = usage.threadId",
			);
	}

	/**
	 * Columns of another module's table, to join as a subquery: a module cannot import another
	 * module's entities, and TypeORM reads a dotted table name as a relation. The table exists
	 * whether that module is on or off, as its migrations always run.
	 */
	private moduleTable(name: string, columns: string[]) {
		const { driver, options } = this.manager.connection;
		const table = [driver.schema, `${options.entityPrefix ?? ''}${name}`]
			.filter((part) => part !== undefined)
			.map((part) => driver.escape(part))
			.join('.');
		return `(SELECT ${columns.map((column) => driver.escape(column)).join(', ')} FROM ${table})`;
	}

	/**
	 * Cuts strings to their column length. Postgres rejects a longer value, and one such row
	 * would fail its whole batch. A cut ID no longer matches its target, which only loses a name.
	 */
	private fitToColumns(row: Partial<LlmUsage>) {
		const fitted = { ...row };
		for (const column of this.metadata.columns) {
			const value: unknown = column.getEntityValue(fitted);
			const maxLength = Number(column.length);
			if (typeof value === 'string' && maxLength > 0 && value.length > maxLength) {
				column.setEntityValue(fitted, value.slice(0, maxLength));
			}
		}
		return fitted;
	}

	private withTotals(query: SelectQueryBuilder<LlmUsage>) {
		query.select([]);
		for (const [name, expression] of TOTAL_COLUMNS) query.addSelect(expression, name);
		return query;
	}
}
