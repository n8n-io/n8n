/**
 * Equivalence cases of the Data Table node. The node calls n8n's data-table
 * service, so a case gives `serviceResults` (in call order) in place of HTTP
 * responses, and the test compares the `ctx.service` calls with the calls
 * that the v1 node made.
 */
import type { EquivalenceCase } from './equivalence.ts';

const TYPE = 'n8n-nodes-base.dataTable';
const byId = { __rl: true, mode: 'id', value: 'tbl1' };
const byName = { __rl: true, mode: 'name', value: 'Leads' };
const found = { count: 1, data: [{ id: 'tbl1', name: 'leads' }] };
const columns = [
	{ id: 'c1', name: 'email', type: 'string', index: 0, dataTableId: 'tbl1' },
	{ id: 'c2', name: 'score', type: 'number', index: 1, dataTableId: 'tbl1' },
	{ id: 'c3', name: 'active', type: 'boolean', index: 2, dataTableId: 'tbl1' },
	{ id: 'c4', name: 'seen', type: 'date', index: 3, dataTableId: 'tbl1' },
];
const at = '2025-01-02T03:04:05.000Z';
const row = (id: number, email: string, score: number | null) => ({
	id,
	email,
	score,
	active: true,
	seen: null,
	createdAt: at,
	updatedAt: at,
});
const schema = [
	{ id: 'email', displayName: 'email', type: 'string', required: false, display: true },
	{ id: 'score', displayName: 'score', type: 'number', required: false, display: true },
	{ id: 'active', displayName: 'active', type: 'boolean', required: false, display: true },
];

/** A row of the date cases: `seen` is the ISO text that the service gives for a date cell. */
const datedRow = (id: number, email: string, seen: string) => ({
	...row(id, email, id),
	seen,
});
const datedRows = [
	datedRow(1, 'a@x.io', '2024-01-15T00:00:00.000Z'),
	datedRow(2, 'b@x.io', '2024-02-15T00:00:00.000Z'),
	datedRow(3, 'c@x.io', '2024-04-15T00:00:00.000Z'),
];

/** A fixed instant, in the text that `Date.toJSON` gives. */
const instant = '2024-03-01T00:00:00.000Z';

/** `get` cases with one condition on `seen`, or on the string column `email`. */
function dateFilterCases(): EquivalenceCase[] {
	const get = (name: string, column: string, condition: string, keyValue: unknown) => ({
		name,
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: byId,
			filters: { conditions: [{ keyName: column, condition, keyValue }] },
			returnAll: true,
		},
		responses: [],
		serviceResults: [columns, { count: datedRows.length, data: datedRows }],
	});
	return [
		get('dataTable row.get, gt on a date column', 'seen', 'gt', '2024-03-01'),
		get('dataTable row.get, lt on a date column', 'seen', 'lt', '2024-03-01'),
		get('dataTable row.get, gte on a date column', 'seen', 'gte', '2024-03-01'),
		// The JSON form of a Date value (spec 4.5), as a Date expression gives it.
		get('dataTable row.get, gt on a date column with ISO date-time text', 'seen', 'gt', instant),
		get('dataTable row.get, gte on a string column', 'email', 'gte', 'b@x.io'),
	];
}

export const DATA_TABLE_CASES: EquivalenceCase[] = [
	{
		name: 'dataTable row.get by id',
		type: TYPE,
		typeVersion: 1.1,
		parameters: { resource: 'row', operation: 'get', dataTableId: byId },
		responses: [],
		serviceResults: [{ count: 2, data: [row(1, 'a@x.io', 3), row(2, 'b@x.io', null)] }],
	},
	{
		name: 'dataTable row.get by id, version 1',
		type: TYPE,
		typeVersion: 1,
		parameters: { resource: 'row', operation: 'get', dataTableId: byId },
		responses: [],
		serviceResults: [{ count: 2, data: [row(1, 'a@x.io', 3), row(2, 'b@x.io', null)] }],
	},
	{
		name: 'dataTable row.insert, version 1',
		type: TYPE,
		typeVersion: 1,
		parameters: {
			resource: 'row',
			operation: 'insert',
			dataTableId: byId,
			columns: { mappingMode: 'defineBelow', value: { email: 'a@x.io' }, schema },
			options: {},
		},
		responses: [],
		serviceResults: [[row(1, 'a@x.io', null)]],
	},
	{
		name: 'dataTable row.get by name, filters, order, all pages',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: byName,
			matchType: 'allConditions',
			filters: {
				conditions: [
					{ keyName: 'score', condition: 'gte', keyValue: 2 },
					{ keyName: 'email', condition: 'isNotEmpty' },
					{ keyName: 'active', condition: 'isTrue' },
					{ keyName: 'seen', condition: 'lt', keyValue: '2025-02-01' },
				],
			},
			returnAll: true,
			orderBy: true,
			orderByColumn: 'score',
			orderByDirection: 'ASC',
		},
		responses: [],
		serviceResults: [
			found,
			columns,
			found,
			columns,
			{ count: 3, data: [row(1, 'a@x.io', 3), row(2, 'b@x.io', 4)] },
			{ count: 3, data: [row(3, 'c@x.io', 5)] },
		],
	},
	{
		name: 'dataTable row.get with a limit and an empty number condition',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'get',
			dataTableId: byId,
			filters: { conditions: [{ keyName: 'score', condition: 'isEmpty' }] },
			limit: 1,
		},
		responses: [],
		serviceResults: [columns, { count: 4, data: [row(2, 'b@x.io', null)] }],
	},
	{
		name: 'dataTable row.insert of two items with schema casts',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'insert',
			dataTableId: byId,
			columns: {
				mappingMode: 'defineBelow',
				value: { email: 'a@x.io', score: '7', active: 'true' },
				matchingColumns: [],
				schema,
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			},
			options: {},
		},
		items: [{ n: 1 }, { n: 2 }],
		responses: [],
		serviceResults: [[row(1, 'a@x.io', 7), row(2, 'a@x.io', 7)]],
	},
	{
		name: 'dataTable row.insert auto-mapped, optimized bulk',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'insert',
			dataTableId: byName,
			columns: { mappingMode: 'autoMapInputData', value: null, matchingColumns: [], schema },
			options: { optimizeBulk: true },
		},
		items: [
			{ id: 9, email: 'a@x.io', score: 1, createdAt: at },
			{ email: 'b@x.io', score: null },
		],
		responses: [],
		serviceResults: [found, { success: true, insertedRows: 2 }],
	},
	{
		name: 'dataTable row.update by email',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'update',
			dataTableId: byId,
			filters: { conditions: [{ keyName: 'email', keyValue: 'a@x.io' }] },
			columns: {
				mappingMode: 'defineBelow',
				value: { score: 10, active: false },
				matchingColumns: [],
				schema,
			},
			options: {},
		},
		responses: [],
		serviceResults: [columns, [row(1, 'a@x.io', 10)]],
	},
	{
		name: 'dataTable row.upsert by id, dry run',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'upsert',
			dataTableId: byName,
			filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: 5 }] },
			columns: {
				mappingMode: 'defineBelow',
				value: { email: 'e@x.io', score: null },
				matchingColumns: [],
				schema,
			},
			options: { dryRun: true },
		},
		responses: [],
		serviceResults: [
			found,
			found,
			columns,
			[
				{
					...row(5, 'e@x.io', null),
					id: null,
					createdAt: null,
					updatedAt: null,
					dryRunState: 'after',
				},
			],
		],
	},
	{
		name: 'dataTable row.deleteRows with like',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'deleteRows',
			dataTableId: byId,
			matchType: 'anyCondition',
			filters: { conditions: [{ keyName: 'email', condition: 'like', keyValue: '%@x.io' }] },
			options: {},
		},
		responses: [],
		serviceResults: [columns, [row(1, 'a@x.io', 3), row(2, 'b@x.io', null)]],
	},
	{
		name: 'dataTable row.rowExists hit',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'rowExists',
			dataTableId: byId,
			filters: { conditions: [{ keyName: 'email', keyValue: 'a@x.io' }] },
		},
		items: [{ email: 'a@x.io', keep: true }],
		responses: [],
		serviceResults: [columns, { count: 1, data: [row(1, 'a@x.io', 3)] }],
	},
	{
		name: 'dataTable row.rowNotExists miss',
		type: TYPE,
		typeVersion: 1.1,
		parameters: {
			resource: 'row',
			operation: 'rowNotExists',
			dataTableId: byId,
			filters: { conditions: [{ keyName: 'email', keyValue: 'z@x.io' }] },
		},
		items: [{ email: 'z@x.io' }],
		responses: [],
		serviceResults: [columns, { count: 0, data: [] }],
	},
	// Conditions on the date column `seen`. v1 gives the data-table service a Date object, so the
	// service compares times; rows before and after the value must give different pages.
	...dateFilterCases(),
];
