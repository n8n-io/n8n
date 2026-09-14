import { Container } from '@n8n/di';

import { blockStaticData } from '../block-context';
import { renderPartial } from '../templates';
import type { BlockRenderContext, BlockRenderer } from '../types';
import { visibleRows } from './table-rows';

import { SYSTEM_COLUMNS, writableColumns } from '../../actions/table-actions';
import type { AppDataTableColumn } from '../../runtime/page-context.factory';
import { PageContextFactory } from '../../runtime/page-context.factory';

const EDIT_QUERY_KEY = '_edit';

const inputType = (type: AppDataTableColumn['type']): string | undefined => {
	switch (type) {
		case 'string':
			return 'text';
		case 'number':
			return 'number';
		case 'date':
			return 'datetime-local';
		case 'boolean':
			return undefined;
	}
};

const formatCell = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	return String(value);
};

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; every other input takes the display text. */
const formatInputValue = (value: unknown, type: AppDataTableColumn['type']): string =>
	type === 'date' && value instanceof Date ? value.toISOString().slice(0, 16) : formatCell(value);

const ACTION_STATUS_KEYS = ['_form', '_status', '_message'];

/** The page's own URL with `_edit` set (or removed when `edit` is undefined) and the last action's status dropped. */
const pageUrl = (ctx: BlockRenderContext, edit: string | undefined): string => {
	const params = new URLSearchParams(ctx.query);
	for (const key of ACTION_STATUS_KEYS) params.delete(key);
	if (edit === undefined) params.delete(EDIT_QUERY_KEY);
	else params.set(EDIT_QUERY_KEY, edit);
	const search = params.toString();
	return search ? `${ctx.page.path}?${search}` : ctx.page.path;
};

export const tableBlockRenderer: BlockRenderer<'table'> = {
	type: 'table',
	async render(block, ctx) {
		const pageContext = Container.get(PageContextFactory).build({
			...blockStaticData(ctx, block.id),
			logs: [],
		});

		const handle = await pageContext.dataTables.get(block.data.source.dataTableId);
		const rows = await visibleRows(handle, block, ctx);

		const { editable = false, deletable = false } = block.data;
		const editPrefix = `${block.id}:`;
		const editParam = ctx.query[EDIT_QUERY_KEY] ?? '';
		const editingRowId =
			editable && editParam.startsWith(editPrefix) ? editParam.slice(editPrefix.length) : undefined;
		const formId = `edit-${block.id}-${editingRowId}`;

		const schema =
			block.data.columns && editingRowId === undefined ? [] : await handle.getColumns();
		const columns =
			block.data.columns ?? schema.map((c) => c.name).filter((name) => !SYSTEM_COLUMNS.has(name));
		const columnTypes = new Map(writableColumns(block, schema).map((c) => [c.name, c.type]));

		return await renderPartial('block-table', {
			columns,
			hasActions: editable || deletable,
			deleteUrl: deletable ? pageContext.actionUrl('delete') : undefined,
			errorMessage:
				ctx.query._form === block.id && ctx.query._status === 'error'
					? ctx.query._message
					: undefined,
			rows: rows.map((row) => {
				const editing = String(row.id) === editingRowId;
				return {
					id: row.id,
					editing,
					editUrl: editable && !editing ? pageUrl(ctx, `${block.id}:${row.id}`) : undefined,
					cells: columns.map((name) => {
						const type = columnTypes.get(name);
						if (!editing || !type) return { value: formatCell(row[name]) };
						return {
							value: formatInputValue(row[name], type),
							input: {
								name,
								formId,
								isBoolean: type === 'boolean',
								isTrue: row[name] === true,
								isNumber: type === 'number',
								inputType: inputType(type),
							},
						};
					}),
				};
			}),
			editForm:
				editingRowId === undefined
					? undefined
					: {
							id: formId,
							rowId: editingRowId,
							updateUrl: pageContext.actionUrl('update'),
							cancelUrl: pageUrl(ctx, undefined),
						},
		});
	},
};
