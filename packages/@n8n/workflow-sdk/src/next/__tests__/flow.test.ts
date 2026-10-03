import {
	binaryKeys,
	contractStep,
	contractProvider,
	contractTrigger,
	expr,
	manual,
	node,
	onError,
	recover,
	route,
	routedStep,
	set,
	provider,
	steps,
	trigger,
	when,
	workflow,
	type Binary,
	type Declared,
	type Dollar,
	type EntryFields,
	type FromSchema,
	type OutputNames,
	type PageValue,
	type ModelOf,
	type Pairing,
	type RoutedStep,
	type Step,
	type Provider,
	type Trigger,
	type Value,
	type ValueSchema,
	type Workflow,
} from '../index';
import { compileBinaryKey, compileLambda } from '../lambda';

interface Page {
	id: string;
	name: string;
	property_due: { start: string; end: string | null } | null;
	property_owners: string[];
	tags: string[];
}

const getPages = <In, Ctx, const N extends string>(config: {
	name: N;
	database: string;
}): Step<In, Ctx, Page, N> => contractStep('notion.databasePage.getAll', config);

const post = <In, Ctx, const N extends string>(config: {
	name: N;
	url: string;
	json: (item: In, $: import('../flow').Dollar<Ctx>) => object;
}): Step<In, Ctx, unknown, N> => contractStep('httpRequest.post', config);

const names = new Set(['Tasks']);

/** The test transform re-formats lambda source; compare token text only. */
const squash = (text: string | false) =>
	(text || '').replace(/\s+/g, ' ').replace(/,? ([})])/g, ' $1');

describe('compileLambda', () => {
	it('compiles a template literal to mixed text', () => {
		expect(compileLambda((page: Page) => `Hi ${page.name}`, names)).toEqual({
			ok: true,
			js: expect.stringMatching(/^`Hi \$\{\$json\.name\}`$/),
			expression: '=Hi {{ $json.name }}',
		});
	});

	it('compiles an object body, earlier nodes, and built-ins', () => {
		const result = compileLambda(
			(page: Page, $: { (name: 'Tasks'): Page; today: { toISODate(): string } }) => ({
				name: page.name,
				first: $('Tasks').id,
				day: $.today.toISODate(),
			}),
			names,
		);
		expect(squash(result.ok && result.expression)).toBe(
			'={{ ({ name: $json.name, first: $("Tasks").item.json.id, day: $today.toISODate() }) }}',
		);
	});

	it('rewrites destructured fields, shorthand properties, and keeps inner lambda locals', () => {
		const result = compileLambda(
			({ tags }: Page) => ({ tags, csv: tags.map((tag) => tag).join(',') }),
			names,
		);
		expect(squash(result.ok && result.js)).toBe(
			'({ tags: $json.tags, csv: $json.tags.map((tag) => tag).join(",") })',
		);
	});

	it('maps the parameter to $response for pagination', () => {
		const result = compileLambda(
			(r: { body: { next: string } }) => r.body.next,
			names,
			'$response',
		);
		expect(result.ok && result.expression).toBe('={{ $response.body.next }}');
	});

	it('rejects reads of the n8n item wrapper', () => {
		const loose = (fn: (item: Page, $: (name: string) => Page) => unknown) =>
			compileLambda(fn, names);
		// @ts-expect-error item has no json field
		expect(loose((item) => item.json.name)).toEqual({
			ok: false,
			error: expect.stringContaining('write item.field, not item.json.field'),
		});
		// @ts-expect-error $() has no item field
		expect(loose((_, $) => $('Tasks').item.name)).toEqual({
			ok: false,
			error: expect.stringContaining('not $("Tasks").item.field'),
		});
		// @ts-expect-error item has no json field
		expect(loose(({ json }) => json)).toEqual({
			ok: false,
			error: expect.stringContaining('not item.json.field'),
		});
		expect(compileLambda((item: { json: string }) => item['json'], names)).toMatchObject({
			ok: true,
		});
	});

	it('reads the binaries of an item beside its JSON', () => {
		type File = { name: string; binary: { data: Binary } };
		const expressionOf = (fn: (...args: never[]) => unknown) => {
			const result = compileLambda(fn, names);
			return result.ok ? result.expression : result.error;
		};
		const keyOf = (fn: (...args: never[]) => unknown) => {
			const result = compileBinaryKey(fn);
			return result.ok ? result.key : result.error;
		};
		expect(keyOf((item: File) => item.binary.data)).toBe('data');
		expect(keyOf(({ binary }: File) => binary['data'])).toBe('data');
		const hint = 'A binary field takes a binary of the input item, e.g. (item) => item.binary.data';
		expect(keyOf(({ binary }: File) => binary.data.fileName)).toBe(hint);
		expect(keyOf((_: File, $: (name: 'Tasks') => File) => $('Tasks').binary.data)).toBe(hint);
		expect(keyOf((item: File) => item.name)).toBe(hint);
		expect(expressionOf((item: File) => item.binary.data)).toBe('={{ $binary.data }}');
		expect(expressionOf(({ binary }: File) => binary.data.fileName)).toBe(
			'={{ $binary.data.fileName }}',
		);
		expect(expressionOf((_: File, $: (name: 'Tasks') => File) => $('Tasks').binary.data)).toBe(
			'={{ $("Tasks").item.binary.data }}',
		);
		expect(expressionOf((item: Record<string, string>) => item['binary'])).toBe(
			'={{ $json["binary"] }}',
		);
	});

	it('rejects local variables and unknown nodes', () => {
		const limit = 5;
		expect(compileLambda((page: Page) => page.property_owners.length > limit, names)).toEqual({
			ok: false,
			error: expect.stringContaining('reads "limit"'),
		});
		expect(compileLambda((_: Page, $: (name: string) => Page) => $('Nope').id, names)).toEqual({
			ok: false,
			error: '$("Nope") names no node in this workflow',
		});
	});
});

describe('workflow', () => {
	it('wires a flat list with a when branch and an error output', () => {
		const wf = workflow(
			'Report',
			manual(),
			getPages({ name: 'Tasks', database: 'abc' }),
			when(
				{ name: 'Has owner?', if: (page) => page.property_owners.length > 0 },
				{
					then: post({ name: 'Report', url: 'https://x', json: (page) => ({ id: page.id }) }),
					else: set({ name: 'Unowned', fields: { id: (page) => page.id } }),
				},
			),
			onError(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
		);
		const json = wf.toJSON();

		expect(json.nodes.map((n) => [n.name, n.type])).toEqual([
			['Start', 'n8n-nodes-base.manualTrigger'],
			['Tasks', 'notion.databasePage.getAll'],
			['Has owner?', '@n8n/nodes-base-next.conditionIf'],
			['Report', 'httpRequest.post'],
			['Unowned', '@n8n/nodes-base-next.itemsSet'],
			['Log', '@n8n/nodes-base-next.itemsSet'],
		]);
		expect(json.connections['Has owner?']?.main.map((out) => out?.map((c) => c.node))).toEqual([
			['Report'],
			['Unowned'],
		]);
		expect(json.connections.Report?.main.map((out) => out?.map((c) => c.node))).toEqual([
			[],
			['Log'],
		]);
		expect(json.nodes.find((n) => n.name === 'Report')).toMatchObject({
			onError: 'continueErrorOutput',
			parameters: { url: 'https://x', json: '={{ ({ id: $json.id }) }}' },
		});
		expect(json.nodes.find((n) => n.name === 'Unowned')?.parameters).toEqual({
			fields: { id: '={{ $json.id }}' },
			include: { mode: 'none' },
		});
		expect(json.nodes.find((n) => n.name === 'Has owner?')?.parameters).toEqual({
			where: {
				conditions: [
					{
						type: 'boolean',
						left: '={{ $json.property_owners.length > 0 }}',
						test: { op: 'true' },
					},
				],
			},
		});
	});

	it('ends the error branch at onError, and rejoins it with recover (sweep 409 shape)', () => {
		const fetch = <In, Ctx, const N extends string>(config: {
			name: N;
		}): Step<In, Ctx, { total: number }, N> => contractStep('httpRequest.get', config);
		const targets = (json: ReturnType<Workflow['toJSON']>, name: string) =>
			json.connections[name]?.main.map((out) => out?.map((c) => c.node));

		const ended = workflow(
			'Sweep',
			manual(),
			fetch({ name: 'Fetch' }),
			onError(set({ name: 'Slack', fields: { text: (e) => e.error.message } })),
			set({ name: 'Summarize', fields: { total: (item) => item.total } }),
		).toJSON();
		expect(targets(ended, 'Fetch')).toEqual([['Summarize'], ['Slack']]);
		expect(targets(ended, 'Slack')).toBeUndefined();

		const rejoined = workflow(
			'Sweep',
			manual(),
			fetch({ name: 'Fetch' }),
			recover(set({ name: 'Slack', fields: { text: (e) => e.error.message } })),
			// @ts-expect-error after recover, an item can be the handler's item, which has no total
			set({ name: 'Summarize', fields: { total: (item) => item.total } }),
		).toJSON();
		expect(targets(rejoined, 'Fetch')).toEqual([['Summarize'], ['Slack']]);
		expect(targets(rejoined, 'Slack')).toEqual([['Summarize']]);
		expect(rejoined.nodes.find((n) => n.name === 'Fetch')?.onError).toBe('continueErrorOutput');
	});

	it('types a 12-step list with when, route, and onError without annotations', () => {
		const exists = <In, Ctx, const N extends string>(config: {
			name: N;
		}): RoutedStep<In, Ctx, { email: string }, N, 'exists' | 'missing'> =>
			routedStep('@n8n/nodes-base-next.dataTableRowExists', config, ['exists', 'missing']);
		const json = workflow(
			'Twelve',
			manual(),
			getPages({ name: 'Tasks', database: 'abc' }),
			onError(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
			set({ name: 'Owner', fields: { owner: (page) => page.property_owners[0] ?? '' } }),
			when(
				{ name: 'Owned?', if: (item) => item.owner !== '' },
				{
					then: steps(
						set({ name: 'Mail', fields: { email: (item, $) => `${item.owner}@${$('Tasks').id}` } }),
						set({ name: 'Mail lower', fields: { email: (item) => item.email.toLowerCase() } }),
					),
					else: set({ name: 'Nobody', fields: { email: 'nobody@example.com' } }),
				},
			),
			route(exists({ name: 'Known' }), {
				exists: set({ name: 'Old', fields: { email: (row) => row.email } }),
				missing: set({
					name: 'New',
					fields: { email: (row, $) => `${row.email} ${$('Tasks').name}` },
				}),
			}),
			set({ name: 'Step 7', fields: { email: (item) => item.email } }),
			// @ts-expect-error a typo at step 8 names the field
			set({ name: 'Typo', fields: { email: (item) => item.emial } }),
			set({ name: 'Step 9', fields: { n: (_item, $) => $('Step 7').email.length } }),
			set({ name: 'Step 10', fields: { twice: (item) => item.n * 2 } }),
			set({ name: 'Step 11', fields: { back: (item, $) => item.twice + $('Owner').owner.length } }),
			set({ name: 'Step 12', fields: { done: (item) => item.back > 0 } }),
		).toJSON();
		expect(json.nodes).toHaveLength(17);
		expect(json.connections['Step 12']).toBeUndefined();
		expect(json.connections.Old?.main.map((out) => out?.map((c) => c.node))).toEqual([['Step 7']]);
	});

	it('starts another flow at a trigger later in the list', () => {
		const json = workflow(
			'Two triggers',
			manual(),
			set({ name: 'A', fields: { a: 1 } }),
			manual({ name: 'Again', sample: [{ b: 'x' }] }),
			set({ name: 'B', fields: { b: (item) => item.b } }),
		).toJSON();
		expect(json.connections.Start?.main.map((out) => out?.map((c) => c.node))).toEqual([['A']]);
		expect(json.connections.A).toBeUndefined();
		expect(json.connections.Again?.main.map((out) => out?.map((c) => c.node))).toEqual([['B']]);
		workflow(
			'Typed',
			manual(),
			set({ name: 'A', fields: { a: 1 } }),
			manual({ name: 'Again', sample: [{ b: 'x' }] }),
			// @ts-expect-error the second trigger has no field a
			set({ name: 'B', fields: { a: (item) => item.a } }),
		);
		const noTrigger = workflow('No trigger', set({ name: 'A', fields: { a: 1 } }) as never);
		expect(() => noTrigger.toJSON()).toThrow('A workflow starts with a trigger, e.g. manual()');
	});

	it('passes set fields that start with "=" on as expressions, and refuses path keys', () => {
		const json = workflow(
			'Fields',
			manual(),
			set({
				name: 'Fields',
				fields: { text: expr('Hi {{ $json.name }}'), raw: '={{ $json.id }}', count: 2 },
				keep: 'all',
			}),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Fields')?.parameters).toEqual({
			fields: { text: '=Hi {{ $json.name }}', raw: '={{ $json.id }}', count: 2 },
			include: { mode: 'all' },
		});
		const nested = workflow('Path', manual(), set({ name: 'Path', fields: { 'a.b': 1 } }));
		expect(() => nested.toJSON()).toThrow('Path: set field "a.b" cannot hold "." or "["');
	});

	it('routes a contract step with named outputs, and continues from the first output', () => {
		const owned = routedStep<Page, unknown, Page, 'Owned', 'kept' | 'discarded'>(
			'@n8n/nodes-base-next.conditionFilter',
			{ name: 'Owned' },
			['kept', 'discarded'],
		);
		const switchConfig = { name: 'Route', cases: [{ output: 'a' }, { output: 'b' }] };
		const cases = routedStep('@n8n/nodes-base-next.conditionSwitch', switchConfig, {
			each: 'cases',
			then: ['fallback'],
		});
		expect([owned.outputs, owned.spec.outputs, cases.outputs]).toEqual([
			['kept', 'discarded'],
			2,
			['a', 'b', 'fallback'],
		]);
		const json = workflow(
			'Routed',
			manual(),
			getPages({ name: 'Tasks', database: 'abc' }),
			owned,
			onError(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
		).toJSON();
		expect(json.connections.Owned?.main.map((out) => out?.map((c) => c.node))).toEqual([
			[],
			[],
			['Log'],
		]);
	});

	it('selects the action of a composed node version for a routed step', () => {
		const step = routedStep('n8n-nodes-test.composed', { name: 'Pick' }, ['yes', 'no'], 2, {
			resource: 'row',
			operation: 'check',
		});
		const json = workflow('Slot', manual(), step).toJSON();
		const node = json.nodes.find(({ name }) => name === 'Pick');
		expect([node?.typeVersion, node?.parameters]).toEqual([
			2,
			{ resource: 'row', operation: 'check' },
		]);
	});

	it('types the output names of a routed step', () => {
		// The shape a generated factory has for outputs named by input entries.
		const byCase = <In, Ctx, const N extends string, const E extends string>(config: {
			name: N;
			cases: ReadonlyArray<{ output: E }>;
		}): RoutedStep<In, Ctx, In, N, E | 'fallback'> =>
			routedStep('@n8n/nodes-base-next.conditionSwitch', config, {
				each: 'cases',
				then: ['fallback'],
			});
		const step = byCase({ name: 'Route', cases: [{ output: 'young' }, { output: 'old' }] });
		const names: Array<OutputNames<typeof step>> = ['young', 'old', 'fallback'];
		// @ts-expect-error -- "middle" is not an output of this step
		const wrong: OutputNames<typeof step> = 'middle';
		expect([names, wrong, step.outputs]).toEqual([
			['young', 'old', 'fallback'],
			'middle',
			['young', 'old', 'fallback'],
		]);
	});

	it('continues from each named output with route, typed by the output names', () => {
		interface Row {
			email: string;
		}
		const exists = <In, Ctx, const N extends string>(config: {
			name: N;
		}): RoutedStep<In, Ctx, Row, N, 'exists' | 'missing'> =>
			routedStep('@n8n/nodes-base-next.dataTableRowExists', config, ['exists', 'missing']);
		const classify = <In, Ctx, const N extends string, const E extends string>(config: {
			name: N;
			categories: ReadonlyArray<{ output: E }>;
		}): RoutedStep<In, Ctx, In, N, E | 'other'> =>
			routedStep('@n8n/nodes-base-next.aiClassify', config, {
				each: 'categories',
				then: ['other'],
			});
		const json = workflow(
			'Route',
			manual(),
			getPages({ name: 'Tasks', database: 'abc' }),
			route(exists({ name: 'Known' }), {
				exists: set({ name: 'Old', fields: { email: (row) => row.email } }),
				missing: set({
					name: 'New',
					fields: { email: (row, $) => `${row.email} ${$('Tasks').name}` },
				}),
			}),
			set({ name: 'After', fields: { email: (item) => item.email } }),
		).toJSON();
		expect(json.connections.Known?.main.map((out) => out?.map((c) => c.node))).toEqual([
			['Old'],
			['New'],
		]);
		expect(json.connections.New?.main.map((out) => out?.map((c) => c.node))).toEqual([['After']]);
		workflow(
			'Absent',
			manual(),
			route(exists({ name: 'Known' }), {
				exists: steps(),
				// @ts-expect-error -- "absent" is not an output of this step
				absent: steps(),
			}),
		);
		expect(() =>
			workflow(
				'Drops',
				manual(),
				route(classify({ name: 'Kind', categories: [{ output: 'bug' }, { output: 'idea' }] }), {
					bug: steps(),
				}),
			).toJSON(),
		).toThrow('Kind: items on "idea" stop. Give each output but the last a part in route');
		expect(() =>
			workflow(
				'Then',
				manual(),
				classify({ name: 'Kind', categories: [{ output: 'bug' }, { output: 'idea' }] }),
			).toJSON(),
		).toThrow(
			'Kind: only output "bug" continues, so items on "idea" stop. Use route(step, { … }) to give each output a part',
		);
		expect(workflow('Two', manual(), exists({ name: 'Known' })).toJSON().nodes).toHaveLength(2);
	});

	it('routes the named outputs of a node() step, e.g. a legacy IF', () => {
		const ifNode = () =>
			node({
				name: 'If',
				type: 'n8n-nodes-base.if',
				version: 2.2,
				parameters: { conditions: {} },
				outputs: ['true', 'false'],
			});
		const json = workflow(
			'If',
			manual(),
			route(ifNode(), {
				true: set({ name: 'Yes', fields: { ok: true } }),
				false: set({ name: 'No', fields: { ok: false } }),
			}),
		).toJSON();
		expect(json.connections.If?.main.map((out) => out?.map((c) => c.node))).toEqual([
			['Yes'],
			['No'],
		]);
		workflow(
			'Maybe',
			manual(),
			route(ifNode(), {
				// @ts-expect-error -- "maybe" is not an output of this node
				maybe: steps(),
			}),
		);
		const plain = node({ name: 'Plain', type: 'n8n-nodes-base.noOp', version: 1 });
		expect('outputs' in plain).toBe(false);
	});

	it('wires the binary of one contract step into the binary field of the next', () => {
		const download = <In, Ctx, const N extends string>(config: {
			name: N;
			url: string;
		}): Step<In, Ctx, { binary: { data: Binary } }, N> =>
			contractStep('httpRequest.download', config);
		const upload = <In, Ctx, const N extends string>(config: {
			name: N;
			file: (item: In, $: Dollar<Ctx>) => Binary;
		}): Step<In, Ctx, { id: string }, N> =>
			contractStep('drive.upload', binaryKeys(config, [['file']]));

		const json = workflow(
			'Copy',
			manual(),
			download({ name: 'Download', url: 'https://x/a.pdf' }),
			upload({ name: 'Upload', file: (item) => item.binary.data }),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Upload')?.parameters).toEqual({ file: 'data' });

		expect(() =>
			workflow(
				'Copy',
				manual(),
				download({ name: 'Download', url: 'https://x/a.pdf' }),
				upload({ name: 'Upload', file: (_item, $) => $('Download').binary.data }),
			).toJSON(),
		).toThrow(
			'Upload: A binary field takes a binary of the input item, e.g. (item) => item.binary.data',
		);

		workflow(
			'Other',
			manual(),
			download({ name: 'Download', url: 'https://x/a.pdf' }),
			// @ts-expect-error the item has no binary named other
			upload({ name: 'Upload', file: (item) => item.binary.other }),
		);
		// @ts-expect-error a binary field takes a binary of the item, not a literal
		workflow('Literal', manual(), upload({ name: 'Upload', file: { mimeType: 'text/csv' } }));
	});

	it('takes an expression string in a typed field and passes it on unchanged', () => {
		const limit = <In, Ctx, const N extends string>(config: {
			name: N;
			max: Value<In, Ctx, number>;
		}): Step<In, Ctx, unknown, N> => contractStep('items.limit', config);

		const json = workflow(
			'Limit',
			manual(),
			limit({ name: 'Limit', max: '={{ $json.count }}' }),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Limit')?.parameters).toEqual({
			max: '={{ $json.count }}',
		});
		// @ts-expect-error a plain string is not a number
		workflow('Ten', manual(), limit({ name: 'Limit', max: 'ten' }));
	});

	it('writes an n8n expression with expr() in a typed field and in node()', () => {
		const limit = <In, Ctx, const N extends string>(config: {
			name: N;
			max: Value<In, Ctx, number>;
		}): Step<In, Ctx, unknown, N> => contractStep('items.limit', config);

		const json = workflow(
			'Expr',
			manual(),
			limit({ name: 'Limit', max: expr('{{ $json.count }}') }),
			node({
				name: 'Raw',
				type: 'n8n-nodes-base.noOp',
				version: 1,
				parameters: { id: expr('{{ $input.first().json.id }}') },
			}),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Limit')?.parameters).toEqual({
			max: '={{ $json.count }}',
		});
		expect(json.nodes.find((n) => n.name === 'Raw')?.parameters).toEqual({
			id: '={{ $input.first().json.id }}',
		});
		expect([expr('{{ $json.id }}'), expr('={{ $json.id }}')]).toEqual([
			'={{ $json.id }}',
			'={{ $json.id }}',
		]);
	});

	it('compiles a lambda in a page field over the response page, and others over the item', () => {
		const get = <In, Ctx, const N extends string>(config: {
			name: N;
			url: Value<In, Ctx, string>;
			pages: { style: 'cursor'; next: PageValue<string>; send: { query: string } };
		}): Step<In, Ctx, unknown, N> =>
			contractStep('httpRequest.get', config, 3, undefined, undefined, undefined, [
				['pages', 'next'],
			]);

		const json = workflow(
			'Customers',
			manual({ sample: [{ base: 'https://x.test' }] }),
			get({
				name: 'Customers',
				url: (item) => `${item.base}/customers`,
				pages: {
					style: 'cursor',
					next: (page) => page.body.data.at(-1)?.id,
					send: { query: 'starting_after' },
				},
			}),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Customers')?.parameters).toEqual({
			url: '={{ $json.base }}/customers',
			pages: {
				style: 'cursor',
				next: '={{ $response.body.data.at(-1)?.id }}',
				send: { query: 'starting_after' },
			},
		});
	});

	it('pins the action version of a contract step', () => {
		const pinned = contractStep('notion.databasePage.getAll', { name: 'Tasks' }, 2);
		const json = workflow('Pinned', manual(), pinned).toJSON();
		expect(json.nodes.find((n) => n.name === 'Tasks')?.typeVersion).toBe(2);
		expect(contractStep('x.y.z', { name: 'Default' }).spec.version).toBe(1);
	});

	it('emits a composed node with its slot parameters last', () => {
		const slot = { resource: 'databasePage', operation: 'getAll' };
		const config = { name: 'Tasks', database: 'db', operation: 'create' };
		const step = contractStep('n8n-nodes-base.notion', config, 4, slot);
		const json = workflow('Composed', manual(), step).toJSON();
		expect(json.nodes.find((n) => n.name === 'Tasks')).toMatchObject({
			type: 'n8n-nodes-base.notion',
			typeVersion: 4,
			parameters: { database: 'db', resource: 'databasePage', operation: 'getAll' },
		});
	});

	it('emits a derived node with an operation-only slot and __rl on its locator values', () => {
		const config = {
			name: 'Row',
			base: { mode: 'id', value: 'app1' },
			table: (item: { table: string }) => item.table,
			fields: { mode: 'not a locator' },
		};
		const step = contractStep('n8n-nodes-base.airtable', config, 2.1, { operation: 'create' });
		const json = workflow('Derived', manual(), step).toJSON();
		expect(json.nodes.find((n) => n.name === 'Row')).toMatchObject({
			type: 'n8n-nodes-base.airtable',
			typeVersion: 2.1,
			parameters: {
				base: { __rl: true, mode: 'id', value: 'app1' },
				table: '={{ $json.table }}',
				fields: { mode: 'not a locator' },
				operation: 'create',
			},
		});
		expect(json.nodes.find((n) => n.name === 'Row')?.parameters).not.toHaveProperty('resource');
	});

	it('starts a flow at a contract trigger and unions the scopes of the workflow', () => {
		const read = { credential: 'notion', scopes: ['content:read'] };
		const config = { name: 'Added' as const, dataSource: 'ds' };
		const added = contractTrigger<Page, 'Added'>(
			'@n8n/nodes-base-next.notionDataSourcePageAdded',
			config,
			1,
			read,
		);
		const create = contractStep('notion.databasePage.create', { name: 'Create' }, 1, undefined, {
			credential: 'notion',
			scopes: ['content:insert', 'content:read'],
		});
		const scoped = (options: Parameters<typeof workflow>[0]) =>
			workflow(options, added, create, post({ name: 'Post', url: 'u', json: () => ({}) }));
		const json = scoped('Scoped').toJSON();
		expect(json.nodes.find((n) => n.name === 'Added')).toMatchObject({
			type: '@n8n/nodes-base-next.notionDataSourcePageAdded',
			parameters: { dataSource: 'ds' },
		});
		expect(scoped('Scoped').scopes()).toEqual({
			notion: { 'content:insert': ['Create'], 'content:read': ['Added', 'Create'] },
		});
		const granted = scoped({ name: 'Scoped', grants: { notion: ['content:read'] } });
		expect(() => granted.toJSON()).toThrow(
			'Credential "notion" does not grant scope "content:insert", which "Create" needs',
		);
		const all = { notion: ['content:read', 'content:insert'] };
		expect(scoped({ name: 'Scoped', grants: all }).toJSON().nodes).toHaveLength(3);
	});

	it('wires AI providers to the ai_* inputs of their node', () => {
		const wf = workflow(
			'Answer',
			manual({ sample: [{ question: 'What is n8n?' }] }),
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 2.2,
				parameters: { promptType: 'define', text: (item) => item.question },
				providers: {
					model: provider({
						name: 'Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						parameters: { model: 'gpt-4o-mini' },
					}),
					memory: provider({
						name: 'Memory',
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						parameters: { sessionKey: (item) => item.question },
					}),
					tools: [
						provider({
							name: 'Calculator',
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							version: 1,
							// @ts-expect-error the agent input has no such field
							parameters: { x: (item) => item.nope },
						}),
					],
				},
			}),
		);
		const json = wf.toJSON();
		expect(json.nodes.map((n) => n.name)).toEqual([
			'Start',
			'Agent',
			'Model',
			'Memory',
			'Calculator',
		]);
		const into = (type: string) => [[{ node: 'Agent', type, index: 0 }]];
		expect(json.connections.Model).toEqual({ ai_languageModel: into('ai_languageModel') });
		expect(json.connections.Memory).toEqual({ ai_memory: into('ai_memory') });
		expect(json.connections.Calculator).toEqual({ ai_tool: into('ai_tool') });
		expect(json.nodes.find((n) => n.name === 'Memory')?.parameters).toEqual({
			sessionKey: '={{ $json.question }}',
		});
	});

	it('wires contract providers by the kind they supply', () => {
		const chatModel = <In, Ctx>(
			config: { name: string } & { model: Value<In, Ctx, ModelOf<'openai'>> },
		): Provider<In, Ctx, 'chatModel'> =>
			contractProvider('pkg.openAiChatModel', 'chatModel', config);
		const tool = <In, Ctx>(config: { name: string } & { url: string }): Provider<In, Ctx, 'tool'> =>
			contractProvider('pkg.httpTool', 'tool', config);
		const agent = <In, Ctx, const N extends string>(
			config: { name: N } & {
				model: Provider<In, Ctx, 'chatModel'>;
				tools?: Array<Provider<In, Ctx, 'tool'>>;
				prompt: Value<In, Ctx, string>;
			},
		): Step<In, Ctx, { text: string }, N> => contractStep('pkg.aiAgent', config);
		const wf = workflow(
			'Answer',
			manual({ sample: [{ question: 'What is n8n?', model: 'gpt-5-mini' }] }),
			agent({
				name: 'Agent',
				model: chatModel({ name: 'Model', model: (item) => item.model }),
				tools: [tool({ name: 'Fetch', url: 'https://example.com' })],
				prompt: (item) => item.question,
			}),
		);
		const json = wf.toJSON();
		expect(json.nodes.map((n) => [n.name, n.parameters])).toEqual([
			['Start', {}],
			['Agent', { prompt: '={{ $json.question }}' }],
			['Model', { model: '={{ $json.model }}' }],
			['Fetch', { url: 'https://example.com' }],
		]);
		const into = (type: string) => [[{ node: 'Agent', type, index: 0 }]];
		expect(json.connections.Model).toEqual({ ai_languageModel: into('ai_languageModel') });
		expect(json.connections.Fetch).toEqual({ ai_tool: into('ai_tool') });

		agent({
			name: 'Wrong kind',
			// @ts-expect-error a tool does not supply a chat model
			model: tool({ name: 'T', url: 'https://example.com' }),
			prompt: 'Hi',
		});
		agent({
			name: 'Legacy',
			// @ts-expect-error a contract root takes contract providers only
			model: provider({ name: 'M', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2 }),
			prompt: 'Hi',
		});
		node({
			name: 'Legacy agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			// @ts-expect-error a legacy root node cannot run a contract provider
			providers: { model: chatModel({ name: 'M2', model: 'gpt-5-mini' }) },
		});
	});

	it('reports a provider that reuses a node name', () => {
		const wf = workflow(
			'Clash',
			manual(),
			node({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 2.2,
				providers: { model: provider({ name: 'Start', type: 'x.lm', version: 1 }) },
			}),
		);
		expect(() => wf.toJSON()).toThrow('Two different nodes are named "Start"');
	});

	it('types the manual trigger by its sample and declares it as pin data', () => {
		const wf = workflow(
			'Count rows',
			manual({ sample: [{ tableName: 'orders' }] }),
			set({ name: 'Table', fields: { table: (item) => item.tableName } }),
		);
		expect(wf.generatePinData().toJSON().pinData).toEqual({ Start: [{ tableName: 'orders' }] });
		expect(workflow('No sample', manual()).generatePinData().toJSON().pinData).toBeUndefined();
		workflow(
			'Typo',
			manual({ sample: [{ tableName: 'orders' }] }),
			// @ts-expect-error the sample has no such field
			set({ name: 'Typo', fields: { table: (item) => item.table } }),
		);
	});

	it('returns build problems instead of throwing while composing', () => {
		const secret = 'x';
		const wf = workflow('Broken', manual(), set({ name: 'Leak', fields: { value: () => secret } }));
		expect(() => wf.toJSON()).toThrow('Leak: The lambda reads "secret"');
	});

	it('types reads against the node before', () => {
		workflow(
			'Reads',
			manual(),
			getPages({ name: 'Tasks', database: 'abc' }),
			post({
				name: 'Post',
				url: 'https://x',
				json: (page, $) => ({
					due: page.property_due?.start,
					// @ts-expect-error property_due may be null
					unsafe: page.property_due.start,
					// @ts-expect-error misspelled field
					typo: page.property_owner,
					first: $('Tasks').name,
					// @ts-expect-error unknown node
					nope: $('Nope'),
				}),
			}),
		);
		workflow(
			'Loose',
			manual(),
			node({ name: 'Anything', type: 'n8n-nodes-base.noOp', version: 1 }),
			set({ name: 'Loose', fields: { read: (item) => item.whatever } }),
		);
	});
});

describe('native triggers', () => {
	interface Request {
		headers: Record<string, string>;
		body: Record<string, unknown>;
	}
	const pairing: Pairing = {
		trigger: 'n8n-nodes-base.webhook',
		reply: 'n8n-nodes-base.respondToWebhook',
		field: 'responseMode',
		value: 'responseNode',
	};
	// The calls a generated module makes for the Webhook and Respond to Webhook contracts.
	const hook = <const N extends string, const S extends { body?: ValueSchema } = {}>(config: {
		name: N;
		path: string;
		responseMode?: string;
		schema?: S;
	}): Trigger<Declared<Request, S>, N> =>
		contractTrigger('n8n-nodes-base.webhook', config, 2.2, undefined, {
			pairing,
			example: { headers: {}, body: {} },
			takesSchema: true,
		});
	const respond = <In, Ctx, const N extends string>(config: {
		name: N;
		respondWith: string;
	}): Step<In, Ctx, In, N> =>
		contractStep('n8n-nodes-base.respondToWebhook', config, 1.5, undefined, undefined, pairing);
	const incident = {
		type: 'object',
		properties: { severity: { enum: ['critical', 'info'] }, count: { type: 'integer' } },
		required: ['severity'],
	} as const;

	it('makes the trigger sample from a declared schema, and keeps the schema out of the node', () => {
		const wf = workflow(
			'Incidents',
			hook({ name: 'Hook', path: 'incidents', schema: { body: incident } }),
			set({ name: 'Severity', fields: { severity: (item) => item.body.severity } }),
		);
		const json = wf.generatePinData().toJSON();
		expect(json.nodes.find((n) => n.name === 'Hook')?.parameters).toEqual({ path: 'incidents' });
		expect(json.pinData).toEqual({
			Hook: [{ headers: {}, body: { severity: 'critical', count: 1 } }],
		});
		const table = contractTrigger('n8n-nodes-base.postgresTrigger', {
			name: 'Table',
			schema: 'public',
		} as never);
		expect(workflow('Table', table).toJSON().nodes[0]?.parameters).toEqual({ schema: 'public' });
		workflow(
			'Typo',
			hook({ name: 'Hook', path: 'p', schema: { body: incident } }),
			// @ts-expect-error the declared body has no such field
			set({ name: 'Typo', fields: { x: (item) => item.body.severty } }),
		);
	});

	it('fills the fields that a trigger sample leaves out from the example', () => {
		const sampled = contractTrigger(
			'n8n-nodes-base.webhook',
			{ name: 'Hook', sample: [{ body: { severity: 'info' } }, { headers: { a: 'b' } }] },
			2.2,
			undefined,
			{ example: { headers: {}, query: { page: '1' }, body: {}, webhookUrl: 'example' } },
		);
		expect(workflow('Sampled', sampled).generatePinData().toJSON().pinData).toEqual({
			Hook: [
				{ headers: {}, query: { page: '1' }, body: { severity: 'info' }, webhookUrl: 'example' },
				{ headers: { a: 'b' }, query: { page: '1' }, body: {}, webhookUrl: 'example' },
			],
		});
		const json = workflow(
			'Declared',
			contractTrigger(
				'n8n-nodes-base.webhook',
				{ name: 'Hook', schema: { body: incident }, sample: [{ body: { count: 5 } }] },
				2.2,
				undefined,
				{ example: { headers: {}, body: {} }, takesSchema: true },
			),
		)
			.generatePinData()
			.toJSON();
		expect(json.pinData).toEqual({
			Hook: [{ headers: {}, body: { severity: 'critical', count: 5 } }],
		});
	});

	it('checks that a webhook that waits for a reply has one, and that it waits for its replies', () => {
		const waiting = () => hook({ name: 'Hook', path: 'p', responseMode: 'responseNode' });
		expect(() => workflow('No reply', waiting()).toJSON()).toThrow(
			'Hook: responseMode is "responseNode", so the flow needs its reply step after it',
		);
		const json = workflow(
			'Reply',
			waiting(),
			respond({ name: 'Reply', respondWith: 'json' }),
		).toJSON();
		expect(json.nodes.map((n) => n.type)).toEqual([
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.respondToWebhook',
		]);
		const immediate = workflow(
			'Immediate',
			hook({ name: 'Hook', path: 'p' }),
			respond({ name: 'Reply', respondWith: 'json' }),
		);
		expect(() => immediate.toJSON()).toThrow(
			'Reply: replies to "Hook", which does not wait for it. Set responseMode: "responseNode" on "Hook"',
		);
	});

	it('accepts a reply that another node waits for, as n8n does', () => {
		const underWait = workflow(
			'Wait',
			hook({ name: 'Hook', path: 'p' }),
			node({
				name: 'Wait',
				type: 'n8n-nodes-base.wait',
				version: 1.1,
				parameters: { resume: 'webhook', responseMode: 'responseNode' },
			}),
			respond({ name: 'Reply', respondWith: 'json' }),
		);
		expect(underWait.toJSON().nodes).toHaveLength(3);
		const chat = workflow(
			'Chat',
			trigger({
				name: 'Chat',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				version: 1.3,
				parameters: { public: true, mode: 'webhook', options: { responseMode: 'responseNode' } },
			}),
			respond({ name: 'Reply', respondWith: 'json' }),
		);
		expect(chat.toJSON().nodes).toHaveLength(2);
		const manualReply = workflow(
			'Manual',
			manual(),
			respond({ name: 'Reply', respondWith: 'json' }),
		);
		expect(manualReply.toJSON().nodes).toHaveLength(2);
	});

	it('checks that a form page has its form trigger before it', () => {
		const formPairing: Pairing = {
			trigger: 'n8n-nodes-base.formTrigger',
			reply: 'n8n-nodes-base.form',
		};
		const form = contractTrigger('n8n-nodes-base.formTrigger', { name: 'Form' }, 2.6, undefined, {
			pairing: formPairing,
		});
		const page = <In, Ctx>() =>
			contractStep<In, Ctx, In, 'Page'>(
				'n8n-nodes-base.form',
				{ name: 'Page' },
				2.5,
				undefined,
				undefined,
				formPairing,
			);
		expect(workflow('Pages', form, page()).toJSON().nodes).toHaveLength(2);
		expect(workflow('Form only', form).toJSON().nodes).toHaveLength(1);
		expect(() => workflow('No form', manual(), page()).toJSON()).toThrow(
			'Page: needs a n8n-nodes-base.formTrigger trigger before it',
		);
	});

	it('types a declared value schema and the fields of config entries', () => {
		type Body = FromSchema<typeof incident>;
		const body: Body = { severity: 'info' };
		// @ts-expect-error severity takes the enum values only
		const wrong: Body = { severity: 'low' };
		// @ts-expect-error an object with properties has only those fields
		const extra: Body = { severity: 'info', other: 1 };
		type Fields = EntryFields<
			{
				fields: [
					{ label: 'Email'; kind: 'email'; required: true },
					{ label: 'Age'; kind: 'number' },
				];
			},
			['fields'],
			['label'],
			'kind',
			{ ['number']: number },
			string,
			'required'
		>;
		const fields: Fields = { Email: 'a@b.c', Age: null };
		// @ts-expect-error a field that is not required may be null
		const age: number = fields.Age;
		expect([body, wrong, extra, age]).toHaveLength(4);
	});
});
