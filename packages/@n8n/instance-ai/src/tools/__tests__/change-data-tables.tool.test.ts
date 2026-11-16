import { DATA_TABLE_WRITE_TOOL_ACTIONS } from '@n8n/api-types';
import { zodSchema } from 'ai';
import { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import { OutsideThreadProjectError } from '../../errors/outside-thread-project.error';
import type { DataTableColumnInfo, InstanceAiContext } from '../../types';
import { changeDataTablesInputSchema } from '../data-tables/change-data-tables.schema';
import { createChangeDataTablesTool } from '../data-tables/change-data-tables.tool';
import { createMockContext, suspendCtx } from './data-table-tools-test-utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

const WRITE_METHODS = [
	'create',
	'delete',
	'addColumn',
	'deleteColumn',
	'renameColumn',
	'insertRows',
	'updateRows',
	'deleteRows',
] as const;

function column(name: string, index = 0): DataTableColumnInfo {
	return { id: `col-${name}`, name, type: 'string', index };
}

/** A context whose existing table "T" resolves by name or by its ID "dt-T". */
function contextWithTables(
	columnsByTableId: Record<string, DataTableColumnInfo[]> = {},
	overrides: Parameters<typeof createMockContext>[0] = {},
): InstanceAiContext {
	const context = createMockContext({ assertInThreadProject: vi.fn(), ...overrides });
	context.dataTableService.resolveTableReference = vi.fn(async (ref: string) => {
		const name = ref.replace(/^dt-/, '');
		return { id: `dt-${name}`, name, projectId: 'proj-1' };
	});
	context.dataTableService.getSchema = vi.fn(async (id: string) => columnsByTableId[id] ?? []);
	return context;
}

async function runBatch(context: InstanceAiContext, input: unknown) {
	const suspend = vi.fn();
	const result = await executeTool(createChangeDataTablesTool(context), input, suspendCtx(suspend));
	return { result, suspend };
}

function expectNoCardAndNoWrites(context: InstanceAiContext, suspend: ReturnType<typeof vi.fn>) {
	expect(suspend).not.toHaveBeenCalled();
	for (const method of WRITE_METHODS) {
		expect(context.dataTableService[method]).not.toHaveBeenCalled();
	}
}

const createA = {
	action: 'create',
	name: 'A',
	columns: [{ name: 'email', type: 'string' }],
} as const;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('change_data_tables tool', () => {
	describe('model-facing input schema', () => {
		it('keeps the action enum and the fields of every action after sanitizing', async () => {
			const jsonSchema = await zodSchema(sanitizeInputSchema(changeDataTablesInputSchema))
				.jsonSchema;
			const items = z
				.object({
					properties: z.object({
						changes: z.object({
							items: z.object({
								properties: z.record(z.object({ enum: z.array(z.string()).optional() })),
							}),
						}),
					}),
				})
				.parse(jsonSchema).properties.changes.items;

			expect(items.properties.action.enum?.sort()).toEqual(
				[...DATA_TABLE_WRITE_TOOL_ACTIONS].sort(),
			);
			expect(Object.keys(items.properties).sort()).toEqual(
				[
					'action',
					'name',
					'columns',
					'table',
					'column',
					'type',
					'newName',
					'rows',
					'filter',
					'data',
				].sort(),
			);
		});
	});

	describe('validation before approval', () => {
		it('rejects the whole batch when one change is blocked by an admin', async () => {
			const context = contextWithTables({}, { permissions: { deleteDataTable: 'blocked' } });
			const { result, suspend } = await runBatch(context, {
				changes: [createA, { action: 'delete', table: 'B' }],
			});

			expect(result).toMatchObject({ denied: true, reason: expect.stringContaining('delete') });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects adding a column and deleting it in the same batch', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result, suspend } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'delete-column', table: 'T', column: 'X' },
				],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 1 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects two creates with the same name', async () => {
			const context = contextWithTables();
			const { result, suspend } = await runBatch(context, { changes: [createA, createA] });

			expect(result).toMatchObject({ success: false, changeIndex: 1 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects a change to a table that an earlier change deletes', async () => {
			const context = contextWithTables();
			const { result, suspend } = await runBatch(context, {
				changes: [
					{ action: 'delete', table: 'T' },
					{ action: 'insert-rows', table: 'dt-T', rows: [{ a: 1 }] },
				],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 1 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects a table outside the thread project', async () => {
			const assertInThreadProject = vi.fn().mockRejectedValue(new OutsideThreadProjectError());
			const context = contextWithTables({}, { assertInThreadProject });
			const suspend = vi.fn();

			await expect(
				executeTool(
					createChangeDataTablesTool(context),
					{ projectId: 'proj-2', changes: [{ action: 'delete', table: 'Contacts' }] },
					suspendCtx(suspend),
				),
			).rejects.toThrow(OutsideThreadProjectError);

			expect(assertInThreadProject).toHaveBeenCalledWith({
				kind: 'data-table',
				id: 'dt-Contacts',
				projectId: 'proj-1',
			});
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects a table that does not exist', async () => {
			const context = contextWithTables();
			context.dataTableService.resolveTableReference = vi
				.fn()
				.mockRejectedValue(new Error('Data table "Missing" not found'));
			const { result, suspend } = await runBatch(context, {
				changes: [createA, { action: 'insert-rows', table: 'Missing', rows: [{ a: 1 }] }],
			});

			expect(result).toMatchObject({
				success: false,
				changeIndex: 1,
				error: expect.stringContaining('changes[1]'),
			});
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects a column that the table does not have', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result, suspend } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'rename-column', table: 'T', column: 'missing', newName: 'other' },
				],
			});

			expect(result).toMatchObject({
				success: false,
				changeIndex: 1,
				error: expect.stringContaining('changes[1]'),
			});
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects adding a column whose name already exists', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result, suspend } = await runBatch(context, {
				changes: [{ action: 'add-column', table: 'T', column: 'name', type: 'string' }],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 0 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects renaming a column to a name that already exists', async () => {
			const context = contextWithTables({ 'dt-T': [column('name'), column('email', 1)] });
			const { result, suspend } = await runBatch(context, {
				changes: [{ action: 'rename-column', table: 'T', column: 'name', newName: 'email' }],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 0 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('rejects a row deletion without a filter condition', async () => {
			const context = contextWithTables();
			const { result, suspend } = await runBatch(context, {
				changes: [{ action: 'delete-rows', table: 'T', filter: { type: 'and', filters: [] } }],
			});

			expect(result).toMatchObject({
				success: false,
				error: expect.stringContaining('changes[0]'),
			});
			expectNoCardAndNoWrites(context, suspend);
		});
	});

	describe('valid batches', () => {
		it('accepts changes to a table created earlier in the batch without a lookup', async () => {
			const context = contextWithTables();
			const { result, suspend } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'insert-rows', table: 'A', rows: [{ email: 'a@b.c' }] },
					{ action: 'add-column', table: 'A', column: 'name', type: 'string' },
				],
			});

			expect(result).toEqual({ success: true, validated: true, changes: 3 });
			expect(context.dataTableService.resolveTableReference).not.toHaveBeenCalled();
			expect(context.assertInThreadProject).not.toHaveBeenCalled();
			expectNoCardAndNoWrites(context, suspend);
		});

		it('accepts renaming a column that an earlier change adds', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'T', column: 'X', newName: 'Y' },
				],
			});

			expect(result).toMatchObject({ success: true, validated: true });
		});

		it('accepts a column ID for a column deletion', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result } = await runBatch(context, {
				changes: [{ action: 'delete-column', table: 'T', column: 'col-name' }],
			});

			expect(result).toMatchObject({ success: true, validated: true });
		});

		it('reads each existing table and its schema once', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'dt-T', column: 'name', newName: 'full_name' },
					{ action: 'insert-rows', table: 'T', rows: [{ X: 1 }] },
				],
			});

			expect(context.dataTableService.getSchema).toHaveBeenCalledTimes(1);
			expect(context.assertInThreadProject).toHaveBeenCalledTimes(1);
		});

		it('uses the table reference as is when the service cannot resolve references', async () => {
			const context = createMockContext({ assertInThreadProject: vi.fn() });
			const { result } = await runBatch(context, {
				projectId: 'proj-1',
				changes: [{ action: 'insert-rows', table: 'dt-1', rows: [{ a: 1 }] }],
			});

			expect(result).toMatchObject({ success: true, validated: true });
			expect(context.assertInThreadProject).toHaveBeenCalledWith({
				kind: 'data-table',
				id: 'dt-1',
				projectId: 'proj-1',
			});
		});
	});
});
