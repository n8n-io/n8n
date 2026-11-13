/**
 * Parity of the fallback host's file data tables with n8n's own data tables on SQLite.
 *
 * n8n runs a row filter as SQL (`data-table-rows.repository.ts`, `getConditionAndParams`),
 * and the host store (`packages/@n8n/workflow-fallback-host/src/data-table.ts`) runs it in
 * TypeScript. This test writes the same table to both: n8n's service inserts the rows, and
 * the file store reads the same rows from a JSON file. It then runs every condition with
 * several values through both, plus the default order and the limit, and expects the same
 * row ids in the same order. The test lives here, not in the host package, because only
 * this package can start n8n's database and its services.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DataTableFilter, ListDataTableContentQueryDto } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type {
	DataTableColumnType,
	DataTableRow,
	IDataTableProjectService,
	ListDataTableRowsOptions,
} from 'n8n-workflow';

import { fileDataTableProvider } from '../../../../../@n8n/workflow-fallback-host/src/data-table';
import { DataTableService } from '../data-table.service';
import { mockDataTableSizeValidator } from '../testing';

type Columns = Array<{ name: string; type: DataTableColumnType }>;

const columns: Columns = [
	{ name: 'text', type: 'string' },
	{ name: 'amount', type: 'number' },
	{ name: 'flag', type: 'boolean' },
	{ name: 'when', type: 'date' },
];

/**
 * The rows of the table, with their ids. A date is a `Date` or ISO text, so both sides
 * agree on the instant: n8n stores it as `YYYY-MM-DD HH:MM:SS.mmm` text, and the file
 * holds one of the two forms. A number or a boolean can be text, which the file keeps and
 * n8n converts on insert.
 */
const rows: Array<DataTableRow & { id: number }> = [
	{ id: 1, text: 'alpha', amount: 1, flag: true, when: new Date('2024-03-01T09:00:00.000Z') },
	{ id: 2, text: 'Beta', amount: 10, flag: false, when: '2024-03-01T10:00:00.000Z' },
	{ id: 3, text: 'beta_2', amount: '7', flag: 'true', when: new Date('2024-03-02T00:00:00.000Z') },
	{ id: 4, text: '', amount: null, flag: null, when: null },
	{ id: 5, text: null, amount: 0, flag: true, when: new Date('2024-03-01T10:00:00.000Z') },
	{ id: 6, text: '10', amount: 9, flag: false, when: '2024-02-29T23:59:59.999Z' },
	{ id: 7, text: '9', amount: -3, flag: 'false', when: null },
	{ id: 8, text: 'true', amount: 1.5, flag: true, when: new Date('2024-03-01T10:00:00.000Z') },
];

/** n8n stores a date as UTC text without a zone (the driver's form), so the file holds it too. */
function storedDate(date: Date): string {
	return date.toISOString().replace('T', ' ').replace('Z', '');
}

/** The file keeps the instant of a `Date` as n8n's stored text, and any text as it is. */
function fileRows(): Array<Record<string, unknown>> {
	return rows.map((row) => ({
		...row,
		when: row.when instanceof Date ? storedDate(row.when) : row.when,
	}));
}

type Filter = DataTableFilter['filters'][number];

/** One filter to run through both stores, and the condition set it uses. */
interface FilterCase {
	filters: Filter[];
	type?: 'and' | 'or';
}

const eq = (columnName: string, value: Filter['value'], condition: Filter['condition'] = 'eq') => ({
	columnName,
	condition,
	value,
});

const filterCases: FilterCase[] = [
	// A text column compares text, whatever type the filter value has.
	{ filters: [eq('text', 'alpha')] },
	{ filters: [eq('text', 'Alpha')] },
	{ filters: [eq('text', 10)] },
	{ filters: [eq('text', '')] },
	{ filters: [eq('text', null)] },
	{ filters: [eq('text', 'true')] },
	{ filters: [eq('text', 'alpha', 'neq')] },
	{ filters: [eq('text', null, 'neq')] },
	{ filters: [eq('text', 9, 'gt')] },
	{ filters: [eq('text', 9, 'gte')] },
	{ filters: [eq('text', 9, 'lt')] },
	{ filters: [eq('text', 9, 'lte')] },
	{ filters: [eq('text', '')], type: 'or' },
	{ filters: [eq('text', 'a', 'like')] },
	{ filters: [eq('text', 'A', 'like')] },
	{ filters: [eq('text', 'a', 'ilike')] },
	{ filters: [eq('text', 'B%a', 'like')] },
	{ filters: [eq('text', 'bet_', 'like')] },
	{ filters: [eq('text', 'bet_', 'ilike')] },
	{ filters: [eq('text', '', 'like')] },
	{ filters: [eq('text', '1_', 'like')] },
	{ filters: [eq('text', '*', 'like')] },
	{ filters: [eq('text', 'ALPHA', 'ilike')] },
	{ filters: [eq('text', 'a\\b', 'like')] },
	{ filters: [eq('text', 'a\\b', 'ilike')] },
	{ filters: [eq('text', null, 'isEmpty')] },
	{ filters: [eq('text', null, 'isNotEmpty')] },
	// A number column compares numbers: n8n converts the value to the column type.
	{ filters: [eq('amount', 7)] },
	{ filters: [eq('amount', '7')] },
	{ filters: [eq('amount', true)] },
	{ filters: [eq('amount', 0, 'gt')] },
	{ filters: [eq('amount', '5', 'gt')] },
	{ filters: [eq('amount', 9, 'gte')] },
	{ filters: [eq('amount', 7, 'lt')] },
	{ filters: [eq('amount', -3, 'lte')] },
	{ filters: [eq('amount', 9, 'neq')] },
	{ filters: [eq('amount', null)] },
	{ filters: [eq('amount', null, 'neq')] },
	{ filters: [eq('amount', null, 'isEmpty')] },
	{ filters: [eq('amount', null, 'isNotEmpty')] },
	// A boolean column compares 1 and 0.
	{ filters: [eq('flag', true)] },
	{ filters: [eq('flag', 1)] },
	{ filters: [eq('flag', 'true')] },
	{ filters: [eq('flag', false)] },
	{ filters: [eq('flag', 0)] },
	{ filters: [eq('flag', null)] },
	{ filters: [eq('flag', null, 'neq')] },
	{ filters: [eq('flag', null, 'isEmpty')] },
	{ filters: [eq('flag', null, 'isNotEmpty')] },
	// A date column holds n8n's text, so it compares text against the value that n8n's
	// validation gives the query. A `Date` goes as n8n's text, any other value as ISO text.
	{ filters: [eq('when', new Date('2024-03-01T10:00:00.000Z'))] },
	{ filters: [eq('when', '2024-03-01T10:00:00.000Z')] },
	{ filters: [eq('when', '2024-03-01 10:00:00.000')] },
	{ filters: [eq('when', new Date('2024-03-01T10:00:00.000Z'), 'lt')] },
	{ filters: [eq('when', '2024-03-01T10:00:00.000Z', 'lt')] },
	{ filters: [eq('when', new Date('2024-03-01T10:00:00.000Z'), 'gte')] },
	{ filters: [eq('when', new Date('2024-03-01T10:00:00.000Z'), 'gt')] },
	{ filters: [eq('when', new Date('2024-03-02T00:00:00.000Z'), 'lte')] },
	{ filters: [eq('when', null)] },
	{ filters: [eq('when', null, 'neq')] },
	{ filters: [eq('when', null, 'isEmpty')] },
	{ filters: [eq('when', null, 'isNotEmpty')] },
	{ filters: [eq('when', '2024-03', 'like')] },
	// The system columns have types of their own.
	{ filters: [eq('id', 3)] },
	{ filters: [eq('id', '3')] },
	{ filters: [eq('id', 3, 'gt')] },
	{ filters: [eq('id', 3, 'gte')] },
	{ filters: [eq('id', 3, 'lt')] },
	{ filters: [eq('id', null, 'isEmpty')] },
	{ filters: [eq('id', null, 'isNotEmpty')] },
	// Several conditions, under both match types.
	{
		filters: [
			eq('text', 'alpha'),
			eq('amount', 10, 'gt'),
			eq('flag', true),
			eq('when', new Date('2024-03-01T00:00:00.000Z'), 'gt'),
		],
	},
	{
		filters: [
			eq('text', 'alpha'),
			eq('amount', 10, 'gt'),
			eq('flag', false),
			eq('when', new Date('2024-03-01T10:00:00.000Z'), 'gte'),
		],
		type: 'or',
	},
	{
		filters: [eq('text', null), eq('amount', 0)],
		type: 'or',
	},
	{ filters: [eq('text', 'a', 'like'), eq('flag', true)], type: 'or' },
	{ filters: [] },
];

/** The orders and pages to compare: n8n sorts on `id` last, and `take: 0` is no limit. */
const listCases: Array<Partial<ListDataTableRowsOptions>> = [
	{},
	{ sortBy: ['id', 'ASC'] },
	{ sortBy: ['id', 'DESC'] },
	{ sortBy: ['text', 'ASC'] },
	{ sortBy: ['text', 'DESC'] },
	{ sortBy: ['amount', 'ASC'] },
	{ sortBy: ['amount', 'DESC'] },
	{ sortBy: ['flag', 'ASC'] },
	{ sortBy: ['flag', 'DESC'] },
	{ sortBy: ['when', 'ASC'] },
	{ sortBy: ['when', 'DESC'] },
	{ skip: 2, take: 3 },
	{ take: 2 },
	{ take: 0 },
	{ skip: 100 },
];

const dataTableId = 'file-parity';

let dataTableService: DataTableService;
let project: Project;
let dir: string;
let fileTable: IDataTableProjectService;
let tableId: string;

beforeAll(async () => {
	await testModules.loadModules(['data-table'], {
		'data-table': async () => await import('../data-table.module.js'),
	});
	await testDb.init();
	mockDataTableSizeValidator();
	dataTableService = Container.get(DataTableService);

	dir = mkdtempSync(join(tmpdir(), 'data-table-parity-'));
	writeFileSync(
		join(dir, `${dataTableId}.json`),
		JSON.stringify({ name: 'parity', columns, rows: fileRows() }),
	);
	const provider = fileDataTableProvider(dir);
	if (!provider) throw new Error('The file data table provider is not available');
	fileTable = await provider.getDataTableProxy(
		// The file provider reads neither the workflow nor the node.
		{} as Parameters<typeof provider.getDataTableProxy>[0],
		{} as Parameters<typeof provider.getDataTableProxy>[1],
		dataTableId,
	);
});

afterAll(async () => {
	rmSync(dir, { recursive: true, force: true });
	await testDb.terminate();
});

beforeEach(async () => {
	project = await createTeamProject();
	const table = await dataTableService.createDataTable(project.id, { name: 'parity', columns });
	tableId = table.id;
	await dataTableService.insertRows(
		tableId,
		project.id,
		rows.map((row) => ({ text: row.text, amount: row.amount, flag: row.flag, when: row.when })),
	);
});

afterEach(async () => {
	await dataTableService.deleteDataTableAll();
});

async function n8nRows(dto: Partial<ListDataTableRowsOptions>) {
	const result = await dataTableService.getManyRowsAndCount(
		tableId,
		project.id,
		dto as ListDataTableContentQueryDto,
	);
	return { count: result.count, ids: result.data.map((row) => row.id) };
}

async function fileStoreRows(dto: Partial<ListDataTableRowsOptions>) {
	const result = await fileTable.getManyRowsAndCount(dto);
	return { count: result.count, ids: result.data.map((row) => row.id) };
}

describe('the file data table filters, sorts and pages as n8n does', () => {
	it('returns the same rows for every filter condition', async () => {
		const results: Array<{ name: string; expected: unknown; actual: unknown }> = [];
		for (const { filters, type } of filterCases) {
			const dto = { filter: { type: type ?? 'and', filters } };
			const expected = await n8nRows(dto);
			const actual = await fileStoreRows(dto);
			results.push({
				name: JSON.stringify(filters.map((f) => [f.columnName, f.condition, f.value])),
				expected,
				actual,
			});
		}
		expect(results.filter((r) => JSON.stringify(r.expected) !== JSON.stringify(r.actual))).toEqual(
			[],
		);
	});

	it('returns the same rows in the same order for every sort and page', async () => {
		const results: Array<{ name: string; expected: unknown; actual: unknown }> = [];
		for (const dto of listCases) {
			const expected = await n8nRows(dto);
			const actual = await fileStoreRows(dto);
			results.push({ name: JSON.stringify(dto), expected, actual });
		}
		expect(results.filter((r) => JSON.stringify(r.expected) !== JSON.stringify(r.actual))).toEqual(
			[],
		);
	});

	it('updates, upserts and deletes the same rows', async () => {
		const filter = (filters: Filter[], type: 'and' | 'or' = 'and'): DataTableFilter => ({
			type,
			filters,
		});
		const results: Array<Record<string, unknown>> = [];

		const updates: DataTableFilter[] = [
			filter([eq('text', 'beta_2')]),
			filter([eq('amount', '5', 'gt')]),
			filter([eq('when', new Date('2024-03-01T10:00:00.000Z'))]),
			filter([eq('flag', true)]),
			filter([eq('text', null), eq('amount', 0)], 'or'),
		];
		for (const updateFilter of updates) {
			const dryRun = true;
			const n8nUpdate = await dataTableService.updateRows(
				tableId,
				project.id,
				{ filter: updateFilter, data: { text: 'changed' } },
				true,
				dryRun,
			);
			const fileUpdate = await fileTable.updateRows({
				filter: updateFilter,
				data: { text: 'changed' },
				dryRun,
			});
			results.push({
				name: `update ${JSON.stringify(updateFilter.filters)}`,
				expected: n8nUpdate.map((row) => [row.id, row.dryRunState]),
				actual: fileUpdate.map((row) => [row.id, row.dryRunState]),
			});

			const n8nDelete = await dataTableService.deleteRows(
				tableId,
				project.id,
				{ filter: updateFilter },
				true,
				dryRun,
			);
			const fileDelete = await fileTable.deleteRows({ filter: updateFilter, dryRun });
			results.push({
				name: `delete ${JSON.stringify(updateFilter.filters)}`,
				expected: n8nDelete.map((row) => row.id),
				actual: fileDelete.map((row) => row.id),
			});
		}

		// An upsert with no matching row inserts one, and both sides answer its row.
		const insertFilter = filter([eq('text', 'not-there')]);
		const n8nInsert = await dataTableService.upsertRow(
			tableId,
			project.id,
			{ filter: insertFilter, data: { text: 'new', amount: 5 } },
			true,
			true,
		);
		const fileInsert = await fileTable.upsertRow({
			filter: insertFilter,
			data: { text: 'new', amount: 5 },
			dryRun: true,
		});
		results.push({
			name: 'upsert insert',
			expected: n8nInsert.map((row) => [row.id, row.dryRunState, row.text]),
			actual: fileInsert.map((row) => [row.id, row.dryRunState, row.text]),
		});

		expect(results.filter((r) => JSON.stringify(r.expected) !== JSON.stringify(r.actual))).toEqual(
			[],
		);
	});

	it('rejects the same filter values', async () => {
		const bad: Filter[][] = [
			[eq('amount', 'abc')],
			[eq('amount', 'abc', 'gt')],
			[eq('flag', 'maybe')],
			[eq('when', 'not a date')],
			[eq('amount', 1, 'like')],
			[eq('amount', '1', 'like')],
			[eq('when', new Date('2024-03-01T10:00:00.000Z'), 'like')],
			[eq('flag', true, 'ilike')],
			[eq('no-such-column', 1)],
		];
		for (const filters of bad) {
			const dto = { filter: { type: 'and' as const, filters } };
			const n8nError = await n8nRows(dto).then(
				() => undefined,
				(error: Error) => error,
			);
			const fileError = await fileStoreRows(dto).then(
				() => undefined,
				(error: Error) => error,
			);
			expect({ filters, threw: n8nError !== undefined }).toMatchObject({
				filters,
				threw: fileError !== undefined,
			});
		}
	});
});
