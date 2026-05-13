import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { parse as flattedParse } from 'flatted';

import type { ExecutionStrategy, SqlOnlyStrategy, SqlPlusJsStrategy } from './engine/compiler';
import {
	applyOrderBy,
	deriveColumns,
	evalFilter,
	projectRow,
	type ItemRow,
} from './engine/compiler/residual';
import { ExecutionError } from './engine/errors';

const DEFAULT_TIMEOUT_MS = 10_000;

export type RunQueryResult = {
	columns: string[];
	rows: Array<Record<string, unknown>>;
	durationMs: number;
	truncated: boolean;
};

export type ExecuteOptions = {
	timeoutMs?: number;
};

@Service()
export class QueryExecutor {
	constructor(private readonly dataSource: DataSource) {}

	async execute(strategy: ExecutionStrategy, opts: ExecuteOptions = {}): Promise<RunQueryResult> {
		const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		const start = performance.now();

		try {
			const result =
				strategy.kind === 'sql-only'
					? await this.withTimeout(this.executePathA(strategy), timeoutMs)
					: await this.withTimeout(this.executePathB(strategy), timeoutMs);
			return { ...result, durationMs: Math.round(performance.now() - start) };
		} catch (error) {
			if (error instanceof ExecutionError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new ExecutionError('EXECUTION_FAILED', message);
		}
	}

	private async executePathA(
		strategy: SqlOnlyStrategy,
	): Promise<Omit<RunQueryResult, 'durationMs'>> {
		const rows = await this.dataSource.query(strategy.sql, strategy.params);
		return {
			columns: strategy.columns,
			rows,
			truncated: rows.length >= strategy.limit,
		};
	}

	private async executePathB(
		strategy: SqlPlusJsStrategy,
	): Promise<Omit<RunQueryResult, 'durationMs'>> {
		const fetched = await this.dataSource.query(strategy.fetch.sql, strategy.fetch.params);

		const rows: ItemRow[] = [];
		let truncated = false;

		for (const exec of fetched) {
			if (rows.length >= strategy.limit) {
				truncated = true;
				break;
			}
			const items = extractNodeItems(exec._raw, strategy.residual.nodeName);
			for (const item of items) {
				if (rows.length >= strategy.limit) {
					truncated = true;
					break;
				}
				const enriched: ItemRow = {
					...item,
					_execution_id: exec._execution_id,
					_executed_at: exec._executed_at,
				};
				if (!evalFilter(strategy.residual.filter, enriched)) continue;
				rows.push(projectRow(enriched, strategy.residual.projection));
			}
		}

		applyOrderBy(rows, strategy.residual.orderBy);
		const columns = deriveColumns(strategy.residual.projection, rows);

		return { columns, rows, truncated };
	}

	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		let timer: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(new ExecutionError('STATEMENT_TIMEOUT', `Query exceeded ${timeoutMs}ms`));
			}, timeoutMs);
		});
		try {
			return await Promise.race([promise, timeoutPromise]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}
}

/**
 * Parses a flatted-encoded execution data blob and extracts the items emitted
 * by the named node (first run, first output port). Returns an empty array
 * when the node didn't run, the blob isn't a string, or it's unparseable.
 */
function extractNodeItems(raw: unknown, nodeName: string): Array<Record<string, unknown>> {
	if (typeof raw !== 'string') return [];
	let parsed: unknown;
	try {
		parsed = flattedParse(raw);
	} catch {
		return [];
	}
	const runData = readPath<Record<string, unknown[]>>(parsed, ['resultData', 'runData']);
	if (!runData) return [];
	const runs = runData[nodeName];
	if (!Array.isArray(runs) || runs.length === 0) return [];
	const firstRun = runs[0] as Record<string, unknown> | undefined;
	const main = readPath<unknown[][]>(firstRun, ['data', 'main']);
	if (!Array.isArray(main) || main.length === 0) return [];
	const firstPort = main[0];
	if (!Array.isArray(firstPort)) return [];
	return firstPort
		.map((item) => {
			if (item && typeof item === 'object' && 'json' in item) {
				const json = (item as { json: unknown }).json;
				return json && typeof json === 'object' ? (json as Record<string, unknown>) : null;
			}
			return null;
		})
		.filter((x): x is Record<string, unknown> => x !== null);
}

function readPath<T>(obj: unknown, path: string[]): T | undefined {
	let cur: unknown = obj;
	for (const key of path) {
		if (cur && typeof cur === 'object' && key in cur) {
			cur = (cur as Record<string, unknown>)[key];
		} else {
			return undefined;
		}
	}
	return cur as T;
}
