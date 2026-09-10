import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { TableBlock } from '@n8n/api-types';

import { PageContextFactory } from '../../../runtime/page-context.factory';
import type {
	AppDataTableHandle,
	AppDataTableRowResult,
	AppPageContext,
} from '../../../runtime/page-context.factory';
import type { BlockRenderContext } from '../../types';
import { tableBlockRenderer } from '../table.renderer';

function ctx(query: Record<string, string> = {}): BlockRenderContext {
	return {
		app: { id: 'app-1', name: 'My App', namespace: 'my-app', projectId: 'project-1', theme: null },
		page: { id: 'page-1', route: '', path: '/apps/my-app' },
		actionPageId: 'page-1',
		menu: [],
		params: { id: '42' },
		query,
		viewer: null,
		baseUrl: 'https://n8n.example.com',
		preview: false,
	};
}

function tableBlock(overrides: Partial<TableBlock['data']> = {}): TableBlock {
	return {
		id: 'block-1',
		type: 'table',
		data: {
			source: { dataTableId: 'dt-1' },
			limit: 50,
			...overrides,
		},
	};
}

const adaRow: AppDataTableRowResult = {
	id: 1,
	name: 'Ada',
	createdAt: new Date('2024-01-01T00:00:00.000Z'),
	updatedAt: new Date(),
};

function setup(rows: AppDataTableRowResult[]) {
	const handle = mock<AppDataTableHandle>();
	handle.getColumns.mockResolvedValue([
		{ id: 'c0', name: 'id', type: 'number', index: 0 },
		{ id: 'c1', name: 'name', type: 'string', index: 1 },
		{ id: 'c2', name: 'amount', type: 'number', index: 2 },
		{ id: 'c3', name: 'paid', type: 'boolean', index: 3 },
		{ id: 'c4', name: 'dueAt', type: 'date', index: 4 },
		{ id: 'c5', name: 'createdAt', type: 'date', index: 5 },
	]);
	handle.getManyRowsAndCount.mockResolvedValue({ count: rows.length, data: rows });
	const pageContext = mock<AppPageContext>({
		dataTables: { get: async () => handle, list: async () => [] },
		actionUrl: (name) => `url:${name}`,
	});
	Container.set(PageContextFactory, mock<PageContextFactory>({ build: () => pageContext }));
	return handle;
}

describe('tableBlockRenderer', () => {
	it('renders selected columns, hiding system columns by default', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(tableBlock(), ctx());

		expect(html).toContain('>name<');
		expect(html).not.toContain('>id<');
		expect(html).not.toContain('>createdAt<');
		expect(html).not.toContain('>updatedAt<');
		expect(html).toContain('Ada');
	});

	it('shows only the configured columns, in order, with dates as ISO strings', async () => {
		const handle = setup([adaRow]);

		const html = await tableBlockRenderer.render(
			tableBlock({ columns: ['createdAt', 'name'] }),
			ctx(),
		);

		expect(html).toContain('2024-01-01T00:00:00.000Z');
		expect(handle.getColumns).not.toHaveBeenCalled();
	});

	it('interpolates {{ params.x }} in filter values', async () => {
		const handle = setup([]);

		await tableBlockRenderer.render(
			tableBlock({
				filter: {
					type: 'and',
					filters: [{ columnName: 'clientId', condition: 'eq', value: '{{ params.id }}' }],
				},
			}),
			ctx(),
		);

		expect(handle.getManyRowsAndCount).toHaveBeenCalledWith(
			expect.objectContaining({
				filter: {
					type: 'and',
					filters: [{ columnName: 'clientId', condition: 'eq', value: '42' }],
				},
			}),
		);
	});

	it('renders no actions column, forms or links unless editable or deletable', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(tableBlock(), ctx());

		expect(html).not.toContain('<form');
		expect(html).not.toContain('<a ');
		expect(html.match(/<th /g)).toHaveLength(4);
	});

	it('renders a delete form per row when deletable', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(tableBlock({ deletable: true }), ctx());

		expect(html).toContain("<form method='POST' action='url:delete' class='inline'>");
		expect(html).not.toContain("name='_token'");
		expect(html).toContain("<input type='hidden' name='id' value='1' />");
		expect(html).toContain('>Delete</button>');
		expect(html).not.toContain('>Edit</a>');
	});

	it('renders an edit link per row that keeps the query minus the last action status when editable', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(
			tableBlock({ editable: true }),
			ctx({ page: '2', _form: 'block-1', _status: 'ok' }),
		);

		expect(html).toContain(
			"<a href='/apps/my-app?page&#x3D;2&amp;_edit&#x3D;block-1%3A1' class='app-link",
		);
		expect(html).toContain('>Edit</a>');
		expect(html).not.toContain('>Delete</button>');
	});

	it('renders inputs by column type for the row named in ?_edit, attached to a form after the table', async () => {
		setup([
			{ ...adaRow, amount: 12.5, paid: true, dueAt: new Date('2024-03-04T05:06:00.000Z') },
			{ ...adaRow, id: 2, name: 'Bob' },
		]);

		const html = await tableBlockRenderer.render(
			tableBlock({ editable: true, columns: ['id', 'name', 'amount', 'paid', 'dueAt'] }),
			ctx({ _edit: 'block-1:1' }),
		);

		expect(html).toContain("<input type='text'  name='name' value='Ada' form='edit-block-1-1'");
		expect(html).toContain(
			"<input type='number' step='any' name='amount' value='12.5' form='edit-block-1-1'",
		);
		expect(html).toContain("<select name='paid' form='edit-block-1-1'");
		expect(html).toContain("<option value='true' selected>true</option>");
		expect(html).toContain(
			"<input type='datetime-local'  name='dueAt' value='2024-03-04T05:06' form='edit-block-1-1'",
		);
		expect(html).not.toContain("name='id' form=");
		expect(html).toContain("<form id='edit-block-1-1' method='POST' action='url:update'");
		expect(html).toContain("<input type='hidden' name='id' value='1' />");
		expect(html).toContain('>Save</button>');
		expect(html).toContain("<a href='/apps/my-app' class='app-link'>Cancel</a>");
		expect(html).toContain('Bob');
		expect(html).not.toContain("value='Bob'");
	});

	it('ignores ?_edit when the block is not editable', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(tableBlock(), ctx({ _edit: 'block-1:1' }));

		expect(html).not.toContain('<input');
		expect(html).not.toContain('<form');
	});

	it('shows the error message from a failed action above the table', async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(
			tableBlock({ editable: true }),
			ctx({ _form: 'block-1', _status: 'error', _message: 'Invalid value for "amount"' }),
		);

		expect(html).toContain('Invalid value for &quot;amount&quot;');
		expect(html).toContain('text-text-danger');
	});

	it("does not show another block's error message", async () => {
		setup([adaRow]);

		const html = await tableBlockRenderer.render(
			tableBlock({ editable: true }),
			ctx({ _form: 'other', _status: 'error', _message: 'nope' }),
		);

		expect(html).not.toContain('nope');
	});
});
