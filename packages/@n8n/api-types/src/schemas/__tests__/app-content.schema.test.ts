import { appBlockSchema, appContentSchema, appLayoutSchema } from '../app-content.schema';

const header = { id: 'h1', type: 'header', data: { text: 'Hello', level: 1 } };

describe('appBlockSchema', () => {
	test.each([
		header,
		{ id: 'p1', type: 'paragraph', data: { text: 'Hi {{ params.id }}' } },
		{ id: 'l1', type: 'list', data: { style: 'ordered', items: ['a', 'b'] } },
		{ id: 'i1', type: 'image', data: { url: 'https://example.com/a.png', alt: 'a' } },
		{ id: 'd1', type: 'divider', data: {} },
		{
			id: 't1',
			type: 'table',
			data: {
				source: { dataTableId: 'dt1' },
				columns: ['name'],
				filter: {
					type: 'and',
					filters: [{ columnName: 'owner', condition: 'eq', value: '{{ params.id }}' }],
				},
				sortBy: ['name', 'ASC'],
			},
		},
		{
			id: 't2',
			type: 'table',
			data: { source: { dataTableId: 'dt1' }, editable: true, deletable: true },
		},
		{ id: 'f1', type: 'form', data: { workflowId: 'wf1', submitLabel: 'Send' } },
		{
			id: 'b1',
			type: 'button',
			data: {
				label: 'Run',
				target: { kind: 'workflow', workflowId: 'wf1', input: { id: '{{ params.id }}' } },
			},
		},
		{
			id: 'b2',
			type: 'button',
			data: { label: 'Delete', target: { kind: 'action', blockId: 'c1', action: 'deleteRow' } },
		},
		{ id: 'html1', type: 'html', data: { template: '<p>{{ params.id }}</p>' } },
		{
			id: 'c1',
			type: 'code',
			data: { source: 'export function render() { return "<p>hi</p>"; }' },
		},
	])('accepts a valid $type block', (block) => {
		expect(appBlockSchema.safeParse(block).success).toBe(true);
	});

	test('applies defaults', () => {
		const table = appBlockSchema.parse({
			id: 't',
			type: 'table',
			data: { source: { dataTableId: 'dt' } },
		});
		const button = appBlockSchema.parse({
			id: 'b',
			type: 'button',
			data: { label: 'Go', target: { kind: 'workflow', workflowId: 'wf' } },
		});

		expect(table.type === 'table' && table.data.limit).toBe(50);
		expect(table.type === 'table' && table.data.editable).toBeUndefined();
		expect(table.type === 'table' && table.data.deletable).toBeUndefined();
		expect(button.type === 'button' && button.data.style).toBe('primary');
	});

	test.each([
		[{ id: 'x', type: 'unknown', data: {} }, 'unknown type'],
		[{ id: 'h', type: 'header', data: { text: 'x', level: 7 } }, 'header level out of range'],
		[{ id: 'i', type: 'image', data: { url: 'http://example.com/a.png' } }, 'plain http image'],
		[{ id: 'i', type: 'image', data: { url: 'javascript:alert(1)' } }, 'javascript image url'],
		[
			{
				id: 'b',
				type: 'button',
				data: { label: 'x', target: { kind: 'action', blockId: 'c', action: '1bad' } },
			},
			'bad action name',
		],
		[{ id: 'bad id!', type: 'divider', data: {} }, 'bad block id'],
		[
			{ id: 't', type: 'table', data: { source: { dataTableId: 'dt' }, limit: 201 } },
			'table limit over max',
		],
		[
			{ id: 't', type: 'table', data: { source: { dataTableId: 'dt' }, editable: 'yes' } },
			'table editable not a boolean',
		],
		[{ type: 'divider', data: {} }, 'missing id'],
	])('rejects %j (%s)', (block, _reason) => {
		expect(appBlockSchema.safeParse(block).success).toBe(false);
	});

	test('accepts a localhost http image for local development', () => {
		expect(
			appBlockSchema.safeParse({
				id: 'i',
				type: 'image',
				data: { url: 'http://localhost:5678/a.png' },
			}).success,
		).toBe(true);
	});
});

describe('appContentSchema', () => {
	test('accepts an empty page', () => {
		expect(appContentSchema.safeParse([]).success).toBe(true);
	});

	test('rejects duplicate block ids', () => {
		const result = appContentSchema.safeParse([
			header,
			{ ...header, data: { text: 'Again', level: 2 } },
		]);

		expect(result.success).toBe(false);
	});

	test('rejects more than 200 blocks', () => {
		const blocks = Array.from({ length: 201 }, (_, i) => ({ ...header, id: `h${i}` }));

		expect(appContentSchema.safeParse(blocks).success).toBe(false);
	});
});

describe('appLayoutSchema', () => {
	const slot = { id: 's1', type: 'slot', data: {} };

	test('accepts blocks around exactly one slot', () => {
		expect(
			appLayoutSchema.safeParse([header, slot, { id: 'd1', type: 'divider', data: {} }]).success,
		).toBe(true);
	});

	test('rejects a layout without a slot', () => {
		expect(appLayoutSchema.safeParse([header]).success).toBe(false);
	});

	test('rejects a layout with two slots', () => {
		expect(appLayoutSchema.safeParse([slot, { ...slot, id: 's2' }]).success).toBe(false);
	});

	test('rejects duplicate block ids', () => {
		expect(appLayoutSchema.safeParse([slot, { ...header, id: 's1' }]).success).toBe(false);
	});

	test('a slot block is not allowed in page content', () => {
		expect(appContentSchema.safeParse([slot]).success).toBe(false);
	});
});
