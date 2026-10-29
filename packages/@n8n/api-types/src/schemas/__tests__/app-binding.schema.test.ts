import {
	appBindingsSchema,
	appRuntimeDeleteRowsSchema,
	appRuntimeInsertRowsSchema,
	MAX_APP_BINDINGS,
} from '../app-binding.schema';

const table = { key: 'tasks', kind: 'dataTable', dataTableId: 't1', permissions: ['read'] };

describe('appBindingsSchema', () => {
	it('accepts one binding of each kind', () => {
		const result = appBindingsSchema.safeParse([
			table,
			{ key: 'submitLead', kind: 'workflow', workflowId: 'w1' },
			{ key: 'support', kind: 'agent', agentId: 'a1', permissions: ['chat', 'history'] },
		]);
		expect(result.success).toBe(true);
	});

	it.each(['Tasks', 'my-table', '1table', 'a'.repeat(65)])(
		'rejects the key %s, which is not a short JS identifier',
		(key) => {
			expect(appBindingsSchema.safeParse([{ ...table, key }]).success).toBe(false);
		},
	);

	it('rejects duplicate keys across kinds', () => {
		const result = appBindingsSchema.safeParse([
			table,
			{ key: 'tasks', kind: 'workflow', workflowId: 'w1' },
		]);
		expect(result.success).toBe(false);
	});

	it('rejects unknown, empty, and duplicate permissions', () => {
		for (const permissions of [['write'], [], ['read', 'read']]) {
			expect(appBindingsSchema.safeParse([{ ...table, permissions }]).success).toBe(false);
		}
	});

	it('rejects agent permissions on a data table', () => {
		expect(appBindingsSchema.safeParse([{ ...table, permissions: ['chat'] }]).success).toBe(false);
	});

	it('limits the number of bindings', () => {
		const bindings = Array.from({ length: MAX_APP_BINDINGS + 1 }, (_, index) => ({
			...table,
			key: `t${index}`,
		}));
		expect(appBindingsSchema.safeParse(bindings).success).toBe(false);
	});
});

describe('app runtime row schemas', () => {
	it('limits an insert to 100 rows', () => {
		const rows = (count: number) => Array.from({ length: count }, () => ({ title: 'x' }));
		expect(appRuntimeInsertRowsSchema.safeParse({ data: rows(100) }).success).toBe(true);
		expect(appRuntimeInsertRowsSchema.safeParse({ data: rows(101) }).success).toBe(false);
	});

	it('rejects nested values in a row', () => {
		expect(appRuntimeInsertRowsSchema.safeParse({ data: [{ title: { a: 1 } }] }).success).toBe(
			false,
		);
	});

	it('rejects a delete without conditions', () => {
		expect(appRuntimeDeleteRowsSchema.safeParse({ filter: { filters: [] } }).success).toBe(false);
		expect(
			appRuntimeDeleteRowsSchema.safeParse({
				filter: { filters: [{ columnName: 'done', value: true }] },
			}).success,
		).toBe(true);
	});
});
