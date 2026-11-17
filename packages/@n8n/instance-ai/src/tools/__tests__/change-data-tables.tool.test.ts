import {
	DATA_TABLE_READ_TOOL_ACTIONS,
	DATA_TABLE_TOOL_NAME_BY_ACTION,
	DATA_TABLE_WRITE_TOOL_ACTIONS,
	DATA_TABLE_WRITE_TOOL_NAMES,
	buildDataTablesSessionGrantKey,
	buildOwnedDataTableGrantKey,
} from '@n8n/api-types';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { JSONValue } from '@n8n/utils/json/to-json-value';
import { UnexpectedError, UserError } from '@n8n/errors';
import { zodSchema } from 'ai';
import { z } from 'zod';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import { OutsideThreadProjectError } from '../../errors/outside-thread-project.error';
import type { DataTableColumnInfo, DataTableSummary, InstanceAiContext } from '../../types';
import { changeDataTablesInputSchema } from '../data-tables/change-data-tables.schema';
import { createChangeDataTablesTool } from '../data-tables/change-data-tables.tool';
import { confirmationSuspendSchema } from '../data-tables/confirmation';
import {
	createMockContext,
	dataTableToolFor,
	resumeCtx,
	suspendCtx,
} from './data-table-tools-test-utils';

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

/** The table that a batch create returns. Its columns get IDs like existing columns. */
function createdTable(
	name: string,
	columns: Array<{ name: string; type: string }>,
	id = 'dt-new',
): DataTableSummary {
	return {
		id,
		name,
		projectId: 'proj-1',
		columns: columns.map((c) => ({ id: `col-${c.name}`, name: c.name, type: c.type })),
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	};
}

/**
 * A context whose existing table "T" resolves by name or by its ID "dt-T".
 * A created table gets the ID "dt-new".
 */
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
	context.dataTableService.create = vi.fn(async (name, columns) => createdTable(name, columns));
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

/** Every write allowed, so a valid batch skips the card and reaches the run stage. */
const ALLOW_ALL = {
	createDataTable: 'always_allow',
	deleteDataTable: 'always_allow',
	mutateDataTableSchema: 'always_allow',
	mutateDataTableRows: 'always_allow',
} as const;

async function resumeBatch(
	context: InstanceAiContext,
	input: unknown,
	approved: boolean,
	scope?: 'once' | 'session',
) {
	return await executeTool(createChangeDataTablesTool(context), input, resumeCtx(approved, scope));
}

/**
 * Shows the card, then resumes it approved with the continuation that the card
 * stored, as the runtime does. `beforeResume` changes the world in between.
 */
async function approveAfterCard(
	context: InstanceAiContext,
	input: unknown,
	beforeResume: () => void = () => {},
) {
	const tool = createChangeDataTablesTool(context);
	const firstSuspend = vi.fn();
	await executeTool(tool, input, suspendCtx(firstSuspend));
	expect(firstSuspend).toHaveBeenCalledTimes(1);
	const options = z
		.object({ continuation: z.unknown().optional() })
		.optional()
		.parse(firstSuspend.mock.calls[0][1]);
	beforeResume();
	const suspend = vi.fn();
	const resumed = { resumeData: { approved: true }, continuation: options?.continuation, suspend };
	const result = await executeTool(tool, input, resumed);
	return { result, suspend, continuation: options?.continuation };
}

/** The payload of the only card the tool showed. */
function cardOf(suspend: ReturnType<typeof vi.fn>) {
	expect(suspend).toHaveBeenCalledTimes(1);
	const card = confirmationSuspendSchema.parse(suspend.mock.calls[0][0]);
	const details = card.approvalDetails;
	if (details?.action !== 'data-table-changes') throw new Error('Expected a batch card');
	return { ...card, approvalDetails: details };
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

	it('shows the model the same schema through the tool as the sanitized input schema', async () => {
		const tool = createChangeDataTablesTool(createMockContext());
		if (!(tool.inputSchema instanceof z.ZodType)) throw new Error('Expected a Zod input schema');
		const sanitized = sanitizeInputSchema(changeDataTablesInputSchema);

		expect(await zodSchema(tool.inputSchema).jsonSchema).toEqual(
			await zodSchema(sanitized).jsonSchema,
		);
		// The tool catalog converts deferred tool schemas with this helper.
		expect(zodToJsonSchema(tool.inputSchema)).toEqual(zodToJsonSchema(sanitized));
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
				.mockRejectedValue(new UserError('Data table "Missing" not found'));
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
			const context = contextWithTables({}, { permissions: ALLOW_ALL });
			const { result, suspend } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'insert-rows', table: 'A', rows: [{ email: 'a@b.c' }] },
					{ action: 'add-column', table: 'A', column: 'name', type: 'string' },
				],
			});

			expect(result).toMatchObject({ success: true, skipped: [] });
			expect(context.dataTableService.resolveTableReference).not.toHaveBeenCalled();
			expect(context.assertInThreadProject).not.toHaveBeenCalled();
			expect(suspend).not.toHaveBeenCalled();
		});

		it('accepts renaming a column that an earlier change adds', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] }, { permissions: ALLOW_ALL });
			vi.mocked(context.dataTableService.addColumn).mockResolvedValue(column('X'));
			const { result } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'T', column: 'X', newName: 'Y' },
				],
			});

			expect(result).toMatchObject({ success: true });
		});

		it('accepts a column ID for a column deletion', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] }, { permissions: ALLOW_ALL });
			const { result } = await runBatch(context, {
				changes: [{ action: 'delete-column', table: 'T', column: 'col-name' }],
			});

			expect(result).toMatchObject({ success: true });
		});

		it('reads each existing table and its schema once', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'dt-T', column: 'name', newName: 'full_name' },
					{ action: 'insert-rows', table: 'T', rows: [{ X: 1, full_name: 'a' }] },
				],
			});

			expect(context.dataTableService.getSchema).toHaveBeenCalledTimes(1);
			expect(context.assertInThreadProject).toHaveBeenCalledTimes(1);
		});

		it('uses the table reference as is when the service cannot resolve references', async () => {
			const context = createMockContext({ assertInThreadProject: vi.fn(), permissions: ALLOW_ALL });
			context.dataTableService.getSchema = vi.fn().mockResolvedValue([column('a')]);
			const { result } = await runBatch(context, {
				projectId: 'proj-1',
				changes: [{ action: 'insert-rows', table: 'dt-1', rows: [{ a: 1 }] }],
			});

			expect(result).toMatchObject({ success: true });
			expect(context.assertInThreadProject).toHaveBeenCalledWith({
				kind: 'data-table',
				id: 'dt-1',
				projectId: 'proj-1',
			});
		});
	});

	describe('table lookups', () => {
		it('looks up each table with the permission its change needs', async () => {
			const context = contextWithTables({ 'dt-T': [column('a')] });
			context.dataTableService.resolveTableReference = vi.fn(
				async (ref: string, options?: { permission?: string }) => {
					if (options?.permission === 'writeRow')
						throw new UserError(`Data table "${ref}" not found`);
					return { id: 'dt-T', name: 'T', projectId: 'proj-1' };
				},
			);
			const { result, suspend } = await runBatch(context, {
				changes: [{ action: 'insert-rows', table: 'T', rows: [{ a: 1 }] }],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 0 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('names the project choice when a table name is ambiguous', async () => {
			const context = contextWithTables();
			context.dataTableService.resolveTableReference = vi
				.fn()
				.mockRejectedValue(
					new UserError(
						'Data table name "T" is ambiguous across accessible projects (p1, p2); pass the UUID or include a `projectId` to disambiguate.',
					),
				);
			const { result } = await runBatch(context, { changes: [{ action: 'delete', table: 'T' }] });

			expect(result).toMatchObject({
				success: false,
				changeIndex: 0,
				error: expect.stringContaining('projectId'),
			});
		});

		it('throws a lookup failure that is not about the table', async () => {
			const context = contextWithTables();
			context.dataTableService.resolveTableReference = vi
				.fn()
				.mockRejectedValue(new Error('Connection timed out'));

			await expect(
				runBatch(context, { changes: [{ action: 'delete', table: 'T' }] }),
			).rejects.toThrow('Connection timed out');
		});

		it('rejects a change when the schema read cannot find the table', async () => {
			const context = contextWithTables();
			context.dataTableService.getSchema = vi
				.fn()
				.mockRejectedValue(new UserError('Data table "dt-T" not found'));
			const { result } = await runBatch(context, {
				changes: [{ action: 'add-column', table: 'T', column: 'X', type: 'string' }],
			});

			expect(result).toMatchObject({ success: false, changeIndex: 0 });
		});

		it('throws a schema read failure that is not about the table', async () => {
			const context = contextWithTables();
			context.dataTableService.getSchema = vi
				.fn()
				.mockRejectedValue(new Error('Connection timed out'));

			await expect(
				runBatch(context, {
					changes: [{ action: 'add-column', table: 'T', column: 'X', type: 'string' }],
				}),
			).rejects.toThrow('Connection timed out');
		});
	});

	describe('row columns', () => {
		const filterOn = (columnName: string) => ({
			type: 'and',
			filters: [{ columnName, condition: 'eq', value: 'x' }],
		});

		it.each([
			{
				name: 'an inserted row uses a column renamed earlier in the batch',
				changes: [
					{ action: 'rename-column', table: 'T', column: 'name', newName: 'full_name' },
					{ action: 'insert-rows', table: 'T', rows: [{ name: 'Ann' }] },
				],
				changeIndex: 1,
			},
			{
				name: 'an inserted row uses an unknown column',
				changes: [{ action: 'insert-rows', table: 'T', rows: [{ name: 'Ann' }, { age: 3 }] }],
				changeIndex: 0,
			},
			{
				name: 'a row update sets an unknown column',
				changes: [
					{ action: 'update-rows', table: 'T', filter: filterOn('name'), data: { age: 3 } },
				],
				changeIndex: 0,
			},
			{
				name: 'a row update filters on an unknown column',
				changes: [
					{ action: 'update-rows', table: 'T', filter: filterOn('age'), data: { name: 'Ann' } },
				],
				changeIndex: 0,
			},
			{
				name: 'a row deletion filters on an unknown column',
				changes: [{ action: 'delete-rows', table: 'T', filter: filterOn('age') }],
				changeIndex: 0,
			},
			{
				name: 'an inserted row in a created table uses a column the create does not define',
				changes: [createA, { action: 'insert-rows', table: 'A', rows: [{ phone: '1' }] }],
				changeIndex: 1,
			},
		])('rejects the batch when $name', async ({ changes, changeIndex }) => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result, suspend } = await runBatch(context, { changes });

			expect(result).toMatchObject({
				success: false,
				changeIndex,
				error: expect.stringContaining(`changes[${changeIndex}]`),
			});
			expectNoCardAndNoWrites(context, suspend);
		});

		it.each([
			{ action: 'insert-rows', table: 'T', rows: [{ name: 'Ann', id: 7 }] },
			{ action: 'update-rows', table: 'T', filter: filterOn('name'), data: { updatedAt: 'x' } },
		])('rejects writing a system column in $action', async (change) => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { result, suspend } = await runBatch(context, { changes: [change] });

			expect(result).toMatchObject({ success: false, changeIndex: 0 });
			expectNoCardAndNoWrites(context, suspend);
		});

		it('throws a not-found failure that is not a user error', async () => {
			const context = contextWithTables();
			context.dataTableService.resolveTableReference = vi
				.fn()
				.mockRejectedValue(new Error('Data table "T" not found'));

			await expect(
				runBatch(context, { changes: [{ action: 'delete', table: 'T' }] }),
			).rejects.toThrow('not found');
		});

		it('accepts filters on system columns and rows that use columns added in the batch', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] }, { permissions: ALLOW_ALL });
			const { result } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'age', type: 'number' },
					{ action: 'insert-rows', table: 'T', rows: [{ name: 'Ann', age: 3 }] },
					{ action: 'update-rows', table: 'T', filter: filterOn('createdAt'), data: { age: 4 } },
					{ action: 'delete-rows', table: 'T', filter: filterOn('id') },
				],
			});

			expect(result).toMatchObject({ success: true });
		});
	});

	describe('approval', () => {
		const insertIntoA = { action: 'insert-rows', table: 'A', rows: [{ email: 'a@b.c' }] };
		const addColumnToB = { action: 'add-column', table: 'B', column: 'x', type: 'string' };
		const filterOn = (columnName: string) => ({
			type: 'and',
			filters: [{ columnName, condition: 'eq', value: 'x' }],
		});
		const filterOnName = filterOn('name');

		it('shows one card that lists every change of a batch in order', async () => {
			const context = contextWithTables({ 'dt-B': [column('name')] });
			const { suspend } = await runBatch(context, {
				changes: [createA, insertIntoA, addColumnToB],
			});

			const card = cardOf(suspend);
			expect(card.approvalDetails.action).toBe('data-table-changes');
			expect(
				card.approvalDetails.changes.map(({ tableName, details }) => [tableName, details.action]),
			).toEqual([
				['A', 'create-table'],
				['A', 'insert-rows'],
				['B', 'add-column'],
			]);
			expect(card.requestId).toEqual(expect.any(String));
			expect(card.message).toEqual(expect.any(String));
		});

		it('gives the changes of one table the same table key', async () => {
			const context = contextWithTables({ 'dt-B': [column('name')] });
			const { suspend } = await runBatch(context, {
				changes: [createA, addColumnToB, insertIntoA],
			});

			const [createKey, addColumnKey, insertKey] = cardOf(suspend).approvalDetails.changes.map(
				({ tableKey }) => tableKey,
			);
			expect(insertKey).toBe(createKey);
			expect(addColumnKey).not.toBe(createKey);
			expect(addColumnKey).toContain('dt-B');
		});

		it('builds the details of each change from the batch', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const { suspend } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'rename-column', table: 'T', column: 'col-name', newName: 'full' },
					{ action: 'insert-rows', table: 'T', rows: [{ full: 'a' }] },
					{ action: 'update-rows', table: 'T', filter: filterOn('full'), data: { full: 'b' } },
					{ action: 'delete-column', table: 'T', column: 'full' },
				],
			});

			const details = cardOf(suspend).approvalDetails.changes.map((change) => change.details);
			expect(details).toEqual([
				{ action: 'create-table', columns: [{ name: 'email', columnType: 'string' }] },
				{ action: 'rename-column', column: 'name', newName: 'full' },
				{
					action: 'insert-rows',
					count: 1,
					rows: [{ values: [{ column: 'full', value: '"a"' }], remainingColumns: 0 }],
				},
				{
					action: 'update-rows',
					changes: { values: [{ column: 'full', value: '"b"' }], remainingColumns: 0 },
					filter: filterOn('full'),
				},
				{ action: 'delete-column', column: 'full' },
			]);
		});

		it('previews only the first rows of a large insert', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			const rows = Array.from({ length: 10 }, (_, i) => ({ name: `n${i}` }));
			const { suspend } = await runBatch(context, {
				changes: [{ action: 'insert-rows', table: 'T', rows }],
			});

			const [{ details }] = cardOf(suspend).approvalDetails.changes;
			if (details.action !== 'insert-rows') throw new Error('Expected an insert-rows change');
			expect(details.count).toBe(10);
			expect(details.rows.length).toBeLessThan(10);
		});

		it('runs without a card when every change is always allowed', async () => {
			const context = contextWithTables({ 'dt-B': [column('name')] }, { permissions: ALLOW_ALL });
			const { result, suspend } = await runBatch(context, {
				changes: [createA, insertIntoA, addColumnToB],
			});

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true });
		});

		it('shows the card for the whole batch when only one change needs approval', async () => {
			const context = contextWithTables(
				{ 'dt-B': [column('name')] },
				{ permissions: { createDataTable: 'always_allow' } },
			);
			const { suspend } = await runBatch(context, { changes: [createA, addColumnToB] });

			const actions = cardOf(suspend).approvalDetails.changes.map((c) => c.details.action);
			expect(actions).toEqual(['create-table', 'add-column']);
		});

		it('skips the card for changes to a table the thread owns', async () => {
			const context = contextWithTables(
				{ 'dt-1': [column('name')] },
				{ sessionApprovedToolKeys: new Set([buildOwnedDataTableGrantKey('dt-1')]) },
			);
			const { result, suspend } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'dt-1', column: 'x', type: 'string' },
					{ action: 'insert-rows', table: 'dt-1', rows: [{ x: 'a' }] },
				],
			});

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true });
		});

		it('shows a destructive card when the batch deletes an owned table', async () => {
			const context = contextWithTables(
				{},
				{ sessionApprovedToolKeys: new Set([buildOwnedDataTableGrantKey('dt-1')]) },
			);
			const { suspend } = await runBatch(context, {
				changes: [{ action: 'delete', table: 'dt-1' }],
			});

			expect(cardOf(suspend).severity).toBe('destructive');
		});

		it('treats a table created earlier in the batch as owned', async () => {
			const context = contextWithTables({}, { permissions: { createDataTable: 'always_allow' } });
			const { result, suspend } = await runBatch(context, { changes: [createA, insertIntoA] });

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true });
		});

		it('skips the card when session grants cover every action', async () => {
			const keys = ['create', 'insert-rows', 'add-column'].map(buildDataTablesSessionGrantKey);
			const context = contextWithTables(
				{ 'dt-B': [column('name')] },
				{ sessionApprovedToolKeys: new Set(keys) },
			);
			const { result, suspend } = await runBatch(context, {
				changes: [createA, insertIntoA, addColumnToB],
			});

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true });
		});

		it.each([
			{
				changes: [createA, { action: 'delete-rows', table: 'B', filter: filterOnName }],
				severity: 'destructive',
			},
			{ changes: [createA, addColumnToB], severity: 'warning' },
			{ changes: [createA], severity: 'info' },
		])('uses the highest severity of the batch ($severity)', async ({ changes, severity }) => {
			const context = contextWithTables({ 'dt-B': [column('name')] });
			const { suspend } = await runBatch(context, { changes });

			expect(cardOf(suspend).severity).toBe(severity);
		});

		it('names the table when the batch changes one table', async () => {
			const context = contextWithTables();
			const { suspend } = await runBatch(context, { changes: [createA, insertIntoA] });

			expect(cardOf(suspend).resourceName).toBe('A');
		});

		it('does not name a single table when the batch changes several tables', async () => {
			const context = contextWithTables({ 'dt-B': [column('name')] });
			const { suspend } = await runBatch(context, { changes: [createA, addColumnToB] });

			const { resourceName } = cardOf(suspend);
			expect(resourceName).toEqual(expect.any(String));
			expect(resourceName).not.toBe('A');
			expect(resourceName).not.toBe('B');
		});

		it('runs no change and grants nothing when the user denies the card', async () => {
			const context = contextWithTables({}, { grantSessionToolApproval: vi.fn() });
			const result = await resumeBatch(context, { changes: [createA, insertIntoA] }, false);

			expect(result).toMatchObject({ success: false, denied: true });
			expect(context.grantSessionToolApproval).not.toHaveBeenCalled();
			for (const method of WRITE_METHODS) {
				expect(context.dataTableService[method]).not.toHaveBeenCalled();
			}
		});

		it('grants each distinct action once when the user approves for the session', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = contextWithTables({ 'dt-B': [column('name')] }, { grantSessionToolApproval });
			const result = await resumeBatch(
				context,
				{ changes: [createA, insertIntoA, insertIntoA, addColumnToB] },
				true,
				'session',
			);

			expect(result).toMatchObject({ success: true });
			const granted = grantSessionToolApproval.mock.calls.map(([key]) => key);
			expect(granted.sort()).toEqual(
				[
					...['create', 'insert-rows', 'add-column'].map(buildDataTablesSessionGrantKey),
					buildOwnedDataTableGrantKey('dt-new'),
				].sort(),
			);
		});

		it('grants no action when the user approves only this batch', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = contextWithTables({}, { grantSessionToolApproval });
			const result = await resumeBatch(context, { changes: [createA, insertIntoA] }, true, 'once');

			expect(result).toMatchObject({ success: true });
			expect(grantSessionToolApproval.mock.calls).toEqual([
				[buildOwnedDataTableGrantKey('dt-new')],
			]);
		});

		it('grants no destructive action for the session', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = contextWithTables({ 'dt-T': [column('name')] }, { grantSessionToolApproval });
			await resumeBatch(
				context,
				{
					changes: [
						{ action: 'insert-rows', table: 'T', rows: [{ name: 'a' }] },
						{ action: 'delete-rows', table: 'T', filter: filterOnName },
					],
				},
				true,
				'session',
			);

			expect(grantSessionToolApproval.mock.calls).toEqual([
				[buildDataTablesSessionGrantKey('insert-rows')],
			]);
		});

		it('shows the card when a session grant covers only some actions', async () => {
			const context = contextWithTables(
				{ 'dt-B': [column('name')] },
				{ sessionApprovedToolKeys: new Set([buildDataTablesSessionGrantKey('insert-rows')]) },
			);
			const { suspend } = await runBatch(context, {
				changes: [{ action: 'insert-rows', table: 'B', rows: [{ name: 'a' }] }, addColumnToB],
			});

			expect(cardOf(suspend).approvalDetails.changes).toHaveLength(2);
		});

		it('shows the card for deleting a table even when the thread owns it', async () => {
			const context = contextWithTables(
				{},
				{ sessionApprovedToolKeys: new Set([buildOwnedDataTableGrantKey('dt-1')]) },
			);
			const { suspend } = await runBatch(context, {
				changes: [{ action: 'delete', table: 'dt-1' }],
			});

			expect(cardOf(suspend).approvalDetails.changes).toHaveLength(1);
		});

		it('returns a denial without checking the batch again', async () => {
			const context = contextWithTables({ 'dt-T': [column('name')] });
			context.dataTableService.resolveTableReference = vi
				.fn()
				.mockRejectedValue(new UserError('Data table "T" not found'));
			const result = await resumeBatch(
				context,
				{ changes: [{ action: 'insert-rows', table: 'T', rows: [{ name: 'a' }] }] },
				false,
			);

			expect(result).toMatchObject({ success: false, denied: true, changes: 1 });
			expect(context.dataTableService.resolveTableReference).not.toHaveBeenCalled();
			expect(context.dataTableService.getSchema).not.toHaveBeenCalled();
			for (const method of WRITE_METHODS) {
				expect(context.dataTableService[method]).not.toHaveBeenCalled();
			}
		});

		describe('tables that change before approval', () => {
			const insertIntoLeads = {
				changes: [{ action: 'insert-rows', table: 'Leads', rows: [{ name: 'a' }] }],
			};
			const leadsColumns = { 'dt-Leads': [column('name')], 'dt-Leads-2': [column('name')] };

			it('shows a new card and runs nothing when a table resolves to another ID', async () => {
				const context = contextWithTables(leadsColumns);
				const { result, suspend } = await approveAfterCard(context, insertIntoLeads, () => {
					context.dataTableService.resolveTableReference = vi.fn(async () => ({
						id: 'dt-Leads-2',
						name: 'Leads',
						projectId: 'proj-1',
					}));
				});

				expect(cardOf(suspend).approvalDetails.changes).toHaveLength(1);
				expect(result).not.toMatchObject({ success: true });
				for (const method of WRITE_METHODS) {
					expect(context.dataTableService[method]).not.toHaveBeenCalled();
				}
			});

			it('runs the batch when every table still resolves to the ID the card showed', async () => {
				const context = contextWithTables(leadsColumns);
				const { result, suspend } = await approveAfterCard(context, insertIntoLeads);

				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({ success: true });
				expect(context.dataTableService.insertRows).toHaveBeenCalledTimes(1);
			});

			it('runs an approved batch whose card stored no tables', async () => {
				const context = contextWithTables(leadsColumns);
				const result = await resumeBatch(context, insertIntoLeads, true, 'once');

				expect(result).toMatchObject({ success: true });
				expect(context.dataTableService.insertRows).toHaveBeenCalledTimes(1);
			});

			it('stores no table for a batch that only creates tables', async () => {
				const context = contextWithTables();
				const { result, suspend, continuation } = await approveAfterCard(context, {
					changes: [createA, { action: 'insert-rows', table: 'A', rows: [{ email: 'x' }] }],
				});

				expect(continuation).toEqual({ tables: [] });
				expect(suspend).not.toHaveBeenCalled();
				expect(result).toMatchObject({ success: true });
				expect(context.dataTableService.create).toHaveBeenCalledTimes(1);
			});
		});

		it('validates the batch again on resume and runs nothing when it fails', async () => {
			const context = contextWithTables({}, { grantSessionToolApproval: vi.fn() });
			const result = await resumeBatch(context, { changes: [createA, createA] }, true, 'session');

			expect(result).toMatchObject({ success: false, changeIndex: 1 });
			expect(context.grantSessionToolApproval).not.toHaveBeenCalled();
		});
	});

	it('accepts creating a table again after the batch deletes it', async () => {
		const context = contextWithTables({}, { permissions: ALLOW_ALL });
		const { result } = await runBatch(context, {
			changes: [createA, { action: 'delete', table: 'A' }, createA],
		});

		expect(result).toMatchObject({ success: true });
	});

	describe('running the batch', () => {
		const filterOnName = {
			type: 'and',
			filters: [{ columnName: 'name', condition: 'eq', value: 'x' }],
		} as const;
		const insertIntoA = { action: 'insert-rows', table: 'A', rows: [{ email: 'a@b.c' }] };

		function allowAll(
			columnsByTableId: Record<string, DataTableColumnInfo[]> = {},
			overrides: Parameters<typeof createMockContext>[0] = {},
		) {
			return contextWithTables(columnsByTableId, { permissions: ALLOW_ALL, ...overrides });
		}

		/** A conflict error as the CLI throws it, wrapped like the service wraps it. */
		function nameConflictError() {
			const conflict = new Error('conflict');
			Object.defineProperty(conflict, 'constructor', {
				value: { name: 'DataTableNameConflictError' },
			});
			return new Error('wrapped', { cause: conflict });
		}

		it('runs the changes in the given order', async () => {
			const context = allowAll({ 'dt-T': [column('name')] });
			const { result } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'add-column', table: 'T', column: 'x', type: 'string' },
					insertIntoA,
					{ action: 'delete-rows', table: 'T', filter: filterOnName },
				],
			});

			const service = vi.mocked(context.dataTableService);
			const order = [service.create, service.addColumn, service.insertRows, service.deleteRows].map(
				(method) => method.mock.invocationCallOrder[0],
			);
			expect(order).toEqual([...order].sort((a, b) => a - b));
			expect(result).toMatchObject({
				success: true,
				applied: [
					{ index: 0, action: 'create' },
					{ index: 1, action: 'add-column', result: { column: 'x' } },
					{ index: 2, action: 'insert-rows' },
					{ index: 3, action: 'delete-rows' },
				],
				skipped: [],
			});
		});

		it('inserts rows into a table created earlier in the batch', async () => {
			const context = allowAll();
			const { result } = await runBatch(context, {
				projectId: 'proj-1',
				changes: [createA, insertIntoA],
			});

			expect(context.dataTableService.create).toHaveBeenCalledWith('A', createA.columns, {
				projectId: 'proj-1',
			});
			expect(context.dataTableService.insertRows).toHaveBeenCalledWith('dt-new', insertIntoA.rows, {
				projectId: 'proj-1',
			});
			expect(result).toMatchObject({
				applied: [
					{
						index: 0,
						table: { id: 'dt-new', name: 'A', projectId: 'proj-1' },
						result: { columns: [{ name: 'email', type: 'string' }] },
					},
					{ index: 1, table: { id: 'dt-new', name: 'A' } },
				],
			});
		});

		it('uses the column ID of an existing column', async () => {
			const context = allowAll({ 'dt-T': [{ ...column('status'), id: 'c-7' }] });
			await runBatch(context, {
				changes: [{ action: 'delete-column', table: 'T', column: 'status' }],
			});

			expect(context.dataTableService.deleteColumn).toHaveBeenCalledWith('dt-T', 'c-7', {
				projectId: 'proj-1',
			});
		});

		it('uses the column ID from the result of an earlier add-column', async () => {
			const context = allowAll({ 'dt-T': [column('name')] });
			vi.mocked(context.dataTableService.addColumn).mockResolvedValue({
				...column('X'),
				id: 'c-x',
			});
			await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'T', column: 'X', newName: 'Y' },
					{ action: 'rename-column', table: 'T', column: 'Y', newName: 'Z' },
				],
			});

			const renames = vi.mocked(context.dataTableService.renameColumn).mock.calls;
			expect(renames).toEqual([
				['dt-T', 'c-x', 'Y', { projectId: 'proj-1' }],
				['dt-T', 'c-x', 'Z', { projectId: 'proj-1' }],
			]);
		});

		it('uses the column ID from the result of an earlier create', async () => {
			const context = allowAll();
			await runBatch(context, {
				changes: [createA, { action: 'delete-column', table: 'A', column: 'email' }],
			});

			expect(context.dataTableService.deleteColumn).toHaveBeenCalledWith('dt-new', 'col-email', {
				projectId: 'proj-1',
			});
		});

		it('reads the schema when a result does not name the column', async () => {
			const context = allowAll();
			vi.mocked(context.dataTableService.create).mockResolvedValue({
				...createdTable('A', []),
			});
			vi.mocked(context.dataTableService.getSchema).mockResolvedValue([
				{ ...column('email'), id: 'c-9' },
			]);
			await runBatch(context, {
				changes: [createA, { action: 'rename-column', table: 'A', column: 'email', newName: 'e' }],
			});

			expect(context.dataTableService.getSchema).toHaveBeenCalledWith('dt-new', {
				projectId: 'proj-1',
			});
			expect(context.dataTableService.renameColumn).toHaveBeenCalledWith('dt-new', 'c-9', 'e', {
				projectId: 'proj-1',
			});
		});

		it('stops at the first failure and lists the changes it skipped', async () => {
			const context = allowAll({ 'dt-T': [column('name')] });
			vi.mocked(context.dataTableService.addColumn).mockRejectedValue(new Error('boom'));
			const { result } = await runBatch(context, {
				changes: [
					createA,
					{ action: 'add-column', table: 'T', column: 'x', type: 'string' },
					{ action: 'delete-rows', table: 'T', filter: filterOnName },
				],
			});

			expect(result).toEqual({
				success: false,
				applied: [expect.objectContaining({ index: 0, action: 'create' })],
				failed: { index: 1, action: 'add-column', error: 'boom' },
				skipped: [2],
			});
			expect(context.dataTableService.deleteRows).not.toHaveBeenCalled();
		});

		it('reports each changed table once, also after a failure', async () => {
			const onArtifactChanged = vi.fn();
			const context = allowAll(
				{ 'dt-T': [column('name')], 'dt-B': [column('name')] },
				{ onArtifactChanged },
			);
			vi.mocked(context.dataTableService.deleteRows).mockRejectedValue(new Error('boom'));
			await runBatch(context, {
				changes: [
					createA,
					insertIntoA,
					{ action: 'add-column', table: 'T', column: 'x', type: 'string' },
					{ action: 'update-rows', table: 'T', filter: filterOnName, data: { name: 'y' } },
					{ action: 'delete-rows', table: 'B', filter: filterOnName },
				],
			});

			const reported = onArtifactChanged.mock.calls.map(([artifact]) => artifact);
			expect(reported).toEqual([
				{ type: 'data-table', id: 'dt-new', name: 'A', projectId: 'proj-1' },
				{ type: 'data-table', id: 'dt-T', name: 'T', projectId: 'proj-1' },
			]);
		});

		it('does not report a table that the batch deletes', async () => {
			const onArtifactChanged = vi.fn();
			const context = allowAll({}, { onArtifactChanged });
			await runBatch(context, {
				changes: [createA, insertIntoA, { action: 'delete', table: 'A' }],
			});

			expect(onArtifactChanged).not.toHaveBeenCalled();
		});

		it('keeps the result when reporting a table fails', async () => {
			const onArtifactChanged = vi.fn().mockRejectedValue(new Error('report failed'));
			const context = allowAll({}, { onArtifactChanged });
			const { result } = await runBatch(context, { changes: [createA] });

			expect(result).toMatchObject({ success: true, applied: [{ index: 0 }] });
		});

		it('records a created table as owned when no card is shown', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = allowAll({}, { grantSessionToolApproval });
			await runBatch(context, { changes: [createA] });

			expect(grantSessionToolApproval).toHaveBeenCalledWith(buildOwnedDataTableGrantKey('dt-new'));
		});

		it('records a created table as owned after an approved card', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = contextWithTables({}, { grantSessionToolApproval });
			await resumeBatch(context, { changes: [createA] }, true, 'once');

			expect(grantSessionToolApproval).toHaveBeenCalledWith(buildOwnedDataTableGrantKey('dt-new'));
		});

		it('returns a hint and skips the rest when the table name is taken', async () => {
			const context = allowAll();
			vi.mocked(context.dataTableService.create).mockRejectedValue(nameConflictError());
			const { result } = await runBatch(context, { changes: [createA, insertIntoA] });

			expect(result).toMatchObject({
				success: false,
				applied: [],
				failed: { index: 0, action: 'create', error: expect.any(String) },
				skipped: [1],
			});
			expect(result).not.toMatchObject({ failed: { error: 'wrapped' } });
			expect(context.dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('runs the batch on an approved resume without a second card', async () => {
			const context = contextWithTables();
			const suspend = vi.fn();
			const ctx = { resumeData: { approved: true }, suspend };
			const tool = createChangeDataTablesTool(context);
			const result = await executeTool(tool, { changes: [createA, insertIntoA] }, ctx);

			expect(suspend).not.toHaveBeenCalled();
			expect(result).toMatchObject({ success: true, applied: [{ index: 0 }, { index: 1 }] });
			expect(context.dataTableService.insertRows).toHaveBeenCalledWith(
				'dt-new',
				insertIntoA.rows,
				expect.anything(),
			);
		});

		it('keeps a create applied when recording it as owned fails', async () => {
			const grantSessionToolApproval = vi.fn().mockRejectedValue(new Error('grant failed'));
			const context = allowAll({}, { grantSessionToolApproval });
			const { result } = await runBatch(context, { changes: [createA, insertIntoA] });

			expect(result).toMatchObject({ success: true, applied: [{ index: 0 }, { index: 1 }] });
		});

		it('does not report an existing table that the batch deletes', async () => {
			const onArtifactChanged = vi.fn();
			const context = allowAll({}, { onArtifactChanged });
			const { result } = await runBatch(context, { changes: [{ action: 'delete', table: 'T' }] });

			expect(result).toMatchObject({
				success: true,
				applied: [{ index: 0, action: 'delete', table: { id: 'dt-T' }, result: {} }],
			});
			expect(context.dataTableService.delete).toHaveBeenCalledWith('dt-T', {
				projectId: 'proj-1',
			});
			expect(onArtifactChanged).not.toHaveBeenCalled();
		});

		it('reports a column that is gone at run time without logging it as a bug', async () => {
			const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
			const context = allowAll({ 'dt-T': [column('name')] }, { logger });
			const { result } = await runBatch(context, {
				changes: [
					{ action: 'add-column', table: 'T', column: 'X', type: 'string' },
					{ action: 'rename-column', table: 'T', column: 'X', newName: 'Y' },
				],
			});

			expect(result).toMatchObject({ success: false, failed: { index: 1 } });
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('logs a failure that is a bug, not a service refusal', async () => {
			const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
			const context = allowAll({}, { logger });
			vi.mocked(context.dataTableService.insertRows).mockRejectedValue(new UnexpectedError('bug'));
			const { result } = await runBatch(context, { changes: [createA, insertIntoA] });

			expect(result).toMatchObject({ success: false, failed: { index: 1 } });
			expect(logger.error).toHaveBeenCalledTimes(1);
		});
	});

	describe('stored calls of the former write tools', () => {
		const filter = {
			type: 'and',
			filters: [{ columnName: 'name', condition: 'eq', value: 'x' }],
		} as const;
		const rows = [{ name: 'Ann' }];

		/** Each former tool's stored input (no `action`) and the service call it must make. */
		const storedCalls = {
			create: {
				input: { name: 'A', projectId: 'proj-1', columns: [{ name: 'email', type: 'string' }] },
				method: 'create',
				args: ['A', [{ name: 'email', type: 'string' }], { projectId: 'proj-1' }],
			},
			delete: {
				input: { dataTableId: 'dt-T', dataTableName: 'T' },
				method: 'delete',
				args: ['dt-T', { projectId: 'proj-1' }],
			},
			'add-column': {
				input: { dataTableId: 'dt-T', dataTableName: 'T', columnName: 'age', type: 'number' },
				method: 'addColumn',
				args: ['dt-T', { name: 'age', type: 'number' }, { projectId: 'proj-1' }],
			},
			'delete-column': {
				input: { dataTableId: 'dt-T', columnId: 'c-7', currentColumnName: 'status' },
				method: 'deleteColumn',
				args: ['dt-T', 'c-7', { projectId: 'proj-1' }],
			},
			'rename-column': {
				input: { dataTableId: 'dt-T', columnId: 'c-7', newName: 'state' },
				method: 'renameColumn',
				args: ['dt-T', 'c-7', 'state', { projectId: 'proj-1' }],
			},
			'insert-rows': {
				input: { dataTableId: 'dt-T', projectId: 'proj-1', rows },
				method: 'insertRows',
				args: ['dt-T', rows, { projectId: 'proj-1' }],
			},
			'update-rows': {
				input: { dataTableId: 'dt-T', filter, data: { name: 'Bo' } },
				method: 'updateRows',
				args: ['dt-T', filter, { name: 'Bo' }, { projectId: 'proj-1' }],
			},
			'delete-rows': {
				input: { dataTableId: 'dt-T', filter },
				method: 'deleteRows',
				args: ['dt-T', filter, { projectId: 'proj-1' }],
			},
		} as const;
		const storedCallCases = DATA_TABLE_WRITE_TOOL_ACTIONS.map((action) => ({
			action,
			...storedCalls[action],
		}));

		function tableContext() {
			return contextWithTables(
				{ 'dt-T': [column('name'), { ...column('status', 1), id: 'c-7' }] },
				{ grantSessionToolApproval: vi.fn() },
			);
		}

		/**
		 * Resume a stored call as the runtime does: convert the input of the former
		 * name, validate it against the input schema, then run the handler.
		 */
		async function resumeStoredCall(
			context: InstanceAiContext,
			formerName: string,
			input: unknown,
			approved: boolean,
			scope?: 'once' | 'session',
		) {
			const tool = createChangeDataTablesTool(context);
			const convert = tool.legacyResumeOnly?.convert;
			if (!convert) throw new Error('Expected the tool to convert stored calls');
			const parsed = parseToolInput(tool, convert(formerName, input as JSONValue));
			if (!parsed.success) return { success: false, error: parsed.error.message };
			return await executeTool(tool, parsed.data, resumeCtx(approved, scope));
		}

		function expectNoWrites(context: InstanceAiContext) {
			for (const method of WRITE_METHODS) {
				expect(context.dataTableService[method]).not.toHaveBeenCalled();
			}
		}

		it.each(storedCallCases)(
			'runs an approved stored $action call with its stored arguments',
			async ({ action, input, method, args }) => {
				const context = tableContext();
				const formerName = DATA_TABLE_TOOL_NAME_BY_ACTION[action];
				const result = await resumeStoredCall(context, formerName, input, true);

				expect(result).toMatchObject({ success: true });
				expect(context.dataTableService[method]).toHaveBeenCalledWith(...args);
				for (const other of WRITE_METHODS.filter((m) => m !== method)) {
					expect(context.dataTableService[other]).not.toHaveBeenCalled();
				}
			},
		);

		it.each(storedCallCases)(
			'runs no change when the user denies a stored $action call',
			async ({ action, input }) => {
				const context = tableContext();
				const formerName = DATA_TABLE_TOOL_NAME_BY_ACTION[action];
				const result = await resumeStoredCall(context, formerName, input, false);

				expect(result).toMatchObject({ success: false, denied: true });
				expectNoWrites(context);
			},
		);

		it.each(
			storedCallCases.flatMap((call) =>
				['data_tables', 'data-tables'].map((formerName) => ({ ...call, formerName })),
			),
		)(
			'runs a stored $action call of the former multi-action tool $formerName',
			async ({ action, formerName, input, method, args }) => {
				const context = tableContext();
				const result = await resumeStoredCall(context, formerName, { action, ...input }, true);

				expect(result).toMatchObject({ success: true });
				expect(context.dataTableService[method]).toHaveBeenCalledWith(...args);
			},
		);

		it('runs a stored call whose input has a key the former tool ignored', async () => {
			const context = tableContext();
			const result = await resumeStoredCall(
				context,
				DATA_TABLE_TOOL_NAME_BY_ACTION['insert-rows'],
				{ ...storedCalls['insert-rows'].input, note: 'extra' },
				true,
			);

			expect(result).toMatchObject({ success: true });
			expect(context.dataTableService.insertRows).toHaveBeenCalledWith(
				...storedCalls['insert-rows'].args,
			);
		});

		it.each([
			{
				name: 'a stored input that misses a field of its tool',
				formerName: DATA_TABLE_TOOL_NAME_BY_ACTION['rename-column'],
				input: { dataTableId: 'dt-T', columnId: 'c-7' },
			},
			{
				name: 'a stored input of another shape',
				formerName: DATA_TABLE_TOOL_NAME_BY_ACTION['add-column'],
				input: { foo: 'bar' },
			},
			{
				name: 'a multi-action call whose fields belong to another action',
				formerName: 'data_tables',
				input: { action: 'add-column', dataTableId: 'dt-T' },
			},
			{
				name: 'a multi-action call of a read action',
				formerName: 'data_tables',
				input: { action: 'query', dataTableId: 'dt-T' },
			},
			{
				name: 'a multi-action call without an action',
				formerName: 'data-tables',
				input: { dataTableId: 'dt-T' },
			},
			{
				name: 'a call under a name that no former write tool had',
				formerName: 'query_data_table',
				input: { dataTableId: 'dt-T' },
			},
		])('returns an error and runs nothing for $name', async ({ formerName, input }) => {
			const context = tableContext();
			const result = await resumeStoredCall(context, formerName, input, true);

			expect(result).toMatchObject({ success: false });
			expectNoWrites(context);
		});

		it('rejects an old input shape in a new call of the batch tool', async () => {
			const context = tableContext();
			const tool = createChangeDataTablesTool(context);

			for (const { input } of storedCallCases) {
				expect(parseToolInput(tool, input).success).toBe(false);
				expect(parseToolInput(tool, { action: 'delete', ...input }).success).toBe(false);
			}
			expectNoWrites(context);
		});

		it('passes a stored project ID to the change', async () => {
			const context = tableContext();
			const result = await resumeStoredCall(
				context,
				DATA_TABLE_TOOL_NAME_BY_ACTION.create,
				{ name: 'A', projectId: 'proj-stored', columns: [{ name: 'email', type: 'string' }] },
				true,
			);

			expect(result).toMatchObject({ success: true });
			expect(context.dataTableService.create).toHaveBeenCalledWith(
				'A',
				[{ name: 'email', type: 'string' }],
				{ projectId: 'proj-stored' },
			);
		});

		it('passes a stored project ID to the table lookup', async () => {
			const context = tableContext();
			await resumeStoredCall(
				context,
				DATA_TABLE_TOOL_NAME_BY_ACTION['insert-rows'],
				{ dataTableId: 'T', projectId: 'proj-stored', rows },
				true,
			);

			expect(context.dataTableService.resolveTableReference).toHaveBeenCalledWith(
				'T',
				expect.objectContaining({ projectId: 'proj-stored' }),
			);
		});

		it('grants a non-destructive action for the session on a stored call', async () => {
			const context = tableContext();
			await resumeStoredCall(
				context,
				DATA_TABLE_TOOL_NAME_BY_ACTION['insert-rows'],
				storedCalls['insert-rows'].input,
				true,
				'session',
			);

			expect(context.grantSessionToolApproval).toHaveBeenCalledWith(
				buildDataTablesSessionGrantKey('insert-rows'),
			);
		});

		it('grants nothing for the session on a stored destructive call', async () => {
			const context = tableContext();
			await resumeStoredCall(
				context,
				DATA_TABLE_TOOL_NAME_BY_ACTION.delete,
				storedCalls.delete.input,
				true,
				'session',
			);

			expect(context.grantSessionToolApproval).not.toHaveBeenCalled();
		});

		it('claims the former write tool names and their actions of the former multi-action tool', () => {
			const tool = createChangeDataTablesTool(createMockContext());

			expect([...(tool.legacyNames ?? [])].sort()).toEqual([...DATA_TABLE_WRITE_TOOL_NAMES].sort());
			for (const formerName of ['data_tables', 'data-tables']) {
				expect([...(tool.legacyActions?.[formerName] ?? [])].sort()).toEqual(
					[...DATA_TABLE_WRITE_TOOL_ACTIONS].sort(),
				);
			}
		});

		it('leaves the read actions of the former multi-action tool to the read tools', () => {
			const batch = createChangeDataTablesTool(createMockContext());
			for (const action of DATA_TABLE_READ_TOOL_ACTIONS) {
				const read = dataTableToolFor(createMockContext(), action);
				expect(read.name).toBe(DATA_TABLE_TOOL_NAME_BY_ACTION[action]);
				expect(batch.legacyNames).not.toContain(read.name);
				for (const formerName of ['data_tables', 'data-tables']) {
					expect(read.legacyActions?.[formerName]).toEqual([action]);
					expect(batch.legacyActions?.[formerName]).not.toContain(action);
				}
			}
		});
	});
});
