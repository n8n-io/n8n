/**
 * Compiled library node: a hand port of `n8n-nodes-base.dataTable` versions
 * 1 and 1.1, resource `row`: `get`, `insert`, `update`, `upsert`, `deleteRows`,
 * `rowExists` and `rowNotExists`.
 *
 * The node does not keep the tables. Each call of n8n's data-table service
 * (`IDataTableProjectService`) is a `ctx.service` call with the service
 * `dataTable` (spec 9.9). Its `op` and `args` are the `kind` and the other
 * fields of the engine v2 data-table call (`engine-data-tables.contract.ts` in
 * the cli package), so n8n runs it with the same service as v1. The node
 * makes the same calls as v1, in the same order, and builds the v1 output.
 *
 * The converter batches `insert` (v1 inserts all items with one call) and
 * runs the other operations once for each item, with `itemIndex` set.
 * Resource locators stay whole: a table by name is looked up first.
 *
 * Version 1 keeps the row dates of the service as Date objects in its items;
 * n8n saves them as ISO text, which is what the service result holds here.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: unknown;
}

interface Condition {
	keyName?: unknown;
	condition?: string;
	keyValue?: unknown;
}

interface SchemaField {
	id?: string;
	type?: string;
	required?: boolean;
}

interface Columns {
	mappingMode?: string;
	value?: Record<string, unknown> | null;
	schema?: SchemaField[];
}

interface DataTableParameters {
	resource?: string;
	operation?: string;
	dataTableId?: string | Locator;
	matchType?: string;
	filters?: { conditions?: Condition[] };
	returnAll?: boolean;
	limit?: number;
	orderBy?: boolean;
	orderByColumn?: string;
	orderByDirection?: string;
	columns?: Columns;
	options?: { dryRun?: unknown; optimizeBulk?: boolean };
	/** The index of the input item in the whole input (error messages). Set by the converter. */
	itemIndex?: number;
	/** "Continue on fail" (`continueRegularOutput`): a failure gives v1's items. Set by the converter. */
	errorItems?: boolean;
	/** `insert`: the parameters of each input item, when v1 inserts all items with one call. */
	batch?: DataTableParameters[];
}

interface Column {
	name?: string;
	type?: string;
}

interface RowPage {
	count?: number;
	data?: Item[];
}

interface TablePage {
	data?: Array<{ id?: unknown }>;
}

interface Filter {
	type: string;
	filters: Array<{ columnName: string; condition: string; value: unknown }>;
}

const SYSTEM_COLUMNS: Record<string, string> = {
	id: 'number',
	createdAt: 'date',
	updatedAt: 'date',
};
const PAGE_SIZE = 1000;
const ROWS_LIMIT_DEFAULT = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The text of a value in a v1 error message (`getValueDescription`). */
function describe(value: unknown): string {
	if (value === null) return "'null'";
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object') return 'object';
	return `'${typeof value === 'string' ? value : JSON.stringify(value)}'`;
}

/** A value as n8n's resource mapper casts it (`validateFieldType`, not strict). */
function castField(key: string, value: unknown, type: string): unknown {
	if (value === null || value === undefined) return undefined;
	const fail = `'${key}' expects a ${type} but we got ${describe(value)}`;
	if (type === 'number') {
		const n = Number(value);
		if (isNaN(n)) throw new Error(fail);
		return n;
	}
	if (type === 'boolean') {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'string' && ['true', 'false'].includes(value.toLowerCase())) {
			return value.toLowerCase() === 'true';
		}
		if (!(typeof value === 'string' && value.trim() === '')) {
			const n = Number(value);
			if (n === 0) return false;
			if (n === 1) return true;
		}
		throw new Error(fail);
	}
	return value;
}

/**
 * `columns.value` as `getNodeParameter` gives it (`validateResourceMapperValue`,
 * mode `add`): required fields must be set, and each field with a schema type
 * is cast. The error is v1's message; its description is the cast error.
 */
function mappedValues(
	value: Record<string, unknown>,
	schema: SchemaField[],
	index: number,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, v] of Object.entries(value)) out[key] = v;
	for (const key of Object.keys(out)) {
		const field = schema.find((s) => s.id === key);
		const v = out[key];
		if (field?.required === true && field.type !== 'boolean' && (v === null || v === undefined)) {
			throw new Error(`Invalid input for '${key}' [item ${index}]`);
		}
		if (field?.type) {
			let cast: unknown;
			try {
				cast = castField(key, v, field.type);
			} catch {
				throw new Error(`Invalid input for '${key}' [item ${index}]`);
			}
			out[key] = cast;
		}
	}
	return out;
}

/** The row of an insert, update or upsert (`getAddRow` and `dataObjectToApiInput`). */
function addRow(p: DataTableParameters, item: Item, index: number): Record<string, unknown> {
	const columns = p.columns ?? {};
	let data: Record<string, unknown>;
	if (columns.mappingMode === 'autoMapInputData') {
		data = {};
		for (const [k, v] of Object.entries(item)) {
			if (SYSTEM_COLUMNS[k] === undefined) data[k] = v;
		}
	} else {
		data = mappedValues(columns.value ?? {}, columns.schema ?? [], index);
	}
	const row: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(data)) {
		if (v === undefined || v === null) {
			row[k] = null;
		} else if (Array.isArray(v)) {
			throw new Error(`unexpected array input '${JSON.stringify(v)}' in row ${index}`);
		} else if (typeof v === 'object') {
			throw new Error(`unexpected object input '${JSON.stringify(v)}' in row ${index}`);
		} else {
			row[k] = v;
		}
	}
	return row;
}

function dryRunOf(p: DataTableParameters): boolean {
	const dryRun = p.options?.dryRun ?? false;
	if (typeof dryRun !== 'boolean') {
		throw new Error(`unexpected input ${JSON.stringify(dryRun)} for boolean dryRun`);
	}
	return dryRun;
}

export default defineNode<DataTableParameters>({
	type: 'n8n-nodes-base.dataTable',
	version: 1.1,
	supports: {
		resource: 'row',
		operation: { row: 'insert' },
		operations: {
			'row.get': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'returnAll',
				'limit',
				'orderBy',
				'orderByColumn',
				'orderByDirection',
				'itemIndex',
				'errorItems',
			],
			'row.insert': [
				'dataTableId',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.optimizeBulk',
				'itemIndex',
				'errorItems',
				'batch',
			],
			'row.update': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.dryRun',
				'itemIndex',
				'errorItems',
			],
			'row.upsert': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'columns',
				'columns.mappingMode',
				'columns.value',
				'columns.matchingColumns',
				'columns.schema',
				'columns.attemptToConvertTypes',
				'columns.convertFieldsToString',
				'options',
				'options.dryRun',
				'itemIndex',
				'errorItems',
			],
			'row.deleteRows': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'options',
				'options.dryRun',
				'itemIndex',
				'errorItems',
			],
			'row.rowExists': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'itemIndex',
				'errorItems',
			],
			'row.rowNotExists': [
				'dataTableId',
				'matchType',
				'filters',
				'filters.conditions',
				'itemIndex',
				'errorItems',
			],
		},
	},
	async run(ctx, parameters, items) {
		// True when the data table service failed. The other errors are the node's own checks,
		// which v1 throws as NodeOperationError.
		let serviceFailed = false;
		// The row operations of the v1 node.
		const rowOperation = async (): Promise<Item[]> => {
			const resource = parameters.resource ?? 'row';
			const operation = parameters.operation ?? 'insert';
			if (resource !== 'row')
				throw new Error(`Data table: ${resource} is not in the compiled library`);
			const call = async <T>(op: string, args: Record<string, unknown>): Promise<T> => {
				try {
					return await ctx.service<T>({ service: 'dataTable', op, args });
				} catch (error) {
					serviceFailed = true;
					throw error;
				}
			};

			// resolveDataTableId: a table by name is looked up for each use, as in v1.
			const tableId = async (p: DataTableParameters): Promise<string> => {
				const locator = p.dataTableId;
				const mode = isRecord(locator) ? locator.mode : 'id';
				const raw = isRecord(locator) ? locator.value : locator;
				const value = typeof raw === 'string' ? raw : String(raw);
				if (mode !== 'name') return value;
				const found = await call<TablePage>('getManyAndCount', {
					options: { filter: { name: value.toLowerCase() }, take: 1 },
				});
				const first = (found.data ?? [])[0];
				if (first === undefined) throw new Error(`Data table with name "${value}" not found`);
				return String(first.id);
			};

			// getSelectFilter: the columns of the table give the type of each condition.
			const selectFilter = async (p: DataTableParameters): Promise<Filter> => {
				// n8n fills the defaults of a condition row: the column `id`, `eq`, and the value
				// '' when the row shows a value. A value that an expression leaves undefined stays so.
				const hidden = ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'];
				const fields = (p.filters?.conditions ?? []).map((f) => {
					if (!isRecord(f)) return f;
					const row: Condition = { keyName: 'id', condition: 'eq', ...f };
					if (!('keyValue' in f) && !hidden.includes(String(row.condition))) row.keyValue = '';
					return row;
				});
				const matchType = p.matchType ?? 'anyCondition';
				if (matchType !== 'anyCondition' && matchType !== 'allConditions') {
					throw new Error('unexpected match type');
				}
				if (!Array.isArray(fields) || !fields.every((f) => isRecord(f) && 'keyName' in f)) {
					throw new Error('unexpected fields input');
				}
				const types: Record<string, string> = { ...SYSTEM_COLUMNS };
				if (fields.length > 0) {
					const id = await tableId(p);
					const columns = await call<Column[]>('getColumns', { dataTableId: id });
					for (const c of columns) types[String(c.name)] = String(c.type);
					const invalid = fields.filter((f) => types[String(f.keyName)] === undefined);
					if (invalid.length > 0) {
						const names = invalid.map((f) => String(f.keyName)).join(', ');
						throw new Error(
							`Filter validation failed: Column(s) "${names}" do not exist in the selected table. ` +
								'This often happens when switching between tables with different schemas. ' +
								'Please update your filter conditions.',
						);
					}
				}
				const filters = fields.map((f) => {
					const name = String(f.keyName);
					const type = types[name];
					if (f.condition === 'isEmpty' || f.condition === 'isNotEmpty') {
						const empty = f.condition === 'isEmpty';
						const condition = type === 'string' ? f.condition : empty ? 'eq' : 'neq';
						return { columnName: name, condition, value: null };
					}
					if (f.condition === 'isTrue' || f.condition === 'isFalse') {
						return { columnName: name, condition: 'eq', value: f.condition === 'isTrue' };
					}
					let value = f.keyValue;
					// v1 gives the service a Date object for a date column and the database compares the
					// column as a time. A Date is a number in the compiled subset, and its JSON form is
					// its ISO text (spec 4.5), which is what a Date expression gives here. The text of a
					// date string becomes that same ISO text, so the service compares one form only.
					if (type === 'date' && typeof value === 'string') {
						const parsed = new Date(value);
						if (isNaN(parsed.getTime())) {
							throw new Error(`Invalid date string '${value}' for column '${name}'`);
						}
						value = parsed.toISOString();
					}
					// v1 sends no `value` when the expression gives undefined. The converter gives an
					// expression's missing value as null, and a value field never holds null itself.
					if (value === null) value = undefined;
					return { columnName: name, condition: f.condition ?? 'eq', value };
				});
				return { type: matchType === 'allConditions' ? 'and' : 'or', filters };
			};

			// executeSelectMany: pages of 1,000 rows until the limit or the count. The caller
			// has resolved the table; the filter resolves it again, as in v1.
			const selectMany = async (
				p: DataTableParameters,
				id: string,
				limitOverride: number | undefined,
				sortBy: [string, string] | undefined,
			): Promise<Item[]> => {
				const filter = await selectFilter(p);
				const result: Item[] = [];
				const limit = limitOverride ?? (p.returnAll === true ? 0 : (p.limit ?? ROWS_LIMIT_DEFAULT));
				let skip = 0;
				let take = PAGE_SIZE;
				for (;;) {
					const options: Record<string, unknown> = {
						skip,
						take: limit ? Math.min(take, limit - result.length) : take,
						filter,
					};
					if (sortBy !== undefined) options.sortBy = sortBy;
					const page = await call<RowPage>('getManyRowsAndCount', { dataTableId: id, options });
					const data = page.data ?? [];
					const count = page.count ?? 0;
					if (skip === 0 && count === data.length) return data;
					if (data.length === 0) break;
					for (const row of data) result.push(row);
					if (limit && result.length >= limit) break;
					if (result.length >= count) break;
					skip = result.length;
					take = Math.min(PAGE_SIZE, count - result.length);
				}
				return result;
			};

			const input = items ?? [{}];
			if (operation === 'insert') {
				const each = parameters.batch ?? input.map(() => parameters);
				const first = each[0] ?? parameters;
				const id = await tableId(first);
				const rows = input.map((item, i) =>
					addRow(each[i] ?? first, item, parameters.batch ? i : (parameters.itemIndex ?? i)),
				);
				if (first.options?.optimizeBulk === true) {
					return [await call<Item>('insertRows', { dataTableId: id, rows, returnType: 'count' })];
				}
				return await call<Item[]>('insertRows', { dataTableId: id, rows, returnType: 'all' });
			}

			const index = parameters.itemIndex ?? 0;
			const item = input[0] ?? {};
			if (operation === 'get') {
				const id = await tableId(parameters);
				let sortBy: [string, string] | undefined;
				if (parameters.orderBy === true) {
					const column = parameters.orderByColumn ?? 'createdAt';
					if (column) {
						const columns = await call<Column[]>('getColumns', { dataTableId: id });
						if (SYSTEM_COLUMNS[column] === undefined && !columns.some((c) => c.name === column)) {
							throw new Error('Specified column does not exist');
						}
						sortBy = [column, parameters.orderByDirection ?? 'DESC'];
					}
				}
				return await selectMany(parameters, id, undefined, sortBy);
			}
			if (operation === 'rowExists' || operation === 'rowNotExists') {
				const hits = await selectMany(parameters, await tableId(parameters), 1, undefined);
				const exists = hits.length > 0;
				return exists === (operation === 'rowExists') ? [item] : [];
			}
			if (operation === 'update' || operation === 'upsert' || operation === 'deleteRows') {
				const id = await tableId(parameters);
				const dryRun = dryRunOf(parameters);
				const row = operation === 'deleteRows' ? {} : addRow(parameters, item, index);
				const filter = await selectFilter(parameters);
				if (filter.filters.length === 0) throw new Error('At least one condition is required');
				const options: Record<string, unknown> =
					operation === 'deleteRows' ? { filter, dryRun } : { data: row, filter, dryRun };
				const op =
					operation === 'update'
						? 'updateRows'
						: operation === 'upsert'
							? 'upsertRow'
							: 'deleteRows';
				return await call<Item[]>(op, { dataTableId: id, options });
			}
			throw new Error(`Data table: row.${operation} is not in the compiled library`);
		};
		try {
			return await rowOperation();
		} catch (error) {
			// A batched call has the flag in the parameters of each item.
			const first = parameters.batch?.[0] ?? parameters;
			if (first.errorItems !== true) throw error;
			// "Continue on fail" in v1's router: a NodeOperationError (a check of the node) gives
			// an item with the error, which n8n turns into `{ error }`. Another error (of the
			// data table service) lets each input item go on unchanged. A bulk insert gives the
			// n8n items themselves (`{ json, pairedItem }`) as the JSON.
			const input = items ?? [{}];
			const message: string = error.message;
			if (parameters.batch !== undefined) {
				return input.map((item, i) => ({
					json: serviceFailed ? item : { error: message },
					pairedItem: { item: i },
				}));
			}
			return serviceFailed ? input : [{ error: message }];
		}
	},
});
