import type {
	IDataTableProjectService,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';

import { generateNodeModule } from '../entry/codegen';
import { lintContract, toContract } from '../entry/registry';
import { defineNode, t, type DataTableFilter, type DataTableRow } from '../index';
import {
	codeRunnerOf,
	dataTablesOf,
	setCodeLanguages,
	tableIdByName,
	type DataTableHost,
} from '../host-imports';
import { executorOf, toNodeType, type ExecutorHost } from '../runtime';
import { contractHash, diffContracts, requiredNodeContractOf } from '../version';

const demo = defineNode({ id: 'demo', displayName: 'Demo' });

const node: INode = {
	id: '1',
	name: 'Demo',
	type: 'demo',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const hostOf = (overrides: Partial<ExecutorHost> = {}): ExecutorHost => ({
	items: [{ json: {} }],
	node,
	parameter: () => undefined,
	request: async () => await Promise.reject(new Error('no HTTP in this test')),
	continueOnFail: () => false,
	...overrides,
});

const created = new Date('2026-01-02T03:04:05.000Z');

/** A table service that records its calls and stores rows in memory. */
function tableService() {
	const calls: Array<{ method: string; args: unknown }> = [];
	const rows: Array<Record<string, unknown>> = [];
	const service: Partial<IDataTableProjectService> = {
		getColumns: async () => {
			calls.push({ method: 'getColumns', args: undefined });
			return [
				{ id: 'c1', name: 'email', type: 'string', index: 0, dataTableId: 't1' },
				{ id: 'c2', name: 'seen', type: 'date', index: 1, dataTableId: 't1' },
				{ id: 'c3', name: 'score', type: 'number', index: 2, dataTableId: 't1' },
			];
		},
		getManyRowsAndCount: async (args) => {
			calls.push({ method: 'getManyRowsAndCount', args });
			return {
				count: rows.length,
				data: rows.map((row) => ({ ...row, id: 1, createdAt: created, updatedAt: created })),
			};
		},
		insertRows: (async (input: Array<Record<string, unknown>>) => {
			calls.push({ method: 'insertRows', args: input });
			const stored = input.map((row, index) => ({
				...row,
				id: index + 1,
				createdAt: created,
				updatedAt: created,
			}));
			rows.push(...stored);
			return stored;
		}) as IDataTableProjectService['insertRows'],
	};
	return { calls, rows, service: service as IDataTableProjectService };
}

const stored = {
	id: 't1',
	name: 'Leads',
	projectId: 'p1',
	createdAt: created,
	updatedAt: created,
	columns: [
		{ id: 'c2', name: 'plan', type: 'string' as const, index: 1, dataTableId: 't1' },
		{ id: 'c1', name: 'email', type: 'string' as const, index: 0, dataTableId: 't1' },
	],
};

const dataTableHost = (service: IDataTableProjectService, names = { leads: 't1' }) => {
	const opened: string[] = [];
	const listed: unknown[] = [];
	const host: DataTableHost = {
		idOf: async (name) => (names as Record<string, string>)[name],
		open: async (id) => {
			opened.push(id);
			return service;
		},
		list: async (options) => {
			listed.push(options);
			return { count: 1, data: [stored] };
		},
		create: async (options) => {
			listed.push(options);
			return { ...stored, name: options.name };
		},
	};
	return { host, opened, listed };
};

describe('dataTables', () => {
	it('opens a table by name and converts dates both ways', async () => {
		const { calls, service } = tableService();
		const { host, opened } = dataTableHost(service);
		const table = await dataTablesOf(host).open({ name: 'leads' });
		const inserted = await table.insert([{ email: 'a@b.c', seen: '2026-05-01T00:00:00.000Z' }]);
		const { rows } = await table.rows({
			limit: 10,
			filter: {
				match: 'all',
				conditions: [
					{ column: 'seen', op: 'gt', value: '2026-01-01T00:00:00.000Z' },
					{ column: 'score', op: 'isEmpty' },
					{ column: 'email', op: 'isNotEmpty' },
				],
			},
			sort: { column: 'email', direction: 'asc' },
		});

		expect(opened).toEqual(['t1']);
		expect(calls.filter(({ method }) => method === 'getColumns')).toHaveLength(1);
		expect(calls.find(({ method }) => method === 'insertRows')?.args).toEqual([
			{ email: 'a@b.c', seen: new Date('2026-05-01T00:00:00.000Z') },
		]);
		expect(calls.find(({ method }) => method === 'getManyRowsAndCount')?.args).toEqual({
			skip: 0,
			take: 10,
			sortBy: ['email', 'ASC'],
			filter: {
				type: 'and',
				filters: [
					{ columnName: 'seen', condition: 'gt', value: new Date('2026-01-01T00:00:00.000Z') },
					{ columnName: 'score', condition: 'eq', value: null },
					{ columnName: 'email', condition: 'isNotEmpty', value: null },
				],
			},
		});
		const expected: DataTableRow = {
			id: 1,
			email: 'a@b.c',
			seen: '2026-05-01T00:00:00.000Z',
			createdAt: created.toISOString(),
			updatedAt: created.toISOString(),
		};
		expect(inserted).toEqual([expected]);
		expect(rows).toEqual([expected]);
	});

	it('lists and creates tables with their columns in order', async () => {
		const { host, listed } = dataTableHost(tableService().service);
		const tables = dataTablesOf(host);
		const page = await tables.list({
			name: 'LEADS',
			sort: { by: 'createdAt', direction: 'desc' },
			limit: 5,
		});
		const made = await tables.create({
			name: 'Signups',
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'plan', type: 'string' },
			],
		});
		const info = {
			id: 't1',
			name: 'Leads',
			columns: [
				{ name: 'email', type: 'string' },
				{ name: 'plan', type: 'string' },
			],
			createdAt: created.toISOString(),
			updatedAt: created.toISOString(),
		};
		expect(page).toEqual({ count: 1, tables: [info] });
		expect(made).toEqual({ ...info, name: 'Signups' });
		expect(listed).toEqual([
			{ filter: { name: 'leads' }, sortBy: 'createdAt:desc', skip: 0, take: 5 },
			{
				name: 'Signups',
				columns: [
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'plan', type: 'string', index: 1 },
				],
			},
		]);
	});

	it('refuses an unknown table and an unknown column', async () => {
		const { service } = tableService();
		const { host } = dataTableHost(service);
		await expect(dataTablesOf(host).open({ name: 'missing' })).rejects.toThrow(
			'Data table with name "missing" not found',
		);
		const table = await dataTablesOf(host).open({ id: 't1' });
		await expect(
			table.rows({
				limit: 1,
				filter: { match: 'any', conditions: [{ column: 'nope', op: 'eq', value: 1 }] },
			}),
		).rejects.toThrow('The data table has no column "nope"');
	});

	it('finds a table by its full name, though the store matches part of a name', async () => {
		const tables = [
			'Old Leads',
			'leads',
			'Leads',
			...Array.from({ length: 150 }, (_, i) => `t${i}`),
		];
		const reads: Array<[number, number]> = [];
		const read = async (skip: number, take: number) => {
			reads.push([skip, take]);
			const data = tables.map((name, index) => ({ ...stored, id: `id-${index}`, name }));
			return { count: data.length, data: data.slice(skip, skip + take) };
		};
		expect(await tableIdByName('Leads', read)).toBe('id-2');
		expect(await tableIdByName('LEADS', read)).toBe('id-1');
		expect(await tableIdByName('t149', read)).toBe('id-152');
		expect(await tableIdByName('Lead', read)).toBeUndefined();
		expect(reads.slice(0, 2)).toEqual([
			[0, 100],
			[100, 100],
		]);
	});

	it('types a condition value by its operator', () => {
		const conditions: DataTableFilter['conditions'] = [
			{ column: 'plan', op: 'eq', value: 'pro' },
			{ column: 'plan', op: 'isEmpty' },
			// @ts-expect-error -- eq needs a value
			{ column: 'plan', op: 'eq' },
			// @ts-expect-error -- isEmpty takes no value
			{ column: 'plan', op: 'isEmpty', value: 'x' },
		];
		expect(conditions).toHaveLength(4);
	});
});

describe('imports', () => {
	const insert = demo.action('insert', {
		action: 'Insert rows',
		summary: 'Insert one row per item in one write.',
		flow: { effect: 'write', cardinality: 'batch' },
		imports: ['dataTables', 'inputOf'],
		input: { table: t.str(), email: t.str() },
		output: t.obj({ email: t.str() }),
		async *run({ input, items, dataTables, inputOf }) {
			const table = await dataTables.open({ name: input.table });
			const inputs = await Promise.all(items.map(async (item) => await inputOf(item)));
			const rows = await table.insert(inputs.map(({ email }) => ({ email })));
			yield* rows.map((row, index) => ({
				json: { email: String(row.email) },
				from: items[index] ?? items,
			}));
		},
	});

	it('gives a batch run the declared imports and the input of each item', async () => {
		const { calls, service } = tableService();
		const items: INodeExecutionData[] = [{ json: { e: 'a@x.y' } }, { json: { e: 'b@x.y' } }];
		const host = hostOf({
			items,
			parameter: (name, index) => (name === 'table' ? 'leads' : items[index]?.json.e),
			dataTables: dataTablesOf(dataTableHost(service).host),
		});
		const [output] = await executorOf(insert)(host);

		expect(calls.filter(({ method }) => method === 'insertRows')).toHaveLength(1);
		expect(output).toEqual([
			{ json: { email: 'a@x.y' }, pairedItem: { item: 0 } },
			{ json: { email: 'b@x.y' }, pairedItem: { item: 1 } },
		]);
	});

	it('opens a table once per run for a per-item action', async () => {
		const { service } = tableService();
		const { host, opened } = dataTableHost(service);
		const count = demo.action('count', {
			action: 'Count rows',
			summary: 'Count the rows of the table for each item.',
			flow: { effect: 'read', cardinality: 'per-item' },
			imports: ['dataTables'],
			input: { table: t.str() },
			output: t.obj({ table: t.str() }),
			async run({ input, dataTables }) {
				const table = await dataTables.open({ name: input.table });
				return { table: table.id };
			},
		});
		const items = [{ json: {} }, { json: {} }];
		const [output] = await executorOf(count)(
			hostOf({ items, parameter: () => 'leads', dataTables: dataTablesOf(host) }),
		);
		expect(output?.map(({ json }) => json)).toEqual([{ table: 't1' }, { table: 't1' }]);
		expect(opened).toEqual(['t1']);
	});

	it('fails a declared import that the host lacks, and refuses an undeclared one', async () => {
		await expect(executorOf(insert)(hostOf({ parameter: () => 'x' }))).rejects.toThrow(
			'demo.insert imports "dataTables", and this host has none',
		);
		const sneaky = demo.action('sneaky', {
			action: 'Sneaky',
			summary: 'Uses an import it does not declare.',
			flow: { effect: 'read', cardinality: 'batch' },
			input: {},
			output: t.json(),
			async *run(context) {
				// A bundle can reach past its types; the host still refuses.
				const wide = context as unknown as { wait?: { until(at: Date): Promise<void> } };
				await wide.wait?.until(new Date());
				yield* [];
			},
		});
		await expect(
			executorOf(sneaky)(hostOf({ waitUntil: async () => await Promise.resolve() })),
		).rejects.toThrow('demo.sneaky does not list "wait" in its imports');
	});

	it('waits through the host, and refuses a time that is not a date', async () => {
		const waited: Date[] = [];
		const pause = demo.action('pause', {
			action: 'Pause',
			summary: 'Wait, then pass the items on.',
			flow: { effect: 'transform', cardinality: 'batch' },
			imports: ['wait'],
			input: { at: t.str() },
			output: t.passedItem(),
			async *run({ input, items, wait }) {
				await wait.until(new Date(input.at));
				yield* items.map((item) => ({ item }));
			},
		});
		const waitUntil = async (at: Date) => {
			waited.push(at);
			await Promise.resolve();
		};
		const items = [{ json: { a: 1 } }];
		const at = '2026-03-01T10:00:00.000Z';
		const [output] = await executorOf(pause)(hostOf({ items, parameter: () => at, waitUntil }));
		expect(waited).toEqual([new Date(at)]);
		expect(output?.[0]).toEqual({ json: { a: 1 }, pairedItem: { item: 0 } });
		await expect(
			executorOf(pause)(hostOf({ items, parameter: () => 'soon', waitUntil })),
		).rejects.toThrow('The wait time is not a date');
	});

	it('puts the imports into the contract, its hash, its diff and its Node Contract version', () => {
		const contract = toContract(insert);
		expect(contract.imports).toEqual(['dataTables', 'inputOf']);
		expect(requiredNodeContractOf(contract)).toBe('2.3.0');
		const { imports: _imports, ...without } = contract;
		expect(contractHash(without)).not.toBe(contractHash(contract));
		expect(requiredNodeContractOf(without)).toBe('2.1.0');
		expect(diffContracts(without, contract).changes).toEqual([
			{ kind: 'major', text: 'import dataTables added' },
			{ kind: 'major', text: 'import inputOf added' },
		]);
		expect(diffContracts(contract, without).kind).toBe('minor');
		expect(lintContract({ ...contract, imports: ['dataTables', 'shell' as 'code'] })).toEqual([
			'demo.insert: shell is not a host import',
		]);
	});

	it('types only the declared imports', () => {
		demo.action('typed', {
			action: 'Typed',
			summary: 'Types its imports.',
			flow: { effect: 'read', cardinality: 'batch' },
			imports: ['code'],
			input: {},
			output: t.json(),
			async *run(context) {
				// @ts-expect-error -- dataTables is not in imports
				await context.dataTables.open({ id: 'x' });
				yield* [];
			},
		});
	});
});

describe('named inputs', () => {
	const join = demo.action('join', {
		action: 'Join',
		summary: 'Pass the left items on, then make one item per right item.',
		flow: { effect: 'transform', cardinality: 'batch' },
		inputs: ['left', 'right'],
		input: {},
		output: t.json(),
		*run({ inputs }) {
			yield* inputs.left.map((item) => ({ item }));
			yield* inputs.right.map((item) => ({
				json: { joined: true },
				from: [item, ...inputs.left],
			}));
		},
	});

	it('reads each input and pairs each output with its input and item', async () => {
		const left = [{ json: { a: 1 }, binary: { file: { data: '', mimeType: 'text/plain' } } }];
		const right = [{ json: { b: 2 } }];
		const host = hostOf({ items: left, inputItems: (index) => (index === 1 ? right : []) });
		const [output] = await executorOf(join)(host);
		expect(output).toEqual([
			{ ...left[0], pairedItem: { item: 0 } },
			{ json: { joined: true }, pairedItem: [{ item: 0, input: 1 }, { item: 0 }] },
		]);
	});

	it('runs when only one input has items, and not when none has', async () => {
		const right = [{ json: { b: 2 } }];
		const one = await executorOf(join)(hostOf({ items: [], inputItems: () => right }));
		expect(one[0]).toHaveLength(1);
		const none = await executorOf(join)(hostOf({ items: [], inputItems: () => [] }));
		expect(none).toEqual([[]]);
	});

	it('names the inputs in the node type, the contract and the module', () => {
		const { description } = new (toNodeType(join))();
		expect(description.inputs).toEqual([
			{ type: 'main', displayName: 'left' },
			{ type: 'main', displayName: 'right' },
		]);
		expect(description.requiredInputs).toBe(1);
		const contract = toContract(join);
		expect(contract.inputs).toEqual(['left', 'right']);
		expect(requiredNodeContractOf(contract)).toBe('2.3.0');
		const { inputs: _inputs, ...single } = contract;
		expect(diffContracts(single, contract).changes).toEqual([
			{ kind: 'major', text: 'inputs one input → left, right' },
		]);
		const module = generateNodeModule('demo', [
			{ contract, nodeType: 'demo.join', operation: 'join' },
		]);
		expect(module).toContain('// demo.join: Join.');
		expect(module).toContain('(inputs: left, right). A flow region with branches builds it.');
		expect(module).toContain('export {};');
	});

	it('needs batch', () => {
		demo.action('joinEach', {
			action: 'Join each',
			summary: 'Not a batch.',
			// @ts-expect-error -- named inputs need batch
			flow: { effect: 'transform', cardinality: 'per-item' },
			inputs: ['left', 'right'],
			input: {},
			output: t.json(),
			run: async () => await Promise.resolve({}),
		});
	});
});

describe('code', () => {
	/** An execute context that records each runner task and answers with `answer`. */
	function contextOf(itemCount: number, answer: (settings: Record<string, unknown>) => unknown) {
		const jobs: Array<{ type: string; settings: Record<string, unknown> }> = [];
		const context = {
			getNode: () => node,
			getWorkflow: () => ({ id: 'w1', name: 'Flow' }),
			getMode: () => 'manual',
			continueOnFail: () => false,
			getInputData: () => Array.from({ length: itemCount }, (_, index) => ({ json: { index } })),
			getRunnerStatus: () => ({ available: true }),
			startJob: async (type: string, settings: Record<string, unknown>) => {
				jobs.push({ type, settings });
				const result = answer(settings);
				return result instanceof Error
					? { ok: false, error: { message: result.message, description: 'from the runner' } }
					: { ok: true, result };
			},
		};
		return { jobs, context: context as unknown as IExecuteFunctions };
	}

	beforeEach(() => setCodeLanguages(['javascript', 'python']));

	it('runs each item in chunks of 1000 and joins the results in order', async () => {
		const { jobs, context } = contextOf(2500, (settings) => {
			const chunk = settings.chunk as { startIndex: number; count: number };
			return Array.from({ length: chunk.count }, (_, i) => ({
				json: { at: chunk.startIndex + i },
			}));
		});
		const result = await codeRunnerOf(context).run({
			language: 'javascript',
			code: 'return $json',
			mode: 'each',
		});

		expect(jobs.map(({ settings }) => settings.chunk)).toEqual([
			{ startIndex: 0, count: 1000 },
			{ startIndex: 1000, count: 1000 },
			{ startIndex: 2000, count: 500 },
		]);
		expect(jobs[0]?.settings).toMatchObject({
			nodeMode: 'runOnceForEachItem',
			workflowMode: 'manual',
		});
		expect(Array.isArray(result) && result.length).toBe(2500);
		expect(Array.isArray(result) && result[2499]).toEqual({ json: { at: 2499 } });
	});

	it('sends the items to the Python runner, and refuses a language the instance disables', async () => {
		const { jobs, context } = contextOf(2, () => []);
		await codeRunnerOf(context).run({ language: 'python', code: 'return []', mode: 'all' });
		expect(jobs[0]).toMatchObject({
			type: 'python',
			settings: { nodeMode: 'runOnceForAllItems', nodeName: 'Demo', workflowId: 'w1' },
		});
		expect((jobs[0]?.settings.items as unknown[]).length).toBe(2);

		setCodeLanguages(['javascript']);
		await expect(
			codeRunnerOf(context).run({ language: 'python', code: 'return []', mode: 'all' }),
		).rejects.toThrow('This instance does not allow python code');
	});

	it('runs only JavaScript until the host sets the languages', async () => {
		vi.resetModules();
		const fresh = await import('../host-imports.js');
		const { context } = contextOf(1, () => []);
		await expect(
			fresh.codeRunnerOf(context).run({ language: 'python', code: 'return []', mode: 'all' }),
		).rejects.toThrow('This instance does not allow python code');
		await expect(
			fresh.codeRunnerOf(context).run({ language: 'javascript', code: 'return []', mode: 'all' }),
		).resolves.toEqual([]);
	});

	it('throws the runner error with its description', async () => {
		const { context } = contextOf(1, () => new Error('x is not defined [line 1]'));
		const failure = codeRunnerOf(context).run({ language: 'javascript', code: 'x', mode: 'all' });
		await expect(failure).rejects.toThrow('x is not defined [line 1]');
		await expect(failure).rejects.toMatchObject({ description: 'from the runner' });
	});
});
