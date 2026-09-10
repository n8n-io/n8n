import { mock } from 'vitest-mock-extended';

import type { TableBlock } from '@n8n/api-types';

import type { BlockRenderContext } from '../../rendering/types';
import type { AppDataTableHandle } from '../../runtime/page-context.factory';
import { runTableAction } from '../table-actions';

function tableBlock(overrides: Partial<TableBlock['data']> = {}): TableBlock {
	return {
		id: 'block-1',
		type: 'table',
		data: { source: { dataTableId: 'dt-1' }, limit: 50, ...overrides },
	};
}

const ctx: BlockRenderContext = {
	app: { id: 'app-1', name: 'App', namespace: 'app', projectId: 'p1', theme: null },
	page: { id: 'page-1', route: ':id', path: '/apps/app/clients/42' },
	actionPageId: 'page-1',
	params: { id: '42' },
	query: {},
	viewer: null,
	menu: [],
	baseUrl: 'https://n8n.example.com',
	preview: false,
};

const idFilter = (id: number) => ({
	type: 'and',
	filters: [{ columnName: 'id', condition: 'eq', value: id }],
});

const shownRow = (id: number) => ({ id, createdAt: new Date(), updatedAt: new Date() });

/** Rows 1, 3 and 7 are the ones the table shows on the page. */
function handleWithColumns() {
	const handle = mock<AppDataTableHandle>();
	handle.getColumns.mockResolvedValue([
		{ id: 'c0', name: 'name', type: 'string', index: 0 },
		{ id: 'c1', name: 'amount', type: 'number', index: 1 },
		{ id: 'c2', name: 'paid', type: 'boolean', index: 2 },
		{ id: 'c3', name: 'dueAt', type: 'date', index: 3 },
	]);
	handle.getManyRowsAndCount.mockResolvedValue({
		count: 3,
		data: [shownRow(1), shownRow(3), shownRow(7)],
	});
	handle.updateRows.mockResolvedValue([]);
	handle.deleteRows.mockResolvedValue([]);
	return handle;
}

describe('runTableAction', () => {
	test('refuses a row the table does not show on this page', async () => {
		const handle = handleWithColumns();
		const block = tableBlock({
			deletable: true,
			filter: {
				type: 'and',
				filters: [{ columnName: 'clientId', condition: 'eq', value: '{{ params.id }}' }],
			},
		});

		const outcome = await runTableAction({
			handle,
			block,
			name: 'delete',
			input: { id: '2' },
			ctx,
		});

		expect(outcome).toEqual({ error: 'Row not found' });
		expect(handle.getManyRowsAndCount).toHaveBeenCalledWith({
			filter: {
				type: 'and',
				filters: [{ columnName: 'clientId', condition: 'eq', value: '42' }],
			},
			sortBy: undefined,
			take: 50,
		});
		expect(handle.deleteRows).not.toHaveBeenCalled();
	});

	test.each([
		['delete', tableBlock({ editable: true })],
		['update', tableBlock({ deletable: true })],
		['insert', tableBlock({ editable: true, deletable: true })],
	])('refuses "%s" when the block does not allow it', async (name, block) => {
		const handle = handleWithColumns();

		const outcome = await runTableAction({ handle, block, name, input: { id: '1' }, ctx });

		expect(outcome).toEqual({ error: 'Action not found' });
		expect(handle.deleteRows).not.toHaveBeenCalled();
		expect(handle.updateRows).not.toHaveBeenCalled();
	});

	test.each([undefined, '', 'abc', '0', '-1', '1.5'])('rejects the row id %j', async (id) => {
		const handle = handleWithColumns();

		const outcome = await runTableAction({
			handle,
			block: tableBlock({ deletable: true }),
			name: 'delete',
			input: { id },
			ctx,
		});

		expect(outcome).toEqual({ error: 'Invalid row id' });
		expect(handle.deleteRows).not.toHaveBeenCalled();
	});

	test('deletes the row addressed by id and redirects to the ok state', async () => {
		const handle = handleWithColumns();

		const outcome = await runTableAction({
			handle,
			block: tableBlock({ deletable: true }),
			name: 'delete',
			input: { id: '7' },
			ctx,
		});

		expect(handle.deleteRows).toHaveBeenCalledWith({ filter: idFilter(7) });
		expect(outcome).toEqual({ redirect: '?_form=block-1&_status=ok' });
	});

	test('coerces each submitted value by its column type', async () => {
		const handle = handleWithColumns();

		const outcome = await runTableAction({
			handle,
			block: tableBlock({ editable: true }),
			name: 'update',
			input: { id: '3', name: 'Ada', amount: '12.5', paid: 'true', dueAt: '2024-01-02T10:30' },
			ctx,
		});

		expect(handle.updateRows).toHaveBeenCalledWith({
			filter: idFilter(3),
			data: { name: 'Ada', amount: 12.5, paid: true, dueAt: new Date('2024-01-02T10:30:00.000Z') },
		});
		expect(outcome).toEqual({ redirect: '?_form=block-1&_status=ok' });
	});

	test('stores an empty number or date as null and any other boolean string as false', async () => {
		const handle = handleWithColumns();

		await runTableAction({
			handle,
			block: tableBlock({ editable: true }),
			name: 'update',
			input: { id: '3', amount: '', paid: 'false', dueAt: '' },
			ctx,
		});

		expect(handle.updateRows).toHaveBeenCalledWith({
			filter: idFilter(3),
			data: { amount: null, paid: false, dueAt: null },
		});
	});

	test.each([
		['amount', 'twelve'],
		['dueAt', 'someday'],
	])('rejects an unparsable %s value without writing', async (column, value) => {
		const handle = handleWithColumns();

		const outcome = await runTableAction({
			handle,
			block: tableBlock({ editable: true }),
			name: 'update',
			input: { id: '3', [column]: value },
			ctx,
		});

		expect(outcome).toEqual({ error: `Invalid value for "${column}"` });
		expect(handle.updateRows).not.toHaveBeenCalled();
	});

	test("ignores columns outside the block's column list and the system columns", async () => {
		const handle = handleWithColumns();

		await runTableAction({
			handle,
			block: tableBlock({ editable: true, columns: ['name'] }),
			name: 'update',
			input: { id: '3', name: 'Ada', amount: '1', createdAt: '2020-01-01' },
			ctx,
		});

		expect(handle.updateRows).toHaveBeenCalledWith({ filter: idFilter(3), data: { name: 'Ada' } });
	});
});
