import vm from 'node:vm';

import type { WorkflowJSON } from '../../types/base';
import { workflow as legacyWorkflow } from '../../workflow-builder';
import { loopWiringIssues } from '../../workflow-builder/plugins/validators/loop-wiring-validator';
import { decompileWorkflow } from '../decompile';
import * as next from '../index';
import {
	contractStep,
	filter,
	forEach,
	loop,
	manual,
	merge,
	node,
	paginate,
	pollUntil,
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
		expect(check?.type).toBe('@n8n/nodes-base-next.coreSwitch');
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
	])('%s: compile, decompile, compile is stable', (_kind, make, call) => {
		const json = make().toJSON();
		const source = decompileWorkflow(json, new Map());
		if (source === undefined) throw new Error('workflow did not decompile');
		expect(source).toContain(call);
		const rebuilt = build(source);
		expect(withoutIds(rebuilt)).toEqual(withoutIds(json));
		expect(decompileWorkflow(rebuilt, new Map())).toBe(source);
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
				[plain('Start'), sib('Loop'), contract('Route', 'coreSwitch', cases), plain('Work')],
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
				[plain('Start'), sib('Loop'), contract('Keep', 'coreFilter'), plain('Work')],
				[...all, edge('Loop', 1, 'Keep'), edge('Keep', 0, 'Work'), edge('Work', 0, 'Loop')],
			),
		).toEqual(['LOOP_BRANCH_DROPS_ITEMS@Keep']);
		expect(
			codes(
				[plain('Start'), sib('Loop'), contract('Check', 'coreIf'), plain('Work')],
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
