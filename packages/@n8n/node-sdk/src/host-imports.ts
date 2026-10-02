/**
 * The n8n side of the optional host imports of Node Contract 2.3.0: data tables, code in the
 * task runner, and wait. Each one maps the typed import of `define.ts` to an n8n service and
 * knows nothing about the node that uses it.
 */
import { isRecord } from '@n8n/utils/is-record';
import {
	NodeOperationError,
	UnexpectedError,
	UserError,
	type CreateDataTableOptions,
	type DataTable as N8nDataTable,
	type DataTableColumnJsType,
	type DataTableFilter as N8nDataTableFilter,
	type IDataTableProjectService,
	type ListDataTableOptions,
	type IExecuteFunctions,
} from 'n8n-workflow';

import type {
	CodeRequest,
	CodeRunner,
	DataTable,
	DataTableColumn,
	DataTableColumnType,
	DataTableFilter,
	DataTableInfo,
	DataTableRow,
	DataTables,
	DataTableValue,
	DataTableValues,
} from './define';

/** The data table services of the project that owns the workflow. */
export interface DataTableHost {
	/** The ID of the table with this name, or undefined when there is none. */
	idOf(name: string): Promise<string | undefined>;
	/** The service of one table. It throws when the table does not exist. */
	open(id: string): Promise<IDataTableProjectService>;
	list(options: ListDataTableOptions): Promise<{ count: number; data: N8nDataTable[] }>;
	create(options: CreateDataTableOptions): Promise<N8nDataTable>;
}

const SYSTEM_COLUMNS: Readonly<Record<string, DataTableColumnType>> = {
	id: 'number',
	createdAt: 'date',
	updatedAt: 'date',
};

const isDate = (value: unknown): value is Date => value instanceof Date;

const cellOf = (value: unknown): DataTableValue =>
	isDate(value)
		? value.toISOString()
		: typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean' ||
				value === null
			? value
			: JSON.stringify(value);

const isRowId = (value: unknown): value is number => typeof value === 'number';

/** A stored row with each date as ISO 8601 text, so the row is JSON. */
function rowOf(raw: Readonly<Record<string, unknown>>): DataTableRow {
	const { id, createdAt, updatedAt } = raw;
	if (!isRowId(id)) throw new UnexpectedError('A data table row has no number id');
	return {
		...Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, cellOf(value)])),
		id,
		createdAt: String(cellOf(createdAt)),
		updatedAt: String(cellOf(updatedAt)),
	};
}

/** The table one action opened. It reads the columns once, for the date conversion. */
function tableOf(id: string, service: IDataTableProjectService): DataTable {
	const columns = new Map<'columns', Promise<readonly DataTableColumn[]>>();
	const columnsOf = async () => {
		const known =
			columns.get('columns') ??
			service
				.getColumns()
				.then((list) => list.map(({ name, type }): DataTableColumn => ({ name, type })));
		columns.set('columns', known);
		return await known;
	};
	const typesOf = async (): Promise<ReadonlyMap<string, DataTableColumnType>> =>
		new Map([
			...Object.entries(SYSTEM_COLUMNS),
			...(await columnsOf()).map(({ name, type }) => [name, type] as const),
		]);

	/** A date column takes a `Date`. Text that is not a date stays text, so the store refuses it. */
	const storedValue = (type: DataTableColumnType | undefined, value: DataTableValue) => {
		if (type !== 'date' || typeof value !== 'string') return value;
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date;
	};

	const valuesOf = async (
		values: DataTableValues,
	): Promise<Record<string, DataTableColumnJsType>> => {
		const types = await typesOf();
		return Object.fromEntries(
			Object.entries(values).map(([name, value]) => [name, storedValue(types.get(name), value)]),
		);
	};

	// Only a text column has an empty value. For the other types, empty means null.
	const filterOf = async ({ match, conditions }: DataTableFilter): Promise<N8nDataTableFilter> => {
		const types = await typesOf();
		return {
			type: match === 'all' ? 'and' : 'or',
			filters: conditions.map((condition) => {
				const { column, op } = condition;
				const type = types.get(column);
				if (type === undefined) {
					throw new UserError(`The data table has no column "${column}"`);
				}
				if ('value' in condition) {
					return { columnName: column, condition: op, value: storedValue(type, condition.value) };
				}
				if (type === 'string') return { columnName: column, condition: op, value: null };
				return { columnName: column, condition: op === 'isEmpty' ? 'eq' : 'neq', value: null };
			}),
		};
	};

	return {
		id,
		columns: columnsOf,
		async rows({ filter, sort, offset, limit }) {
			const { count, data } = await service.getManyRowsAndCount({
				skip: offset ?? 0,
				take: limit,
				...(filter ? { filter: await filterOf(filter) } : {}),
				...(sort ? { sortBy: [sort.column, sort.direction === 'asc' ? 'ASC' : 'DESC'] } : {}),
			});
			return { count, rows: data.map(rowOf) };
		},
		async insert(rows) {
			const stored = await Promise.all(rows.map(valuesOf));
			return (await service.insertRows(stored, 'all')).map(rowOf);
		},
		async update(filter, values) {
			const rows = await service.updateRows({
				filter: await filterOf(filter),
				data: await valuesOf(values),
			});
			return rows.map(rowOf);
		},
		async upsert(filter, values) {
			const rows = await service.upsertRow({
				filter: await filterOf(filter),
				data: await valuesOf(values),
			});
			return rows.map(rowOf);
		},
		async delete(filter) {
			return (await service.deleteRows({ filter: await filterOf(filter) })).map(rowOf);
		},
		clear: async () => (await service.clearRows()).deletedCount,
		rename: async (name) => await service.updateDataTable({ name }),
		drop: async () => await service.deleteDataTable(),
	};
}

const infoOf = ({ id, name, columns, createdAt, updatedAt }: N8nDataTable): DataTableInfo => ({
	id,
	name,
	columns: [...columns]
		.sort((a, b) => a.index - b.index)
		.map(({ name: column, type }) => ({ name: column, type })),
	createdAt: String(cellOf(createdAt)),
	updatedAt: String(cellOf(updatedAt)),
});

const COLUMN_TYPES: ReadonlySet<unknown> = new Set(['string', 'number', 'boolean', 'date']);

const isCellValue = (value: unknown): value is DataTableValue =>
	value === null || ['string', 'number', 'boolean'].includes(typeof value);

/** A row as JSON: the system columns and cell values. Recorded fixtures cross as JSON. */
const isDataTableRow = (value: unknown): value is DataTableRow =>
	isRecord(value) &&
	typeof value.id === 'number' &&
	typeof value.createdAt === 'string' &&
	typeof value.updatedAt === 'string' &&
	Object.values(value).every(isCellValue);

export const isDataTableRows = (value: unknown): value is readonly DataTableRow[] =>
	Array.isArray(value) && value.every(isDataTableRow);

export const isDataTablePage = (
	value: unknown,
): value is { readonly count: number; readonly rows: readonly DataTableRow[] } =>
	isRecord(value) && typeof value.count === 'number' && isDataTableRows(value.rows);

export const isDataTableColumns = (value: unknown): value is readonly DataTableColumn[] =>
	Array.isArray(value) &&
	value.every(
		(column) =>
			isRecord(column) && typeof column.name === 'string' && COLUMN_TYPES.has(column.type),
	);

export const isDataTableInfo = (value: unknown): value is DataTableInfo =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.name === 'string' &&
	typeof value.createdAt === 'string' &&
	typeof value.updatedAt === 'string' &&
	isDataTableColumns(value.columns);

export const isDataTableList = (
	value: unknown,
): value is { readonly count: number; readonly tables: readonly DataTableInfo[] } =>
	isRecord(value) &&
	typeof value.count === 'number' &&
	Array.isArray(value.tables) &&
	value.tables.every(isDataTableInfo);

export const dataTablesOf = (host: DataTableHost): DataTables => ({
	async open(table) {
		const id = table.id ?? (await host.idOf(table.name));
		if (id === undefined) throw new UserError(`Data table with name "${table.name}" not found`);
		return tableOf(id, await host.open(id));
	},
	async list({ name, sort, offset, limit }) {
		const { count, data } = await host.list({
			// The store compares names without case, so the Data table node sends lower case.
			...(name === undefined ? {} : { filter: { name: name.toLowerCase() } }),
			...(sort ? { sortBy: `${sort.by}:${sort.direction}` } : {}),
			skip: offset ?? 0,
			take: limit,
		});
		return { count, tables: data.map(infoOf) };
	},
	async create({ name, columns }) {
		return infoOf(
			await host.create({
				name,
				columns: columns.map((column, index) => ({ ...column, index })),
			}),
		);
	},
});

/** Tables per page of a name lookup. */
const NAME_PAGE_SIZE = 100;

type TablePage = (skip: number, take: number) => Promise<{ count: number; data: N8nDataTable[] }>;

async function tablesOf(read: TablePage, skip = 0): Promise<N8nDataTable[]> {
	const { count, data } = await read(skip, NAME_PAGE_SIZE);
	const next = skip + data.length;
	return data.length === 0 || next >= count ? data : [...data, ...(await tablesOf(read, next))];
}

/**
 * The table with this name: the same text first, else the same text without case. The store
 * filters names by part and without case, so the first table of a filter can be another one.
 */
export async function tableIdByName(name: string, read: TablePage): Promise<string | undefined> {
	const tables = await tablesOf(read);
	const wanted = name.toLowerCase();
	return (
		tables.find((table) => table.name === name) ??
		tables.find((table) => table.name.toLowerCase() === wanted)
	)?.id;
}

/** The data table services of an n8n execution, as the Data table node reads them. */
export function dataTableHostOf(context: IExecuteFunctions): DataTableHost {
	// n8n has no data table helpers when the data table module is off.
	const helpers = () => {
		const { getDataTableProxy, getDataTableAggregateProxy } = context.helpers;
		if (!getDataTableProxy || !getDataTableAggregateProxy) {
			throw new NodeOperationError(context.getNode(), 'The data table module of n8n is off');
		}
		return { getDataTableProxy, getDataTableAggregateProxy };
	};
	return {
		idOf: async (name) => {
			const aggregate = await helpers().getDataTableAggregateProxy();
			return await tableIdByName(
				name,
				async (skip, take) => await aggregate.getManyAndCount({ filter: { name }, skip, take }),
			);
		},
		open: async (id) => await helpers().getDataTableProxy(id),
		list: async (options) =>
			await (await helpers().getDataTableAggregateProxy()).getManyAndCount(options),
		create: async (options) =>
			await (await helpers().getDataTableAggregateProxy()).createDataTable(options),
	};
}

const CODE_LANGUAGES = new Map<'languages', ReadonlySet<CodeRequest['language']>>();

/** The languages the instance allows, e.g. without Python when `N8N_PYTHON_ENABLED` is false. */
export const setCodeLanguages = (languages: ReadonlyArray<CodeRequest['language']>) => {
	CODE_LANGUAGES.set('languages', new Set(languages));
};

// Until the host sets the languages, only JavaScript runs: a host that skips the switch must not run Python.
const allows = (language: CodeRequest['language']) =>
	CODE_LANGUAGES.get('languages')?.has(language) ?? language === 'javascript';

/** An error from the runner is JSON, not an `Error`; the Code node wraps it the same way. */
function runnerError(context: IExecuteFunctions, error: unknown): Error {
	if (error instanceof Error) return error;
	const fields = typeof error === 'object' && error !== null ? error : {};
	const message =
		'message' in fields && typeof fields.message === 'string' ? fields.message : 'Unknown error';
	const description =
		'description' in fields && typeof fields.description === 'string'
			? fields.description
			: undefined;
	return new NodeOperationError(context.getNode(), message, {
		...(description ? { description } : {}),
	});
}

/** The JavaScript runner reads the items of a chunk of each-item runs at once. */
const CHUNK_SIZE = 1000;

/** User code in the n8n task runner, with the settings the Code node sends. */
export function codeRunnerOf(context: IExecuteFunctions): CodeRunner {
	const resultOf = async (language: string, settings: Record<string, unknown>) => {
		const result = await context.startJob(language, settings, 0);
		if (!result.ok) throw runnerError(context, 'error' in result ? result.error : {});
		return result.result;
	};
	return {
		async run({ language, code, mode }) {
			if (!allows(language)) {
				throw new UserError(`This instance does not allow ${language} code`);
			}
			const nodeMode = mode === 'all' ? 'runOnceForAllItems' : 'runOnceForEachItem';
			const base = {
				code,
				nodeMode,
				workflowMode: context.getMode(),
				continueOnFail: context.continueOnFail(),
			};
			if (language === 'python') {
				const status = context.getRunnerStatus('python');
				if (!status.available) {
					throw new UserError(
						`The Python task runner is not available${status.reason ? `: ${status.reason}` : ''}`,
					);
				}
				const node = context.getNode();
				const workflow = context.getWorkflow();
				// The Python runner gets the items with the task.
				return await resultOf('python', {
					...base,
					items: context.getInputData(),
					nodeId: node.id,
					nodeName: node.name,
					workflowId: workflow.id,
					workflowName: workflow.name,
				});
			}
			if (mode === 'all')
				return await resultOf('javascript', { ...base, additionalProperties: {} });
			const count = context.getInputData().length;
			const starts = Array.from(
				{ length: Math.ceil(count / CHUNK_SIZE) },
				(_, i) => i * CHUNK_SIZE,
			);
			// One list for all chunks: a copy per chunk would grow with the square of the items.
			const outputs: unknown[] = [];
			await starts.reduce(async (previous, startIndex) => {
				await previous;
				const chunk = { startIndex, count: Math.min(CHUNK_SIZE, count - startIndex) };
				const result = await resultOf('javascript', { ...base, chunk, additionalProperties: {} });
				outputs.push(...(Array.isArray(result) ? result : [result]));
			}, Promise.resolve());
			return outputs;
		},
	};
}
