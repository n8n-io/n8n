import { convertWorkflow } from '../../convert/index.ts';
import { runReference, type EffectRecord } from '../../reference/runner.ts';
import { runDataTableCall, type DataTableBackend, type ServiceCallEvent } from '../data-table.ts';

/** The columns of a table with a date column and a string column. */
const columns = [
	{ id: 'c1', name: 'name', type: 'string', index: 0, dataTableId: 'T' },
	{ id: 'c2', name: 'wait_until', type: 'date', index: 1, dataTableId: 'T' },
];

/** The one instant that a Date value has on the wire, in the text that `Date.toJSON` gives. */
const instant = '2024-03-01T00:00:00.000Z';

/** A backend that records the provider calls, and answers `getColumns` with `columns`. */
function recordingBackend(): { backend: DataTableBackend; calls: unknown[][] } {
	const calls: unknown[][] = [];
	const table = {
		getColumns: async () => {
			calls.push(['getColumns']);
			return columns;
		},
		getManyRowsAndCount: async (options: unknown) => {
			calls.push(['getManyRowsAndCount', options]);
			return { count: 0, data: [] };
		},
		updateRows: async (options: unknown) => {
			calls.push(['updateRows', options]);
			return [];
		},
	};
	return {
		calls,
		backend: {
			getDataTableAggregateProxy: async () => ({}),
			getDataTableProxy: async () => table,
		},
	};
}

/** A `getManyRowsAndCount` call with one condition. */
function getCall(column: string, condition: string, value: unknown): ServiceCallEvent {
	return {
		service: 'dataTable',
		op: 'getManyRowsAndCount',
		args: {
			dataTableId: 'T',
			options: {
				skip: 0,
				take: 1000,
				filter: { type: 'or', filters: [{ columnName: column, condition, value }] },
			},
		},
	};
}

describe('runDataTableCall', () => {
	const calls: unknown[] = [];
	const backend: DataTableBackend = {
		getDataTableAggregateProxy: async () => ({
			getManyAndCount: async (options: unknown) => {
				calls.push(['getManyAndCount', options]);
				return { count: 1, data: [{ id: 'T', createdAt: new Date(0) }] };
			},
		}),
		getDataTableProxy: async (id: string) => ({
			insertRows: async (rows: unknown, returnType: unknown) => {
				calls.push(['insertRows', id, rows, returnType]);
				return [{ id: 1, createdAt: new Date(0) }];
			},
			deleteRows: async () => {
				throw Object.assign(new Error('unknown column name'), { description: 'd' });
			},
		}),
	};

	it('calls the service method with the arguments of the call, and gives JSON', async () => {
		expect(
			await runDataTableCall(backend, {
				service: 'dataTable',
				op: 'insertRows',
				args: { dataTableId: 'T', rows: [{ a: 1 }], returnType: 'all' },
			}),
		).toEqual({ ok: true, result: [{ id: 1, createdAt: '1970-01-01T00:00:00.000Z' }] });
		await runDataTableCall(backend, {
			service: 'dataTable',
			op: 'getManyAndCount',
			args: { options: { filter: { name: 'x' }, take: 1 } },
		});
		expect(calls).toEqual([
			['insertRows', 'T', [{ a: 1 }], 'all'],
			['getManyAndCount', { filter: { name: 'x' }, take: 1 }],
		]);
	});

	it('answers a failed call with the error', async () => {
		expect(
			await runDataTableCall(backend, {
				service: 'dataTable',
				op: 'deleteRows',
				args: { dataTableId: 'T', options: {} },
			}),
		).toEqual({ ok: false, error: { message: 'unknown column name', description: 'd' } });
		expect(
			await runDataTableCall(backend, { service: 'dataTable', op: 'dropTable', args: {} }),
		).toEqual({ ok: false, error: { message: 'Unknown data table operation "dropTable"' } });
	});

	it('gives the service a Date for a date column, as v1 does, and text for a string column', async () => {
		const { backend: table, calls: recorded } = recordingBackend();
		await runDataTableCall(table, getCall('wait_until', 'gt', instant));
		await runDataTableCall(table, getCall('name', 'gte', instant));
		const first = recorded[1]?.[1];
		const second = recorded[3]?.[1];
		expect(filterValue(first)).toEqual(new Date(instant));
		expect(filterValue(second)).toBe(instant);
	});

	it('reads no columns when no filter value is the JSON form of a Date', async () => {
		const { backend: table, calls: recorded } = recordingBackend();
		await runDataTableCall(table, getCall('name', 'like', 'a%'));
		await runDataTableCall(table, getCall('wait_until', 'gt', 1709251200000));
		expect(recorded).toEqual([
			['getManyRowsAndCount', expect.anything()],
			['getManyRowsAndCount', expect.anything()],
		]);
	});

	it('gives the Date that a compiled Date expression makes, for a filter on a date column', async () => {
		const source = workflowSource();
		const out = await runReference(source, {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Table: [columns, { count: 0, data: [] }] },
		});
		expect(out.status).toBe('ok');
		const serviceCall = out.effects.map(serviceEffect).find((c) => c?.op === 'getManyRowsAndCount');
		if (serviceCall === undefined) throw new Error('the node made no filtered call');
		const { backend: table, calls: recorded } = recordingBackend();
		await runDataTableCall(table, serviceCall);
		expect(filterValue(recorded[1]?.[1])).toEqual(new Date(0));
	});
});

/** The value of the first condition of the arguments of a filtered call. */
function filterValue(options: unknown): unknown {
	if (typeof options !== 'object' || options === null) return undefined;
	const filter = Reflect.get(options, 'filter');
	if (typeof filter !== 'object' || filter === null) return undefined;
	const filters = Reflect.get(filter, 'filters');
	if (!Array.isArray(filters)) return undefined;
	const first: unknown = filters[0];
	return typeof first === 'object' && first !== null ? Reflect.get(first, 'value') : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One effect as a service call, when the effect is a service call. */
function serviceEffect(effect: EffectRecord): ServiceCallEvent | undefined {
	const args = effect.args;
	if (!isRecord(args) || typeof args.op !== 'string') return undefined;
	return {
		service: 'dataTable',
		op: args.op,
		args: isRecord(args.args) ? args.args : {},
	};
}

/** A workflow whose Data Table node filters a date column by a Date expression. */
function workflowSource(): string {
	const converted = convertWorkflow(
		{
			name: 'Date filter',
			nodes: [
				{
					name: 'Hook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					parameters: { path: 'p' },
				},
				{
					name: 'Table',
					type: 'n8n-nodes-base.dataTable',
					typeVersion: 1.1,
					position: [200, 0],
					parameters: {
						resource: 'row',
						operation: 'get',
						dataTableId: { __rl: true, mode: 'id', value: 'T' },
						filters: {
							conditions: [
								{ keyName: 'wait_until', condition: 'gt', keyValue: '={{ new Date() }}' },
							],
						},
						returnAll: true,
					},
				},
			],
			connections: { Hook: { main: [[{ node: 'Table', type: 'main', index: 0 }]] } },
		},
		{ services: true },
	);
	if (!converted.ok || converted.source === undefined)
		throw new Error('the workflow did not convert');
	return converted.source;
}
