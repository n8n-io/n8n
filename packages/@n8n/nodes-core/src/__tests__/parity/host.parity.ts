import { Code } from 'n8n-nodes-base/dist/nodes/Code/Code.node';
import { DataTable } from 'n8n-nodes-base/dist/nodes/DataTable/DataTable.node';
import { Merge } from 'n8n-nodes-base/dist/nodes/Merge/Merge.node';
import { NoOp } from 'n8n-nodes-base/dist/nodes/NoOp/NoOp.node';
import { StopAndError } from 'n8n-nodes-base/dist/nodes/StopAndError/StopAndError.node';
import { Wait } from 'n8n-nodes-base/dist/nodes/Wait/Wait.node';
import type { Action } from '@n8n/node-sdk';
import { hostRuntime } from '@n8n/node-sdk/host';
import { compileFunction } from 'node:vm';
import type {
	DataTableColumn,
	DataTableFilter,
	DataTableProxyProvider,
	DataTableRowReturn,
	IDataObject,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';

import { runJavaScript } from '../../nodes/code/actions/java-script';
import { runPython } from '../../nodes/code/actions/python';
import { deleteRows } from '../../nodes/data-table/actions/row.delete';
import { rowExists } from '../../nodes/data-table/actions/row.exists';
import { getRows } from '../../nodes/data-table/actions/row.get';
import { insertRows } from '../../nodes/data-table/actions/row.insert';
import { updateRows } from '../../nodes/data-table/actions/row.update';
import { upsertRows } from '../../nodes/data-table/actions/row.upsert';
import { clearTable } from '../../nodes/data-table/actions/table.clear';
import { createTable } from '../../nodes/data-table/actions/table.create';
import { deleteTable } from '../../nodes/data-table/actions/table.delete';
import { listTables } from '../../nodes/data-table/actions/table.list';
import { renameTable } from '../../nodes/data-table/actions/table.rename';
import { appendItems } from '../../nodes/merge/actions/append';
import { combineItems } from '../../nodes/merge/actions/combine';
import { combineByPosition } from '../../nodes/merge/actions/combine-by-position';
import { passItems } from '../../nodes/no-op/actions/pass';
import { stopWithError } from '../../nodes/stop-and-error/actions/stop';
import { waitInterval } from '../../nodes/wait/actions/interval';
import { waitUntil } from '../../nodes/wait/actions/until';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type ParityRun,
} from './harness';

const legacy = (
	nodeType: INodeType | IVersionedNodeType,
	type: string,
	typeVersion: number,
	parameters: INodeParameters,
) => ({ nodeType, type: `n8n-nodes-base.${type}`, typeVersion, parameters });

/** Runs both nodes on the same case, each with a fresh copy of its host state. */
async function expectParity(
	old: ReturnType<typeof legacy>,
	action: Action,
	parameters: Record<string, unknown>,
	caseOf: () => ParityCase,
	allowed: readonly AllowedDifference[] = [],
): Promise<{ before: ParityRun; after: ParityRun }> {
	const before = await runNode(old, caseOf());
	const after = await runNode(actionNode(action, parameters), caseOf());
	expect(compareRuns(before, after, allowed)).toEqual({ unexplained: [], stale: [] });
	return { before, after };
}

// ── In-memory data tables ───────────────────────────────────────────────────

const CREATED = new Date('2026-03-01T10:00:00.000Z');

interface MemoryTable {
	readonly id: string;
	name: string;
	readonly columns: readonly DataTableColumn[];
	rows: DataTableRowReturn[];
}

const isEmptyCell = (value: unknown) => value === null || value === undefined || value === '';

const likeOf = (pattern: string, flags: string) =>
	new RegExp(
		`^${pattern
			.split('%')
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
			.join('.*')}$`,
		flags,
	);

const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : value);

function matchesFilter(row: DataTableRowReturn, filter: DataTableFilter | undefined) {
	if (!filter || filter.filters.length === 0) return true;
	const tests = filter.filters.map(({ columnName, condition, value }) => {
		const cell = comparable(row[columnName]);
		const wanted = comparable(value);
		switch (condition) {
			case 'eq':
				return wanted === null ? isEmptyCell(cell) : cell === wanted;
			case 'neq':
				return wanted === null ? !isEmptyCell(cell) : cell !== wanted;
			case 'like':
				return likeOf(String(wanted), '').test(String(cell));
			case 'ilike':
				return likeOf(String(wanted), 'i').test(String(cell));
			case 'gt':
				return (cell as number) > (wanted as number);
			case 'gte':
				return (cell as number) >= (wanted as number);
			case 'lt':
				return (cell as number) < (wanted as number);
			case 'lte':
				return (cell as number) <= (wanted as number);
			case 'isEmpty':
				return isEmptyCell(cell);
			case 'isNotEmpty':
				return !isEmptyCell(cell);
		}
	});
	return filter.type === 'and' ? tests.every(Boolean) : tests.some(Boolean);
}

/** A data table store with the same answers as the n8n one, for one run. */
function memoryTables(seed: readonly MemoryTable[]) {
	const tables = seed.map((table) => ({ ...table, rows: table.rows.map((row) => ({ ...row })) }));
	const nextId = { value: 100 };
	const stored = (table: MemoryTable, data: IDataObject): DataTableRowReturn => {
		nextId.value += 1;
		const cells = Object.fromEntries(
			table.columns.map(({ name, type }) => {
				const value = data[name];
				return [
					name,
					type === 'date' && typeof value === 'string' ? new Date(value) : (value ?? null),
				];
			}),
		);
		return { ...cells, id: nextId.value, createdAt: CREATED, updatedAt: CREATED };
	};
	const service = (table: MemoryTable): IDataTableProjectService =>
		({
			getColumns: async () => [...table.columns],
			getManyRowsAndCount: async ({ filter, sortBy, skip = 0, take = Infinity }) => {
				const found = table.rows.filter((row) => matchesFilter(row, filter));
				const sorted = sortBy
					? [...found].sort((a, b) => {
							const [column, direction] = sortBy;
							const order =
								(comparable(a[column]) as number) > (comparable(b[column]) as number) ? 1 : -1;
							return direction === 'ASC' ? order : -order;
						})
					: found;
				return { count: found.length, data: sorted.slice(skip, skip + take) };
			},
			insertRows: async (rows: IDataObject[], returnType: string) => {
				const added = rows.map((row) => stored(table, row));
				table.rows.push(...added);
				return returnType === 'count' ? { success: true, insertedRows: added.length } : added;
			},
			updateRows: async ({ filter, data }) => {
				const changed = table.rows
					.filter((row) => matchesFilter(row, filter))
					.map((row) => Object.assign(row, data));
				return changed;
			},
			upsertRow: async ({ filter, data }) => {
				const changed = table.rows
					.filter((row) => matchesFilter(row, filter))
					.map((row) => Object.assign(row, data));
				if (changed.length > 0) return changed;
				const added = stored(table, data);
				table.rows.push(added);
				return [added];
			},
			deleteRows: async ({ filter }) => {
				const removed = table.rows.filter((row) => matchesFilter(row, filter));
				table.rows = table.rows.filter((row) => !removed.includes(row));
				return removed;
			},
			clearRows: async () => {
				const deletedCount = table.rows.length;
				table.rows = [];
				return { deletedCount };
			},
			updateDataTable: async ({ name }) => {
				table.name = name;
				return true;
			},
			deleteDataTable: async () => {
				tables.splice(tables.indexOf(table), 1);
				return true;
			},
		}) as IDataTableProjectService;
	const entityOf = ({ id, name, columns }: MemoryTable) => ({
		id,
		name,
		columns: [...columns],
		createdAt: CREATED,
		updatedAt: CREATED,
		projectId: 'p1',
	});
	const provider: DataTableProxyProvider = {
		getDataTableAggregateProxy: async () =>
			({
				getManyAndCount: async ({
					filter,
					skip = 0,
					take = Infinity,
				}: {
					filter?: { name?: string };
					skip?: number;
					take?: number;
				}) => {
					// The store matches part of a name, without case.
					const name = filter?.name?.toLowerCase();
					const data = tables.filter(
						(table) => name === undefined || table.name.toLowerCase().includes(name),
					);
					return { count: data.length, data: data.slice(skip, skip + take).map(entityOf) };
				},
				createDataTable: async ({
					name,
					columns,
				}: { name: string; columns: DataTableColumn[] }) => {
					if (tables.some((table) => table.name === name)) {
						throw new Error(`Data table with name '${name}' already exists in this project`);
					}
					const id = `t${tables.length + 10}`;
					const table: MemoryTable = {
						id,
						name,
						columns: columns.map((column) => ({
							...column,
							id: `${id}-${column.name}`,
							dataTableId: id,
						})),
						rows: [],
					};
					tables.push(table);
					return entityOf(table);
				},
			}) as unknown as IDataTableProjectAggregateService,
		getDataTableProxy: async (_workflow, _node, id) => {
			const table = tables.find((candidate) => candidate.id === id);
			if (!table) throw new Error(`Data table with ID '${id}' could not be found in this project`);
			return service(table);
		},
	};
	return { provider, tables };
}

const leadColumns: DataTableColumn[] = [
	{ id: 'c1', name: 'email', type: 'string', index: 0, dataTableId: 't1' },
	{ id: 'c2', name: 'plan', type: 'string', index: 1, dataTableId: 't1' },
	{ id: 'c3', name: 'score', type: 'number', index: 2, dataTableId: 't1' },
];

const lead = (id: number, email: string, plan: string | null, score: number) =>
	({ id, email, plan, score, createdAt: CREATED, updatedAt: CREATED }) as DataTableRowReturn;

const leads = (): MemoryTable => ({
	id: 't1',
	name: 'Leads',
	columns: leadColumns,
	rows: [
		lead(1, 'ada@example.com', 'pro', 30),
		lead(2, 'bo@example.com', 'free', 10),
		lead(3, 'cy@example.com', 'pro', 20),
		lead(4, 'di@example.com', null, 5),
	],
});

const oldLeads = (): MemoryTable => ({
	id: 't0',
	name: 'Old Leads',
	columns: leadColumns,
	rows: [lead(9, 'old@example.com', 'free', 1)],
});

const tableCase = (input: readonly IDataObject[] = [{}], seed = () => [leads()]) => {
	const runs: Array<ReturnType<typeof memoryTables>> = [];
	return {
		runs,
		caseOf: (): ParityCase => {
			const store = memoryTables(seed());
			runs.push(store);
			return { input, routes: [], dataTables: store.provider };
		},
	};
};

const byName = { __rl: true, mode: 'name', value: 'leads' };
const byId = { __rl: true, mode: 'id', value: 't1' };

const legacyFilter = (
	matchType: 'allConditions' | 'anyCondition',
	conditions: Array<{ keyName: string; condition?: string; keyValue?: string | number }>,
): INodeParameters => ({ matchType, filters: { conditions } });

const columnsSchema = (names: readonly string[]) =>
	names.map((id) => ({
		id,
		displayName: id,
		required: false,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
	}));

// Legacy rows from writes keep `Date` objects in the item; a contract row is JSON throughout.
const dateFields = (count: number): AllowedDifference[] =>
	Array.from({ length: count }, (_, index) =>
		['createdAt', 'updatedAt'].map((field) => ({
			path: `items[${index}].json.${field}`,
			kind: 'intended' as const,
			reason: 'Dates are ISO 8601 text in the contract item, as n8n stores the item after the run',
		})),
	).flat();

const tableState = (runs: Array<ReturnType<typeof memoryTables>>) =>
	runs.map(({ tables }) =>
		tables[0]?.rows.map(({ email, plan, score }) => ({ email, plan, score })),
	);

const tableNames = (runs: Array<ReturnType<typeof memoryTables>>) =>
	runs.map(({ tables }) =>
		tables.map(({ name, columns, rows }) => ({
			name,
			columns: columns.map((c) => [c.name, c.type]),
			rows: rows.length,
		})),
	);

describe('data table parity', () => {
	it('creates a table, or gives the one that has the name', async () => {
		for (const [name, reuse] of [
			['Signups', true],
			['Leads', true],
		] as const) {
			const { runs, caseOf } = tableCase();
			const before = await runNode(
				legacy(new DataTable(), 'dataTable', 1.1, {
					resource: 'table',
					operation: 'create',
					tableName: name,
					columns: {
						column: [
							{ name: 'email', type: 'string' },
							{ name: 'seen', type: 'date' },
						],
					},
					options: { createIfNotExists: reuse },
				}),
				caseOf(),
			);
			const after = await runNode(
				actionNode(createTable, {
					name,
					columns: [
						{ name: 'email', type: 'string' },
						{ name: 'seen', type: 'date' },
					],
				}),
				caseOf(),
			);
			const view = ({ items }: ParityRun) =>
				items.map(({ json }) => ({
					id: (json as IDataObject).id,
					name: (json as IDataObject).name,
				}));
			expect(after.error).toBeUndefined();
			expect(view(after)).toEqual(view(before));
			const [old, next] = tableNames(runs);
			expect(next).toEqual(old);
		}
	});

	it('lists the tables of the project', async () => {
		const { caseOf } = tableCase();
		const before = await runNode(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'table',
				operation: 'list',
				returnAll: true,
			}),
			caseOf(),
		);
		const after = await runNode(actionNode(listTables, {}), caseOf());
		const names = ({ items }: ParityRun) => items.map(({ json }) => (json as IDataObject).name);
		expect(names(after)).toEqual(names(before));
		expect(names(after)).toEqual(['Leads']);
	});

	it.each([
		['delete', deleteTable, {}],
		['update', renameTable, { newName: 'Prospects' }],
		['clear', clearTable, {}],
	] as const)(
		'runs the table operation %s with the same effect',
		async (operation, action, extra) => {
			const { runs, caseOf } = tableCase();
			const before = await runNode(
				legacy(new DataTable(), 'dataTable', 1.1, {
					resource: 'table',
					operation,
					dataTableId: byName,
					...extra,
				}),
				caseOf(),
			);
			const after = await runNode(
				actionNode(action, {
					table: { name: 'leads' },
					...('newName' in extra ? { name: extra.newName } : {}),
				}),
				caseOf(),
			);
			expect(before.error).toBeUndefined();
			expect(after.error).toBeUndefined();
			const [old, next] = tableNames(runs);
			expect(next).toEqual(old);
		},
	);

	it('inserts mapped values in one write, as legacy bulk insert', async () => {
		const { runs, caseOf } = tableCase([
			{ mail: 'new@example.com', tier: 'team' },
			{ mail: 'old@example.com', tier: 'free' },
		]);
		const { before, after } = await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'insert',
				dataTableId: byName,
				columns: {
					mappingMode: 'defineBelow',
					value: { email: '={{ $json.mail }}', plan: '={{ $json.tier }}' },
					schema: columnsSchema(['email', 'plan']),
				},
			}),
			insertRows,
			{ table: { name: 'leads' }, values: '={{ { email: $json.mail, plan: $json.tier } }}' },
			caseOf,
			dateFields(2),
		);
		expect(after.items.map(({ json }) => json)).toEqual(
			before.items.map(({ json }) =>
				Object.fromEntries(
					Object.entries(json as IDataObject).map(([key, value]) => [
						key,
						value instanceof Date ? value.toISOString() : value,
					]),
				),
			),
		);
		const [old, next] = tableState(runs);
		expect(next).toEqual(old);
	});

	it('inserts the fields of each item without values, as legacy auto-map', async () => {
		const { runs, caseOf } = tableCase([{ email: 'x@example.com', plan: 'pro', id: 9 }]);
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'insert',
				dataTableId: byId,
				columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] },
			}),
			insertRows,
			{ table: { id: 't1' } },
			caseOf,
			dateFields(1),
		);
		const [old, next] = tableState(runs);
		expect(next).toEqual(old);
	});

	it('gets the rows that match all conditions, up to a limit', async () => {
		const { caseOf } = tableCase();
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'get',
				dataTableId: byName,
				...legacyFilter('allConditions', [
					{ keyName: 'plan', condition: 'eq', keyValue: 'pro' },
					{ keyName: 'score', condition: 'gte', keyValue: 20 },
				]),
				limit: 1,
			}),
			getRows,
			{
				table: { name: 'leads' },
				where: {
					match: 'all',
					conditions: [
						{ op: 'eq', column: 'plan', value: 'pro' },
						{ op: 'gte', column: 'score', value: 20 },
					],
				},
				limit: 1,
			},
			caseOf,
		);
	});

	it('gets every row that matches any condition, sorted', async () => {
		const { caseOf } = tableCase();
		const { after } = await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'get',
				dataTableId: byId,
				...legacyFilter('anyCondition', [
					{ keyName: 'plan', condition: 'isEmpty' },
					{ keyName: 'email', condition: 'like', keyValue: 'a%' },
				]),
				returnAll: true,
				orderBy: true,
				orderByColumn: 'score',
				orderByDirection: 'ASC',
			}),
			getRows,
			{
				table: { id: 't1' },
				where: {
					match: 'any',
					conditions: [
						{ op: 'isEmpty', column: 'plan' },
						{ op: 'like', column: 'email', value: 'a%' },
					],
				},
				sort: { column: 'score', direction: 'asc' },
			},
			caseOf,
		);
		expect(after.items.map(({ json }) => (json as IDataObject).id)).toEqual([4, 1]);
	});

	it('routes items that have a row to exists and the others to missing', async () => {
		const input = [{ email: 'ada@example.com' }, { email: 'zed@example.com' }];
		const lookup = { keyName: 'email', keyValue: '={{ $json.email }}' };
		const contract = {
			table: { name: 'leads' },
			where:
				'={{ { match: "all", conditions: [{ op: "eq", column: "email", value: $json.email }] } }}',
		};
		const exists = await runNode(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'rowExists',
				dataTableId: byName,
				...legacyFilter('allConditions', [lookup]),
			}),
			tableCase(input).caseOf(),
		);
		const missing = await runNode(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'rowNotExists',
				dataTableId: byName,
				...legacyFilter('allConditions', [lookup]),
			}),
			tableCase(input).caseOf(),
		);
		const routed = await runNode(actionNode(rowExists, contract), tableCase(input).caseOf());
		expect(routed.error).toBeUndefined();
		expect(routed.items).toEqual(exists.items);
		expect(routed.otherOutputs).toEqual([missing.items]);
	});

	it('updates the matching rows', async () => {
		const { runs, caseOf } = tableCase();
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'update',
				dataTableId: byName,
				...legacyFilter('allConditions', [{ keyName: 'plan', condition: 'eq', keyValue: 'pro' }]),
				columns: {
					mappingMode: 'defineBelow',
					value: { plan: 'team' },
					schema: columnsSchema(['plan']),
				},
			}),
			updateRows,
			{
				table: { name: 'leads' },
				where: { match: 'all', conditions: [{ op: 'eq', column: 'plan', value: 'pro' }] },
				values: { plan: 'team' },
			},
			caseOf,
			dateFields(2),
		);
		const [old, next] = tableState(runs);
		expect(next).toEqual(old);
	});

	it('upserts a row that matches, and inserts one that does not', async () => {
		const input = [
			{ email: 'bo@example.com', plan: 'team' },
			{ email: 'eve@example.com', plan: 'pro' },
		];
		const { runs, caseOf } = tableCase(input);
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'upsert',
				dataTableId: byName,
				...legacyFilter('allConditions', [
					{ keyName: 'email', condition: 'eq', keyValue: '={{ $json.email }}' },
				]),
				columns: {
					mappingMode: 'defineBelow',
					value: { email: '={{ $json.email }}', plan: '={{ $json.plan }}' },
					schema: columnsSchema(['email', 'plan']),
				},
			}),
			upsertRows,
			{
				table: { name: 'leads' },
				where:
					'={{ { match: "all", conditions: [{ op: "eq", column: "email", value: $json.email }] } }}',
			},
			caseOf,
			dateFields(2),
		);
		const [old, next] = tableState(runs);
		expect(next).toEqual(old);
	});

	it('deletes the matching rows', async () => {
		const { runs, caseOf } = tableCase();
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'deleteRows',
				dataTableId: byId,
				...legacyFilter('anyCondition', [{ keyName: 'score', condition: 'lt', keyValue: 11 }]),
			}),
			deleteRows,
			{
				table: { id: 't1' },
				where: { match: 'any', conditions: [{ op: 'lt', column: 'score', value: 11 }] },
			},
			caseOf,
			dateFields(2),
		);
		const [old, next] = tableState(runs);
		expect(next).toEqual(old);
	});

	it('opens and reuses the table with the full name, not the first that contains it', async () => {
		const { caseOf } = tableCase([{}], () => [oldLeads(), leads()]);
		const emails = ({ items }: ParityRun) => items.map(({ json }) => (json as IDataObject).email);
		const read = { resource: 'row', operation: 'get', dataTableId: byName, returnAll: true };
		const before = await runNode(legacy(new DataTable(), 'dataTable', 1.1, read), caseOf());
		const after = await runNode(actionNode(getRows, { table: { name: 'leads' } }), caseOf());
		// Legacy takes the first table whose name contains the text.
		expect(emails(before)).toEqual(['old@example.com']);
		expect(emails(after)).toEqual(leads().rows.map(({ email }) => email));

		const create = { name: 'Leads', columns: [{ name: 'email', type: 'string' }] };
		const legacyCreate = await runNode(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'table',
				operation: 'create',
				tableName: create.name,
				columns: { column: create.columns },
				options: { createIfNotExists: true },
			}),
			caseOf(),
		);
		const contractCreate = await runNode(actionNode(createTable, create), caseOf());
		expect(legacyCreate.error).toContain('already exists');
		expect(contractCreate.items.map(({ json }) => (json as IDataObject).id)).toEqual(['t1']);
	});

	it('fails on a table name that does not exist', async () => {
		const { caseOf } = tableCase();
		await expectParity(
			legacy(new DataTable(), 'dataTable', 1.1, {
				resource: 'row',
				operation: 'get',
				dataTableId: { __rl: true, mode: 'name', value: 'nope' },
				returnAll: true,
			}),
			getRows,
			{ table: { name: 'nope' } },
			caseOf,
		);
	});
});

// ── Code ────────────────────────────────────────────────────────────────────

interface Task {
	readonly jobType: string;
	readonly settings: unknown;
}

/** Runs JavaScript in process with `$input` and `$json`, and Python from canned answers. */
function fakeRunner(tasks: Task[], python: Readonly<Record<string, unknown>> = {}) {
	const runner: IWorkflowExecuteAdditionalData['startRunnerTask'] = async (...args) => {
		const [, jobType, settings, , , , , , , , , connectionInputData] = args;
		const {
			code,
			nodeMode,
			chunk,
			items: _items,
			...rest
		} = settings as {
			code: string;
			nodeMode: string;
			chunk?: { startIndex: number; count: number };
			items?: unknown;
		};
		tasks.push({ jobType, settings: { code, nodeMode, chunk, ...rest } });
		if (jobType === 'python') return { ok: true, result: python[code] } as never;
		const items: INodeExecutionData[] = connectionInputData;
		const $input = { all: () => items, first: () => items[0] };
		try {
			const result =
				nodeMode === 'runOnceForAllItems'
					? compileFunction(code, ['$input'])($input)
					: items
							.slice(
								chunk?.startIndex ?? 0,
								(chunk?.startIndex ?? 0) + (chunk?.count ?? items.length),
							)
							.map((item) =>
								compileFunction(code, ['$input', '$json'])({ ...$input, item }, item.json),
							);
			return { ok: true, result } as never;
		} catch (error) {
			return {
				ok: false,
				error: { message: (error as Error).message, stack: (error as Error).stack },
			} as never;
		}
	};
	return runner;
}

const people: IDataObject[] = [
	{ name: 'ada', email: 'a@x.y' },
	{ name: 'bo', email: 'b@x.y' },
	{ name: 'cy', email: 'a@x.y' },
];

async function expectCodeParity(
	language: 'javaScript' | 'python',
	code: string,
	mode: 'runOnceForAllItems' | 'runOnceForEachItem',
	allowed: readonly AllowedDifference[] = [],
	python: Readonly<Record<string, unknown>> = {},
	runtime = hostRuntime(),
) {
	const tasks: { legacy: Task[]; next: Task[] } = { legacy: [], next: [] };
	const caseOf = (into: Task[]) => (): ParityCase => ({
		input: people,
		routes: [],
		runner: fakeRunner(into, python),
	});
	const before = await runNode(
		legacy(new Code(), 'code', 2, {
			language,
			mode,
			...(language === 'python' ? { pythonCode: code } : { jsCode: code }),
		}),
		caseOf(tasks.legacy)(),
	);
	const action = language === 'python' ? runPython : runJavaScript;
	const after = await runNode(
		actionNode(
			action,
			{ code, mode: mode === 'runOnceForAllItems' ? 'allItems' : 'eachItem' },
			undefined,
			runtime,
		),
		caseOf(tasks.next)(),
	);
	expect(compareRuns(before, after, allowed)).toEqual({ unexplained: [], stale: [] });
	// Both nodes start the same runner tasks.
	expect(tasks.next).toEqual(tasks.legacy);
	return { before, after };
}

describe('code parity', () => {
	it('dedupes items by a field in one run for all items', async () => {
		await expectCodeParity(
			'javaScript',
			'const seen = new Set(); return $input.all().filter((item) => !seen.has(item.json.email) && seen.add(item.json.email));',
			'runOnceForAllItems',
		);
	});

	it('wraps plain objects in one run for all items', async () => {
		await expectCodeParity(
			'javaScript',
			'return [{ message: "We\'re excited you\'re joining O\'Brien\'s crew, " + $input.first().json.name + "!" }];',
			'runOnceForAllItems',
		);
	});

	it('returns one object per item in one run per item', async () => {
		await expectCodeParity(
			'javaScript',
			'return { upper: $json.name.toUpperCase() };',
			'runOnceForEachItem',
		);
	});

	it('fails the same way on a code error', async () => {
		const { after } = await expectCodeParity(
			'javaScript',
			"throw new Error('Simulated upstream failure');",
			'runOnceForAllItems',
		);
		expect(after.error).toBe('Simulated upstream failure');
	});

	it("refuses $input.all() in a run per item, and a return that isn't an object", async () => {
		await expectCodeParity('javaScript', 'return $input.all();', 'runOnceForEachItem');
		await expectCodeParity('javaScript', 'return 3;', 'runOnceForAllItems');
	});

	it('runs Python with the items in the task', async () => {
		const code = "return [{'count': len(_items)}]";
		await expectCodeParity(
			'python',
			code,
			'runOnceForAllItems',
			[],
			{ [code]: [{ json: { count: 3 } }] },
			hostRuntime({ codeLanguages: ['javascript', 'python'] }),
		);
	});
});

// ── Merge ───────────────────────────────────────────────────────────────────

const customers: IDataObject[] = [
	{ id: 1, name: 'Ada', address: { city: 'London' } },
	{ id: 2, name: 'Bo' },
	{ id: 4, name: 'Di' },
];
const orders: IDataObject[] = [
	{ id: 1, total: 10, address: { zip: 'N1' } },
	{ id: 1, total: 20, customer: 'Ada' },
	{ id: 3, total: 30 },
];

/** Legacy gives a combined item an empty `binary`; a contract item without binary data has none. */
const emptyBinaries = ({ items }: ParityRun): AllowedDifference[] =>
	items.flatMap(({ binary }, index) =>
		binary && Object.keys(binary).length === 0
			? [{ path: `items[${index}].binary`, kind: 'intended' as const, reason: 'No empty binary' }]
			: [],
	);

const notes: IDataObject[] = [
	{ id: 1, note: 'vip', address: { city: 'Paris' } },
	{ id: 2, note: 'new' },
];

const mergeCase = (): ParityCase => ({ input: [], inputs: [customers, orders], routes: [] });
const mergeCaseOf3 = (): ParityCase => ({
	input: [],
	inputs: [customers, orders, notes],
	routes: [],
});

const pairsOf = ({ items }: ParityRun) => items.map(({ json }) => json);

async function expectMergeParity(
	parameters: INodeParameters,
	action: Action,
	contract: Record<string, unknown>,
	allowed: (before: ParityRun) => AllowedDifference[] = () => [],
	parityCase = mergeCase,
) {
	const before = await runNode(legacy(new Merge(), 'merge', 3.2, parameters), parityCase());
	const after = await runNode(actionNode(action, contract), parityCase());
	expect(before.error).toBeUndefined();
	expect(after.error).toBeUndefined();
	expect(pairsOf(after)).toEqual(pairsOf(before));
	expect(compareRuns(before, after, [...emptyBinaries(before), ...allowed(before)])).toEqual({
		unexplained: [],
		stale: [],
	});
	return after;
}

describe('merge parity', () => {
	it('appends the right items after the left items', async () => {
		const after = await expectMergeParity({ mode: 'append' }, appendItems, {});
		expect(after.items[3]?.pairedItem).toEqual({ item: 0, input: 1 });
	});

	it('appends the items of 3 inputs in input order', async () => {
		const after = await expectMergeParity(
			{ mode: 'append', numberInputs: 3 },
			appendItems,
			{ inputs: 3 },
			() => [],
			mergeCaseOf3,
		);
		expect(after.items).toHaveLength(customers.length + orders.length + notes.length);
		expect(after.items.at(-1)?.pairedItem).toEqual({ item: 1, input: 2 });
	});

	it.each([
		['preferLast', 'last', false],
		['preferLast', 'last', true],
		['preferInput1', 'first', false],
	])(
		'combines 3 inputs by position with %s as %s, unpaired %s',
		async (resolveClash, prefer, unpaired) => {
			// Legacy lists the item of the preferred input twice.
			const once = ({ items }: ParityRun): AllowedDifference[] =>
				items.flatMap(({ pairedItem }, index) =>
					Array.isArray(pairedItem) && pairedItem.length > 3
						? [
								{
									path: `items[${index}].pairedItem[3]`,
									kind: 'intended' as const,
									reason: 'Once',
								},
							]
						: [],
				);
			const after = await expectMergeParity(
				{
					mode: 'combine',
					combineBy: 'combineByPosition',
					numberInputs: 3,
					options: {
						clashHandling: { values: { resolveClash, mergeMode: 'deepMerge' } },
						includeUnpaired: unpaired,
					},
				},
				combineByPosition,
				{ inputs: 3, prefer, unpaired },
				once,
				mergeCaseOf3,
			);
			expect(after.items).toHaveLength(unpaired ? 3 : 2);
		},
	);

	it('combines by position, with and without unpaired items', async () => {
		// Legacy lists the item of the preferred input twice.
		const once = ({ items }: ParityRun): AllowedDifference[] =>
			items.flatMap(({ pairedItem }, index) =>
				Array.isArray(pairedItem) && pairedItem.length > 2
					? [{ path: `items[${index}].pairedItem[2]`, kind: 'intended' as const, reason: 'Once' }]
					: [],
			);
		await expectMergeParity(
			{ mode: 'combine', combineBy: 'combineByPosition', options: {} },
			combineItems,
			{ by: { by: 'position' } },
			once,
		);
		await expectMergeParity(
			{ mode: 'combine', combineBy: 'combineByPosition', options: { includeUnpaired: true } },
			combineItems,
			{ by: { by: 'position', unpaired: true } },
			once,
		);
	});

	it.each([
		['keepMatches', 'inner'],
		['enrichInput1', 'left'],
		['enrichInput2', 'right'],
		['keepEverything', 'outer'],
	])('combines by fields with %s as a %s join', async (joinMode, join) => {
		const after = await expectMergeParity(
			{
				mode: 'combine',
				combineBy: 'combineByFields',
				fieldsToMatchString: 'id',
				joinMode,
				outputDataFrom: 'both',
				options: {},
			},
			combineItems,
			{ by: { by: 'fields', left: 'id', right: 'id', join } },
		);
		expect(after.items.length).toBeGreaterThan(0);
	});

	it.each([
		['input1', 'leftOnly'],
		['input2', 'rightOnly'],
	])('keeps the unmatched items of %s as %s', async (outputDataFrom, join) => {
		await expectMergeParity(
			{
				mode: 'combine',
				combineBy: 'combineByFields',
				fieldsToMatchString: 'id',
				joinMode: 'keepNonMatches',
				outputDataFrom,
				options: {},
			},
			combineItems,
			{ by: { by: 'fields', left: 'id', right: 'id', join } },
		);
	});

	it('combines every left item with every right item', async () => {
		const after = await expectMergeParity(
			{ mode: 'combine', combineBy: 'combineAll', options: {} },
			combineItems,
			{ by: { by: 'all' } },
		);
		expect(after.items).toHaveLength(customers.length * orders.length);
	});

	it('combines by two different field names', async () => {
		const after = await expectMergeParity(
			{
				mode: 'combine',
				combineBy: 'combineByFields',
				advanced: true,
				mergeByFields: { values: [{ field1: 'name', field2: 'customer' }] },
				joinMode: 'keepMatches',
				outputDataFrom: 'both',
				options: {},
			},
			combineItems,
			{ by: { by: 'fields', left: 'name', right: 'customer' } },
		);
		expect(after.items).toHaveLength(1);
	});
});

// ── Wait, Stop and Error, No Operation ──────────────────────────────────────

const items: IDataObject[] = [{ a: 1 }, { a: 2 }];
// The Wait node takes its context as an argument, which its built type does not show.
const waitNode = () => new Wait() as unknown as INodeType;
const plain = (): ParityCase => ({ input: items, routes: [] });

describe('wait parity', () => {
	it('passes the items on after a short interval', async () => {
		await expectParity(
			legacy(waitNode(), 'wait', 1.1, { resume: 'timeInterval', amount: 0, unit: 'seconds' }),
			waitInterval,
			{ amount: 0, unit: 'seconds' },
			plain,
		);
	});

	it('puts the execution to wait for a long interval and for a time', async () => {
		const interval = await expectParity(
			legacy(waitNode(), 'wait', 1.1, { resume: 'timeInterval', amount: 2, unit: 'hours' }),
			waitInterval,
			{ amount: 2, unit: 'hours' },
			plain,
		);
		const { before, after } = interval;
		expect(before.waitTill).toBeDefined();
		expect(Math.abs((after.waitTill ?? 0) - (before.waitTill ?? 0))).toBeLessThan(5_000);

		const time = await expectParity(
			legacy(waitNode(), 'wait', 1.1, {
				resume: 'specificTime',
				dateTime: '2030-01-02T03:04:05+02:00',
			}),
			waitUntil,
			{ time: '2030-01-02T03:04:05+02:00' },
			plain,
		);
		expect(time.after.waitTill).toBe(Date.parse('2030-01-02T01:04:05Z'));
		expect(time.after.waitTill).toBe(time.before.waitTill);
	});
});

describe('stop and error parity', () => {
	it('fails with the message', async () => {
		const { after } = await expectParity(
			legacy(new StopAndError(), 'stopAndError', 1, {
				errorType: 'errorMessage',
				errorMessage: 'The order has no customer',
			}),
			stopWithError,
			{ message: 'The order has no customer' },
			plain,
		);
		expect(after.error).toBe('The order has no customer');
	});
});

describe('no operation parity', () => {
	it('passes the items on', async () => {
		await expectParity(legacy(new NoOp(), 'noOp', 1, {}), passItems, {}, plain);
	});
});
