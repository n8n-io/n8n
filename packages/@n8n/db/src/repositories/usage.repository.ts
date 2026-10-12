import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Brackets, DataSource, type EntityManager, In, LessThan } from '@n8n/typeorm';
import chunk from 'lodash/chunk';

import { BaseRepository } from './base-repository';
import { UsageByPeriod, UsageEvent, UsageLedgerEntry } from '../entities';
import type { UsageFact, UsageKind, UsagePhase } from '../entities';
import type { OperationContext } from '../services/transaction';
import { TransactionRunner } from '../services/transaction';
import { chunkIds } from '../utils/chunk-ids';

/** Rows per multi-row statement, so the binds stay far under SQLite's limit. */
const ROWS_PER_STATEMENT = 500;

const PERIOD_KEY = [
	'projectId',
	'kind',
	'subjectId',
	'phase',
	'trigger',
	'status',
	'origin',
	'isTest',
	'hasParent',
	'periodUnit',
	'periodStart',
] as const;

export type UsagePeriodIncrement = Pick<UsageByPeriod, (typeof PERIOD_KEY)[number] | 'count'>;

/** One conjunction of conditions on the grid's dimensions. A unit is an OR of these. */
export type UsageFilter = {
	kind: UsageKind;
	triggerIn?: string[];
	triggerNotIn?: string[];
	statusIn?: string[];
	/** Use '' for a normal run. */
	originIn?: string[];
	originNotIn?: string[];
	isTest?: boolean;
	hasParent?: boolean;
};

@Service()
export class UsageRepository extends BaseRepository<UsageEvent> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly globalConfig: GlobalConfig,
	) {
		super(UsageEvent, dataSource.manager, transactionRunner);
	}

	/** Queue one fact. This is the only write on the run's path. */
	async append(fact: UsageFact, ctx: OperationContext = {}): Promise<void> {
		// A copy, because TypeORM writes the generated id back into the object it inserts.
		await this.managerFor(ctx).insert(UsageEvent, { ...fact });
	}

	/** Take the oldest queued facts out of the queue. Call it inside the fold's transaction. */
	async takeBatch(tx: EntityManager, limit: number): Promise<UsageEvent[]> {
		const batch = await tx.find(UsageEvent, { order: { id: 'ASC' }, take: limit });
		for (const ids of chunkIds(batch.map((event) => event.id))) {
			await tx.delete(UsageEvent, { id: In(ids) });
		}
		return batch;
	}

	/**
	 * Record the facts the ledger has not seen yet, and return only those. Safe without
	 * `ON CONFLICT` because the fold is the ledger's only writer and runs under a lock.
	 */
	async recordInLedger(tx: EntityManager, facts: UsageFact[]): Promise<UsageFact[]> {
		const unique = new Map<string, UsageFact>();
		for (const fact of facts) {
			const key = ledgerKey(fact);
			if (!unique.has(key)) unique.set(key, fact);
		}

		const seen = new Set<string>();
		for (const { kind, phase, executionIds } of groupExecutionIds([...unique.values()])) {
			for (const ids of chunkIds(executionIds)) {
				const rows = await tx.find(UsageLedgerEntry, {
					select: { kind: true, phase: true, executionId: true },
					where: { kind, phase, executionId: In(ids) },
				});
				for (const row of rows) seen.add(ledgerKey(row));
			}
		}

		const fresh = [...unique.entries()].filter(([key]) => !seen.has(key)).map(([, fact]) => fact);
		const foldedAt = new Date();
		for (const rows of chunk(fresh, ROWS_PER_STATEMENT)) {
			await tx.insert(
				UsageLedgerEntry,
				rows.map((fact) => ({ ...fact, foldedAt })),
			);
		}
		return fresh;
	}

	/** Delete ledger rows for facts that occurred before `cutoff`, oldest first, a batch at a time. */
	async deleteLedgerOlderThan(
		cutoff: Date,
		batchSize: number,
		signal?: AbortSignal,
	): Promise<number> {
		let deleted = 0;
		while (!signal?.aborted) {
			const batch = await this.manager.find(UsageLedgerEntry, {
				select: { kind: true, phase: true, executionId: true },
				where: { occurredAt: LessThan(cutoff) },
				order: { occurredAt: 'ASC' },
				take: batchSize,
			});
			for (const { kind, phase, executionIds } of groupExecutionIds(batch)) {
				for (const ids of chunkIds(executionIds)) {
					await this.manager.delete(UsageLedgerEntry, { kind, phase, executionId: In(ids) });
				}
			}
			deleted += batch.length;
			if (batch.length < batchSize) break;
		}
		return deleted;
	}

	/** Add counts to the per-period grid. Keys must be unique within one call. */
	async addToPeriods(tx: EntityManager, increments: UsagePeriodIncrement[]): Promise<void> {
		const isPostgres = this.globalConfig.database.type === 'postgresdb';
		const table = tx.connection.driver.escape(tx.getRepository(UsageByPeriod).metadata.tableName);
		const columns = [...PERIOD_KEY, 'count'] as const;
		// Postgres reports an unqualified column as ambiguous; SQLite resolves it to the target row.
		const existingCount = isPostgres ? `${table}."count"` : '"count"';

		for (const rows of chunk(increments, ROWS_PER_STATEMENT)) {
			const params: unknown[] = [];
			const values = rows.map((row) => {
				const placeholders = columns.map((column) => {
					const value =
						column === 'periodStart' ? toDbDate(row.periodStart, isPostgres) : row[column];
					params.push(value);
					return isPostgres ? `$${params.length}` : '?';
				});
				return `(${placeholders.join(', ')})`;
			});

			await tx.query(
				`INSERT INTO ${table} (${columns.map((column) => `"${column}"`).join(', ')})
				VALUES ${values.join(', ')}
				ON CONFLICT (${PERIOD_KEY.map((column) => `"${column}"`).join(', ')})
				DO UPDATE SET "count" = ${existingCount} + excluded."count"`,
				params,
			);
		}
	}

	/** Start of the oldest hourly grid row before `cutoff`, or null when there is none. */
	async oldestHourBefore(cutoff: Date): Promise<Date | null> {
		const row = await this.manager.findOne(UsageByPeriod, {
			select: { periodStart: true },
			where: { periodUnit: 'hour', periodStart: LessThan(cutoff) },
			order: { periodStart: 'ASC' },
		});
		return row ? new Date(row.periodStart) : null;
	}

	/**
	 * Roll one UTC day's hourly rows into daily rows, then delete them. Adds to an existing
	 * daily row, so a late fact compacted on a later run still counts. Returns hourly rows removed.
	 */
	async compactHoursOfDay(tx: EntityManager, dayStart: Date): Promise<number> {
		const isPostgres = this.globalConfig.database.type === 'postgresdb';
		const table = tx.connection.driver.escape(tx.getRepository(UsageByPeriod).metadata.tableName);
		const dims = PERIOD_KEY.filter((column) => column !== 'periodUnit' && column !== 'periodStart');
		const dimList = dims.map((column) => `"${column}"`).join(', ');
		const p = (n: number) => (isPostgres ? `$${n}` : '?');
		const from = toDbDate(dayStart, isPostgres);
		const to = toDbDate(new Date(dayStart.getTime() + 24 * 60 * 60 * 1000), isPostgres);
		const inDay = `"periodUnit" = 'hour' AND "periodStart" >= ${p(isPostgres ? 1 : 2)} AND "periodStart" < ${p(isPostgres ? 2 : 3)}`;
		const existingCount = isPostgres ? `${table}."count"` : '"count"';

		const [{ hours }] = await tx.query<Array<{ hours: string | number }>>(
			`SELECT COUNT(*) AS hours FROM ${table} WHERE "periodUnit" = 'hour' AND "periodStart" >= ${p(1)} AND "periodStart" < ${p(2)}`,
			[from, to],
		);
		if (Number(hours) === 0) return 0;

		// The day is a bound value, so the same statement works on both databases.
		await tx.query(
			`INSERT INTO ${table} (${dimList}, "periodUnit", "periodStart", "count")
			SELECT ${dimList}, 'day', ${p(1)}, SUM("count") FROM ${table}
			WHERE ${inDay}
			GROUP BY ${dimList}
			ON CONFLICT (${PERIOD_KEY.map((column) => `"${column}"`).join(', ')})
			DO UPDATE SET "count" = ${existingCount} + excluded."count"`,
			isPostgres ? [from, to] : [from, from, to],
		);
		await tx.query(
			`DELETE FROM ${table} WHERE "periodUnit" = 'hour' AND "periodStart" >= ${p(1)} AND "periodStart" < ${p(2)}`,
			[from, to],
		);
		return Number(hours);
	}

	/**
	 * Sum one project's facts of one phase in `[from, to)` that match any of the filters, across
	 * period units. Also returns how many grid rows the sum read.
	 */
	async sumUsage(
		projectId: string,
		from: Date,
		to: Date,
		anyOf: UsageFilter[],
		phase: UsagePhase = 'finished',
		ctx: OperationContext = {},
	): Promise<{ total: number; rows: number }> {
		const isPostgres = this.globalConfig.database.type === 'postgresdb';
		const query = this.managerFor(ctx)
			.createQueryBuilder(UsageByPeriod, 'u')
			.select('COALESCE(SUM(u.count), 0)', 'total')
			.addSelect('COUNT(*)', 'rows')
			.where('u.projectId = :projectId', { projectId })
			.andWhere('u.phase = :phase', { phase })
			.andWhere('u.periodStart >= :from AND u.periodStart < :to', {
				from: toDbDate(from, isPostgres),
				to: toDbDate(to, isPostgres),
			})
			.andWhere(
				new Brackets((oneOf) => {
					anyOf.forEach((filter, i) => {
						oneOf.orWhere(new Brackets((all) => applyFilter(all, filter, i)));
					});
				}),
			);

		const result = await query.getRawOne<{ total: string | number; rows: string | number }>();
		return { total: Number(result?.total ?? 0), rows: Number(result?.rows ?? 0) };
	}
}

type WhereBuilder = Parameters<ConstructorParameters<typeof Brackets>[0]>[0];

function applyFilter(where: WhereBuilder, filter: UsageFilter, i: number) {
	where.where(`u.kind = :kind${i}`, { [`kind${i}`]: filter.kind });
	const list = (column: string, name: string, values: string[] | undefined, negate = false) => {
		if (!values) return;
		where.andWhere(`u.${column} ${negate ? 'NOT IN' : 'IN'} (:...${name}${i})`, {
			[`${name}${i}`]: values,
		});
	};
	list('trigger', 'triggerIn', filter.triggerIn);
	list('trigger', 'triggerNotIn', filter.triggerNotIn, true);
	list('status', 'statusIn', filter.statusIn);
	list('origin', 'originIn', filter.originIn);
	list('origin', 'originNotIn', filter.originNotIn, true);
	if (filter.isTest !== undefined) {
		where.andWhere(`u.isTest = :isTest${i}`, { [`isTest${i}`]: filter.isTest });
	}
	if (filter.hasParent !== undefined) {
		where.andWhere(`u.hasParent = :hasParent${i}`, { [`hasParent${i}`]: filter.hasParent });
	}
}

type LedgerKey = Pick<UsageFact, 'kind' | 'phase' | 'executionId'>;

function ledgerKey({ kind, phase, executionId }: LedgerKey) {
	return `${kind}:${phase}:${executionId}`;
}

function groupExecutionIds(
	facts: LedgerKey[],
): Array<{ kind: UsageKind; phase: UsagePhase; executionIds: string[] }> {
	const groups = new Map<string, { kind: UsageKind; phase: UsagePhase; executionIds: string[] }>();
	for (const { kind, phase, executionId } of facts) {
		const key = `${kind}:${phase}`;
		const group = groups.get(key) ?? { kind, phase, executionIds: [] };
		group.executionIds.push(executionId);
		groups.set(key, group);
	}
	return [...groups.values()];
}

/** Raw SQL bypasses TypeORM's date conversion, so match the format its SQLite driver writes. */
export function toDbDate(date: Date, isPostgres: boolean): Date | string {
	return isPostgres ? date : date.toISOString().replace('T', ' ').replace('Z', '');
}
