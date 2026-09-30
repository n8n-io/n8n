import { contractStep, manual, node, set, workflow, type Step } from '../index';
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
			['Has owner?', 'n8n-nodes-base.if'],
			['Report', 'httpRequest.post'],
			['Unowned', 'n8n-nodes-base.set'],
			['Log', 'n8n-nodes-base.set'],
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
		expect(json.nodes.find((n) => n.name === 'Unowned')?.parameters).toMatchObject({
			mode: 'raw',
			jsonOutput: '={{ ({ "id": $json.id }) }}',
		});
	});

	it('pins the action version of a contract step', () => {
		const pinned = contractStep('notion.databasePage.getAll', { name: 'Tasks' }, 2);
		const json = workflow('Pinned', manual().andThen(pinned)).toJSON();
		expect(json.nodes.find((n) => n.name === 'Tasks')?.typeVersion).toBe(2);
		expect(contractStep('x.y.z', { name: 'Default' }).spec.version).toBe(1);
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
