/**
 * The `dataTable` service of `ctx.service` (spec 9.9) over a data-table
 * provider with n8n's interface (`DataTableProxyProvider` of n8n-workflow).
 * The test bed answers service calls with it over the fallback host's file
 * store. n8n itself answers them with its engine v2 service
 * (`EngineDataTablesService.call`), whose call is `{ kind: op, ...args }`.
 */

/** One `ctx.service` call as the runtime reports it. */
export interface ServiceCallEvent {
	service: string;
	op: string;
	args?: Record<string, unknown>;
}

/** The answer to a service call (spec 9.9). */
export type ServiceAnswer =
	| { ok: true; result: unknown }
	| { ok: false; error: { message: string; description?: string } };

/** The parts of n8n's data-table services that the Data Table node calls. */
export interface DataTableBackend {
	getDataTableAggregateProxy(): Promise<object>;
	getDataTableProxy(dataTableId: string): Promise<object>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The arguments of each operation, in the order of the service method's parameters. */
const TABLE_OPS: Record<string, (args: Record<string, unknown>) => unknown[]> = {
	getColumns: () => [],
	getManyRowsAndCount: (a) => [a.options ?? {}],
	insertRows: (a) => [a.rows ?? [], a.returnType ?? 'all'],
	updateRows: (a) => [a.options ?? {}],
	upsertRow: (a) => [a.options ?? {}],
	deleteRows: (a) => [a.options ?? {}],
};

/** JSON as the wire carries it: dates become ISO text. */
function json(value: unknown): unknown {
	const text = JSON.stringify(value);
	return text === undefined ? null : (JSON.parse(text) as unknown);
}

/**
 * A date and time in UTC with milliseconds. This is the text that `Date.toJSON`
 * gives, so it is the JSON form of a Date value (spec 4.5), and the JSON form
 * of the Date that v1 gives the data-table service.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** The columns of the table behind `proxy` as the service reports them. */
async function columnsOf(proxy: object): Promise<Array<{ name: string; type: string }>> {
	const method: unknown = Reflect.get(proxy, 'getColumns');
	if (typeof method !== 'function') return [];
	const columns: unknown = await Reflect.apply(method, proxy, []);
	if (!Array.isArray(columns)) return [];
	return columns
		.filter(isRecord)
		.map((column) => ({ name: String(column.name), type: String(column.type) }));
}

/**
 * The arguments of a call, with each filter value that is the JSON form of a
 * Date given as a Date again, when the filter names a `date` column.
 *
 * v1 gives the data-table service Date objects for date columns. n8n writes a
 * Date in its own text form (UTC, a space between the date and the time), so a
 * date column compares as a time. The same instant as ISO text does not compare
 * as a time in a text comparison, which SQLite uses, so the service needs the
 * Date back. Every other value, and a value on a column of another type, stays
 * as it is: a string column compares text.
 *
 * Only a call that holds such a value reads the columns, so a filter without a
 * date value costs no extra read.
 */
async function withDateFilterValues(
	proxy: object,
	args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const options = args.options;
	if (!isRecord(options) || !isRecord(options.filter)) return args;
	const filters = options.filter.filters;
	if (!Array.isArray(filters)) return args;
	const hasDateValue = filters.some(
		(filter) =>
			isRecord(filter) && typeof filter.value === 'string' && ISO_DATE_TIME.test(filter.value),
	);
	if (!hasDateValue) return args;
	const dates = new Set(
		(await columnsOf(proxy))
			.filter((column) => column.type === 'date')
			.map((column) => column.name),
	);
	if (dates.size === 0) return args;
	const withValues = filters.map((filter) => {
		if (!isRecord(filter) || typeof filter.value !== 'string') return filter;
		if (!ISO_DATE_TIME.test(filter.value) || !dates.has(String(filter.columnName))) return filter;
		return { ...filter, value: new Date(filter.value) };
	});
	return { ...args, options: { ...options, filter: { ...options.filter, filters: withValues } } };
}

/** Runs one `dataTable` service call and gives its answer. Errors become `ok: false`. */
export async function runDataTableCall(
	backend: DataTableBackend,
	call: ServiceCallEvent,
): Promise<ServiceAnswer> {
	try {
		const args = call.args ?? {};
		let target: object;
		let params: unknown[];
		if (call.op === 'getManyAndCount') {
			target = await backend.getDataTableAggregateProxy();
			params = [args.options ?? {}];
		} else {
			const toArgs = TABLE_OPS[call.op];
			if (!toArgs) throw new Error(`Unknown data table operation "${call.op}"`);
			if (typeof args.dataTableId !== 'string') throw new Error('The call has no dataTableId');
			target = await backend.getDataTableProxy(args.dataTableId);
			params = toArgs(await withDateFilterValues(target, args));
		}
		const method: unknown = Reflect.get(target, call.op);
		if (typeof method !== 'function') throw new Error(`Unknown data table operation "${call.op}"`);
		const result: unknown = await Reflect.apply(method, target, params);
		return { ok: true, result: json(result) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const description =
			isRecord(error) && typeof error.description === 'string' ? error.description : undefined;
		return { ok: false, error: description ? { message, description } : { message } };
	}
}
