import {
	contractStep,
	contractSubnode,
	contractTrigger,
	manual,
	node,
	routedStep,
	set,
	subnode,
	trigger,
	workflow,
	type Binary,
	type Declared,
	type Dollar,
	type EntryFields,
	type Flow,
	type FromSchema,
	type OutputNames,
	type ModelOf,
	type Pairing,
	type RoutedStep,
	type Step,
	type Subnode,
	type Value,
	type ValueSchema,
} from '../index';
import { compileLambda } from '../lambda';

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
			js: '`Hi ${$json.name}`',
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
	it('wires a chain with a branch and an error output', () => {
		const wf = workflow(
			'Report',
			manual()
				.andThen(getPages({ name: 'Tasks', database: 'abc' }))
				.branch({
					name: 'Has owner?',
					if: (page) => page.property_owners.length > 0,
					then: (flow) =>
						flow.andThen(
							post({ name: 'Report', url: 'https://x', json: (page) => ({ id: page.id }) }),
						),
					else: (flow) => flow.andThen(set({ name: 'Unowned', fields: { id: (page) => page.id } })),
				})
				.orElse((failed) =>
					failed.andThen(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
				),
		);
		const json = wf.toJSON();

		expect(json.nodes.map((n) => [n.name, n.type])).toEqual([
			['Start', 'n8n-nodes-base.manualTrigger'],
			['Tasks', 'notion.databasePage.getAll'],
			['Has owner?', '@n8n/nodes-base-next.coreIf'],
			['Report', 'httpRequest.post'],
			['Unowned', '@n8n/nodes-base-next.coreSet'],
			['Log', '@n8n/nodes-base-next.coreSet'],
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

	it('quotes constant set fields that n8n would read as expressions, and refuses path keys', () => {
		const json = workflow(
			'Fields',
			manual().andThen(
				set({ name: 'Constants', fields: { text: '=not an expression', count: 2 }, keep: 'all' }),
			),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Constants')?.parameters).toEqual({
			fields: { text: '={{ "=not an expression" }}', count: 2 },
			include: { mode: 'all' },
		});
		const nested = workflow('Path', manual().andThen(set({ name: 'Path', fields: { 'a.b': 1 } })));
		expect(() => nested.toJSON()).toThrow('Path: set field "a.b" cannot hold "." or "["');
	});

	it('routes a contract step with named outputs, and continues from the first output', () => {
		const filter = routedStep<Page, unknown, Page, 'Owned', 'kept' | 'discarded'>(
			'@n8n/nodes-base-next.coreFilter',
			{ name: 'Owned' },
			['kept', 'discarded'],
		);
		const switchConfig = { name: 'Route', cases: [{ output: 'a' }, { output: 'b' }] };
		const cases = routedStep('@n8n/nodes-base-next.coreSwitch', switchConfig, {
			each: 'cases',
			then: ['fallback'],
		});
		expect([filter.outputs, filter.spec.outputs, cases.outputs]).toEqual([
			['kept', 'discarded'],
			2,
			['a', 'b', 'fallback'],
		]);
		const json = workflow(
			'Routed',
			manual()
				.andThen(getPages({ name: 'Tasks', database: 'abc' }))
				.andThen(filter)
				.orElse((failed) =>
					failed.andThen(set({ name: 'Log', fields: { reason: (e) => e.error.message } })),
				),
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
		const json = workflow('Slot', manual().andThen(step)).toJSON();
		const node = json.nodes.find(({ name }) => name === 'Pick');
		expect([node?.typeVersion, node?.parameters]).toEqual([
			2,
			{ resource: 'row', operation: 'check' },
		]);
	});

	it('types the output names of a routed step', () => {
		// The shape a generated factory has for outputs named by input entries.
		const route = <In, Ctx, const N extends string, const E extends string>(config: {
			name: N;
			cases: ReadonlyArray<{ output: E }>;
		}): RoutedStep<In, Ctx, In, N, E | 'fallback'> =>
			routedStep('@n8n/nodes-base-next.coreSwitch', config, { each: 'cases', then: ['fallback'] });
		const step = route({ name: 'Route', cases: [{ output: 'young' }, { output: 'old' }] });
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
		const routed = manual()
			.andThen(getPages({ name: 'Tasks', database: 'abc' }))
			.route(exists({ name: 'Known' }), {
				exists: (flow) => flow.andThen(set({ name: 'Old', fields: { email: (row) => row.email } })),
				missing: (flow) =>
					flow.andThen(
						set({ name: 'New', fields: { email: (row, $) => `${row.email} ${$('Tasks').name}` } }),
					),
			});
		const json = workflow('Route', routed).toJSON();
		expect(json.connections.Known?.main.map((out) => out?.map((c) => c.node))).toEqual([
			['Old'],
			['New'],
		]);
		routed.andThen(set({ name: 'After', fields: { email: (item) => item.email } }));
		manual().route(exists({ name: 'Known' }), {
			exists: (flow) => flow,
			// @ts-expect-error -- "absent" is not an output of this step
			absent: (flow) => flow,
		});
		const twoOutputs = classify({
			name: 'Kind',
			categories: [{ output: 'bug' }, { output: 'idea' }],
		});
		expect(() =>
			workflow('Drops', manual().route(twoOutputs, { bug: (flow) => flow })).toJSON(),
		).toThrow('Kind: items on "idea" stop. Give each output but the last a flow in route');
		expect(() => workflow('Then', manual().andThen(twoOutputs)).toJSON()).toThrow(
			'Kind: andThen continues only from output "bug", so items on "idea" stop. Use .route(step, { … }) to give each output a flow',
		);
		expect(
			workflow('Two', manual().andThen(exists({ name: 'Known' }))).toJSON().nodes,
		).toHaveLength(2);
	});

	it('routes the named outputs of a node() step, e.g. a legacy IF', () => {
		const ifNode = node({
			name: 'If',
			type: 'n8n-nodes-base.if',
			version: 2.2,
			parameters: { conditions: {} },
			outputs: ['true', 'false'],
		});
		const json = workflow(
			'If',
			manual().route(ifNode, {
				true: (flow) => flow.andThen(set({ name: 'Yes', fields: { ok: true } })),
				false: (flow) => flow.andThen(set({ name: 'No', fields: { ok: false } })),
			}),
		).toJSON();
		expect(json.connections.If?.main.map((out) => out?.map((c) => c.node))).toEqual([
			['Yes'],
			['No'],
		]);
		manual().route(ifNode, {
			// @ts-expect-error -- "maybe" is not an output of this node
			maybe: (flow) => flow,
		});
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
		}): Step<In, Ctx, { id: string }, N> => contractStep('drive.upload', config);

		const json = workflow(
			'Copy',
			manual()
				.andThen(download({ name: 'Download', url: 'https://x/a.pdf' }))
				.andThen(upload({ name: 'Upload', file: (item) => item.binary.data })),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Upload')?.parameters).toEqual({
			file: '={{ $binary.data }}',
		});

		manual()
			.andThen(download({ name: 'Download', url: 'https://x/a.pdf' }))
			// @ts-expect-error the item has no binary named other
			.andThen(upload({ name: 'Upload', file: (item) => item.binary.other }));
		// @ts-expect-error a binary field takes a binary of the item, not a literal
		manual().andThen(upload({ name: 'Upload', file: { mimeType: 'text/csv' } }));
	});

	it('takes an expression string in a typed field and passes it on unchanged', () => {
		const limit = <In, Ctx, const N extends string>(config: {
			name: N;
			max: Value<In, Ctx, number>;
		}): Step<In, Ctx, unknown, N> => contractStep('core.limit', config);

		const json = workflow(
			'Limit',
			manual().andThen(limit({ name: 'Limit', max: '={{ $json.count }}' })),
		).toJSON();
		expect(json.nodes.find((n) => n.name === 'Limit')?.parameters).toEqual({
			max: '={{ $json.count }}',
		});
		// @ts-expect-error a plain string is not a number
		manual().andThen(limit({ name: 'Limit', max: 'ten' }));
	});

	it('pins the action version of a contract step', () => {
		const pinned = contractStep('notion.databasePage.getAll', { name: 'Tasks' }, 2);
		const json = workflow('Pinned', manual().andThen(pinned)).toJSON();
		expect(json.nodes.find((n) => n.name === 'Tasks')?.typeVersion).toBe(2);
		expect(contractStep('x.y.z', { name: 'Default' }).spec.version).toBe(1);
	});

	it('emits a composed node with its slot parameters last', () => {
		const slot = { resource: 'databasePage', operation: 'getAll' };
		const config = { name: 'Tasks', database: 'db', operation: 'create' };
		const step = contractStep('n8n-nodes-base.notion', config, 4, slot);
		const json = workflow('Composed', manual().andThen(step)).toJSON();
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
		const json = workflow('Derived', manual().andThen(step)).toJSON();
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
		const flow = added.andThen(create).andThen(post({ name: 'Post', url: 'u', json: () => ({}) }));
		const json = workflow('Scoped', flow).toJSON();
		expect(json.nodes.find((n) => n.name === 'Added')).toMatchObject({
			type: '@n8n/nodes-base-next.notionDataSourcePageAdded',
			parameters: { dataSource: 'ds' },
		});
		expect(workflow('Scoped', flow).scopes()).toEqual({
			notion: { 'content:insert': ['Create'], 'content:read': ['Added', 'Create'] },
		});
		const granted = workflow({ name: 'Scoped', grants: { notion: ['content:read'] } }, flow);
		expect(() => granted.toJSON()).toThrow(
			'Credential "notion" does not grant scope "content:insert", which "Create" needs',
		);
		const all = { notion: ['content:read', 'content:insert'] };
		expect(workflow({ name: 'Scoped', grants: all }, flow).toJSON().nodes).toHaveLength(3);
	});

	it('wires AI sub-nodes to the ai_* inputs of their node', () => {
		const wf = workflow(
			'Answer',
			manual({ sample: [{ question: 'What is n8n?' }] }).andThen(
				node({
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 2.2,
					parameters: { promptType: 'define', text: (item) => item.question },
					subnodes: {
						model: subnode({
							name: 'Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							version: 1.2,
							parameters: { model: 'gpt-4o-mini' },
						}),
						memory: subnode({
							name: 'Memory',
							type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
							version: 1.3,
							parameters: { sessionKey: (item) => item.question },
						}),
						tools: [
							subnode({
								name: 'Calculator',
								type: '@n8n/n8n-nodes-langchain.toolCalculator',
								version: 1,
								// @ts-expect-error the agent input has no such field
								parameters: { x: (item) => item.nope },
							}),
						],
					},
				}),
			),
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

	it('wires contract sub-nodes by the kind they supply', () => {
		const chatModel = <In, Ctx>(
			config: { name: string } & { model: Value<In, Ctx, ModelOf<'openai'>> },
		): Subnode<In, Ctx, 'chatModel'> => contractSubnode('pkg.openAiChatModel', 'chatModel', config);
		const tool = <In, Ctx>(config: { name: string } & { url: string }): Subnode<In, Ctx, 'tool'> =>
			contractSubnode('pkg.httpTool', 'tool', config);
		const agent = <In, Ctx, const N extends string>(
			config: { name: N } & {
				model: Subnode<In, Ctx, 'chatModel'>;
				tools?: Array<Subnode<In, Ctx, 'tool'>>;
				prompt: Value<In, Ctx, string>;
			},
		): Step<In, Ctx, { text: string }, N> => contractStep('pkg.aiAgent', config);
		const wf = workflow(
			'Answer',
			manual({ sample: [{ question: 'What is n8n?', model: 'gpt-5-mini' }] }).andThen(
				agent({
					name: 'Agent',
					model: chatModel({ name: 'Model', model: (item) => item.model }),
					tools: [tool({ name: 'Fetch', url: 'https://example.com' })],
					prompt: (item) => item.question,
				}),
			),
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
			// @ts-expect-error a contract root takes contract sub-nodes only
			model: subnode({ name: 'M', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2 }),
			prompt: 'Hi',
		});
		node({
			name: 'Legacy agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			// @ts-expect-error a legacy root node cannot run a contract sub-node
			subnodes: { model: chatModel({ name: 'M2', model: 'gpt-5-mini' }) },
		});
	});

	it('reports a sub-node that reuses a node name', () => {
		const wf = workflow(
			'Clash',
			manual().andThen(
				node({
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 2.2,
					subnodes: { model: subnode({ name: 'Start', type: 'x.lm', version: 1 }) },
				}),
			),
		);
		expect(() => wf.toJSON()).toThrow('Two different nodes are named "Start"');
	});

	it('types the manual trigger by its sample and declares it as pin data', () => {
		const wf = workflow(
			'Count rows',
			manual({ sample: [{ tableName: 'orders' }] }).andThen(
				set({ name: 'Table', fields: { table: (item) => item.tableName } }),
			),
		);
		expect(wf.generatePinData().toJSON().pinData).toEqual({ Start: [{ tableName: 'orders' }] });
		expect(workflow('No sample', manual()).generatePinData().toJSON().pinData).toBeUndefined();
		manual({ sample: [{ tableName: 'orders' }] }).andThen(
			// @ts-expect-error the sample has no such field
			set({ name: 'Typo', fields: { table: (item) => item.table } }),
		);
	});

	it('returns build problems instead of throwing while composing', () => {
		const secret = 'x';
		const wf = workflow(
			'Broken',
			manual().andThen(set({ name: 'Leak', fields: { value: () => secret } })),
		);
		expect(() => wf.toJSON()).toThrow('Leak: The lambda reads "secret"');
	});

	it('types reads against the node before', () => {
		manual()
			.andThen(getPages({ name: 'Tasks', database: 'abc' }))
			.andThen(
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
		manual()
			.andThen(node({ name: 'Anything', type: 'n8n-nodes-base.noOp', version: 1 }))
			.andThen(set({ name: 'Loose', fields: { read: (item) => item.whatever } }));
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
	}): Flow<Declared<Request, S>, Record<N, Declared<Request, S>>> =>
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
			hook({ name: 'Hook', path: 'incidents', schema: { body: incident } }).andThen(
				set({ name: 'Severity', fields: { severity: (item) => item.body.severity } }),
			),
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
		hook({ name: 'Hook', path: 'p', schema: { body: incident } }).andThen(
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
		const waiting = hook({ name: 'Hook', path: 'p', responseMode: 'responseNode' });
		expect(() => workflow('No reply', waiting).toJSON()).toThrow(
			'Hook: responseMode is "responseNode", so the flow needs its reply step after it',
		);
		const json = workflow(
			'Reply',
			waiting.andThen(respond({ name: 'Reply', respondWith: 'json' })),
		).toJSON();
		expect(json.nodes.map((n) => n.type)).toEqual([
			'n8n-nodes-base.webhook',
			'n8n-nodes-base.respondToWebhook',
		]);
		const immediate = hook({ name: 'Hook', path: 'p' }).andThen(
			respond({ name: 'Reply', respondWith: 'json' }),
		);
		expect(() => workflow('Immediate', immediate).toJSON()).toThrow(
			'Reply: replies to "Hook", which does not wait for it. Set responseMode: "responseNode" on "Hook"',
		);
	});

	it('accepts a reply that another node waits for, as n8n does', () => {
		const wait = node({
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			parameters: { resume: 'webhook', responseMode: 'responseNode' },
		});
		const underWait = hook({ name: 'Hook', path: 'p' })
			.andThen(wait)
			.andThen(respond({ name: 'Reply', respondWith: 'json' }));
		expect(workflow('Wait', underWait).toJSON().nodes).toHaveLength(3);
		const chat = trigger({
			name: 'Chat',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.3,
			parameters: { public: true, mode: 'webhook', options: { responseMode: 'responseNode' } },
		}).andThen(respond({ name: 'Reply', respondWith: 'json' }));
		expect(workflow('Chat', chat).toJSON().nodes).toHaveLength(2);
		const manualReply = manual().andThen(respond({ name: 'Reply', respondWith: 'json' }));
		expect(workflow('Manual', manualReply).toJSON().nodes).toHaveLength(2);
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
		expect(workflow('Pages', form.andThen(page())).toJSON().nodes).toHaveLength(2);
		expect(workflow('Form only', form).toJSON().nodes).toHaveLength(1);
		expect(() => workflow('No form', manual().andThen(page())).toJSON()).toThrow(
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
