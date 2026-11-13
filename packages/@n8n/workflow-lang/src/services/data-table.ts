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
			params = toArgs(args);
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
