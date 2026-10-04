import vm from 'node:vm';

import type { WorkflowJSON } from '../../types/base';
import { workflow as legacyWorkflow } from '../../workflow-builder';
import {
	node as legacyNode,
	trigger as legacyTrigger,
} from '../../workflow-builder/node-builders/node-builder';
import { loopWiringIssues } from '../../workflow-builder/plugins/validators/loop-wiring-validator';
import { decompileWorkflow } from '../decompile';
import * as next from '../index';
import {
	contractStep,
	filter,
	forEach,
	group,
	loop,
	manual,
	merge,
	node,
	onError,
	paginate,
	recover,
	pollUntil,
	provider,
	set,
	splitOut,
	steps,
	switchOn,
	validateLoopWiring,
	when,
	workflow,
	type Step,
} from '../index';

interface Order {
	id: string;
	total: number;
}

interface Customer {
	id: string;
	name: string;
	orders: Order[];
	tags: string[];
}

type Ticket =
	| { kind: 'bug'; id: string; severity: number }
	| { kind: 'feature'; id: string; votes: number }
	| { kind: 'chore'; id: string };

/** A typed source of items. The tests feed its items as the trigger input. */
const source =
	<T>() =>
	<In, Ctx, const N extends string>(name: N): Step<In, Ctx, T, N> =>
		contractStep('n8n-nodes-base.noOp', { name });

const customers = source<Customer>();
const requests = source<{ body: { orders: Order[]; tags: string[]; note: string } }>();
const hooks = source<{ headers: Record<string, string>; body: next.Loose }>();
const tickets = source<Ticket>();

const forEachWorkflow = () =>
	workflow(
		'Orders per customer',
		manual(),
		customers('Customers'),
		forEach(
			{ name: 'Each customer', batchSize: 1 },
			steps(
				splitOut({ name: 'Orders', field: 'orders' }),
				forEach(
					{ name: 'Each order', batchSize: 2 },
					set({ name: 'Line', fields: { order: (o) => o.id, total: (o) => o.total * 2 } }),
				),
			),
		),
		set({ name: 'Report', fields: { order: (line) => line.order } }),
	);

const loopWorkflow = (maxIterations: number) =>
	workflow(
		'Count',
		manual(),
		set({ name: 'Init', fields: { n: 0, sum: 0 } }),
		loop(
			{
				name: 'Count',
				maxIterations,
				until: (out) => out.n >= 3,
				next: (out) => ({ n: out.n, sum: out.sum }),
			},
			set({ name: 'Add', fields: { n: (s) => s.n + 1, sum: (s) => s.sum + s.n + 1 } }),
		),
		set({ name: 'Result', fields: { sum: (out) => out.sum } }),
	);

const paginateWorkflow = () =>
	workflow(
		'Pages',
		manual(),
		set({ name: 'Start page', fields: { cursor: 0 } }),
		paginate(
			{
				name: 'Pages',
				maxPages: 10,
				next: (response) => (response.next === null ? null : { cursor: response.next }),
			},
			set({
				name: 'Fetch',
				fields: {
					rows: (p) => [p.cursor * 10, p.cursor * 10 + 1],
					next: (p) => (p.cursor < 2 ? p.cursor + 1 : null),
				},
			}),
		),
		splitOut({ name: 'Rows', field: 'rows' }),
	);

const pollWorkflow = () =>
	workflow(
		'Poll',
		manual(),
		set({ name: 'Job', fields: { job: 'j1' } }),
		pollUntil(
			{
				name: 'Poll',
				maxAttempts: 5,
				every: { amount: 0, unit: 'seconds' },
				until: (status) => status.done === true,
			},
			// Stands in for a status request: the job is done on the third attempt.
			node({
				name: 'Status',
				type: 'n8n-nodes-base.set',
				version: 3.4,
				parameters: {
					mode: 'raw',
					jsonOutput: '={{ ({ job: $json.job, done: $json["Poll pass"] >= 2 }) }}',
				},
			}),
		),
	);

const switchWorkflow = () =>
	workflow(
		'Triage',
		manual(),
		tickets('Tickets'),
		switchOn(
			{ name: 'By kind', on: 'kind' },
			{
				bug: set({ name: 'Bug', fields: { score: (t) => t.severity * 10 } }),
				feature: set({ name: 'Feature', fields: { score: (t) => t.votes } }),
				chore: set({ name: 'Chore', fields: { score: 0 } }),
			},
		),
		set({ name: 'Scored', fields: { score: (s) => s.score } }),
	);

const filterWorkflow = () =>
	workflow(
		'Bugs',
		manual(),
		tickets('Tickets'),
		filter({
			name: 'Bugs only',
			if: (t): t is Extract<Ticket, { kind: 'bug' }> => t.kind === 'bug',
		}),
		set({ name: 'Severity', fields: { severity: (bug) => bug.severity } }),
	);

const mergeWorkflow = () =>
	workflow(
		'Join',
		manual(),
		customers('Customers'),
		merge({ name: 'Join', join: { left: 'id', right: 'id' } }, [
			set({ name: 'Names', fields: { id: (c) => c.id, name: (c) => c.name } }),
			set({ name: 'Counts', fields: { id: (c) => c.id, count: (c) => c.orders.length } }),
		]),
		set({ name: 'Summary', fields: { text: (row) => `${row.name}: ${row.count}` } }),
	);

const switchDefaultWorkflow = () =>
	workflow(
		'By name',
		manual(),
		customers('Customers'),
		switchOn(
			{ name: 'By name', on: 'name' },
			{
				Ada: set({ name: 'Ada', fields: { vip: true } }),
				fallback: set({ name: 'Rest', fields: { vip: false } }),
			},
		),
	);

const mergeJoinWorkflow = (join: 'append' | 'position') =>
	workflow(
		'Both',
		manual(),
		customers('Customers'),
		merge({ name: 'Both', join }, [
			set({ name: 'Names', fields: { name: (c) => c.name } }),
			set({ name: 'Counts', fields: { count: (c) => c.orders.length } }),
		]),
	);

/** A loop that walks up to 3 levels: the body output is the next state, the limit ends it. */
const cappedLoopWorkflow = () =>
	workflow(
		'Walk',
		manual(),
		set({ name: 'Init', fields: { level: 0 } }),
		loop(
			{ name: 'Walk', maxIterations: 3, onLimit: 'continue', until: (out) => out.level >= 10 },
			set({ name: 'Up', fields: { level: (s) => s.level + 1 } }),
		),
		set({ name: 'Depth', fields: { level: (out) => out.level } }),
	);

const mergeThreeWorkflow = (join: 'append' | 'position') =>
	workflow(
		'Three',
		manual(),
		customers('Customers'),
		merge({ name: 'All', join }, [
			set({ name: 'Names', fields: { name: (c) => c.name } }),
			set({ name: 'Counts', fields: { count: (c) => c.orders.length } }),
			set({ name: 'Tags', fields: { tags: (c) => c.tags.join(',') } }),
		]),
	);

/** A forEach body that starts with the branches of a merge. */
const forEachBranchesWorkflow = () =>
	workflow(
		'Each in parts',
		manual(),
		customers('Customers'),
		forEach(
			{ name: 'Each', batchSize: 1 },
			merge({ name: 'Parts', join: 'position' }, [
				set({ name: 'Names', fields: { name: (c) => c.name } }),
				set({ name: 'Counts', fields: { count: (c) => c.orders.length } }),
				set({ name: 'Tags', fields: { tags: (c) => c.tags.length } }),
			]),
		),
		set({ name: 'Report', fields: { text: (row) => `${row.name}: ${row.count}` } }),
	);

/** A forEach whose last node has an error branch that ends, or that continues. */
const guardedEachWorkflow = (rejoins: boolean) =>
	workflow(
		'Guarded each',
		manual(),
		customers('Customers'),
		forEach({ name: 'Each', batchSize: 2 }, set({ name: 'Post', fields: { id: (c) => c.id } })),
		rejoins
			? recover(set({ name: 'Log', fields: { failed: (e) => e.error } }))
			: onError(set({ name: 'Log', fields: { failed: (e) => e.error } })),
		set({ name: 'Report', fields: { done: true } }),
	);

/** Canvas groups: one with a description, one around a forEach, one in it, one with an AI node. */
const groupWorkflow = () =>
	workflow(
		{ name: 'Grouped orders', settings: { errorWorkflow: 'wf-errors', timezone: 'Europe/Berlin' } },
		manual(),
		customers('Customers'),
		group(
			{ name: 'Prepare', description: 'Splits each customer into orders' },
			steps(
				splitOut({ name: 'Orders', field: 'orders' }),
				set({ name: 'Line', fields: { order: (o) => o.id, total: (o) => o.total } }),
			),
		),
		group(
			{ name: 'Send' },
			steps(
				forEach(
					{ name: 'Each line', batchSize: 5 },
					steps(
						group({ name: 'Post' }, set({ name: 'Post line', fields: { order: (l) => l.order } })),
						set({ name: 'Mark line', fields: { sent: true } }),
					),
				),
				node({
					name: 'Summarize',
					type: '@n8n/n8n-nodes-langchain.agent',
					version: 3,
					providers: {
						model: provider({
							name: 'Model',
							type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							version: 1.2,
						}),
					},
				}),
			),
		),
		set({ name: 'Report', fields: { done: true } }),
	);

const connections = (json: WorkflowJSON, name: string) =>
	json.connections[name]?.main.map((targets) =>
		(targets ?? []).map((target) => `${target.node}#${target.index}`),
	);

describe('regions compile to node contracts', () => {
	it('emits nested forEach as regions, with no loop node', () => {
		const json = forEachWorkflow().toJSON();
		const nameOf = new Map(json.nodes.map((n) => [n.id, n.name]));
		const named = (id: string) => nameOf.get(id) ?? id;
		expect(json.nodes.map((n) => n.name)).toEqual([
			'Start',
			'Customers',
			'Orders',
			'Line',
			'Report',
		]);
		expect(connections(json, 'Customers')).toEqual([['Orders#0']]);
		expect(connections(json, 'Orders')).toEqual([['Line#0']]);
		expect(connections(json, 'Line')).toEqual([['Report#0']]);
		expect(
			json.nodeGroups?.map(({ name, nodeIds, repeat }) => ({
				name,
				members: nodeIds.map(named),
				entry: repeat && named(repeat.entry),
				exits: repeat?.exits.map(({ node, output }) => `${named(node)}#${output}`),
				batchSize: repeat?.batchSize,
			})),
		).toEqual([
			{ name: 'Each order', members: ['Line'], entry: 'Line', exits: ['Line#0'], batchSize: 2 },
			{
				name: 'Each customer',
				members: ['Orders', 'Line'],
				entry: 'Orders',
				exits: ['Line#0'],
				batchSize: 1,
			},
		]);
		expect(json.settings).toEqual({ executionOrder: 'v1' });
		expect(validateLoopWiring(json)).toEqual([]);
	});

	it('wires loop with a typed exit, a next state, and a pass limit', () => {
		const json = loopWorkflow(10).toJSON();
		expect(connections(json, 'Count')).toEqual([['Add#0']]);
		expect(connections(json, 'Add')).toEqual([['Count until#0']]);
		expect(connections(json, 'Count until')).toEqual([
			['Result#0'],
			['Count limit#0'],
			['Count next#0'],
		]);
		expect(connections(json, 'Count next')).toEqual([['Count#0']]);
		const until = (left: string) => ({
			conditions: [{ type: 'boolean', left, test: { op: 'true' } }],
		});
		const check = json.nodes.find((n) => n.name === 'Count until');
		expect(check?.type).toBe('@n8n/nodes-base-next.conditionSwitch');
		expect(check?.parameters).toEqual({
			cases: [
				{ output: 'done', where: until('={{ $json.n >= 3 }}') },
				{ output: 'limit', where: until('={{ $("Count").item.json["Count pass"] + 1 >= 10 }}') },
			],
		});
		const types = new Set(json.nodes.map((n) => n.type));
		expect([...types].filter((type) => !type.startsWith('@n8n/nodes-base-next.'))).toEqual([
			'n8n-nodes-base.manualTrigger',
		]);
	});

	it('emits every page of paginate and waits between pollUntil attempts', () => {
		const pages = paginateWorkflow().toJSON();
		expect(connections(pages, 'Fetch')).toEqual([['Pages until#0', 'Rows#0']]);
		expect(connections(pages, 'Pages until')?.[0]).toEqual([]);
		const poll = pollWorkflow().toJSON();
		expect(connections(poll, 'Poll next')).toEqual([['Poll wait#0']]);
		expect(connections(poll, 'Poll wait')).toEqual([['Poll#0']]);
		const wait = poll.nodes.find((n) => n.name === 'Poll wait');
		expect(wait?.type).toBe('@n8n/nodes-base-next.waitInterval');
		expect(wait?.parameters).toEqual({ amount: 0, unit: 'seconds' });
	});

	it('routes switch cases by output, and merges branches by input', () => {
		const triage = switchWorkflow().toJSON();
		expect(connections(triage, 'By kind')).toEqual([['Bug#0'], ['Feature#0'], ['Chore#0']]);
		const joined = mergeWorkflow().toJSON();
		expect(connections(joined, 'Customers')).toEqual([['Names#0', 'Counts#0']]);
		expect(connections(joined, 'Names')).toEqual([['Join#0']]);
		expect(connections(joined, 'Counts')).toEqual([['Join#1']]);
		const byName = switchDefaultWorkflow().toJSON();
		expect(connections(byName, 'By name')).toEqual([['Ada#0'], ['Rest#0']]);
	});

	it.each([
		['forEach', forEachWorkflow],
		['loop', () => loopWorkflow(10)],
		['paginate', paginateWorkflow],
		['pollUntil', pollWorkflow],
		['switch', switchWorkflow],
		['switch with default', switchDefaultWorkflow],
		['filter', filterWorkflow],
		['merge by fields', mergeWorkflow],
		['merge append', () => mergeJoinWorkflow('append')],
		['merge position', () => mergeJoinWorkflow('position')],
		['loop without next to its limit', cappedLoopWorkflow],
		['merge of three', () => mergeThreeWorkflow('position')],
		['forEach of branches', forEachBranchesWorkflow],
		['forEach with onError', () => guardedEachWorkflow(false)],
		['forEach with recover', () => guardedEachWorkflow(true)],
	])('%s: workflow validation finds no issues', (_kind, make) => {
		const { errors, warnings } = make().validate();
		expect([...errors, ...warnings]).toEqual([]);
	});

	it('reports a loop region inside forEach as a build problem', () => {
		const looped = workflow(
			'Retry each',
			manual(),
			customers('Customers'),
			forEach(
				{ name: 'Each', batchSize: 1 },
				loop(
					{
						name: 'Count',
						maxIterations: 3,
						until: () => true,
						next: (out, $) => ({ ...$('Count'), id: out.id, each: $('Each').name }),
					},
					set({ name: 'Add', fields: { id: (c) => c.id } }),
				),
			),
		);
		expect(() => looped.toJSON()).toThrow(/Region "Each": its nodes connect in a loop/);
		const paged = workflow(
			'Pages per customer',
			manual(),
			set({ name: 'Start', fields: { cursor: 0 } }),
			forEach(
				{ name: 'Each', batchSize: 1 },
				paginate(
					{ name: 'Pages', maxPages: 3, next: () => null },
					set({ name: 'Fetch', fields: { next: null } }),
				),
			),
		);
		expect(() => paged.toJSON()).toThrow(/Region "Each": its nodes connect in a loop/);
	});

	it('accepts a forEach body that drops items', () => {
		const filtered = workflow(
			'Filtered',
			manual(),
			customers('Customers'),
			forEach(
				{ name: 'Each', batchSize: 1 },
				filter({ name: 'Has orders', if: (c) => c.orders.length > 0 }),
			),
		);
		expect(() => filtered.toJSON()).not.toThrow();
		const branched = workflow(
			'Branched',
			manual(),
			customers('Customers'),
			forEach(
				{ name: 'Each', batchSize: 1 },
				when(
					{ name: 'Has orders?', if: (c) => c.orders.length > 0 },
					{ then: set({ name: 'Keep', fields: { id: (c) => c.id } }) },
				),
			),
		);
		expect(() => branched.toJSON()).not.toThrow();
	});

	it('reports two regions with the same name as a build problem, also with a later step', () => {
		const twice = workflow(
			'Twice',
			manual(),
			customers('Customers'),
			forEach({ name: 'Each', batchSize: 1 }, set({ name: 'A', fields: { id: (c) => c.id } })),
			forEach({ name: 'Each', batchSize: 1 }, set({ name: 'B', fields: { id: (c) => c.id } })),
			set({ name: 'C', fields: { id: (c) => c.id } }),
		);
		expect(() => twice.toJSON()).toThrow(/Two regions have the name "Each"/);
	});

	it('loop without next carries the body output, and onLimit continue ends at the limit', () => {
		const json = cappedLoopWorkflow().toJSON();
		const names = json.nodes.map((n) => n.name);
		expect(names).toEqual(['Start', 'Init', 'Walk', 'Up', 'Walk until', 'Walk next', 'Depth']);
		expect(connections(json, 'Walk until')).toEqual([['Depth#0'], ['Walk next#0']]);
		const check = json.nodes.find((n) => n.name === 'Walk until');
		expect(check?.parameters).toEqual({
			cases: [
				{
					output: 'done',
					where: {
						conditions: [
							{
								type: 'boolean',
								left: '={{ ($json.level >= 10) || $("Walk").item.json["Walk pass"] + 1 >= 3 }}',
								test: { op: 'true' },
							},
						],
					},
				},
			],
		});
		expect(json.nodes.find((n) => n.name === 'Walk next')?.parameters).toEqual({
			state: '={{ ({ ...($json), "Walk pass": $("Walk").item.json["Walk pass"] + 1 }) }}',
		});
	});

	it('merges more than two branches in one Merge contract that counts its inputs', () => {
		const appended = mergeThreeWorkflow('append').toJSON();
		expect(appended.nodes.find((n) => n.name === 'All')).toMatchObject({
			type: '@n8n/nodes-base-next.mergeAppend',
			typeVersion: 2,
			parameters: { inputs: 3 },
		});
		expect(connections(appended, 'Tags')).toEqual([['All#2']]);
		const joined = mergeThreeWorkflow('position').toJSON();
		expect(joined.nodes.find((n) => n.name === 'All')).toMatchObject({
			type: '@n8n/nodes-base-next.mergeCombineByPosition',
			typeVersion: 1,
			parameters: { inputs: 3 },
		});
		expect(JSON.stringify(joined)).not.toContain('n8n-nodes-base.merge');
		// Two branches set no count: n8n stores no default.
		const both = (join: 'append' | 'position') =>
			mergeJoinWorkflow(join)
				.toJSON()
				.nodes.find((n) => n.name === 'Both');
		expect(both('append')).toMatchObject({
			type: '@n8n/nodes-base-next.mergeAppend',
			parameters: {},
		});
		expect(both('position')).toMatchObject({
			type: '@n8n/nodes-base-next.mergeCombineByPosition',
			parameters: {},
		});
	});

	it('reports a merge by fields of more than two branches as a build problem', () => {
		const three = workflow(
			'Three',
			manual(),
			customers('Customers'),
			merge({ name: 'J', join: { left: 'id', right: 'id' } } as never, [steps(), steps(), steps()]),
		);
		expect(() => three.toJSON()).toThrow(/J: merge by matching fields takes 2 branches, not 3/);
	});

	it('starts a forEach body that splits into branches with a No Operation node', () => {
		const json = forEachBranchesWorkflow().toJSON();
		const nameOf = new Map(json.nodes.map((n) => [n.id, n.name]));
		const start = json.nodes.find((n) => n.name === 'Each start');
		expect(start?.type).toBe('@n8n/nodes-base-next.noOpPass');
		expect(connections(json, 'Customers')).toEqual([['Each start#0']]);
		expect(connections(json, 'Each start')).toEqual([['Names#0', 'Counts#0', 'Tags#0']]);
		const [group] = json.nodeGroups ?? [];
		expect(group?.repeat && nameOf.get(group.repeat.entry)).toBe('Each start');
		expect(group?.nodeIds.map((id) => nameOf.get(id))).toEqual([
			'Each start',
			'Names',
			'Counts',
			'Tags',
			'Parts',
		]);
	});

	it.each([
		['onError', false, ['Post#0']],
		['recover', true, ['Post#0', 'Log#0']],
	])('keeps a forEach before %s, and runs the error branch in it', (_kind, rejoins, exits) => {
		const json = guardedEachWorkflow(rejoins).toJSON();
		const nameOf = new Map(json.nodes.map((n) => [n.id, n.name]));
		const named = (id: string) => nameOf.get(id) ?? id;
		expect(
			json.nodeGroups?.map(({ name, nodeIds, repeat }) => ({
				name,
				members: nodeIds.map(named),
				entry: repeat && named(repeat.entry),
				exits: repeat?.exits.map(({ node, output }) => `${named(node)}#${output}`),
			})),
		).toEqual([{ name: 'Each', members: ['Post', 'Log'], entry: 'Post', exits }]);
		expect(connections(json, 'Post')).toEqual([['Report#0'], ['Log#0']]);
		expect(connections(json, 'Log')).toEqual(rejoins ? [['Report#0']] : undefined);
		expect(json.settings).toEqual({ executionOrder: 'v1' });
	});

	it('runs an error branch after a nested forEach in both regions', () => {
		const json = workflow(
			'Guarded nested',
			manual(),
			customers('Customers'),
			forEach(
				{ name: 'Outer', batchSize: 2 },
				steps(
					set({ name: 'Prepare', fields: { id: (c) => c.id } }),
					forEach(
						{ name: 'Inner', batchSize: 1 },
						set({ name: 'Post', fields: { id: (c) => c.id } }),
					),
				),
			),
			recover(set({ name: 'Log', fields: { failed: true } })),
		).toJSON();
		const nameOf = new Map(json.nodes.map((n) => [n.id, n.name]));
		expect(
			json.nodeGroups?.map(({ name, nodeIds, repeat }) => [
				name,
				nodeIds.map((id) => nameOf.get(id)),
				repeat?.exits.map(({ node, output }) => `${nameOf.get(node)}#${output}`),
			]),
		).toEqual([
			['Inner', ['Post', 'Log'], ['Post#0', 'Log#0']],
			['Outer', ['Prepare', 'Post', 'Log'], ['Post#0', 'Log#0']],
		]);
	});

	it('reports a bad batch size and an empty body as build problems', () => {
		const empty = workflow('Empty', manual(), forEach({ name: 'Loop', batchSize: 0 }, steps()));
		expect(() => empty.toJSON()).toThrow(/batchSize must be a whole number[\s\S]*needs a body/);
	});

	it('types items through regions', () => {
		workflow(
			'Each',
			manual(),
			customers('Customers'),
			forEach(
				{ name: 'Each', batchSize: 1 },
				set({
					name: 'Read',
					fields: {
						name: (c, $) => `${c.name} ${$('Each').id}`,
						// @ts-expect-error unknown field
						typo: (c) => c.nme,
					},
				}),
			),
		);
		workflow(
			'Orders',
			manual(),
			customers('Customers'),
			splitOut({ name: 'Orders', field: 'orders' }),
			set({
				name: 'Order',
				fields: {
					total: (o) => o.total,
					// @ts-expect-error an order has no name
					name: (o) => o.name,
				},
			}),
		);
		workflow(
			'Tags',
			manual(),
			customers('Customers'),
			splitOut({ name: 'Tags', field: 'tags' }),
			set({ name: 'Tag', fields: { tag: (t) => t.tags.toUpperCase() } }),
		);
		workflow(
			'Bad',
			manual(),
			customers('Customers'),
			// @ts-expect-error name is not a list
			splitOut({ name: 'Bad', field: 'name' }),
		);
		workflow(
			'Nested',
			manual(),
			requests('Request'),
			splitOut({ name: 'Orders', field: 'body.orders' }),
			set({
				name: 'Order',
				fields: {
					total: (o) => o.total,
					// @ts-expect-error an order has no name
					name: (o) => o.name,
				},
			}),
		);
		workflow(
			'Nested tags',
			manual(),
			requests('Request'),
			splitOut({ name: 'Tags', field: 'body.tags' }),
			set({ name: 'Tag', fields: { tag: (t) => t['body.tags'].toUpperCase() } }),
		);
		workflow(
			'Nested bad',
			manual(),
			requests('Request'),
			// @ts-expect-error body.note is not a list
			splitOut({ name: 'Bad', field: 'body.note' }),
		);
		workflow(
			'Open',
			manual(),
			hooks('Hook'),
			splitOut({ name: 'Orders', field: 'body.orders' }),
			set({ name: 'Order', fields: { id: (o) => String(o.id) } }),
		);
		workflow(
			'Open typo',
			manual(),
			hooks('Hook'),
			// @ts-expect-error the item has no bdy
			splitOut({ name: 'Bad', field: 'bdy.orders' }),
		);

		workflow(
			'Kinds',
			manual(),
			tickets('Tickets'),
			switchOn(
				{ name: 'Kind', on: 'kind' },
				{
					bug: set({ name: 'B', fields: { s: (t) => t.severity } }),
					// @ts-expect-error a feature has no severity
					feature: set({ name: 'F', fields: { s: (t) => t.severity } }),
					chore: steps(),
				},
			),
		);
		workflow(
			'Missing',
			manual(),
			tickets('Tickets'),
			switchOn(
				{ name: 'Kind', on: 'kind' },
				// @ts-expect-error the chore case is missing
				{ bug: steps(), feature: steps() },
			),
		);
		workflow(
			'Unknown case',
			manual(),
			tickets('Tickets'),
			switchOn(
				{ name: 'Kind', on: 'kind' },
				// @ts-expect-error task is no kind
				{ bug: steps(), feature: steps(), chore: steps(), task: steps() },
			),
		);
		workflow(
			'No fallback',
			manual(),
			customers('Customers'),
			// @ts-expect-error a plain string field needs a fallback
			switchOn({ name: 'By name', on: 'name' }, { a: steps() }),
		);
		workflow(
			'Fallback',
			manual(),
			customers('Customers'),
			switchOn(
				{ name: 'By name', on: 'name' },
				{
					a: set({ name: 'A', fields: { id: (c) => c.id } }),
					fallback: set({ name: 'Rest', fields: { id: (c, $) => `${c.id} ${$('By name').name}` } }),
				},
			),
		);

		workflow(
			'Bugs',
			manual(),
			tickets('Tickets'),
			filter({ name: 'Bugs', if: (t): t is Extract<Ticket, { kind: 'bug' }> => t.kind === 'bug' }),
			set({ name: 'Sev', fields: { s: (t) => t.severity } }),
		);

		workflow(
			'Loop',
			manual(),
			set({ name: 'Init', fields: { n: 0 } }),
			loop(
				{
					name: 'L',
					maxIterations: 3,
					until: (out) => out.m > 2,
					// @ts-expect-error the next state needs n
					next: (out) => ({ m: out.m }),
				},
				set({ name: 'Inc', fields: { m: (s) => s.n + 1 } }),
			),
		);
		workflow(
			'Loop without next',
			manual(),
			set({ name: 'Init', fields: { n: 0 } }),
			loop(
				{ name: 'L', maxIterations: 3, onLimit: 'continue', until: (out) => out.n > 2 },
				set({ name: 'Inc', fields: { n: (s) => s.n + 1 } }),
			),
			set({ name: 'Out', fields: { n: (out) => out.n } }),
		);
		workflow(
			'Loop with a boolean state',
			manual(),
			set({ name: 'Init', fields: { ok: false, error: '' } }),
			loop(
				{ name: 'L', maxIterations: 3, onLimit: 'continue', until: (out) => out.ok },
				set({ name: 'Try', fields: { ok: (s) => s.error === '', error: 'none' } }),
			),
		);
		workflow(
			'Loop with an empty list state',
			manual(),
			set({ name: 'Init', fields: { chain: [], id: 'e1' } }),
			loop(
				{ name: 'Walk', maxIterations: 3, onLimit: 'continue', until: (out) => out.id === '' },
				set({
					name: 'Step',
					fields: { chain: (s, $) => [...$('Walk').chain, s.id], id: (s) => s.id.slice(1) },
				}),
			),
			set({ name: 'Out', fields: { size: (out) => out.chain.length } }),
		);
		workflow(
			'Loop needs next',
			manual(),
			set({ name: 'Init', fields: { n: 0 } }),
			loop(
				// @ts-expect-error the body output has no n, so the next pass needs next
				{ name: 'L', maxIterations: 3, until: (out) => out.m > 2 },
				set({ name: 'Inc', fields: { m: (s) => s.n + 1 } }),
			),
		);
		workflow(
			'Loop limit',
			manual(),
			set({ name: 'Init', fields: { n: 0 } }),
			loop(
				// @ts-expect-error onLimit takes fail or continue
				{ name: 'L', maxIterations: 3, onLimit: 'stop', until: (out) => out.n > 2 },
				set({ name: 'Inc', fields: { n: (s) => s.n + 1 } }),
			),
		);

		workflow(
			'Joined',
			manual(),
			customers('Customers'),
			merge({ name: 'J', join: 'position' }, [
				set({ name: 'A', fields: { a: 1 } }),
				set({ name: 'B', fields: { b: 'x' } }),
			]),
			set({ name: 'AB', fields: { ab: (row) => `${row.a}${row.b}` } }),
		);
		workflow(
			'Fields',
			manual(),
			customers('Customers'),
			merge(
				// @ts-expect-error B has no field id
				{ name: 'J', join: { left: 'id', right: 'id' } },
				[steps(), set({ name: 'B', fields: { b: 1 } })],
			),
		);
		workflow(
			'Three by position',
			manual(),
			customers('Customers'),
			merge({ name: 'J', join: 'position' }, [
				set({ name: 'A', fields: { a: 1 } }),
				set({ name: 'B', fields: { b: 'x' } }),
				set({ name: 'C', fields: { c: (cu) => cu.name } }),
			]),
			set({ name: 'ABC', fields: { abc: (row) => `${row.a}${row.b}${row.c}` } }),
		);
		workflow(
			'Three appended',
			manual(),
			customers('Customers'),
			merge({ name: 'J', join: 'append' }, [
				set({ name: 'A', fields: { a: 1 } }),
				set({ name: 'B', fields: { b: 'x' } }),
				set({ name: 'C', fields: { c: (cu) => cu.name } }),
			]),
			// @ts-expect-error an appended item is from one branch, so it may have no a
			set({ name: 'A only', fields: { a: (row) => row.a } }),
		);
		workflow(
			'Three by fields',
			manual(),
			customers('Customers'),
			merge(
				// @ts-expect-error matching fields join 2 branches only
				{ name: 'J', join: { left: 'id', right: 'id' } },
				[steps(), steps(), steps()],
			),
		);
	});
});

const modules: Record<string, unknown> = { '@n8n/workflow-sdk/next': next };

function build(source: string): WorkflowJSON {
	const code = source
		.replace(/^import \{ ([^}]+) \} from '([^']+)';$/gm, "const { $1 } = require('$2');")
		.replace('export default ', 'module.exports.default = ');
	const module = { exports: { default: undefined as unknown } };
	vm.runInNewContext(code, { require: (id: string) => modules[id], module });
	return (module.exports.default as next.Workflow).toJSON();
}

/** The workflow with node names in place of node IDs, which each build makes again. */
const withoutIds = (json: WorkflowJSON) => {
	const nameOf = new Map(json.nodes.map((n) => [n.id, n.name ?? '']));
	const named = (id: string) => nameOf.get(id) ?? id;
	return {
		...json,
		nodes: json.nodes.map(({ id: _id, ...rest }) => rest),
		nodeGroups: json.nodeGroups?.map(({ id: _id, nodeIds, repeat, ...group }) => ({
			...group,
			nodeIds: nodeIds.map(named),
			...(repeat
				? {
						repeat: {
							...repeat,
							entry: named(repeat.entry),
							exits: repeat.exits.map(({ node, output }) => ({ node: named(node), output })),
						},
					}
				: {}),
		})),
	};
};

describe('regions round-trip through decompile', () => {
	it.each([
		['forEach', forEachWorkflow, '  forEach({'],
		['loop', () => loopWorkflow(10), '  loop({'],
		['paginate', paginateWorkflow, '  paginate({'],
		['pollUntil', pollWorkflow, '  pollUntil({'],
		['switch', switchWorkflow, '  switchOn({'],
		['switch with default', switchDefaultWorkflow, 'fallback: set({'],
		['filter', filterWorkflow, '  filter({'],
		['merge', mergeWorkflow, '  merge({'],
		['merge append', () => mergeJoinWorkflow('append'), 'join: "append"'],
		['merge position', () => mergeJoinWorkflow('position'), 'join: "position"'],
		['loop without next to its limit', cappedLoopWorkflow, 'onLimit: "continue",'],
		['merge of three appended', () => mergeThreeWorkflow('append'), 'join: "append"'],
		['merge of three by position', () => mergeThreeWorkflow('position'), 'join: "position"'],
		['forEach of branches', forEachBranchesWorkflow, 'name: "Each start"'],
		['groups and settings', groupWorkflow, '  group({'],
		['forEach with onError', () => guardedEachWorkflow(false), '  forEach({'],
		['forEach with recover', () => guardedEachWorkflow(true), '  forEach({'],
	])('%s: compile, decompile, compile is stable', (_kind, make, call) => {
		const json = make().toJSON();
		const source = decompileWorkflow(json, new Map());
		if (source === undefined) throw new Error('workflow did not decompile');
		expect(source).toContain(call);
		const rebuilt = build(source);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(decompileWorkflow(rebuilt, new Map())).toBe(source);
	});

	it.each([
		['onError', false],
		['recover', true],
	])('reads a forEach before %s back with the error branch in its body', (kind, rejoins) => {
		const source = decompileWorkflow(guardedEachWorkflow(rejoins).toJSON(), new Map()) ?? '';
		expect(source).toContain('  forEach({\n    name: "Each",\n    batchSize: 2,\n  }, steps(');
		expect(source).toContain(`\n    ${kind}(set({\n      name: "Log",`);
	});

	it('reads a nested forEach back as nested regions', () => {
		const source = decompileWorkflow(forEachWorkflow().toJSON(), new Map()) ?? '';
		expect(source).toMatch(/ forEach\(\{\s+name: "Each customer",\s+batchSize: 1,/);
		expect(source).toContain('}, steps(');
		expect(source.match(/ forEach\(/g)).toHaveLength(2);
	});
});

describe('loopWiringIssues', () => {
	const sib = (name: string, version = 3, parameters: Record<string, unknown> = {}) => ({
		name,
		type: 'n8n-nodes-base.splitInBatches',
		version,
		parameters,
	});
	const plain = (name: string, type = 'n8n-nodes-base.set') => ({ name, type, version: 1 });
	const edge = (from: string, output: number, to: string) => ({ from, output, to });
	const codes = (nodes: Parameters<typeof loopWiringIssues>[0], edges: typeof all) =>
		loopWiringIssues(nodes, edges).map(({ code, nodeName }) => `${code}@${nodeName}`);
	const all = [edge('Start', 0, 'Loop')];

	it('accepts a well-wired loop of version 3 and of version 2', () => {
		expect(
			codes(
				[plain('Start'), sib('Loop'), plain('Work'), plain('After')],
				[
					edge('Start', 0, 'Loop'),
					edge('Loop', 1, 'Work'),
					edge('Work', 0, 'Loop'),
					edge('Loop', 0, 'After'),
				],
			),
		).toEqual([]);
		expect(
			codes(
				[plain('Start'), sib('Loop', 2), plain('Work')],
				[edge('Start', 0, 'Loop'), edge('Loop', 0, 'Work'), edge('Work', 0, 'Loop')],
			),
		).toEqual([]);
	});

	it('catches a loop output that feeds nothing', () => {
		expect(
			codes([plain('Start'), sib('Loop'), plain('After')], [...all, edge('Loop', 0, 'After')]),
		).toEqual(['LOOP_BODY_MISSING@Loop']);
	});

	it('catches a body that never returns', () => {
		expect(
			codes([plain('Start'), sib('Loop'), plain('Work')], [...all, edge('Loop', 1, 'Work')]),
		).toEqual(['LOOP_NO_RETURN@Loop']);
	});

	it('catches done and loop swapped', () => {
		expect(
			codes(
				[plain('Start'), sib('Loop'), plain('Work'), plain('After')],
				[...all, edge('Loop', 0, 'Work'), edge('Work', 0, 'Loop'), edge('Loop', 1, 'After')],
			),
		).toEqual(['LOOP_OUTPUTS_SWAPPED@Loop']);
	});

	it('catches a branch in the body whose output does not return', () => {
		expect(
			codes(
				[plain('Start'), sib('Loop'), plain('Check', 'n8n-nodes-base.if'), plain('Work')],
				[...all, edge('Loop', 1, 'Check'), edge('Check', 0, 'Work'), edge('Work', 0, 'Loop')],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Check']);
		expect(
			codes(
				[plain('Start'), sib('Loop'), plain('Keep', 'n8n-nodes-base.filter')],
				[...all, edge('Loop', 1, 'Keep'), edge('Keep', 0, 'Loop')],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Keep']);
	});

	it('accepts a branch output that fails the run with Stop and Error', () => {
		expect(
			codes(
				[
					plain('Start'),
					sib('Loop'),
					plain('Check', 'n8n-nodes-base.if'),
					plain('Work'),
					plain('Fail', 'n8n-nodes-base.stopAndError'),
				],
				[
					...all,
					edge('Loop', 1, 'Check'),
					edge('Check', 0, 'Work'),
					edge('Check', 1, 'Fail'),
					edge('Work', 0, 'Loop'),
				],
			),
		).toEqual([]);
	});

	it('knows the routing contracts: an open fallback is no output, an open discarded is', () => {
		const contract = (name: string, type: string, parameters?: Record<string, unknown>) => ({
			...plain(name, `@n8n/nodes-base-next.${type}`),
			...(parameters ? { parameters } : {}),
		});
		const cases = { cases: [{ output: 'a' }, { output: 'b' }] };
		expect(
			codes(
				[plain('Start'), sib('Loop'), contract('Route', 'conditionSwitch', cases), plain('Work')],
				[
					...all,
					edge('Loop', 1, 'Route'),
					edge('Route', 0, 'Work'),
					edge('Route', 1, 'Work'),
					edge('Work', 0, 'Loop'),
				],
			),
		).toEqual([]);
		expect(
			codes(
				[plain('Start'), sib('Loop'), contract('Keep', 'conditionFilter'), plain('Work')],
				[...all, edge('Loop', 1, 'Keep'), edge('Keep', 0, 'Work'), edge('Work', 0, 'Loop')],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Keep']);
		expect(
			codes(
				[plain('Start'), sib('Loop'), contract('Check', 'conditionIf'), plain('Work')],
				[...all, edge('Loop', 1, 'Check'), edge('Check', 0, 'Work'), edge('Work', 0, 'Loop')],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Check']);
	});

	it('checks the outer body before an inner loop', () => {
		const reset = { options: { reset: '={{ $prevNode.name === "Check" }}' } };
		expect(
			codes(
				[
					plain('Start'),
					sib('Outer'),
					plain('Check', 'n8n-nodes-base.if'),
					sib('Inner', 3, reset),
					plain('Work'),
					plain('After'),
				],
				[
					edge('Start', 0, 'Outer'),
					edge('Outer', 1, 'Check'),
					edge('Check', 0, 'Inner'),
					edge('Inner', 1, 'Work'),
					edge('Work', 0, 'Inner'),
					edge('Inner', 0, 'After'),
					edge('After', 0, 'Outer'),
				],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Check']);
	});

	it('catches a nested loop without reset, and a Merge in a body', () => {
		const nodes = [
			plain('Start'),
			sib('Outer'),
			sib('Inner'),
			plain('Work'),
			plain('Join', 'n8n-nodes-base.merge'),
		];
		const edges = [
			edge('Start', 0, 'Outer'),
			edge('Outer', 1, 'Inner'),
			edge('Inner', 1, 'Work'),
			edge('Work', 0, 'Inner'),
			edge('Inner', 0, 'Join'),
			edge('Join', 0, 'Outer'),
		];
		expect(codes(nodes, edges)).toEqual(['LOOP_NESTED_NO_RESET@Inner', 'LOOP_MERGE_IN_BODY@Join']);
		const withReset = (reset: string) =>
			nodes.map((n) => (n.name === 'Inner' ? sib('Inner', 3, { options: { reset } }) : n));
		expect(codes(withReset('={{ $prevNode.name === "Outer" }}'), edges)).toEqual([
			'LOOP_MERGE_IN_BODY@Join',
		]);
		expect(codes(withReset('={{ true }}'), edges)).toEqual([
			'LOOP_NESTED_NO_RESET@Inner',
			'LOOP_MERGE_IN_BODY@Join',
		]);
	});

	it('catches a forEach reset that names a renamed return node', () => {
		const nodes = [
			plain('Start'),
			sib('Loop', 3, { options: { reset: '={{ !["Old name"].includes($prevNode.name) }}' } }),
			plain('Work'),
		];
		expect(codes(nodes, [...all, edge('Loop', 1, 'Work'), edge('Work', 0, 'Loop')])).toEqual([
			'LOOP_RESET_STALE@Loop',
		]);
	});

	it('reports loop wiring in next workflow validation only', () => {
		const handWired = workflow(
			'Hand-wired',
			manual(),
			node({
				name: 'Loop',
				type: 'n8n-nodes-base.splitInBatches',
				version: 3,
				parameters: { batchSize: 1 },
			}),
			set({ name: 'Work', fields: { done: true } }),
		);
		const codesOf = (issues: ReadonlyArray<{ code: string }>) => issues.map(({ code }) => code);
		expect(codesOf(handWired.validate().errors)).toEqual(['LOOP_BODY_MISSING']);
		const legacy = legacyWorkflow.fromJSON(handWired.toJSON()).validate();
		expect(codesOf([...legacy.errors, ...legacy.warnings])).not.toContain('LOOP_BODY_MISSING');
	});
});

describe('group', () => {
	const named = (json: WorkflowJSON) => {
		const nameOf = new Map(json.nodes.map((n) => [n.id, n.name]));
		return json.nodeGroups?.map(({ nodeIds, ...rest }) => ({
			...rest,
			nodeIds: nodeIds.map((id) => nameOf.get(id)),
		}));
	};

	it('emits the node group JSON of the legacy group()', () => {
		const noOp = (name: string) => node({ name, type: 'n8n-nodes-base.noOp', version: 1 });
		const grouped = workflow(
			'Grouped',
			manual(),
			group({ name: 'Stage', description: 'Two steps' }, steps(noOp('A'), noOp('B'))),
			noOp('C'),
		).toJSON();
		const legacyNoOp = (name: string) =>
			legacyNode({ type: 'n8n-nodes-base.noOp', version: 1, config: { name } });
		const [a, b, c] = [legacyNoOp('A'), legacyNoOp('B'), legacyNoOp('C')];
		const legacy = legacyWorkflow('Grouped', 'Grouped')
			.add(
				legacyTrigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			)
			.to(a)
			.to(b)
			.to(c)
			.group('Stage', [a, b], { description: 'Two steps' })
			.toJSON();

		expect(named(grouped)).toEqual(named(legacy));
		expect(named(grouped)).toEqual([
			{ id: expect.any(String), name: 'Stage', nodeIds: ['A', 'B'], description: 'Two steps' },
		]);
		expect(grouped.settings).toEqual({});
	});

	it('changes no node or connection, holds the providers of its members, and nests', () => {
		const json = groupWorkflow().toJSON();
		expect(named(json)).toEqual([
			expect.objectContaining({ name: 'Each line', nodeIds: ['Post line', 'Mark line'] }),
			{
				id: expect.any(String),
				name: 'Prepare',
				nodeIds: ['Orders', 'Line'],
				description: 'Splits each customer into orders',
			},
			{ id: expect.any(String), name: 'Post', nodeIds: ['Post line'] },
			{
				id: expect.any(String),
				name: 'Send',
				nodeIds: ['Post line', 'Mark line', 'Summarize', 'Model'],
			},
		]);
		expect(connections(json, 'Line')).toEqual([['Post line#0']]);
		expect(connections(json, 'Mark line')).toEqual([['Summarize#0']]);
		expect(connections(json, 'Summarize')).toEqual([['Report#0']]);
	});

	it('keeps a group before an error branch', () => {
		const json = workflow(
			'Guarded',
			manual(),
			customers('Customers'),
			group({ name: 'Fetch' }, steps(customers('A'), customers('B'))),
			onError(set({ name: 'Log', fields: { failed: true } })),
		).toJSON();
		expect(named(json)?.map(({ name, nodeIds }) => [name, nodeIds])).toEqual([
			['Fetch', ['A', 'B']],
		]);
		expect(connections(json, 'B')).toEqual([[], ['Log#0']]);
	});

	it('reads back no group that group() cannot build', () => {
		const json = groupWorkflow().toJSON();
		const idOf = new Map(json.nodes.map((n) => [n.name, n.id]));
		const regroup = (name: string, members: string[]): WorkflowJSON => ({
			...json,
			nodeGroups: json.nodeGroups?.map((each) =>
				each.name === name
					? { ...each, nodeIds: members.map((member) => idOf.get(member) ?? '') }
					: each,
			),
		});
		expect(decompileWorkflow(json, new Map())).toBeDefined();
		expect(decompileWorkflow(regroup('Prepare', ['Customers', 'Line']), new Map())).toBeUndefined();
		expect(
			decompileWorkflow(regroup('Send', ['Post line', 'Mark line', 'Summarize']), new Map()),
		).toBeUndefined();
	});

	it.each([
		[
			'an empty body',
			() => group({ name: 'Empty' }, steps()),
			'Empty: group needs a body that runs a node',
		],
		[
			'the nodes of the forEach it wraps',
			() => group({ name: 'Batch' }, forEach({ name: 'Each', batchSize: 1 }, customers('A'))),
			'Batch: group has the same nodes as "Each". Remove one, or give the group more nodes',
		],
		[
			'the name of another group',
			() =>
				steps(group({ name: 'Stage' }, customers('A')), group({ name: 'Stage' }, customers('B'))),
			'Two groups or forEach regions are named "Stage"',
		],
	])('fails the build on a group with %s', (_case, part, issue) => {
		expect(() => workflow('Bad', manual(), customers('Customers'), part()).toJSON()).toThrow(issue);
	});
});

describe('workflow settings', () => {
	it('emits the settings JSON of the legacy settings()', () => {
		const settings = {
			errorWorkflow: 'wf-errors',
			timezone: 'Europe/Berlin',
			saveManualExecutions: true,
			callerPolicy: 'workflowsFromSameOwner',
		} as const;
		const legacy = legacyWorkflow('Settled', 'Settled')
			.settings(settings)
			.add(
				legacyTrigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1,
					config: { name: 'Start' },
				}),
			)
			.toJSON();
		expect(workflow({ name: 'Settled', settings }, manual()).toJSON().settings).toEqual(
			legacy.settings,
		);
	});

	it('adds execution order v1 for a forEach, and fails the build on v0', () => {
		const each = forEach({ name: 'Each', batchSize: 1 }, customers('A'));
		const settled = (settings: next.WorkflowSettings) =>
			workflow({ name: 'Paced', settings }, manual(), customers('Customers'), each);
		expect(settled({ timezone: 'UTC' }).toJSON().settings).toEqual({
			timezone: 'UTC',
			executionOrder: 'v1',
		});
		expect(() => settled({ executionOrder: 'v0' }).toJSON()).toThrow(
			'forEach runs in execution order v1 only. Remove settings.executionOrder',
		);
	});

	it('reads saved settings back, without a DEFAULT value or execution order v1', () => {
		const saved = (settings: WorkflowJSON['settings']): WorkflowJSON => ({
			...workflow('Saved', manual()).toJSON(),
			settings,
		});
		const source = decompileWorkflow(
			saved({ errorWorkflow: 'wf-errors', timezone: 'DEFAULT', executionOrder: 'v1' }),
			new Map(),
		);
		expect(source).toContain(
			'workflow(\n  {\n    name: "Saved",\n    settings: {\n      errorWorkflow: "wf-errors",\n    },\n  },\n',
		);
		expect(build(source ?? '').settings).toEqual({ errorWorkflow: 'wf-errors' });

		const v0 = decompileWorkflow(saved({ executionOrder: 'v0' }), new Map()) ?? '';
		expect(v0).toContain('settings: {\n      executionOrder: "v0",\n    },');
		expect(build(v0).settings).toEqual({ executionOrder: 'v0' });
	});

	it('reads a workflow with only default settings back without settings', () => {
		const json: WorkflowJSON = {
			...workflow('Saved', manual()).toJSON(),
			settings: { executionOrder: 'v1' },
		};
		const source = decompileWorkflow(json, new Map()) ?? '';
		expect(source).toContain('export default workflow(\n  "Saved",\n  manual(');
		expect(source).not.toContain('settings');
		// The save merges these settings into the saved ones, so execution order v1 stays.
		expect(build(source).settings).toEqual({});
	});

	it('types the settings by the n8n workflow settings', () => {
		const typed = () => [
			workflow(
				{
					name: 'Typo',
					// @ts-expect-error A key that n8n does not save.
					settings: { errorWorkflowId: 'wf-errors' },
				},
				manual(),
			),
			workflow(
				{
					name: 'Default',
					// @ts-expect-error Leave the key out for the default.
					settings: { timezone: 'UTC', saveManualExecutions: 'DEFAULT' },
				},
				manual(),
			),
		];
		expect(typed).toBeInstanceOf(Function);
	});
});
