// End-to-end execution of a group node, the boundary of a canvas group.
//
// A group is a node with one main input and one main output. Its interior is
// flat: every node that carries the group's id in `parentId`. The engine
// resolves the boundary once, when the `Workflow` builds its connection
// indices, so the group node itself is never a step in a run.
//
// Two rules cross the boundary:
// - fan-in: one group input broadcasts to every interior entry node.
// - collect: every interior exit node concatenates onto the group output.
//
// An empty group forwards its input unchanged.
//
// These tests run the real engine and assert on which nodes ran, in what order,
// and what reached the node after the group. See
// `.agents/specs/group-as-first-class-node.md`.

import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IConnections,
	IExecuteFunctions,
	INode,
	INodeTypeData,
	INodeTypeDescription,
	IRun,
	IWorkflowGroup,
} from 'n8n-workflow';
import {
	GROUP_NODE_TYPE,
	migrateNodeGroupsToGroupNodes,
	NodeConnectionTypes,
	Workflow,
} from 'n8n-workflow';

import * as Helpers from '@test/helpers';

import { DirectedGraph } from '../partial-execution-utils';
import { WorkflowExecute } from '../workflow-execute';

const TRIGGER = 'Trigger';

/** Records the order in which nodes ran, so a test can assert on it. */
let executed: string[] = [];

const passThrough: INodeTypeDescription = {
	displayName: 'Test Node',
	name: 'testNode',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'Test Node' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

const nodeTypeData: INodeTypeData = {
	testTrigger: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'trigger', inputs: [] },
			async execute(this: IExecuteFunctions) {
				executed.push(this.getNode().name);
				return [[{ json: { seed: true } }]];
			},
		},
	},
	// Stamps its own name onto every item, so the collect order is visible in
	// the data that reaches the node after the group.
	testStamp: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'stamp' },
			async execute(this: IExecuteFunctions) {
				const name = this.getNode().name;
				executed.push(name);
				return [this.getInputData().map((item) => ({ json: { ...item.json, [name]: true } }))];
			},
		},
	},
	// Resolves an expression parameter named `read` and stamps its value onto the
	// item, so a test can assert a `$('NodeName')` reference across the boundary.
	testReader: {
		sourcePath: '',
		type: {
			description: {
				...passThrough,
				name: 'reader',
				properties: [{ displayName: 'Read', name: 'read', type: 'string', default: '' }],
			},
			async execute(this: IExecuteFunctions) {
				const name = this.getNode().name;
				executed.push(name);
				const read = this.getNodeParameter('read', 0);
				return [this.getInputData().map((item) => ({ json: { ...item.json, read } }))];
			},
		},
	},
	// The group boundary. Registered so node-type lookups resolve, but the
	// rewrite removes it from the executed graph, so this must never run.
	[GROUP_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: { ...passThrough, name: 'group', group: ['organization'] },
			async execute(this: IExecuteFunctions) {
				executed.push(`RAN_GROUP:${this.getNode().name}`);
				return [this.getInputData()];
			},
		},
	},
};

function node(name: string, parentId?: string, type = 'testStamp'): INode {
	return {
		id: name.toLowerCase(),
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...(parentId === undefined ? {} : { parentId }),
	};
}

function group(id: string, name = id, parentId?: string): INode {
	return { ...node(name, parentId, GROUP_NODE_TYPE), id };
}

function connect(...edges: Array<[string, string]>): IConnections {
	const connections: IConnections = {};

	for (const [from, to] of edges) {
		const bySource = (connections[from] ??= {});
		const main = (bySource[NodeConnectionTypes.Main] ??= [[]]);
		(main[0] ??= []).push({ node: to, type: NodeConnectionTypes.Main, index: 0 });
	}

	return connections;
}

async function run(nodes: INode[], connections: IConnections): Promise<IRun> {
	const workflow = new Workflow({
		id: 'group-test',
		active: false,
		nodeTypes: Helpers.NodeTypes(nodeTypeData),
		settings: { executionOrder: 'v1' },
		nodes,
		connections,
	});
	const waitPromise = createDeferredPromise<IRun>();
	const workflowExecute = new WorkflowExecute(
		Helpers.WorkflowExecuteAdditionalData(waitPromise),
		'manual',
	);

	await workflowExecute.run({ workflow, startNode: workflow.getNode(TRIGGER)! });

	return await waitPromise.promise;
}

/**
 * The items the named node emitted on its first run. Every test node stamps its
 * own name onto each item, so this shows both what reached the node and which
 * interior nodes the item passed through.
 */
function itemsOutOf(result: IRun, nodeName: string) {
	return (
		result.data.resultData.runData[nodeName]?.[0]?.data?.[NodeConnectionTypes.Main]?.[0] ?? []
	).map((item) => item.json);
}

/** Every item the named node emitted, across all of its runs. */
function allItemsOutOf(result: IRun, nodeName: string) {
	return (result.data.resultData.runData[nodeName] ?? []).flatMap((taskData) =>
		(taskData.data?.[NodeConnectionTypes.Main]?.[0] ?? []).map((item) => item.json),
	);
}

/** Orders items by their JSON so a collect comparison ignores branch order. */
function sortByKeys(a: unknown, b: unknown): number {
	return JSON.stringify(a).localeCompare(JSON.stringify(b));
}

beforeEach(() => {
	executed = [];
});

describe('group node execution', () => {
	it('forwards items through an empty group without running it', async () => {
		const nodes = [node(TRIGGER, undefined, 'testTrigger'), group('g'), node('After')];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		// The group is a boundary, not a step.
		expect(executed).toEqual([TRIGGER, 'After']);
		// Nothing between the trigger and `After`: the item is unchanged apart
		// from `After`'s own stamp.
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, After: true }]);
	});

	it('runs a single interior node between the group ports', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Mid', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Mid: true, After: true }]);
	});

	it('runs an interior chain in order', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Extract', 'g'),
			node('Transform', 'g'),
			node('Load', 'g'),
			node('After'),
		];
		const result = await run(
			nodes,
			connect([TRIGGER, 'g'], ['Extract', 'Transform'], ['Transform', 'Load'], ['g', 'After']),
		);

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Extract', 'Transform', 'Load', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([
			{ seed: true, Extract: true, Transform: true, Load: true, After: true },
		]);
	});

	it('broadcasts the group input to every interior entry node', async () => {
		// Two unconnected interior nodes: both are an entry and an exit.
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('EntryA', 'g'),
			node('EntryB', 'g'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toContain('EntryA');
		expect(executed).toContain('EntryB');
		// Each entry gets its own copy of the same input branch.
		expect(itemsOutOf(result, 'EntryA')).toEqual([{ seed: true, EntryA: true }]);
		expect(itemsOutOf(result, 'EntryB')).toEqual([{ seed: true, EntryB: true }]);
	});

	it('collects every interior exit onto the group output', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('ExitA', 'g'),
			node('ExitB', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		// `After` runs once per collected exit branch, so both exits reach it.
		const collected = allItemsOutOf(result, 'After');

		expect(collected).toContainEqual({ seed: true, ExitA: true, After: true });
		expect(collected).toContainEqual({ seed: true, ExitB: true, After: true });
	});

	it('runs a multi-entry, multi-exit interior', async () => {
		// In -> Left and Right in parallel -> Out. One entry, one exit, a
		// diamond between them.
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('In', 'g'),
			node('Left', 'g'),
			node('Right', 'g'),
			node('After'),
		];
		const result = await run(
			nodes,
			connect([TRIGGER, 'g'], ['In', 'Left'], ['In', 'Right'], ['g', 'After']),
		);

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual(expect.arrayContaining([TRIGGER, 'In', 'Left', 'Right', 'After']));
		// Left and Right are the exits, so both collect onto the output.
		const collected = allItemsOutOf(result, 'After');

		expect(collected).toContainEqual({ seed: true, In: true, Left: true, After: true });
		expect(collected).toContainEqual({ seed: true, In: true, Right: true, After: true });
	});

	it('resolves through nested groups', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g1'),
			group('g2', 'g2', 'g1'),
			node('Inner', 'g2'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g1'], ['g1', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Inner', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Inner: true, After: true }]);
	});

	it('forwards through an empty group nested in a group', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g1'),
			group('g2', 'g2', 'g1'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'g1'], ['g1', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, After: true }]);
	});

	it('runs a trigger that sits inside a group', async () => {
		// The trigger is an interior entry node with no incoming boundary edge.
		// The interior still runs, and its exit collects onto the group output.
		const nodes = [
			node(TRIGGER, 'g', 'testTrigger'),
			group('g'),
			node('Inside', 'g'),
			node('After'),
		];
		const result = await run(nodes, connect([TRIGGER, 'Inside'], ['g', 'After']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'Inside', 'After']);
		expect(itemsOutOf(result, 'After')).toEqual([{ seed: true, Inside: true, After: true }]);
	});

	it('never executes the group node itself', async () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		await run(nodes, connect([TRIGGER, 'g'], ['g', 'After']));

		expect(executed.some((name) => name.startsWith('RAN_GROUP'))).toBe(false);
	});

	it('leaves a workflow with no group untouched', async () => {
		const nodes = [node(TRIGGER, undefined, 'testTrigger'), node('A'), node('B')];
		const result = await run(nodes, connect([TRIGGER, 'A'], ['A', 'B']));

		expect(result.data.resultData.error).toBeUndefined();
		expect(executed).toEqual([TRIGGER, 'A', 'B']);
	});
});

describe('a converted nodeGroups workflow executes like the original', () => {
	// The old model ran the member chain directly; the engine never saw the group.
	// So "identical to the original" means the group boundary is transparent: the
	// converted D-shape workflow runs the same nodes, in the same order, and the
	// node after the group receives the same items as the plain member chain does.
	//
	// Each case builds the plain baseline (members on the canvas, no group) and the
	// `nodeGroups` shape, converts the latter with the pure migration, and asserts
	// both runs match.

	/** Runs a plain baseline and the converted `nodeGroups` shape, and returns both. */
	async function runBoth(
		plainNodes: INode[],
		plainConnections: IConnections,
		groupedNodes: INode[],
		groupedConnections: IConnections,
		nodeGroups: IWorkflowGroup[],
	) {
		executed = [];
		const baseline = await run(plainNodes, plainConnections);
		const baselineExecuted = executed;

		const converted = migrateNodeGroupsToGroupNodes({
			nodes: groupedNodes,
			connections: groupedConnections,
			nodeGroups,
		});

		executed = [];
		const grouped = await run(converted.nodes, converted.connections);
		const groupedExecuted = executed;

		return { baseline, baselineExecuted, grouped, groupedExecuted };
	}

	it('pass-through empty group matches an ungrouped edge', async () => {
		const { baseline, baselineExecuted, grouped, groupedExecuted } = await runBoth(
			// Baseline: Trigger -> After, no group in between.
			[node(TRIGGER, undefined, 'testTrigger'), node('After')],
			connect([TRIGGER, 'After']),
			// nodeGroups shape: an empty group between the trigger and After.
			[node(TRIGGER, undefined, 'testTrigger'), node('After')],
			connect([TRIGGER, 'After']),
			[{ id: 'g', name: 'Empty', nodeIds: [] }],
		);

		expect(baseline.data.resultData.error).toBeUndefined();
		expect(grouped.data.resultData.error).toBeUndefined();
		expect(groupedExecuted).toEqual(baselineExecuted);
		expect(itemsOutOf(grouped, 'After')).toEqual(itemsOutOf(baseline, 'After'));
	});

	it('multi-entry interior broadcasts like two ungrouped branches', async () => {
		// Two interior entries, both fed by the boundary.
		const { baseline, grouped } = await runBoth(
			// Baseline: Trigger fans out to EntryA and EntryB directly.
			[node(TRIGGER, undefined, 'testTrigger'), node('EntryA'), node('EntryB')],
			{
				[TRIGGER]: {
					main: [
						[
							{ node: 'EntryA', type: NodeConnectionTypes.Main, index: 0 },
							{ node: 'EntryB', type: NodeConnectionTypes.Main, index: 0 },
						],
					],
				},
			},
			// nodeGroups shape: the two entries are grouped, fed through the group.
			[node(TRIGGER, undefined, 'testTrigger'), node('EntryA'), node('EntryB')],
			connect([TRIGGER, 'EntryA'], [TRIGGER, 'EntryB']),
			[{ id: 'g', name: 'Fan', nodeIds: ['entrya', 'entryb'] }],
		);

		expect(grouped.data.resultData.error).toBeUndefined();
		// Each entry gets its own copy of the same input branch, in both runs.
		expect(itemsOutOf(grouped, 'EntryA')).toEqual(itemsOutOf(baseline, 'EntryA'));
		expect(itemsOutOf(grouped, 'EntryB')).toEqual(itemsOutOf(baseline, 'EntryB'));
	});

	it('multi-exit interior collects onto the output like two ungrouped exits', async () => {
		// In -> Left and Right; Left and Right are the exits, both feed After.
		const plainConnections: IConnections = {
			...connect([TRIGGER, 'In'], ['In', 'Left'], ['In', 'Right']),
			Left: { main: [[{ node: 'After', type: NodeConnectionTypes.Main, index: 0 }]] },
			Right: { main: [[{ node: 'After', type: NodeConnectionTypes.Main, index: 0 }]] },
		};

		const { baseline, grouped } = await runBoth(
			[
				node(TRIGGER, undefined, 'testTrigger'),
				node('In'),
				node('Left'),
				node('Right'),
				node('After'),
			],
			plainConnections,
			[
				node(TRIGGER, undefined, 'testTrigger'),
				node('In'),
				node('Left'),
				node('Right'),
				node('After'),
			],
			connect(
				[TRIGGER, 'In'],
				['In', 'Left'],
				['In', 'Right'],
				['Left', 'After'],
				['Right', 'After'],
			),
			[{ id: 'g', name: 'Collect', nodeIds: ['in', 'left', 'right'] }],
		);

		expect(grouped.data.resultData.error).toBeUndefined();
		expect(allItemsOutOf(grouped, 'After').sort(sortByKeys)).toEqual(
			allItemsOutOf(baseline, 'After').sort(sortByKeys),
		);
	});

	it('keeps a $() reference to an interior node valid across the boundary', async () => {
		// `After` reads the interior node `Mid` by name. The reference must resolve
		// the same whether `Mid` sits on the canvas or inside a group.
		const reader = (): INode => ({
			id: 'after',
			name: 'After',
			type: 'testReader',
			typeVersion: 1,
			position: [0, 0],
			parameters: { read: "={{ $('Mid').item.json.Mid }}" },
		});

		const { baseline, grouped } = await runBoth(
			[node(TRIGGER, undefined, 'testTrigger'), node('Mid'), reader()],
			connect([TRIGGER, 'Mid'], ['Mid', 'After']),
			[node(TRIGGER, undefined, 'testTrigger'), node('Mid'), reader()],
			connect([TRIGGER, 'Mid'], ['Mid', 'After']),
			[{ id: 'g', name: 'Wrap', nodeIds: ['mid'] }],
		);

		expect(grouped.data.resultData.error).toBeUndefined();
		expect(itemsOutOf(grouped, 'After')).toEqual(itemsOutOf(baseline, 'After'));
		// The reference resolved to Mid's stamped value, not to nothing.
		expect(itemsOutOf(grouped, 'After')[0]).toMatchObject({ read: true });
	});
});

describe('partial execution inherits the boundary', () => {
	// `DirectedGraph.fromWorkflow` reads `connectionsBySourceNode`, which is the
	// resolved graph, so partial runs need no group handling of their own. This
	// pins that inheritance: the group node must not reach the graph, and the
	// interior must be reachable from the trigger.
	it('builds a graph of runnable nodes only', () => {
		const nodes = [
			node(TRIGGER, undefined, 'testTrigger'),
			group('g'),
			node('Mid', 'g'),
			node('After'),
		];
		const workflow = new Workflow({
			id: 'partial',
			active: false,
			nodeTypes: Helpers.NodeTypes(nodeTypeData),
			settings: { executionOrder: 'v1' },
			nodes,
			connections: connect([TRIGGER, 'g'], ['g', 'After']),
		});

		const graph = DirectedGraph.fromWorkflow(workflow);
		const edges = graph
			.getConnections()
			.map((connection) => `${connection.from.name}->${connection.to.name}`)
			.sort();

		expect(edges).toEqual(['Mid->After', 'Trigger->Mid']);
		// The group node is still a node of the workflow, so the canvas can draw
		// it, but no connection touches it.
		expect(graph.hasNode('g')).toBe(true);
		expect(
			graph
				.getConnections()
				.some((connection) => connection.from.name === 'g' || connection.to.name === 'g'),
		).toBe(false);
	});
});
