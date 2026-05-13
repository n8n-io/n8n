import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import type { ExecutionStrategy } from './engine/compiler';
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

		let rows: Array<Record<string, unknown>>;
		try {
			rows = await this.withTimeout(
				this.dataSource.query(strategy.sql, strategy.params) as Promise<
					Array<Record<string, unknown>>
				>,
				timeoutMs,
			);
		} catch (err) {
			if (err instanceof ExecutionError) throw err;
			const message = err instanceof Error ? err.message : String(err);
			throw new ExecutionError('EXECUTION_FAILED', message);
		}

		return {
			columns: strategy.columns,
			rows,
			durationMs: Math.round(performance.now() - start),
			truncated: rows.length >= strategy.limit,
		};
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
