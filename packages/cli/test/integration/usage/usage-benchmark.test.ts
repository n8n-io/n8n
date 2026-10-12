import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	StatisticsNames,
	UsageEvent,
	UsageLedgerEntry,
	UsageRepository,
	WorkflowStatisticsRepository,
	type UsageFact,
	type UsagePeriodIncrement,
	type WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { periodIncrementsOf, startOfUtcDay } from '@/usage/usage-aggregation';
import { UsageConfig } from '@/usage/usage.config';
import { UsageCompactionService } from '@/usage/usage-compaction.service';
import { UsageFoldService } from '@/usage/usage-fold.service';
import { UsageRecorder } from '@/usage/usage-recorder.service';
import {
	matchesUnit,
	USAGE_UNITS,
	type UsageDimensions,
	type UsageUnit,
} from '@/usage/usage-units';

/** Throwaway spike benchmark. Run with USAGE_BENCH=1; writes results to USAGE_BENCH_OUT. */
const enabled = process.env.USAGE_BENCH === '1';

type Stats = { n: number; p50: number; p95: number; p99: number; max: number };

const percentiles = (samples: number[]): Stats => {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
	const round = (value: number) => Math.round(value * 100) / 100;
	return {
		n: sorted.length,
		p50: round(at(0.5)),
		p95: round(at(0.95)),
		p99: round(at(0.99)),
		max: round(sorted.at(-1) ?? 0),
	};
};

/** The run mix of one workflow on one day: [trigger, status, hasParent, share of days, max runs]. */
const MIX: Array<[string, string, boolean, number, number]> = [
	['webhook', 'success', false, 1, 200],
	['webhook', 'error', false, 0.5, 20],
	['trigger', 'success', false, 0.3, 100],
	['integrated', 'success', true, 0.4, 150],
	['manual', 'success', false, 0.3, 10],
	['error', 'success', false, 0.1, 5],
	['chat', 'success', false, 0.1, 30],
	['webhook', 'canceled', false, 0.1, 3],
];
const WORKFLOW_UNITS: UsageUnit[] = ['root_production', 'all_production', 'manual', 'all_runs'];

/** Deterministic, so both databases get the same data. */
const seededRandom = (seed: number) => () => {
	seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
	return seed / 2_147_483_648;
};

/** The legacy shape: one row per unit, so each unit is a direct lookup. */
type UnitRow = Pick<
	UsagePeriodIncrement,
	'projectId' | 'kind' | 'subjectId' | 'periodStart' | 'count'
> & {
	unit: UsageUnit;
};

const unitRowsOf = (grid: UsagePeriodIncrement[]): UnitRow[] => {
	const rows = new Map<string, UnitRow>();
	for (const row of grid) {
		const dims: UsageDimensions = row;
		for (const unit of WORKFLOW_UNITS) {
			if (!matchesUnit(unit, dims)) continue;
			const key = [row.projectId, row.subjectId, unit, row.periodStart.getTime()].join('|');
			const existing = rows.get(key);
			if (existing) existing.count += row.count;
			else rows.set(key, { ...row, unit, count: row.count });
		}
	}
	return [...rows.values()];
};

const timed = async (fn: () => Promise<unknown>) => {
	const start = performance.now();
	await fn();
	return performance.now() - start;
};

describe.skipIf(!enabled)('usage counting benchmark', () => {
	const results: Record<string, unknown> = {};
	let workflow: WorkflowEntity;
	let repository: UsageRepository;
	let recorder: UsageRecorder;
	let fold: UsageFoldService;
	let dataSource: DataSource;
	let isPostgres: boolean;

	const fact = (endedAt = new Date()): UsageFact => ({
		kind: 'workflow',
		executionId: randomUUID(),
		phase: 'finished',
		subjectId: workflow.id,
		subjectName: workflow.name,
		projectId: null,
		trigger: 'webhook',
		status: 'success',
		origin: null,
		isTest: false,
		parentId: null,
		startedAt: endedAt,
		occurredAt: endedAt,
	});

	const legacyWrite = async () => {
		const statistics = Container.get(WorkflowStatisticsRepository);
		if (isPostgres) {
			await statistics.appendIncrement(StatisticsNames.productionSuccess, workflow.id, true, 'wf');
		} else {
			await statistics.upsertWorkflowStatistics(
				StatisticsNames.productionSuccess,
				workflow.id,
				true,
				'wf',
			);
		}
	};

	const recordRun = async () =>
		await recorder.recordWorkflowRun({
			executionId: randomUUID(),
			workflowId: workflow.id,
			workflowName: workflow.name,
			mode: 'webhook',
			status: 'success',
			startedAt: new Date(),
			endedAt: new Date(),
		});

	const reset = async () => {
		await testDb.truncate([
			'UsageEvent',
			'UsageLedgerEntry',
			'UsageByPeriod',
			'WorkflowStatistics',
			'WorkflowStatisticsDelta',
		]);
	};

	/** Fire writes at a fixed rate while the fold runs every 5 s, as the real task would. */
	const load = async (runsPerSecond: number, seconds: number) => {
		const writeMs: number[] = [];
		const foldMs: number[] = [];
		let loading = true;

		const folder = (async () => {
			while (loading) {
				await sleep(5000);
				foldMs.push(await timed(async () => await fold.foldAll()));
			}
		})();

		const tickMs = 10;
		const perTick = (runsPerSecond * tickMs) / 1000;
		const pending: Array<Promise<void>> = [];
		let owed = 0;
		const end = performance.now() + seconds * 1000;
		while (performance.now() < end) {
			owed += perTick;
			for (; owed >= 1; owed--) {
				pending.push(
					timed(recordRun).then((ms) => {
						writeMs.push(ms);
					}),
				);
			}
			await sleep(tickMs);
		}
		await Promise.all(pending);
		loading = false;
		await folder;

		const backlog = await repository.count();
		const drainMs = await timed(async () => await fold.foldAll());
		const total = await Container.get(WorkflowStatisticsRepository).findOneBy({
			workflowId: workflow.id,
			name: StatisticsNames.productionSuccess,
		});

		return {
			runs: writeMs.length,
			write: percentiles(writeMs),
			fold: percentiles(foldMs),
			backlogAfterLoad: backlog,
			drainMs: Math.round(drainMs),
			countedCorrectly: total?.count === writeMs.length,
		};
	};

	beforeAll(async () => {
		await testDb.init();
		isPostgres = Container.get(GlobalConfig).database.type === 'postgresdb';
		repository = Container.get(UsageRepository);
		recorder = Container.get(UsageRecorder);
		fold = Container.get(UsageFoldService);
		dataSource = Container.get(DataSource);
		const project = await createTeamProject('Bench');
		workflow = await createWorkflow({ name: 'Bench workflow' }, project);
		results.database = Container.get(GlobalConfig).database.type;
		results.poolSize = isPostgres
			? Container.get(GlobalConfig).database.postgresdb.poolSize
			: Container.get(GlobalConfig).database.sqlite.poolSize;
	});

	afterAll(async () => {
		writeFileSync(
			process.env.USAGE_BENCH_OUT ?? `/tmp/usage-bench-${String(results.database)}.json`,
			JSON.stringify(results, null, 2),
		);
		await testDb.terminate();
	});

	it('hot-path write: legacy statistics write vs usage event insert', async () => {
		await reset();
		const legacy: number[] = [];
		const usage: number[] = [];
		for (let i = 0; i < 2000; i++) {
			legacy.push(await timed(legacyWrite));
			usage.push(await timed(async () => await repository.append(fact())));
		}
		results.sequentialWrite = { legacy: percentiles(legacy), usage: percentiles(usage) };

		await reset();
		const burstLegacy: number[] = [];
		const legacyWall = await timed(
			async () =>
				await Promise.all(
					Array.from({ length: 500 }, async () => burstLegacy.push(await timed(legacyWrite))),
				),
		);
		const burstUsage: number[] = [];
		const usageWall = await timed(
			async () =>
				await Promise.all(
					Array.from({ length: 500 }, async () =>
						burstUsage.push(await timed(async () => await repository.append(fact()))),
					),
				),
		);
		results.burst500Write = {
			legacy: { wallMs: Math.round(legacyWall), perWrite: percentiles(burstLegacy) },
			usage: { wallMs: Math.round(usageWall), perWrite: percentiles(burstUsage) },
		};
	}, 600_000);

	it('steady load: 30 runs/s for 20 s with the fold running', async () => {
		await reset();
		results.steady30 = await load(30, 20);
	}, 600_000);

	it('burst load: 500 runs/s for 10 s with the fold running', async () => {
		await reset();
		results.burst500 = await load(500, 10);
	}, 600_000);

	it('fold cost with an empty and a large ledger', async () => {
		const batch = isPostgres ? 5000 : 1000;
		const foldOneBatch = async () => {
			for (let i = 0; i < batch; i++) await repository.append(fact());
			return Math.round(await timed(async () => await fold.foldAll()));
		};

		await reset();
		const emptyLedger = await foldOneBatch();

		const ledgerRows = 500_000;
		const old = new Date(Date.now() - 24 * 60 * 60 * 1000);
		for (let i = 0; i < ledgerRows; i += 500) {
			await dataSource.manager.insert(
				UsageLedgerEntry,
				Array.from({ length: 500 }, () => ({ ...fact(old), foldedAt: old })),
			);
		}
		const largeLedger = await foldOneBatch();

		results.foldOneBatch = { batch, emptyLedgerMs: emptyLedger, ledger500kMs: largeLedger };
	}, 900_000);

	it('backlog drain: 50,000 queued facts', async () => {
		await reset();
		for (let i = 0; i < 50_000; i += 500) {
			await dataSource.manager.insert(
				UsageEvent,
				Array.from({ length: 500 }, () => fact()),
			);
		}
		const drainMs = await timed(async () => await fold.foldAll());
		results.drain50k = {
			ms: Math.round(drainMs),
			factsPerSecond: Math.round(50_000 / (drainMs / 1000)),
		};
	}, 900_000);

	describe('read and size: neutral grid vs one row per unit', () => {
		const DAYS = 30;
		const MONTH_START = new Date('2026-09-01T00:00:00.000Z');
		const MONTH_END = new Date(MONTH_START.getTime() + DAYS * 24 * 60 * 60 * 1000);
		const LAST_DAY = new Date(MONTH_END.getTime() - 24 * 60 * 60 * 1000);
		const unitTable = () => `${Container.get(GlobalConfig).database.tablePrefix}bench_unit_totals`;

		const tableBytes = async (table: string): Promise<number | null> => {
			try {
				const rows = isPostgres
					? await dataSource.query<Array<{ bytes: string }>>(
							'SELECT pg_total_relation_size($1) AS bytes',
							[table],
						)
					: await dataSource.query<Array<{ bytes: number }>>(
							'SELECT SUM(pgsize) AS bytes FROM dbstat WHERE name = ? OR tbl_name = ?',
							[table, table],
						);
				return Number(rows[0]?.bytes ?? 0) || null;
			} catch {
				// SQLite builds without the dbstat table cannot report a size.
				return null;
			}
		};

		it('compares rows, size, reads and fold writes for the same month of runs', async () => {
			await reset();
			const random = seededRandom(42);
			const projects: Array<{ id: string; workflows: string[] }> = [];
			for (let p = 0; p < 50; p++) {
				const workflows = Array.from({ length: p === 0 ? 500 : 20 }, () => randomUUID());
				projects.push({ id: randomUUID(), workflows });
			}

			const grid: UsagePeriodIncrement[] = [];
			for (const project of projects) {
				for (const subjectId of project.workflows) {
					for (let day = 0; day < DAYS; day++) {
						const periodStart = new Date(MONTH_START.getTime() + day * 24 * 60 * 60 * 1000);
						for (const [trigger, status, hasParent, share, max] of MIX) {
							if (random() > share) continue;
							grid.push({
								projectId: project.id,
								kind: 'workflow',
								subjectId,
								phase: 'finished',
								trigger,
								status,
								origin: '',
								isTest: false,
								hasParent,
								periodUnit: 'day',
								periodStart,
								count: 1 + Math.floor(random() * max),
							});
						}
					}
				}
			}
			const unitRows = unitRowsOf(grid);

			await dataSource.transaction(async (tx) => await repository.addToPeriods(tx, grid));
			const escaped = dataSource.driver.escape(unitTable());
			const timestamp = isPostgres ? 'TIMESTAMP(3) WITH TIME ZONE' : 'DATETIME(3)';
			await dataSource.query(`DROP TABLE IF EXISTS ${escaped}`);
			await dataSource.query(
				`CREATE TABLE ${escaped} ("projectId" VARCHAR(36) NOT NULL, "kind" VARCHAR(16) NOT NULL,
				"subjectId" VARCHAR(36) NOT NULL, "unit" VARCHAR(32) NOT NULL, "periodStart" ${timestamp} NOT NULL,
				"count" BIGINT NOT NULL, PRIMARY KEY ("projectId", "kind", "subjectId", "unit", "periodStart"))`,
			);
			await dataSource.query(
				`CREATE INDEX ${dataSource.driver.escape(`${unitTable()}_read`)} ON ${escaped} ("projectId", "unit", "periodStart")`,
			);
			for (let i = 0; i < unitRows.length; i += 500) {
				const rows = unitRows.slice(i, i + 500);
				const params: unknown[] = [];
				const values = rows.map((row) => {
					const cells = [
						row.projectId,
						row.kind,
						row.subjectId,
						row.unit,
						toDb(row.periodStart),
						row.count,
					];
					return `(${cells.map((cell) => (params.push(cell), placeholder(params.length))).join(', ')})`;
				});
				await dataSource.query(
					`INSERT INTO ${escaped} ("projectId", "kind", "subjectId", "unit", "periodStart", "count") VALUES ${values.join(', ')}`,
					params,
				);
			}
			if (isPostgres) await dataSource.query('ANALYZE');

			const gridTable = dataSource.getMetadata('UsageByPeriod').tableName;
			results.size = {
				gridRows: grid.length,
				unitRows: unitRows.length,
				gridBytes: await tableBytes(gridTable),
				unitBytes: await tableBytes(unitTable()),
			};

			const readUnitTable = async (projectId: string, from: Date, to: Date) => {
				const [row] = await dataSource.query<
					Array<{ total: string | number; rows: string | number }>
				>(
					`SELECT COALESCE(SUM("count"), 0) AS total, COUNT(*) AS rows FROM ${escaped}
					WHERE "projectId" = ${placeholder(1)} AND "unit" = ${placeholder(2)}
					AND "periodStart" >= ${placeholder(3)} AND "periodStart" < ${placeholder(4)}`,
					[projectId, 'root_production', toDb(from), toDb(to)],
				);
				return { total: Number(row.total), rows: Number(row.rows) };
			};

			const compare = async (projectIds: string[], from: Date, to: Date) => {
				const grid: number[] = [];
				const unit: number[] = [];
				const gridRowsRead: number[] = [];
				const unitRowsRead: number[] = [];
				let mismatches = 0;
				for (let i = 0; i < 200; i++) {
					const projectId = projectIds[i % projectIds.length];
					let neutral = { total: 0, rows: 0 };
					grid.push(
						await timed(async () => {
							neutral = await repository.sumUsage(projectId, from, to, USAGE_UNITS.root_production);
						}),
					);
					let legacy = { total: 0, rows: 0 };
					unit.push(
						await timed(async () => {
							legacy = await readUnitTable(projectId, from, to);
						}),
					);
					gridRowsRead.push(neutral.rows);
					unitRowsRead.push(legacy.rows);
					if (neutral.total !== legacy.total) mismatches++;
				}
				const avg = (values: number[]) =>
					Math.round(values.reduce((a, b) => a + b, 0) / values.length);
				return {
					grid: { ms: percentiles(grid), rowsRead: avg(gridRowsRead) },
					unit: { ms: percentiles(unit), rowsRead: avg(unitRowsRead) },
					totalsMatch: mismatches === 0,
				};
			};

			const small = projects.slice(1).map((project) => project.id);
			const large = [projects[0].id];
			results.reads = {
				smallProjectMonth: await compare(small, MONTH_START, MONTH_END),
				smallProjectDay: await compare(small, LAST_DAY, MONTH_END),
				largeProjectMonth: await compare(large, MONTH_START, MONTH_END),
				largeProjectDay: await compare(large, LAST_DAY, MONTH_END),
			};

			// Fold writes: distinct rows one batch of 5000 runs upserts in each design.
			const batch: UsageFact[] = [];
			const flat = projects.flatMap((project) =>
				project.workflows.map((subjectId) => ({ projectId: project.id, subjectId })),
			);
			for (let i = 0; i < 5000; i++) {
				const { projectId, subjectId } = flat[Math.floor(random() * flat.length)];
				const [trigger, status, hasParent] = MIX[Math.floor(random() * MIX.length)];
				batch.push({
					...fact(startOfUtcDay(new Date())),
					projectId,
					subjectId,
					trigger,
					status,
					parentId: hasParent ? randomUUID() : null,
				});
			}
			const gridKeys = periodIncrementsOf(batch);
			results.foldWritesPer5000 = {
				gridUpserts: gridKeys.length,
				unitUpserts: unitRowsOf(gridKeys).length,
			};

			await dataSource.query(`DROP TABLE ${escaped}`);
		}, 1_800_000);

		const toDb = (date: Date) =>
			isPostgres ? date : date.toISOString().replace('T', ' ').replace('Z', '');
		const placeholder = (n: number) => (isPostgres ? `$${n}` : '?');
	});

	describe('hourly rows with hour -> day compaction', () => {
		it('compares rows, compaction time and reads for a month of hourly data', async () => {
			await reset();
			const DAY = 24 * 60 * 60 * 1000;
			const HOUR = 60 * 60 * 1000;
			const today = startOfUtcDay(new Date());
			const monthStart = new Date(today.getTime() - 29 * DAY);
			const monthEnd = new Date(today.getTime() + DAY);
			const random = seededRandom(7);

			const projects: Array<{ id: string; workflows: string[] }> = [];
			for (let p = 0; p < 50; p++) {
				const workflows = Array.from({ length: p === 0 ? 500 : 20 }, () => randomUUID());
				projects.push({ id: randomUUID(), workflows });
			}

			const hourly: UsagePeriodIncrement[] = [];
			let dayRows = 0;
			for (const project of projects) {
				for (const subjectId of project.workflows) {
					for (let day = 0; day < 30; day++) {
						const dayStart = new Date(monthStart.getTime() + day * DAY);
						for (const [trigger, status, hasParent, share, max] of MIX) {
							if (random() > share) continue;
							dayRows++;
							const runs = 1 + Math.floor(random() * max);
							// Spread the day's runs over 1 to 16 active hours.
							const hours = Math.min(runs, 1 + Math.floor(random() * 16));
							const firstHour = Math.floor(random() * (24 - hours + 1));
							for (let h = 0; h < hours; h++) {
								hourly.push({
									projectId: project.id,
									kind: 'workflow',
									subjectId,
									phase: 'finished',
									trigger,
									status,
									origin: '',
									isTest: false,
									hasParent,
									periodUnit: 'hour',
									periodStart: new Date(dayStart.getTime() + (firstHour + h) * HOUR),
									count: Math.max(1, Math.round(runs / hours)),
								});
							}
						}
					}
				}
			}
			for (let i = 0; i < hourly.length; i += 20_000) {
				await dataSource.transaction(
					async (tx) => await repository.addToPeriods(tx, hourly.slice(i, i + 20_000)),
				);
			}
			if (isPostgres) await dataSource.query('ANALYZE');

			const gridTable = dataSource.getMetadata('UsageByPeriod').tableName;
			const bytes = async () => {
				if (!isPostgres) return null;
				const [row] = await dataSource.query<Array<{ bytes: string }>>(
					'SELECT pg_total_relation_size($1) AS bytes',
					[gridTable],
				);
				return Number(row.bytes);
			};

			const small = projects.slice(1).map((project) => project.id);
			const large = [projects[0].id];
			const ranges = {
				month: [monthStart, monthEnd],
				day: [new Date(today.getTime() - DAY), today],
				last24h: [new Date(today.getTime() - 12 * HOUR), new Date(today.getTime() + 12 * HOUR)],
			} as const;

			const measureReads = async () => {
				const out: Record<string, unknown> = {};
				const totals: number[] = [];
				for (const [name, ids] of [
					['small', small],
					['large', large],
				] as const) {
					for (const [rangeName, [from, to]] of Object.entries(ranges)) {
						const ms: number[] = [];
						const rows: number[] = [];
						for (let i = 0; i < 100; i++) {
							const projectId = ids[i % ids.length];
							let result = { total: 0, rows: 0 };
							ms.push(
								await timed(async () => {
									result = await repository.sumUsage(
										projectId,
										from,
										to,
										USAGE_UNITS.root_production,
									);
								}),
							);
							rows.push(result.rows);
							if (i < ids.length) totals.push(result.total);
						}
						out[`${name}-${rangeName}`] = {
							ms: percentiles(ms),
							rowsRead: Math.round(rows.reduce((a, b) => a + b, 0) / rows.length),
						};
					}
				}
				return { reads: out, totals };
			};

			const allHourly = { rows: hourly.length, bytes: await bytes(), ...(await measureReads()) };

			Container.get(UsageConfig).hourlyRetentionDays = 7;
			const compaction = Container.get(UsageCompactionService);
			const dayTimes: number[] = [];
			const cutoff = startOfUtcDay(new Date(Date.now() - 7 * DAY));
			for (;;) {
				const oldest = await repository.oldestHourBefore(cutoff);
				if (!oldest) break;
				const day = startOfUtcDay(oldest);
				dayTimes.push(
					await timed(
						async () =>
							await dataSource.transaction(
								async (tx) => await repository.compactHoursOfDay(tx, day),
							),
					),
				);
			}
			expect(await compaction.compact()).toBe(0);
			if (isPostgres) await dataSource.query('ANALYZE');

			const compacted = {
				rows: await dataSource.getRepository('UsageByPeriod').count(),
				bytes: await bytes(),
				...(await measureReads()),
			};

			results.hourly = {
				dayOnlyRows: dayRows,
				allHourly: { rows: allHourly.rows, bytes: allHourly.bytes, reads: allHourly.reads },
				after7DayCompaction: {
					rows: compacted.rows,
					bytes: compacted.bytes,
					reads: compacted.reads,
				},
				compactOneDay: { days: dayTimes.length, ms: percentiles(dayTimes) },
				totalsUnchanged: JSON.stringify(allHourly.totals) === JSON.stringify(compacted.totals),
			};
		}, 3_600_000);
	});
});
