import {
	contractStep,
	contractTrigger,
	manual,
	node,
	routedStep,
	set,
	subnode,
	workflow,
	type Binary,
	type Dollar,
	type OutputNames,
	type RoutedStep,
	type Step,
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
