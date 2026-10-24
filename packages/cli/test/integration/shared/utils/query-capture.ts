import { Container } from '@n8n/di';
import { DataSource, type QueryRunner } from '@n8n/typeorm';

export type CapturedStatement = { sql: string; records: Record<string, unknown>[] };

const containsText = (value: unknown, text: string) => {
	if (typeof value === 'string') return value.includes(text);
	if (value !== null && typeof value === 'object') return JSON.stringify(value).includes(text);
	return false;
};

/**
 * How many cells across all statements contain `text`, counted on the raw rows before
 * TypeORM merges duplicate rows. Use a marker inside a workflow's nodes to count how many
 * copies of that JSON the database sent.
 */
export const countCopies = (statements: CapturedStatement[], text: string) =>
	statements.reduce(
		(copies, { records }) =>
			copies +
			records.reduce(
				(rowCopies, row) =>
					rowCopies + Object.values(row).filter((value) => containsText(value, text)).length,
				0,
			),
		0,
	);

/** Index of the first statement whose rows contain `text`, or -1. */
export const statementContaining = (statements: CapturedStatement[], text: string) =>
	statements.findIndex(({ records }) =>
		records.some((row) => Object.values(row).some((value) => containsText(value, text))),
	);

/**
 * Runs `load` and records every statement sent through a new query runner, with its raw
 * rows. Queries on a query runner created before the call are not recorded.
 */
export async function captureStatements<T>(load: () => Promise<T>) {
	const dataSource = Container.get(DataSource);
	const statements: CapturedStatement[] = [];
	const createQueryRunner = dataSource.createQueryRunner.bind(dataSource);
	const spy = vi.spyOn(dataSource, 'createQueryRunner').mockImplementation((mode) => {
		const runner: QueryRunner = createQueryRunner(mode);
		const query = runner.query.bind(runner);
		runner.query = async (sql: string, parameters?: unknown[], useStructuredResult?: boolean) => {
			const result = await query(sql, parameters, true);
			statements.push({ sql, records: (result.records ?? []) as CapturedStatement['records'] });
			return useStructuredResult ? result : result.raw;
		};
		return runner;
	});

	try {
		return { result: await load(), statements };
	} finally {
		spy.mockRestore();
	}
}
